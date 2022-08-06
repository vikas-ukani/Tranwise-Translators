const log = require("../Logger")

function logInsert(message, user, object) {
    const objectToLog = typeof object === "object" ? JSON.stringify(object) : object
    log("VALIDATION", `I: ${object ? object.table : "object is undefined"} : ${message}, user = ${user.pk} - ${user.fullName}, object = ${objectToLog}`)
}

function logUpdate(message, user) {
    log("VALIDATION", `U: ${message}, user = ${user.pk} - ${user.fullName}`)
}

function logDelete(message, user) {
    log("VALIDATION", `D: ${message}, user = ${user.pk} - ${user.fullName}`)
}

module.exports = { logInsert, logUpdate, logDelete }
