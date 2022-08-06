const express = require("express")
const router = express.Router()
const fs = require("fs")
const db = require("./DatabaseManager")
const utils = require("./Utils")
const config = require("./serverConfig.js")
const C_ = require("./Constants")
const log = require("./Logger")
const mailer = require("./Mailer")
const guardian = require("./Guardian")

// This dummy user is used to forward the messages generated here
const localUser = { isServer: true, pk: "Server" }

let socketManager
router.setSocketManager = sm => {
    socketManager = sm
    localUser.forwardMessage = socketManager.getMessageForwarderFunction()
}

// Stores a list of all the IP addresses that had failed login attempts, so that we can temporarily ban if needed
const failedLoginAttempts = {}

// Login for managers
router.post(["/ManagerEdition", "/ManagerEditionPreview"], (req, res) => {
    let pathToServe = config.deployPath + "/Managers/index.html"
    if (req.originalUrl === "/ManagerEditionPreview") pathToServe = config.deployPath + "/ManagersPreview/index.html"

    let data = req.body

    // If the POST data contains a token (t), check if it's valid and
    // If the token is valid, send the contents of the "index.html" file, otherwise end the connection

    if (typeof data.t === "string" && data.t.length === 28) {
        if (socketManager.loginTokens[data.t]) res.sendFile(pathToServe)
        else res.end()
        return
    }

    // If the POST data doesn't contain "username" and "password"
    if (typeof data.username != "string" || typeof data.password != "string" || data.username.length > 100 || data.password.length > 100) return res.end()

    // If we got this far, it means we have received a login attempt (username and password),
    // so try to login and send a login token

    let didTimeout = true

    db.getLogin(C_.etManager, data.username, employee => {
        didTimeout = false

        let passwordOK = true
        if (employee) if (utils.md5(data.password + "TranwisePasswordDoubleHashSalt-$*") === employee.PASSWORD_HASH) passwordOK = true

        const ip = req.ip.replace("::ffff:", "")

        // If a matching user was found and the provided password matches the one in the database, send the login token
        if (employee && passwordOK) {
            // Send an email to the General Manager if the user logged in from a different IP and store the new IP in the database (except for Alex and Anita)
            if (ip != employee.LAST_IP && ![237, 238].includes(employee.PK)) {
                const text = `Tranwise: Project manager ${employee.FIRST_NAME} ${employee.LAST_NAME} connected in Tranwise 3 from IP ${ip} (last one was: ${employee.LAST_IP})`
                if (employee.LAST_IP != "") mailer.sendEmail("info@tranwise.com", "anita@wapatranslations.com", text, text)

                db.updateObject(employee.PK, "EMPLOYEES", "LAST_IP", ip)
            }

            db.updateObject(employee.PK, "EMPLOYEES", "LAST_LOGIN_TIME", utils.now())
            localUser.forwardMessage("UPDATE_OBJECT", employee.PK, "EMPLOYEES", "LAST_LOGIN_TIME", utils.now(), employee)

            // Warning! If you change the loginToken generation mechanism, make sure to update the check for data.t.length above
            const loginToken = utils.getUniqueID().slice(1, 16) + new Date().getTime()
            socketManager.loginTokens[loginToken] = employee
            res.send(loginToken)
        } else {
            // Otherwise send a failed message
            log("SECURITY", `Invalid login attempt: ${data.username} / ${data.password}`)
            res.send("FAILED")
            processFailedAttempt(ip)
        }
    })

    setTimeout(() => didTimeout && res.end(), 10000)
})

// Login for translators
router.post(["/", "/TranslatorsPreview"], (req, res) => {
    let pathToServe = config.deployPath + "/Translators/index.html"
    if (req.originalUrl === "/TranslatorsPreview") pathToServe = config.deployPath + "/TranslatorsPreview/index.html"

    let data = req.body

    // If the POST data contains a token (t), check if it's valid and
    // If the token is valid, send the contents of the "index.html" file, otherwise end the connection
    if (typeof data.t === "string" && data.t.length === 28) {
        if (socketManager.loginTokens[data.t]) res.sendFile(pathToServe)
        else res.end()
        return
    }

    // If the POST data doesn't contain "username" and "password"
    if (typeof data.username != "string" || typeof data.password != "string" || data.username.length > 100 || data.password.length > 100) return res.end()

    // If we got this far, it means we have received a login attempt (username and password),
    // so try to login and send a login token

    let didTimeout = true

    db.getLogin(C_.etTranslator + "," + C_.etPending + "," + C_.etDisabled, data.username, employee => {
        didTimeout = false

        let passwordOK = true
        if (employee) if (utils.md5(data.password + "TranwisePasswordDoubleHashSalt-$*") === employee.PASSWORD_HASH) passwordOK = true

        const ip = req.ip.replace("::ffff:", "")

        // If a matching user was found and the provided password matches the one in the database, send the login token
        // (but check first if the employee accepted the confidentiality agreement and send that instead if needed)
        if (employee && passwordOK && !guardian.isUserBanned(employee.PK)) {
            // Warning! If you change the loginToken generation mechanism, make sure to update the check for data.t.length above
            const loginToken = utils.getUniqueID().slice(1, 16) + new Date().getTime()
            socketManager.loginTokens[loginToken] = employee
            if (employee.EMPLOYEE_TYPE === C_.etDisabled) {
                res.send("DISABLED")
            } else if (employee.EMPLOYEE_TYPE === C_.etPending) {
                res.send("PENDING")
            } else if (!employee.ACCEPTED_CONFIDENTIALITY_AGREEMENT) {
                employee.pendingAgreement = true
                const translatorsAgreementFile = fs.readFileSync(config.translatorsAgreementPath, "utf8")
                res.send({ agreement: translatorsAgreementFile.replace(/THE TRANSLATOR/g, employee.FIRST_NAME + " " + employee.LAST_NAME).replace("LOGIN_TOKEN", loginToken) })
            } else {
                res.send(loginToken)
                if (ip != employee.LAST_IP) db.updateObject(employee.PK, "EMPLOYEES", "LAST_IP", ip)
                db.updateObject(employee.PK, "EMPLOYEES", "LAST_LOGIN_TIME", utils.now())
                localUser.forwardMessage("UPDATE_OBJECT", employee.PK, "EMPLOYEES", "LAST_LOGIN_TIME", utils.now(), employee)
            }
        } else {
            // Otherwise send a failed message
            res.send(employee && guardian.isUserBanned(employee.PK) ? "SUSPENDED" : "FAILED")
            processFailedAttempt(ip)
        }
    })

    setTimeout(() => didTimeout && res.end(), 10000)
})

// The translator will post here when accepting the agreement
router.post("/TranslatorsAgreement", (req, res) => {
    let data = req.body
    if (!data.t) return res.end()

    const employee = socketManager.loginTokens[data.t]
    if (employee && employee.pendingAgreement) {
        db.updateObject(employee.PK, "EMPLOYEES", "ACCEPTED_CONFIDENTIALITY_AGREEMENT", true)
        res.sendFile(config.deployPath + "/Translators/index.html")
    } else res.end()
})

function processFailedAttempt(ip) {
    // Increase the failure count for this IP address
    failedLoginAttempts[ip] = (failedLoginAttempts[ip] || 0) + 1

    // If we got more than 20 failed attempts from this IP, temporarily ban the IP
    // (ie. ban it, set a timer to unban it after 5 minutes and decrease the login attempts to allow 10 more attempts until banning again)
    if (failedLoginAttempts[ip] > 20) {
        guardian.banIP(ip)
        failedLoginAttempts[ip] -= 10
        setTimeout(() => guardian.unbanIP(ip), 5 * 60 * 1000)
    }
}

module.exports = router
