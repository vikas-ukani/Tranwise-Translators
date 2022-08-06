const express = require("express")
const router = express.Router()
const BusBoy = require("busboy")
const fs = require("fs")
const config = require("./serverConfig.js")
const log = require("./Logger")

const STORE_FOLDER = config.storeFolder

const BUSBOY_LIMITS = {
    // Only allow files 6 MB or smaller
    fileSize: 6 * 1024 * 1024,
    // Only allow one request field besides the File field (ie. the FileInfo). Further fields won't be processed by BusBoy
    fields: 1,
    // Only allow a maximum of 1000 bytes per field value. This will truncate the FileInfo field and generate a JSON.parse error
    fieldSize: 1000
}

router.use(express.json())

router.get("*", (req, res) => res.end())

router.post("/", (req, res) => {
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
                return
            }

            let error
            if (typeof fileInfo.fileName != "string") error = "Missing fileName"
            if (typeof fileInfo.id != "string" || fileInfo.id.length != 24) error = "Missing or wrong id"

            if (error) {
                res.writeHead(404, { Connection: "close" })
                res.end()
                return
            }

            // If the FileInfo was validated, attach it to the BusBoy instance so we can use it later
            // and process the file stream
            busboy.tranwiseFileInfo = fileInfo
            busboy.on("file", processFile)
        }
    })

    // When BusBoy finishes processing the incoming request, close the connetiona
    busboy.on("finish", () => res.end())

    req.on("close", () => req.unpipe(busboy))

    // Pipe the request to the BusBoy instance
    return req.pipe(busboy)
})

function processFile(_fieldName, file) {
    let isFileSizeLimitReached = false

    const tempFileID = this.tranwiseFileInfo.id
    if (!tempFileID) return

    // Pipe the file to the temporary location
    const tempLocation = STORE_FOLDER + "Files/TEMP/" + tempFileID
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

        // Rename the file, so it can be found when the registration request is received
        const finalLocation = STORE_FOLDER + "Files/TEMP/Resume_" + tempFileID
        fs.rename(tempLocation, finalLocation, err => {
            if (err) log("ERROR", "File move ERROR: " + JSON.stringify(err))
        })
    })
}

module.exports = router
