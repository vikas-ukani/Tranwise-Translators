const express = require("express")
const helmet = require("helmet")
const compression = require("compression")
const app = express()
const axios = require("axios")
const { spawn } = require("child_process")
const uploadManager = require("./UploadManager")
const downloadManager = require("./DownloadManager")
const socketManager = require("./SocketManager")
const log = require("./Logger")
const clientErrorManager = require("./ServerClientErrorManager")
const actions = require("./ServerActions")
const config = require("./serverConfig.js")
const guardian = require("./Guardian")
const fs = require("fs")
const API = require("./API.js")
const loginManager = require("./LoginManager")
const timedActions = require("./TimedActions")

// Start the server for the clients' portal
require("./ClientsAPI")

API.setProcessor(actions)

/*
The server works like this:

- server.js contains the io server. For each incoming io connection, upon successful login,
  a User is created and added to the "users" array

- The User gets incoming messages and processes them via MessageProcessor, called with this = user

- The MessageProcessor processes the message, then calls the respective method in ServerActions,
  and then calls user.forwardMessage (which forwards it to all other users interested in the message)

- When ServerActions has to generate a new message, it does so by invoking this.processMessage(message data),
  since this is bound to the user

*/

let server

if (config.useHTTPS) {
    const serverOptions = {
        key: fs.readFileSync(config.certificatesPath + "translators.tranwise.com-key.pem"),
        cert: fs.readFileSync(config.certificatesPath + "translators.tranwise.com-chain.pem"),
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
app.use(require("cookie-parser")())

app.set("trust proxy", true)

// Use different static folders for Managers and Translators
app.use("/static-a602d66123a4c4556b1fc42c4e73acf9", express.static(config.deployPath + "/Managers/static-a602d66123a4c4556b1fc42c4e73acf9", { maxage: "24h" }))
app.use("/static-bf564b3bd0c34ba3b2e29e22a3518b09", express.static(config.deployPath + "/Translators/static-bf564b3bd0c34ba3b2e29e22a3518b09", { maxage: "24h" }))
app.use("/staticPreview", express.static(config.deployPath + "/ManagersPreview/staticPreview", { maxage: "24h" }))
app.use("/staticPreviewTranslators", express.static(config.deployPath + "/TranslatorsPreview/staticPreviewTranslators", { maxage: "24h" }))

if (!config.isDeployed) {
    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*")
        res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With")
        next()
    })
}

app.use((req, res, next) => {
    const ip = req.ip.replace("::ffff:", "")
    if (guardian.isIPBanned(ip)) return res.end()
    next()
})

app.use("/dofi", downloadManager)
app.use("/upfi", uploadManager)
app.use("/Register", require("./TranslatorRegistration"))
app.use("/ResetPassword", require("./ResetPassword"))

// In order to access /management/ routes, you need to add the following cookie for https://translators.tranwise.com
// Name: tranwiseManagement     Value: tranwiseManagement
app.use("/management/*", (req, res, next) => {
    if (req.cookies && req.cookies.tranwiseManagement === "tranwiseManagementSrvr") next()
    else res.end()
})

// app.get("/management/showBans", (req, res) => res.send(guardian.getBans()))
// app.get("/management/unbanAllUsers", (req, res) => res.send(guardian.unbanUser("All") || "OK"))
// app.get("/management/unbanAllIPs", (req, res) => res.send(guardian.unbanIP("All") || "OK"))
// app.get("/management/viewClientErrors", (req, res) => res.json(clientErrorManager.getErrors()))
// app.get("/management/usersList", (req, res) => res.json(socketManager.getUsers()))
// app.get("/management/disconnectToken/*", (req, res) => res.send(socketManager.disconnectToken(req.path.replace("/management/disconnectToken/", "")) || "OK"))
// app.get("/management/disconnectAllTranslators", (req, res) => res.send(socketManager.disconnectAllTranslators() || "OK"))
// app.get("/management/disconnectAll", (req, res) => res.send(socketManager.disconnectAll() || "OK"))
// app.get("/management/testAction", (req, res) => res.send(actions.testAction() || "OK TEST ACTION"))
// app.get("/management/logSize", (req, res) => res.send(socketManager.logSize() || "OK"))
app.get("/management/reloadEmailTemplates", (req, res) => res.send(actions.reloadEmailTemplates()))
app.get("/management/reloadDivisions", (req, res) => res.send(actions.reloadDivisions()))
app.get("/management/reloadLanguages", (req, res) => res.send(actions.reloadLanguages()))
app.get("/management/reloadSettings", (req, res) => res.send(actions.reloadSettings()))
app.get("/management/sendOverdueInvoicesReminders", (req, res) => {
    // eslint-disable-next-line quotes
    const text = `<form action="/management/sendOverdueInvoicesReminders" method="POST"><input type="text" placeholder="Year to start" name="year"><br><br><button type="submit">Send overdue invoice reminders</button></form>`
    res.send(text)
})
app.post("/management/sendOverdueInvoicesReminders", (req, res) => {
    const data = req.body
    if (typeof data.year != "string" || data.year < 2010) return res.end("Wrong year.")
    actions.sendOverdueInvoicesReminders(data.year, output => res.end(output))
})

app.get("/ManagerEdition", (req, res) => res.sendFile(config.loginPageManagersPath))
app.get("/ManagerEditionPreview", (req, res) => res.sendFile(config.loginPageManagersPreviewPath))
app.get("/TranslatorsPreview", (req, res) => res.sendFile(config.loginPageTranslatorsPreviewPath))
app.get("/migrate", (req, res) => res.sendFile(config.translatorsMigratePath))
app.get("/", (req, res) => res.sendFile(config.loginPageTranslatorsPath))

loginManager.setSocketManager(socketManager)
app.use(loginManager)

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

process.on("uncaughtException", err => console.error(err))

actions.setSocketManager(socketManager)
downloadManager.socketManager = socketManager

const inTestMode = process.argv[2] === "test"
timedActions.inTestMode = inTestMode

if (inTestMode) {
    server.listen(3383, () => console.log("Started server in test mode on port 3383..."))
} else {
    // Try to access the session server
    axios
        .get("http://localhost:3353/check")
        .then(response => {
            if (response.data && !response.data.endsWith("OK")) log("GLOBAL", response.data)
            // If we got a response, start the main server right away
            socketManager.initIOServer(server)
        })
        .catch(error => {
            // In case of an ECONNREFUSED error (meaning that the server is not running), start it as a separate process (below)
            // and then start the main server with a short delay, to make sure the session server is up and running
            if (error.code === "ECONNREFUSED") {
                log("GLOBAL", "Starting session server ...", true)
                // Start the server-session server as a separate process, so it doesn't quit if the server restarts
                spawn("node", [__dirname + "/server-session.js"], { detached: true })
                setTimeout(() => socketManager.initIOServer(server), 500)
            } else log("ERROR", "Error when connecting to session server: " + JSON.stringify(error))
        })

    // Start the mailer service
    spawn("node", [__dirname + "/mailer-service.js"], { detached: true })
}
