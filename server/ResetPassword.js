const express = require("express")
const router = express.Router()
const db = require("./DatabaseManager")
const utils = require("./Utils")
const fs = require("fs")
const path = require("path")
const config = require("./serverConfig.js")
const mailer = require("./Mailer")

function sendStaticFile(res, fileName) {
    const filePath = path.resolve(config.staticFolderPath, fileName)
    fs.access(filePath, fs.F_OK, err => {
        if (err) {
            console.error(err)
            res.send("Server error.")
        } else res.sendFile(filePath)
    })
}

router.get("/", (req, res) => {
    // If accessing the link with no parameters, show the reset page
    if (req.url === "/") return sendStaticFile(res, "requestResetPassword.html")

    const token = req.url.replace("/?", "")

    if (typeof token != "string" || token.length != 32 || token.replace(/[0-9a-f]/g, "") != "") {
        res.send("The link is invalid.")
        return
    }

    db.getObjectWithQuery(`SELECT * FROM PASSWORD_RESET_TOKENS WHERE TOKEN = ${db.escape(token)}`).then(data => {
        if (!data) return res.send("The link is invalid.")
        if (data.WAS_USED) return res.send("The link is not valid anymore.")
        if (utils.now() - data.DATE > 7200) return res.send("The link is not valid anymore.")

        sendStaticFile(res, "resetPassword.html")
    })
})

router.post("/Request", (req, res) => {
    if (!req.body || typeof req.body.email != "string") return res.send("There was with your request. Please try again.")

    if (!utils.isValidEmail(req.body.email)) return res.end("Please fill in a valid email address.")

    db.getObjectWithQuery(
        `SELECT PK, EMAIL, USERNAME FROM EMPLOYEES WHERE EMPLOYEE_TYPE IN (0, 1) AND LOWER(EMAIL) = ${db.escape(
            req.body.email.toLowerCase()
        )} ORDER BY EMPLOYEE_TYPE DESC, ACCEPTED_CONFIDENTIALITY_AGREEMENT DESC, PK DESC`
    ).then(data => {
        // Send a success message even if we didn't find an account with this email address, so that attackers
        // wouldn't know if we found an email or not.
        if (!data) {
            res.send("SUCCESS")
            return
        }

        const token = utils.getUniqueID()
        const resetLink = {
            table: "PASSWORD_RESET_TOKENS",
            EMPLOYEE_ID: data.PK,
            DATE: utils.now(),
            TOKEN: token
        }

        db.insertObject(
            resetLink,
            () => {
                const message = `Dear translator,\n\nYour username is: ${data.USERNAME}\n\nPlease use the link below to reset your password:\n\nhttps://translators.tranwise.com/ResetPassword?${token}\n\nThis link expires in 2 hours.\n\nThank you!\nUniversal Translation Services`
                mailer.sendEmail("recruitment@universal-translation-services.com", data.EMAIL, "Tranwise Password Reset", message)
                res.send("SUCCESS")
            },
            () => res.send("There was an error with your request. Please try again.")
        )
    })
})

router.post("/", (req, res) => {
    if (!req.body || typeof req.body.password != "string" || typeof req.body.token != "string")
        return res.send("There was an error resetting your password with this link. Please request another link.")

    const password = req.body.password
    if (password.length < 8 || password.length > 64) return res.send("Please select a password between 8 and 64 characters.")

    db.getObjectWithQuery(`SELECT * FROM PASSWORD_RESET_TOKENS WHERE WAS_USED = 0 AND TOKEN = ${db.escape(req.body.token)}`).then(data => {
        if (!data) return res.send("The reset link is invalid. Please request another link.")

        db.updateObject(data.PK, "PASSWORD_RESET_TOKENS", "WAS_USED", "1")

        res.end("SUCCESS")

        const firstHash = utils.md5(password + "2147483648")
        const secondHash = utils.md5(firstHash + "TranwisePasswordDoubleHashSalt-$*")
        db.updateObject(data.EMPLOYEE_ID, "EMPLOYEES", "PASSWORD_HASH", secondHash)
    })
})

module.exports = router
