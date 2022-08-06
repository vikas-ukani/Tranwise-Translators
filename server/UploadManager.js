const express = require("express")
const router = express.Router()
const BusBoy = require("busboy")
const path = require("path")
const fs = require("fs")
const config = require("./serverConfig.js")
const log = require("./Logger")
const utils = require("./Utils")

const STORE_FOLDER = config.storeFolder

const uploadTokens = {}

router.addUploadToken = function (uploadToken) {
    uploadTokens[uploadToken.token] = uploadToken
}

const BUSBOY_LIMITS = {
    // Only allow files 300 MB or smaller
    fileSize: 300 * 1024 * 1024,
    // Only allow one request field besides the File field (ie. the FileInfo). Further fields won't be processed by BusBoy
    fields: 1,
    // Only allow a maximum of 15000 bytes per field value. This will truncate the FileInfo field and generate a JSON.parse error
    // On the client size, the comments that are added to the file are truncated to 10000 bytes, so this limit should never be reached
    // unless somebody is uploading from outside the app.
    fieldSize: 15000
}

router.use(express.json())

// Set the headers to allow file uploads
router.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*")
    next()
})

// Prevent accessing the path without a token
router.post("/", (req, res) => {
    log("SECURITY", `${req.ip} accessed upfi/ without a token`)
    res.end()
})

// === The chain starts here, with an incoming POST request

// The server is using this uploadManager as a middleware on /upfi
// so this post is actually to hostname/upfi/*
router.post("/*", (req, res) => {
    // Process the path, which should be a valid uploadToken ID
    const receivedToken = req.path.slice(1)
    const uploadToken = uploadTokens[receivedToken]

    // If no valid uploadToken was found, close the connection
    if (!uploadToken) {
        log("SECURITY", `${req.ip} accessed upfi/ with an invalid token "${receivedToken}"`)
        closeConnection(res)
        return
    }

    // Take some of the headers from the request and pass them to BusBoy
    const headers = ["content-length", "content-type"].reduce(function (o, k) {
        o[k] = req.headers[k]
        return o
    }, {})

    // Create the BusBoy object, which will help us handle the request
    const busboy = new BusBoy({ headers, limits: BUSBOY_LIMITS })

    // Parse the fields that come with the file request.
    // First we should receive a FileInfo field, and only when that is validated
    // add the file handler (otherwise the file is ignored)
    busboy.on("field", function (fieldName, value) {
        if (fieldName === "FileInfo") {
            // If multiple "FileInfo" fields are sent with the request, ignore all of them excepting the first one
            if (this.tranwiseFileInfo) return

            // Catch any errors when parsing the JSON value of FileInfo and return
            let fileInfo
            try {
                fileInfo = JSON.parse(value)
            } catch (error) {
                log("SECURITY", `FileInfo parse error: ${value} ${JSON.stringify(error)}`)
                return
            }

            // Validate the file info
            if (uploadToken.allowedFileTypes) {
                if (!uploadToken.allowedFileTypes.includes(fileInfo.FILE_TYPE)) {
                    log("SECURITY", `Forbidden file type: userID = ${uploadToken.user.pk} ${JSON.stringify(fileInfo)}`)
                    return
                }
            }

            if (uploadToken.requiresEmployeeToken) {
                if (fileInfo.token != utils.getChatToken(fileInfo.TO_ID)) {
                    log("SECURITY", `Upload: Missing or wrong employee token: userID = ${uploadToken.user.pk} ${JSON.stringify(fileInfo)}`)
                    return
                }
            }

            // If the FileInfo was validated, attach it to the BusBoy instance so we can use it later
            // and process the file stream
            busboy.tranwiseFileInfo = fileInfo
            busboy.tranwiseUploadToken = uploadToken
            busboy.on("file", processFile)
        }
    })

    // When BusBoy finishes processing the incoming request, close the connetion
    busboy.on("finish", function () {
        res.end()
    })

    req.on("close", function () {
        req.unpipe(busboy)
    })

    // Pipe the request to the BusBoy instance
    return req.pipe(busboy)
})

// eslint-disable-next-line no-unused-vars
function processFile(fieldName, file, filename, encoding, mimeType) {
    let isFileSizeLimitReached = false

    filename = filename.replace(/[<>:"/\\|?*\n\r\t]/g, "")

    // Pipe the file to the temporary location
    const uniqueID = Date.now() + "_" + Math.random().toString().substring(2)
    const tempFileName = uniqueID
    var tempLocation = STORE_FOLDER + "Files/TEMP/" + tempFileName
    file.pipe(fs.createWriteStream(tempLocation))

    file.on("data", data => {
        // Add the data.length to the current size of the file
        if (!this.tranwiseFileInfo.SIZE) this.tranwiseFileInfo.SIZE = 0
        this.tranwiseFileInfo.SIZE += data.length
    })

    file.on("limit", function () {
        isFileSizeLimitReached = true
        // Delete the temp file if it was over the file size limit
        fs.unlink(tempLocation, err => {
            if (err) log("ERROR", "Delete temp file ERROR: " + JSON.stringify(err))
        })
    })

    file.on("end", () => {
        // Don't perform the upload completion if the file size limit was reached (set above, in file.on("limit"))
        // Or if the file was empty (0 bytes)
        if (isFileSizeLimitReached || !this.tranwiseFileInfo.SIZE) return

        const uploadToken = this.tranwiseUploadToken

        if (uploadToken.onUploadCompleted) {
            uploadToken.onUploadCompleted(
                path.basename(filename),
                this.tranwiseFileInfo,
                function onObjectInsertSuccess(insertedObject) {
                    // If the object was inserted into the database, move the file to its final location
                    const fileID = insertedObject.PK

                    // If the file is a PROJECTS_FILES, add the containg subfolder to the path. The project files are stored in subfolders
                    // like 00400000, 00410000, 00420000 based on their fileID
                    let subfolder = ""
                    if (uploadToken.folder === "01_PROJECTS_FILES") subfolder = ("00000000" + fileID).slice(-8).slice(0, 4) + "0000/"

                    const finalLocation = STORE_FOLDER + "Files/" + uploadToken.folder + "/" + subfolder + ("00000000" + fileID).slice(-8) + "_" + path.basename(filename)
                    fs.rename(tempLocation, finalLocation, err => {
                        if (err) log("ERROR", "File move ERROR: " + JSON.stringify(err))
                    })
                },
                function onObjectInsertFailure() {
                    // If the object was not inserted into the database, delete the temp file
                    fs.unlink(tempLocation, err => {
                        if (err) log("ERROR", "Delete temp file ERROR: " + JSON.stringify(err))
                    })
                }
            )
        }
    })
}

function closeConnection(res) {
    res.writeHead(404, { Connection: "close" })
    res.end()
}

// Handle all Express errors on this router and return a blank body to the client in case of an error
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    log("ERROR", err)
    closeConnection(res)
}

router.use(errorHandler)

module.exports = router
