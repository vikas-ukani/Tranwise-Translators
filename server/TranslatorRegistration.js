const express = require("express")
const router = express.Router()
const db = require("./DatabaseManager")
const fs = require("fs")
const path = require("path")
const config = require("./serverConfig.js")
const actions = require("./ServerActions")
const utils = require("./Utils")

// Count the number of registrations for each IP and don't allow more than a certain number of registrations from the same IP
const registrationsByIP = {}

router.use("/Resume", require("./PendingTranslatorUploadResume"))

router.get("/", (req, res) => {
    const filePath = path.resolve(config.staticFolderPath, "register.html")
    let fileContents = fs.readFileSync(filePath, "utf8")
    // eslint-disable-next-line quotes
    fileContents = fileContents.replace('"LANGUAGES_DATA"', JSON.stringify(Object.values(actions.languages)))
    res.send(fileContents)
})

router.post("/", async (req, res) => {
    if (!req.body) return res.end("There was an error with your registration. Please try again.")

    if (registrationsByIP[req.ip] > 20) return res.end("There was an error with your registration. Please try again.")

    const data = req.body

    const expectedFields = {
        username: "string",
        password: "string",
        firstName: "string",
        lastName: "string",
        email: "string",
        nativeLanguage1: "number",
        nativeLanguage2: "number",
        isPhoneInterpreter: "number",
        isVideoInterpreter: "number",
        otherTranslationAreas: "string",
        resumeFileName: "string",
        resumeFileID: "string"
    }

    for (let [field, type] of Object.entries(expectedFields)) {
        if (typeof data[field] != type) return res.end("There was an error with your registration. Please try again.")
    }

    if (!data.username.trim() || !data.password.trim() || !data.firstName.trim() || !data.lastName.trim() || !data.email.trim())
        return res.end("There was an error with your registration. Please try again.")

    if (!/^[0-9a-zA-Z._@-]{0,50}$/.test(data.username)) return res.end("There was an error with your registration. Please try again.")

    if (!actions.languages[data.nativeLanguage1]) return res.end("There was an error with your registration. Please try again.")

    if (data.nativeLanguage2 && !actions.languages[data.nativeLanguage2]) return res.end("There was an error with your registration. Please try again.")

    if (![0, 1].includes(data.isPhoneInterpreter)) return res.end("There was an error with your registration. Please try again.")
    if (![0, 1].includes(data.isVideoInterpreter)) return res.end("There was an error with your registration. Please try again.")

    if (data.resumeFileID) {
        if (!/^[0-9a-zA-Z]{24}$/.test(data.resumeFileID)) return res.end("There was an error with your registration. Please try again.")
    }

    if (!Array.isArray(data.translationAreas)) return res.end("There was an error with your registration. Please try again.")
    for (let area of data.translationAreas) if (typeof area != "number") return res.end("There was an error with your registration. Please try again.")

    if (!Array.isArray(data.languagePairs)) return res.end("There was an error with your registration. Please try again.")
    for (let pair of data.languagePairs) {
        if (typeof pair != "object") return res.end("There was an error with your registration. Please try again.")
        if (typeof pair.from != "number" || typeof pair.to != "number") return res.end("There was an error with your registration. Please try again.")
    }

    const existingUsernames = await db.getObjectsWithQuery(`SELECT PK FROM EMPLOYEES WHERE USERNAME = ${db.escape(data.username)}`)
    if (existingUsernames.length) return res.end("This username is already taken. Please choose another username.")

    let translationAreas = ""
    for (let i = 1; i <= 8; i++) translationAreas += data.translationAreas.includes(i) ? "1" : "0"

    data.firstName = data.firstName.replace(/[\n\r\t]/g, " ")
    data.lastName = data.lastName.replace(/[\n\r\t]/g, " ")
    data.email = data.email.replace(/[\n\r\t]/g, " ")
    data.resumeFileName = data.resumeFileName.replace(/[<>:"/\\|?*\n\r\t]/g, "")

    // Compute the password hash
    const firstHash = utils.md5(data.password.trim().slice(0, 50) + "2147483648")
    const secondHash = utils.md5(firstHash + "TranwisePasswordDoubleHashSalt-$*")

    const newEmployee = {
        table: "EMPLOYEES",
        EMPLOYEE_TYPE: 0, // C_.etPending
        USERNAME: data.username.trim().slice(0, 50),
        PASSWORD_HASH: secondHash,
        FIRST_NAME: data.firstName.trim().slice(0, 50),
        LAST_NAME: data.lastName.trim().slice(0, 50),
        EMAIL: data.email.trim().slice(0, 90),
        NATIVE_LANGUAGE_1_ID: data.nativeLanguage1,
        NATIVE_LANGUAGE_2_ID: data.nativeLanguage2,
        IS_PHONE_INTERPRETER: data.isPhoneInterpreter,
        IS_VIDEO_INTERPRETER: data.isVideoInterpreter,
        RATE_TRANSLATION: parseFloat(actions.settings("DEFAULT_RATE_TRANSLATION")) || 0.03,
        RATE_PROOFREADING: parseFloat(actions.settings("DEFAULT_RATE_PROOFREADING")) || 0.005,
        TRANSLATION_AREAS: translationAreas,
        TRANSLATION_AREAS_OTHER: data.otherTranslationAreas,
        RESUME_FILE_NAME: data.resumeFileName
    }

    let hasResumeFile = false
    if (data.resumeFileID) {
        try {
            if (fs.existsSync(config.storeFolder + "Files/TEMP/Resume_" + data.resumeFileID)) hasResumeFile = true
        } catch (err) {}
    }

    // Insert the employee
    db.insertObject(
        newEmployee,
        insertedEmployee => {
            // Insert the language pairs
            // Insert only the first 20 language pairs in the list (in case the translators tries to abuse the system
            // and add a ton of language pairs).
            for (let pair of data.languagePairs.slice(0, 20)) {
                if (!actions.languages[pair.from] || !actions.languages[pair.to]) continue
                const languagePair = {
                    table: "EMPLOYEES_LANGUAGES",
                    EMPLOYEE_ID: insertedEmployee.PK,
                    SOURCE_LANGUAGE_ID: pair.from,
                    TARGET_LANGUAGE_ID: pair.to
                }
                db.insertObject(languagePair)
            }

            // Move the Resume file from the temp location to the final location based on the employee's PK
            if (data.resumeFileID && data.resumeFileName && hasResumeFile) {
                const tempLocation = config.storeFolder + "Files/TEMP/Resume_" + data.resumeFileID
                const finalLocation = config.storeFolder + "Files/06_EMPLOYEES_RESUMES/" + ("00000000" + insertedEmployee.PK).slice(-8) + "_" + data.resumeFileName
                fs.rename(tempLocation, finalLocation, err => {
                    if (err) console.log("Registration Resume move ERROR: " + JSON.stringify(err))
                })
            }

            res.send("SUCCESS")

            registrationsByIP[req.ip] = registrationsByIP[req.ip] ? registrationsByIP[req.ip] + 1 : 1
            actions.processTranslatorRegistration(insertedEmployee)
        },
        () => {
            res.end("There was an error with your registration. Please try again.")
        }
    )
})

module.exports = router
