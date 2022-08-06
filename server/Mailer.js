const log = require("./Logger")
const request = require("request")
const utils = require("./Utils")

function sendRequestToMailerService(email) {
    request.post("http://localhost:3354/email", { json: email }, error => {
        if (!error) return
        if (`${error}`.includes("ECONNREFUSED")) log("ERROR", "Mailer service not running or port 3354.")
        else log("ERROR", "Mailer error: " + error)
    })
}

function sendEmail(from, to, subject, text, attachments, options = {}) {
    const email = { from, to, subject, text }
    if (attachments) {
        email.attachments = []
        attachments.split(",").forEach(path => email.attachments.push({ path }))
    }
    if (options.lowPriority) email.lowPriority = true
    if (options.cc && utils.isValidEmail(options.cc)) email.cc = options.cc
    if (options.bcc && utils.isValidEmail(options.bcc)) email.bcc = options.bcc
    sendRequestToMailerService(email)
}

function sendHTMLEmail(from, to, subject, text, html, attachments, options = {}) {
    const email = { from, to, subject, text, html }
    if (attachments) {
        email.attachments = []
        attachments.split(",").forEach(path => email.attachments.push({ path }))
    }
    if (options.lowPriority) email.lowPriority = true
    if (options.cc && utils.isValidEmail(options.cc)) email.cc = options.cc
    if (options.bcc && utils.isValidEmail(options.bcc)) email.bcc = options.bcc
    sendRequestToMailerService(email)
}

module.exports = {
    sendEmail,
    sendHTMLEmail
}
