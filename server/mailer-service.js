const express = require("express")
const app = express()
const nodemailer = require("nodemailer")
const config = require("./serverConfig.js")
const log = require("./Logger")
const utils = require("./Utils")

const port = 3354

app.use(express.json({ limit: "2mb" }))

const emails = []
const emailsLowPriority = []

const transporter = nodemailer.createTransport(config.smtpMailer)

/*
Add an email to the queue. The email should be a JSON object with the following structure:
{
    from:
    to:
    subject:
    text:
    html:   (optional)
    attachments: [ { path: "path1" }, { path: "path2" }]   (optional)
    lowPriority:   (optional)
}
*/

function logError(errorString) {
    log("MAILER-ERROR", errorString)
    return true
}

app.post("/email", (req, res) => {
    let email = req.body || {}

    let isError = false

    if (!email.from) isError = logError(`Missing 'from' property: From ${email.from} to ${email.to} - Subject: ${email.subject}`)
    if (!email.to) isError = logError(`Missing 'to' property: From ${email.from} to ${email.to} - Subject: ${email.subject}`)
    if (!email.subject) isError = logError(`Blank subject: ${email.from} - ${email.to} - Body: ${utils.replaceReturns(email.text, " ").slice(1, 100)}`)
    if (!email.text) isError = logError(`Blank text: ${email.from} - ${email.to} - Subject: ${email.subject}`)

    if (isError) return res.end()

    email.subject = utils.replaceReturns(email.subject || "", " ")
    if (email.lowPriority) emailsLowPriority.push(email)
    else emails.push(email)

    res.end()
})

app.get("/check", (_req, res) => {
    res.send(`Tranwise Mailer Service OK. Queue: ${emails.length} - Low priority queue: ${emailsLowPriority.length}`)
})

// Send the first email from the queue every 1 second.
// If there is no email to send in the main queue, send the emails from the low priority queue.
setInterval(() => {
    let email = emails.shift()
    if (!email) email = emailsLowPriority.shift()
    if (!email) return

    log("MAILER", `${email.from} - ${email.to} - ${email.subject}`)
    if (!config.isDeployed) return

    transporter.sendMail(email, error => {
        if (error) {
            const uniqueID = utils.getUniqueID()
            log("MAILER-ERROR", `${uniqueID} - ${error}`)
            log("MAILER-ERROR-DETAILS", `${uniqueID} - ${email.from} - ${email.to} - ${email.subject} - ${email.text}`, true)
        }
    })
}, 1000)

// Start the server
app.listen(port, "localhost", () => {
    log("GLOBAL", `> > > Starting Tranwise 3 Mailer Service on port ${port}...`)
}).on("error", error => {
    if (error.code === "EADDRINUSE") {
        // If we get an EADDRINUSE error, it means the mailer-service is already running, so exit.
        log("GLOBAL", "Mailer service already running.")
        setTimeout(() => process.exit(-1), 1000)
    } else {
        log("ERROR", `Mailer service error: ${error}`)
        setTimeout(() => process.exit(-1), 1000)
    }
})
