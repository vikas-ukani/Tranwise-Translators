const logger = require("./ValidationLogger")
const dbs = require("../DatabaseStructure")
const db = require("../DatabaseManager")

const validator = {}

validator.EMPLOYEES_MESSAGES = async (user, pk) => {
    const message = await db.getObjectWithQuery(`SELECT TO_ID FROM EMPLOYEES_MESSAGES WHERE PK = ${pk}`)
    if (!message) return false
    if (fails(message.TO_ID === user.pk, "Forbidden delete from EMPLOYEES_MESSAGES", `pk = ${pk}`, user)) return false
}

validator.EMPLOYEES_FILES = async (user, pk) => {
    const file = await db.getObjectWithQuery(`SELECT TO_ID FROM EMPLOYEES_FILES WHERE PK = ${pk}`)
    if (!file) return false
    if (fails(file.TO_ID === user.pk, "Forbidden delete from EMPLOYEES_FILES", `pk = ${pk}`, user)) return false
}

function fails(condition, message, requestString, user, failureCallback) {
    if (!condition) {
        logger.logDelete(message + " : " + requestString, user)
        if (failureCallback) failureCallback(message)
        return true // meaning the condition wasn't met
    }
}

async function validateDelete(user, pk, table, successCallback, failureCallback) {
    let pkValue = pk
    // Add quotes (ie. "1") around the pk if the value is a string, to make it clear in the logs why the pk is invalid
    if (typeof pk === "string") pkValue = `"${pk}"`
    const requestString = `pk = ${pkValue}, table = ${table}`

    // --- Check if the pk is a valid number and that the table exists
    if (fails(Number.isSafeInteger(pk) && pk > 0, "Invalid pk", requestString, user, failureCallback)) return
    if (fails(dbs.tableExists(table), "Invalid table", requestString, user, failureCallback)) return

    // --- Check if the user is allowed to delete from this table
    if (fails(dbs[table].Deletable || (dbs[table].DeletableByManagers && user.isManager) || user.isServer, "Can't delete from table", requestString, user, failureCallback)) return

    // --- Perform specific validation on all objects, using the validator functions for each table

    // Execute the validation function and check the result type below
    // to see if the function returned a promise or a boolean

    // --- Perform specific validation, using the validator functions for each table
    if (validator[table]) {
        const validationResult = await validator[table](user, pk)
        if (validationResult === false) return
    }

    // --- Do some more tests
    let failureReason

    if (failureReason) {
        logger.logDelete(failureReason + " : " + requestString, user)
        failureCallback(failureReason)
    } else successCallback()
}

module.exports = validateDelete
