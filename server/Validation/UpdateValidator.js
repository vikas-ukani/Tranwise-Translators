const logger = require("./ValidationLogger")
const dbs = require("../DatabaseStructure")

const validator = {}

validator.EMPLOYEES = (user, pk, table, field, value) => {
    if (field === "EMPLOYEE_TYPE" && value === 2) {
        if (fails(user.permissions.createManagers, "Not allowed to create managers", `pk = ${pk}`, user)) return false
    }
}

validator.TIPS_MANAGERS = (user, pk, table, field, value) => {
    if (field === "DESCRIPTION") {
        return { updatedValue: value.replace(/<img .+>/gi, "") }
    }
}

validator.TIPS = (user, pk, table, field, value) => {
    if (field === "DESCRIPTION") {
        return { updatedValue: value.replace(/<img .+>/gi, "") }
    }
}

function fails(condition, message, requestString, user, failureCallback) {
    if (!condition) {
        logger.logUpdate(message + " : " + requestString, user)
        if (failureCallback) failureCallback(message)
        return true // meaning the condition wasn't met
    }
}

async function validateUpdate(user, pk, table, field, value, successCallback, failureCallback) {
    const requestString = `pk = ${pk}, table = ${table}, field = ${field}, value = "${value}"`

    // --- Check if the pk is a valid number, and that the table and the field exist
    if (fails(Number.isSafeInteger(pk) && pk > 0, "Invalid pk", requestString, user, failureCallback)) return
    if (fails(dbs.tableExists(table), "Invalid table", requestString, user, failureCallback)) return
    if (fails(dbs.fieldExists(table, field), "Invalid field", requestString, user, failureCallback)) return

    // --- Check if the user is allowed to edit the field
    let isFieldEditable = false

    // Get the information about the field from the DatabaseStructure
    const dbField = dbs[table][field]

    // If the information is an array (eg. [Int, Editable]), look for editable symbols
    if (Array.isArray(dbField)) {
        for (let symbol of dbField) {
            if (symbol === dbs.symbols.Editable) isFieldEditable = true
            if (symbol === dbs.symbols.EditableByManagers && user.isManager) isFieldEditable = true
            if (symbol === dbs.symbols.EditableBySelf && user.pk === pk) isFieldEditable = true
        }

        // If the field is marked as protected, check if the user has the permissions to edit the field
        if (dbField.includes(dbs.symbols.Protected) && !user.isServer) {
            // If the user doesn't have the permission to update, fail - so that the failure is forwarded to the guardian - and return
            if (!user.permissions.fields.includes(`${table}.${field}`)) {
                fails(false, "Trying to edit protected field", requestString, user, failureCallback)
                return
            }
        }
    } // If the information is not an array, it must be a symbol of the data type (eg. PK: Int), therefore not editable

    if (fails(isFieldEditable || user.isServer, "Not editable field", requestString, user, failureCallback)) return

    // --- Check if the value is valid based on the field's type
    let fieldType = dbs.fieldType(table, field)

    const fieldTypeDescription = typeof fieldType.description === "function" ? fieldType.description() : table + "." + field
    if (fails(dbs.isFieldValueValid(table, field, value), `Invalid ${fieldTypeDescription} value`, requestString, user, failureCallback)) return

    // --- Perform specific validation, using the validator functions for each table
    if (validator[table]) {
        const validationResult = await validator[table](user, pk, table, field, value)
        if (validationResult === false) return

        // If the validation returned an object with a property named "updatedField".
        // it means the validator had to update the field
        if (validationResult && validationResult.updatedValue) value = validationResult.updatedValue
    }

    if (typeof value === "string") value = value.replace(/[\u{10000}-\u{FFFFF}]/gu, "")

    let failureReason

    if (failureReason) {
        logger.logUpdate(`${failureReason} ${pk} ${table} ${field} ${value}`, user)
        failureCallback(failureReason)
    } else successCallback(pk, table, field, value)
}

module.exports = validateUpdate
