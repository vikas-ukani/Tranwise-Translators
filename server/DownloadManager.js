const express = require("express")
const router = express.Router()
const log = require("./Logger")
const config = require("./serverConfig.js")
const db = require("./DatabaseManager")
const fs = require("fs")
const requestedFiles = require("./RequestedFiles")

const STORE_FOLDER = config.storeFolder

router.use(express.json())

// Set the headers to allow file downloads
router.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With")
    next()
})

const serverFileStructure = {
    PROJECTS_FILES: { folder: "01_PROJECTS_FILES", allowTranslators: true, fieldsToMatch: ["PROJECT_ID", "EMPLOYEE_ID", "FILE_TYPE", "FILE_NAME", "UPLOAD_TIME"] },
    CLIENTS_FILES: { folder: "05_CLIENTS_FILES", allowTranslators: true, fieldsToMatch: ["PK", "CLIENT_ID", "FILE_NAME"] },
    EMPLOYEES_FILES: { folder: "0A_EMPLOYEES_FILES", allowTranslators: true, fieldsToMatch: ["PK", "FROM_ID", "FILE_TYPE", "FILE_NAME", "UPLOAD_TIME"] },
    EMPLOYEES_RESUMES: { folder: "06_EMPLOYEES_RESUMES", table: "EMPLOYEES", fieldsToMatch: ["PK", "RESUME_FILE_NAME"] },
    EMPLOYEES_DIPLOMAS: { folder: "07_EMPLOYEES_DIPLOMAS", table: "EMPLOYEES", fieldsToMatch: ["PK", "DIPLOMA_FILE_NAME"] }
}

function processDownloadRequest(fileInfo) {
    return new Promise(async function (resolve, reject) {
        let table = fileInfo.table
        const fileStructure = serverFileStructure[table]
        if (!fileStructure) return reject("Invalid table " + table)

        const user = fileInfo.user || {}

        if (!fileStructure.allowTranslators && !user.isManager) return reject(`Forbidden table ${table} for user ${user.pk} - ${user.fullName}`)

        const pk = parseInt(fileInfo.PK, 10)
        if (!pk) return reject(`Invalid PK ${fileInfo.PK} for table ${table} - userID: ${user.pk} - ${user.fullName}`)

        if (fileStructure.table) table = fileStructure.table

        const file = await db.getFullObject(fileInfo.PK, table)

        if (!file) return reject(`File not found - ${fileInfo.PK} - ${table} - userID: ${user.pk} - ${user.fullName}`)

        for (let field of fileStructure.fieldsToMatch) {
            if (fileInfo[field] !== file[field]) {
                reject(`Not matched field ${field}: ${fileInfo[field]} vs. ${file[field]} - userID: ${user.pk} - ${user.fullName}`)
                return
            }
        }

        const fileID = file.PREFIX ? file.PREFIX : file.PK

        // If the file is a PROJECTS_FILES, add the containg subfolder to the path. The project files are stored in subfolders
        // like 00400000, 00410000, 00420000 based on their fileID
        let subfolder = ""
        if (fileStructure.folder === "01_PROJECTS_FILES") subfolder = ("00000000" + fileID).slice(-8).slice(0, 4) + "0000/"

        file.pathOnServer = STORE_FOLDER + "Files/" + fileStructure.folder + "/" + subfolder + ("00000000" + fileID).slice(-8) + "_" + fileInfo.FILE_NAME

        resolve(file)
    })
}

// This is used when requesting files generated on the server (eg. files for notarization, PDF invoices),
// which are not records in the database. It can come either as a direct request for a previously generated file
// (eg. downloadCertificateOfEvidence)  or as a response to the message received from the server that the
// requested file has been generated and can be downloaded (eg. files for notarization, PDF invoices)

function processDownloadRequestForRequestedFile(fileInfo) {
    return new Promise(async function (resolve, reject) {
        const user = fileInfo.user || {}
        if (!user.isManager) return reject(`Forbidden processDownloadRequestForRequestedFile - userID: ${user.pk} - ${user.fullName}`)

        let fileName

        if (fileInfo.requestID) {
            fileName = requestedFiles[fileInfo.requestID]

            if (!fileName) {
                reject("File not found for request ID " + fileInfo.requestID)
                return
            }
        } else {
            fileName = fileInfo.FILE_NAME
        }

        // Most requested files are generated and saved in 0B_REQUESTED_FILES
        let pathOnServer = STORE_FOLDER + "Files/0B_REQUESTED_FILES/" + fileName
        // But PDF invoices are generated and saved in /Invoices/
        if (fileName.includes("/Invoices/")) pathOnServer = fileName

        resolve({ pathOnServer })
    })
}

router.post("/*", (req, res) => {
    const fileInfo = req.body
    if (!fileInfo) return closeConnection(res)

    // Process the path, which should be a valid download information
    const user = router.socketManager.getUserWithToken(fileInfo.token)

    if (!user) return closeConnection(res)

    // Add the user to the fileInfo, so we can use it in the download function
    fileInfo.user = user

    // The request function is different when requesting files from the database and when requesting
    // files generated on the server (eg. files for notarization, PDF invoices).
    // If the fileInfo has a requestID, it means it was a file generated on the server

    let requestFunction = fileInfo.requestID || fileInfo.table === "REQUESTED_FILES" ? processDownloadRequestForRequestedFile : processDownloadRequest
    requestFunction(fileInfo)
        .then(file => {
            // Check if the file exists on the server
            fs.access(file.pathOnServer, error => {
                // If no error (ie. the file exists), send in to the client
                if (!error) {
                    res.download(file.pathOnServer, "downloaded.zip", err => {
                        if (err) {
                            res.end()
                            if (`${err}`.includes("Request aborted") || `${err}`.includes("ECANCELED")) return
                            log("ERROR", `Download error - ${err} - ${file.pathOnServer}`, true)
                        }
                    })
                }
                // If the file does not exist, send an error response and close the connection
                else closeConnection(res, 288)
            })
        })
        .catch(error => {
            log("ERROR", "Download file error: " + error)
            closeConnection(res, 290)
        })
})

function closeConnection(res, statusCode) {
    if (!res.headersSent) res.writeHead(statusCode || 404, { Connection: "close" })
    res.end()
}

// Handle all Express errors on this router and return a blank body to the client in case of an error
// Do not remove the unused "next" argument!
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    log("ERROR", err)
    closeConnection(res)
}
router.use(errorHandler)

module.exports = router
