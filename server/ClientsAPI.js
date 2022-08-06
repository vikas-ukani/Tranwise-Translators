const express = require("express")
const app = express()
const helmet = require("helmet")
const compression = require("compression")
const fs = require("fs")
const log = require("./Logger")
const router = express.Router()
const db = require("./DatabaseManager")
const utils = require("./Utils")
const config = require("./serverConfig")
const actions = require("./ServerActions")
const C_ = require("./Constants")
const { currencySymbol } = require("./ServerActionsHelpers")

let server

if (config.useHTTPS) {
    const serverOptions = {
        key: fs.readFileSync(config.certificatesPathClients + "translate-company.com-key.pem"),
        cert: fs.readFileSync(config.certificatesPathClients + "translate-company.com-chain.pem"),
        requestCert: false,
        rejectUnauthorized: false
    }
    server = require("https").Server(serverOptions, app)
} else {
    server = require("http").Server(app)
}

app.use(helmet())
app.use(compression())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.set("trust proxy", true)

if (!config.isDeployed) {
    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*")
        res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With")
        next()
    })
}

app.use("/Clients/static-c14742d4ac994c6e8c2a48c9192e38fb", express.static(config.deployPath + "/Clients/static-c14742d4ac994c6e8c2a48c9192e38fb", { maxage: "24h" }))
app.use("/Clients", router)

// Set up the file that manages file uploads
const fileUploader = require("./ClientsAPIUploadProjectFile")
fileUploader.actions = actions
fileUploader.getProjectFileWithDetails = getProjectFileWithDetails
app.use("/Clients/UploadFile", fileUploader)

app.get("/*", (req, res) => res.end())
app.post("/*", (req, res) => res.end())

// The default Express error handler -- Don't remove the "next" argument, even though it's not used
// eslint-disable-next-line no-unused-vars
app.use(function (err, _req, res, next) {
    if (!(err + "").includes("in JSON")) {
        log("ERROR", err.stack.replace(/\n/g, " | "), true)
        console.error(err)
    }
    if (res.headersSent) return
    res.status(500).send("Server error")
})

// Start the server for the clients' portal
server.listen(3344)

// === The routes for the API start here

router.get("/Client", async (req, res) => {
    const clientID = getClientIDFromCode(req.query.c)
    if (!clientID) return res.json([])

    let client = await db.getObjectWithQuery(`SELECT CLIENT_NAME AS NAME, EMAILS FROM CLIENTS WHERE PK = ${db.escape(clientID)}`)

    res.json(client)
})

router.get("/Invoices", async (req, res) => {
    const clientID = getClientIDFromCode(req.query.c)
    if (!clientID) return res.json([])

    let invoices = await db.getObjectsWithQuery(
        "SELECT INVOICES.PK, IF (INVOICE_NUMBER <> '', INVOICE_NUMBER, CONCAT(IF (IS_USA_SPECIAL, '007-', IF(IS_MONTHLY, '005-', '003-')), INVOICES.PK)) AS NUMBER," +
            "INVOICES.STATUS,ROUND(SUM(CALCULATED_PRICE), 2) AS AMOUNT, INVOICE_DATE AS DATE, GROUP_CONCAT(PROJECT_NUMBER) AS PROJECTS, GROUP_CONCAT(PROJECTS.PK) AS PROJECT_ID" +
            ` FROM INVOICES JOIN PROJECTS ON INVOICE_ID = INVOICES.PK AND INVOICES.CLIENT_ID = ${db.escape(clientID)} GROUP BY INVOICE_ID ORDER BY INVOICES.PK DESC LIMIT 50`
    )

    res.json(invoices)
})

router.get("/Quotes", async (req, res) => {
    const clientID = getClientIDFromCode(req.query.c)
    if (!clientID) return res.json([])

    let quotes = await db.getObjectsWithQuery(
        "SELECT PROJECTS.PK, PROJECT_NUMBER AS NUMBER, DATE_RECEIVED AS DATE, CALCULATED_PRICE AS PRICE, CURRENCY, IS_NOTARIZED, IS_CERTIFIED, REQUIRED_PREPAYMENT_PERCENT, " +
            "CERTIFIED_PAYMENT_METHOD, CERTIFIED_PRICE_PER_WORD, CERTIFIED_PRICE_PER_PAGE, PAGES_COUNT, SOURCE_WORDS, " +
            "SL.LANGUAGE AS LANGUAGE, GROUP_CONCAT(TL.LANGUAGE) AS TARGET" +
            ` FROM PROJECTS JOIN LANGUAGES SL ON SOURCE_LANGUAGE_ID = SL.PK JOIN SUBPROJECTS ON PROJECT_ID = PROJECTS.PK JOIN LANGUAGES TL ON LANGUAGE_ID = TL.PK AND CLIENT_ID = ${db.escape(
                clientID
            )} AND STATUS = 1 AND IS_QUOTE_SENT = 1 AND QUOTE_IS_ACCEPTED = 0 GROUP BY PROJECT_ID`
    )

    let quotesFiles = await db.getObjectsWithQuery(
        "SELECT PROJECTS_FILES.PK, PROJECT_ID, FILE_NAME FROM PROJECTS_FILES JOIN PROJECTS ON PROJECT_ID = PROJECTS.PK AND STATUS = 1 AND IS_QUOTE_SENT = 1 AND QUOTE_IS_ACCEPTED = 0 AND FILE_TYPE = 1" +
            ` AND CLIENT_ID = ${db.escape(clientID)} AND FILE_NAME NOT LIKE '%[OCR]%'`
    )

    // Add the files to the corresponding projects
    for (let file of quotesFiles) {
        for (let project of quotes)
            if (project.PK === file.PROJECT_ID) {
                if (!project.files) project.files = []
                project.files.push({
                    PK: file.PK,
                    FILE_NAME: file.FILE_NAME,
                    // Add a security code to the file, which is required when the client wants to download the file
                    CODE: utils.md5(file.PK + "TranwiseFileSecuritySalt!")
                })
            }
    }

    let division = await db.getObjectWithQuery(`SELECT * FROM DIVISIONS JOIN CLIENTS ON DIVISION_ID = DIVISIONS.PK AND CLIENTS.PK = ${db.escape(clientID)}`)

    // Process the quotes before sending
    for (let project of quotes) {
        project.DATE = readableDate(project.DATE, "MMM D, YYYY", project.COUNTRY_ID)

        // If the project requires prepayment, provide the payment link
        if (project.REQUIRED_PREPAYMENT_PERCENT) {
            const prepaymentAmount = utils.roundPrice((project.PRICE * project.REQUIRED_PREPAYMENT_PERCENT) / 100)
            let code = `UTSPP-${project.PK}|${prepaymentAmount}|${project.CURRENCY}|${project.IS_NOTARIZED || project.IS_CERTIFIED ? 1 : 0}|${project.NUMBER}`
            code = Buffer.from(code).toString("base64")
            const paymentLink =
                `http://${division.EMAIL.replace("info@", "www.")}/charge-in-advance/?params=${code}` +
                utils
                    .md5(
                        `UTSPP-${project.PK}-${prepaymentAmount}-${project.CURRENCY}-${project.IS_NOTARIZED || project.IS_CERTIFIED ? 1 : 0}-${project.NUMBER}-tranwise_secret_key`
                    )
                    .slice(0, 7)
                    .toLowerCase()
            project.PAYMENT_LINK = paymentLink
        }

        // Add the price breakdown
        const currency = currencySymbol(project.CURRENCY)
        if (project.CERTIFIED_PAYMENT_METHOD === C_.ptBySourceWords)
            project.priceBreakdown = " — " + project.SOURCE_WORDS + " words  x  " + currency + " " + project.CERTIFIED_PRICE_PER_WORD + " / word"
        if (project.CERTIFIED_PAYMENT_METHOD === C_.ptByPages)
            project.priceBreakdown = " — " + project.PAGES_COUNT + " pages  x  " + currency + " " + project.CERTIFIED_PRICE_PER_PAGE + " / page"

        delete project.PAGES_COUNT
        delete project.SOURCE_WORDS
        delete project.CERTIFIED_PAYMENT_METHOD
        delete project.CERTIFIED_PRICE_PER_PAGE
        delete project.CERTIFIED_PRICE_PER_WORD
    }

    res.json(quotes)
})

router.get("/CompletedProjects", async (req, res) => {
    const clientID = getClientIDFromCode(req.query.c)
    if (!clientID) return res.json([])

    // Send a list of the most recent completed projects, with just the PK and the PROJECT_NUMBER
    // The rest of the details will be requested by the client when clicking on the project's details.
    const completedProjects = await db.getObjectsWithQuery(
        `SELECT PK, PROJECT_NUMBER AS NUMBER FROM PROJECTS WHERE CLIENT_ID = ${db.escape(clientID)} AND STATUS IN (8, 9) ORDER BY PK DESC LIMIT 100`
    )
    res.json(completedProjects)
})

router.get("/Projects", async (req, res) => {
    const clientID = getClientIDFromCode(req.query.c)
    if (!clientID) return res.json([])

    // Requests to this route can come from two different places:
    // - AppClients - the main file which loads the projects in progress
    // - InvoicesMainCL - the invoices page which can request details of a certain project

    // By default, send the projects that are in progress
    let query = "STATUS IN (2, 3, 4, 5, 6, 7)"

    // But if the request includes a "p" parameter, that's the projectID that has to be sent with the response
    if (req.query.p) {
        const projectID = req.query.p
        if (!projectID) return closeConnection(res)
        if (projectID != parseInt(projectID, 10) || parseInt(projectID, 10) <= 0) return closeConnection(res)
        query = "PROJECTS.PK = " + db.escape(projectID)
    }

    // Get the projects from the database
    let projects = await db.getObjectsWithQuery(
        "SELECT PROJECTS.PK, STATUS, PROJECT_NUMBER AS NUMBER, DATE_RECEIVED AS DATE, CALCULATED_PRICE AS PRICE, PROJECTS.CURRENCY, IS_CERTIFIED, IS_NOTARIZED, " +
            "DEADLINE, COUNTRY_ID, SL.LANGUAGE AS LANGUAGE, GROUP_CONCAT(TL.LANGUAGE) AS TARGET" +
            ` FROM PROJECTS JOIN LANGUAGES SL ON SOURCE_LANGUAGE_ID = SL.PK JOIN SUBPROJECTS ON PROJECT_ID = PROJECTS.PK JOIN LANGUAGES TL ON LANGUAGE_ID = TL.PK JOIN CLIENTS ON CLIENT_ID = CLIENTS.PK AND CLIENT_ID = ${db.escape(
                clientID
            )} AND ${query} GROUP BY PROJECT_ID`
    )

    // If we didn't find any matching project for this client, return a blank list
    if (!projects.length) return res.json([])

    // Generate the list of projects' PKs to be used below
    const projectsPKs = projects.map(project => project.PK).join(",")

    // Get the files for the projects above
    let projectsFiles = await db.getObjectsWithQuery(
        `SELECT PK, PROJECT_ID, FILE_NAME, FILE_TYPE, PROJECTS_FILES.CLIENT_APPROVAL_STATUS, CONTENTS, ONLINE_EDITOR_LINK FROM PROJECTS_FILES WHERE PROJECT_ID IN (${projectsPKs}) ` +
            "AND FILE_TYPE IN (1, 4, 5, 10, 16)"
    )

    // Add the files to the corresponding projects
    for (let file of projectsFiles) {
        if (file.FILE_TYPE === 1 && file.FILE_NAME.includes("[OCR]")) continue
        if (file.FILE_TYPE === 4 && file.CONTENTS != "NOT_NC") continue
        if (file.FILE_TYPE === 4 && file.CLIENT_APPROVAL_STATUS != 1) continue
        if (file.FILE_TYPE === 4 && file.ONLINE_EDITOR_LINK === "LINK") continue
        for (let project of projects)
            if (project.PK === file.PROJECT_ID) {
                if (!project.files) project.files = []
                project.files.push({
                    PK: file.PK,
                    FILE_NAME: file.FILE_NAME,
                    FILE_TYPE: file.FILE_TYPE,
                    CLIENT_APPROVAL_STATUS: file.CLIENT_APPROVAL_STATUS,
                    ONLINE_EDITOR_LINK: file.ONLINE_EDITOR_LINK,
                    // Add a security code to the file, which is required when the client wants to download the file
                    CODE: utils.md5(file.PK + "TranwiseFileSecuritySalt!")
                })
            }
    }

    // Get all the messages for the client about these projects
    let projectsMessages = await db.getObjectsWithQuery(`SELECT PROJECT_ID, MESSAGE FROM PROJECTS_MESSAGES WHERE RECIPIENT IN ("CL", "CLR") AND PROJECT_ID IN (${projectsPKs})`)

    // Add the messages to the corresponding projects
    for (let message of projectsMessages)
        for (let project of projects)
            if (project.PK === message.PROJECT_ID) {
                if (!project.messages) project.messages = []
                project.messages.push(message.MESSAGE)
            }

    // Get all the unpaid projects_services for these projects
    let projectsServices = await db.getObjectsWithQuery(
        `SELECT PROJECT_ID, SERVICE_TYPE, COST FROM PROJECTS_SERVICES WHERE WAS_INITIAL = 0 AND IS_PAID = 0 AND IS_COMPLETED = 0 AND PROJECT_ID IN (${projectsPKs})`
    )

    //  Add the services to the corresponding projects (with service name and cost, as a string)
    const serviceNames = ["", "Certification", "Notarization", "Shipping", "Document changes", "Extra copies", "Digital certification"]
    for (let service of projectsServices)
        for (let project of projects)
            if (project.PK === service.PROJECT_ID) {
                if (!project.services) project.services = []
                project.services.push(`${serviceNames[service.SERVICE_TYPE]} - $ ${service.COST}`)
            }

    // Get all the items in PROJECTS_HISTORY in order to calculate the "last updated" value for each project
    let projectsHistory = await db.getObjectsWithQuery(`SELECT PROJECT_ID, DATE FROM PROJECTS_HISTORY WHERE PROJECT_ID IN (${projectsPKs})`)

    // Add the LAST_UPDATED value to each project as a timestamp. Since the list is sorted in ascending order, the last value that is set
    // for a project is correct. Then, when processing the projects below, LAST_UPDATED will be converted to the amount of minutes
    // that passed since the last update.
    for (let action of projectsHistory) for (let project of projects) if (project.PK === action.PROJECT_ID) project.LAST_UPDATED = action.DATE

    // Process the projects before sending
    for (let project of projects) {
        project.DATE = readableDate(project.DATE, "MMM D, YYYY", project.COUNTRY_ID)
        project.DEADLINE = readableDate(project.DEADLINE, "MMM D, YYYY @ HH:mm", project.COUNTRY_ID)

        // Calculate the number of the status image that should be displayed based on the the project's STATUS field
        // and replace the STATUS field with this new status number
        const status = project.STATUS
        if (status === 2) project.STATUS = 1
        if (status === 3) project.STATUS = 1
        if ([4, 5, 6].includes(status)) {
            let hasFilesForPendingApproval = false
            for (let file of project.files) if (file.FILE_TYPE === 4 && file.CLIENT_APPROVAL_STATUS === 1) hasFilesForPendingApproval = true

            if (hasFilesForPendingApproval) project.STATUS = 4
            else if (project.IS_CERTIFIED || project.IS_NOTARIZED) project.STATUS = 6
            else project.STATUS = 5
        }
        if (status >= 7) project.STATUS = 7

        // Convert the LAST_UPDATED value (set above from projectsHistory) from a timestamp to the number of minutes since the last update
        project.LAST_UPDATED = Math.floor((utils.now() - project.LAST_UPDATED) / 60)
        // If we get a negative or 0 value, set it to 1 minute
        if (project.LAST_UPDATED <= 0) project.LAST_UPDATED = 1
        // If we get a value larger that 2 days, set it to 48 hours
        if (project.LAST_UPDATED > 60 * 48) project.LAST_UPDATED = 60 * 48

        delete project.COUNTRY_ID
        delete project.IS_CERTIFIED
        delete project.IS_NOTARIZED
    }

    res.json(projects)
})

router.get("/DownloadInvoice", async (req, res) => {
    const clientID = getClientIDFromCode(req.query.c)
    if (!clientID) return closeConnection(res)

    const invoiceID = req.query.i
    if (!invoiceID) return closeConnection(res)
    if (invoiceID != parseInt(invoiceID, 10) || parseInt(invoiceID, 10) <= 0) return closeConnection(res)

    let invoices = await db.getObjectsWithQuery(
        `SELECT PK, IF (INVOICE_NUMBER <> '', INVOICE_NUMBER, CONCAT(IF (IS_USA_SPECIAL, '007-', IF(IS_MONTHLY, '005-', '003-')), INVOICES.PK)) AS NUMBER FROM INVOICES WHERE PK = ${db.escape(
            invoiceID
        )} AND CLIENT_ID = ${db.escape(clientID)}`
    )
    if (invoices.length != 1) return closeConnection(res)

    let invoicePath = config.storeFolder + "Invoices/Invoice-" + invoices[0].NUMBER + ".pdf"
    if (!(await utils.fileExists(invoicePath))) {
        const result = await actions.createPDFInvoice(invoiceID, clientID)
        invoicePath = result.documentPath
    }

    res.download(invoicePath, "Invoice.pdf", err => {
        if (err) closeConnection(res)
    })
})

router.get("/DownloadProjectFile", async (req, res) => {
    const projectFile = await getProjectFileWithDetails(req.query.c, req.query.f, req.query.s)
    if (!projectFile) return closeConnection(res)

    let filePath = actions.projectFilePath(projectFile)

    if (await utils.fileExists(filePath)) {
        res.download(filePath, "File.pdf", err => {
            if (err) closeConnection(res)
        })
    } else return closeConnection(res)
})

router.get("/DownloadCertificateOfEvidence", async (req, res) => {
    const projectFile = await getProjectFileWithDetails(req.query.c, req.query.f, req.query.s)
    if (!projectFile) return closeConnection(res)

    const project = await db.getObjectWithQuery("SELECT * FROM PROJECTS WHERE PK = " + projectFile.PROJECT_ID)
    if (!project) return closeConnection(res)

    // Send the certificate of evidence (generate it if it doesn't exist)
    const certificateName = `CertificateOfEvidence-${project.PROJECT_NUMBER}-us${projectFile.PK}.pdf`
    let certificateFileName = config.storeFolder + "Files/0B_REQUESTED_FILES/" + certificateName
    const certificateOfEvidenceExists = await utils.fileExists(certificateFileName)
    if (!certificateOfEvidenceExists) certificateFileName = await actions.generateCertificateOfEvidence(projectFile, config.storeFolder + "Files/0B_REQUESTED_FILES/")

    if (await utils.fileExists(certificateFileName)) {
        res.download(certificateFileName, certificateName, err => {
            if (err) closeConnection(res)
        })
    } else return closeConnection(res)
})

router.get("/ApproveProjectFile", async (req, res) => {
    const projectFile = await getProjectFileWithDetails(req.query.c, req.query.f, req.query.s)
    if (!projectFile) return closeConnection(res)

    actions.clientConfirmedNotarizedProjectFile({ PROJECT_FILE_ID: projectFile.PK })
    res.end()
})

router.get("/*", async (req, res) => {
    let code = req.url.slice(1)
    if (code.endsWith("/")) code = code.slice(0, -1)
    if (code.includes("?")) code = code.slice(0, code.indexOf("?"))
    const clientID = getClientIDFromCode(code)

    if (!clientID) {
        const notFoundText = "The link you have opened is not valid.<br /><br />Please use the link you have received in the email from us."
        const html = `<html><head><title="Link not valid"></head><body style="text-align: center; padding-top: 50px; font-family: Helvetica, Arial, Sans-Serif; font-size: 18px">${notFoundText}</body></html>`
        return res.send(html)
    }

    let pathToServe = config.deployPath + "/Clients/index.html"
    res.sendFile(pathToServe)
})

router.post("/CancelQuote", async (req, res) => {
    const data = req.body
    const clientID = getClientIDFromCode(data.c)
    if (!clientID) return closeConnection(res)

    const projectID = data.q
    if (!projectID) return closeConnection(res)
    if (projectID != parseInt(projectID, 10) || parseInt(projectID, 10) <= 0) return closeConnection(res)

    let projects = await db.getObjectsWithQuery(`SELECT PK FROM PROJECTS WHERE PK = ${db.escape(projectID)} AND CLIENT_ID = ${db.escape(clientID)} AND STATUS = 1`)
    if (projects.length != 1) return res.end("ERROR")

    const reason = "Cancelled by the client in the client's portal:\n\n" + (data.reason || "")
    actions.updateObject(projectID, "PROJECTS", "CANCEL_REASON", reason)
    actions.updateObject(projectID, "PROJECTS", "STATUS", 10)
    actions.updateObject(projectID, "PROJECTS", "WORKING_MANAGER_ID", 0)

    res.end("OK")
})

router.post("/AcceptQuote", async (req, res) => {
    const data = req.body
    const clientID = getClientIDFromCode(data.c)
    if (!clientID) return closeConnection(res)

    const projectID = data.q
    if (!projectID) return closeConnection(res)
    if (projectID != parseInt(projectID, 10) || parseInt(projectID, 10) <= 0) return closeConnection(res)

    let projects = await db.getObjectsWithQuery(
        "SELECT PROJECTS.PK, PROJECT_NUMBER, REQUIRED_PREPAYMENT_PERCENT, DIVISIONS.EMAIL FROM PROJECTS JOIN CLIENTS ON CLIENT_ID = CLIENTS.PK JOIN DIVISIONS ON DIVISION_ID = DIVISIONS.PK " +
            `AND PROJECTS.PK = ${db.escape(projectID)} AND CLIENT_ID = ${db.escape(clientID)} AND STATUS = 1`
    )
    if (projects.length != 1) return res.end("ERROR")
    if (projects[0].REQUIRED_PREPAYMENT_PERCENT) return res.end("ERROR")

    actions.updateObject(projectID, "PROJECTS", "QUOTE_IS_ACCEPTED", true)

    const text = "The client has accepted quote " + projects[0].PROJECT_NUMBER + " in the portal"
    actions.sendEmail(projects[0].EMAIL, projects[0].EMAIL, text, text + ". Please set up the project.")

    res.end("OK")
})

router.post("/SendProjectMessage", async (req, res) => {
    const data = req.body
    const clientID = getClientIDFromCode(data.c)
    if (!clientID) return closeConnection(res)

    const projectID = data.p
    if (!projectID) return closeConnection(res)
    if (projectID != parseInt(projectID, 10) || parseInt(projectID, 10) <= 0) return closeConnection(res)

    let projects = await db.getObjectsWithQuery(
        "SELECT PROJECTS.PK FROM PROJECTS JOIN CLIENTS ON CLIENT_ID = CLIENTS.PK " + `AND PROJECTS.PK = ${db.escape(projectID)} AND CLIENT_ID = ${db.escape(clientID)}`
    )
    if (projects.length != 1) return res.end("ERROR")

    if (!data.m) return res.end("ERROR")

    actions.insertLocalObject({
        table: "PROJECTS_MESSAGES",
        PROJECT_ID: projectID,
        MESSAGE: data.m,
        SENDER: "CL",
        RECIPIENT: "MT",
        IS_PROBLEM: 1
    })

    res.end("OK")
})

// === End of the routes for the API

function getClientIDFromCode(code) {
    if (typeof code != "string") return
    let clientID = 0
    if (utils.md5("TranwiseClientsVersionSecurityCode!" + code.slice(32)) === code.slice(0, 32)) clientID = code.slice(32)
    if (parseInt(clientID, 10) == clientID) return parseInt(clientID, 10)
}

async function getProjectFileWithDetails(clientCode, fileID, securityCode) {
    const clientID = getClientIDFromCode(clientCode)
    if (!clientID) return

    if (!fileID) return
    if (fileID != parseInt(fileID, 10) || parseInt(fileID, 10) <= 0) return

    if (!securityCode) return

    // If the security code doesn't match the one generated on the server, don't send the file.
    // This prevents clients from download other files than those sent to them with the "projects" data.
    if (securityCode != utils.md5(fileID + "TranwiseFileSecuritySalt!")) return

    let projectsFiles = await db.getObjectsWithQuery(
        `SELECT PROJECTS_FILES.* FROM PROJECTS_FILES JOIN PROJECTS ON PROJECT_ID = PROJECTS.PK AND PROJECTS_FILES.PK = ${db.escape(fileID)} AND CLIENT_ID = ${db.escape(clientID)}`
    )
    if (projectsFiles.length != 1) return

    return projectsFiles[0]
}

// Convert a timestamp to a readable date and take into account whether the country is USA (241)
function readableDate(timestamp, format, countryID) {
    let timezone = countryID === 241 ? " EST" : " CET"
    if (!format.includes("H")) timezone = ""
    let date = utils.formatDate(timestamp, format) + timezone
    if (countryID === 241) date = utils.formatDate(timestamp - 6 * 3600, format) + timezone
    return date
}

function closeConnection(res, statusCode) {
    if (!res.headersSent) res.writeHead(statusCode || 404, { Connection: "close" })
    res.end()
}

module.exports = router
