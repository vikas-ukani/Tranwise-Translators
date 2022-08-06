const db = require("../DatabaseManager")
const dbs = require("../DatabaseStructure")
const logger = require("./ValidationLogger")
const utils = require("../Utils")
const store = require("../ServerStore")
const C_ = require("../Constants")
const log = require("../Logger")

function isValidLanguage(languageID) {
    const language = store.language(languageID)
    return language !== undefined
}

function isValidEmployee(employeeID) {
    return employeeID > 0
}

const validator = {}

function fails(condition, message, user, object) {
    if (!condition) {
        logger.logInsert(message, user, object)
        return true // meaning the condition failed
    }
}

// =======
// How to add a specific validation for a table:
// =======
validator.SAMPLE_TABLE = async (user, object) => {
    // First set any needed properties on the object (eg. EMPLOYEE_ID)
    object.EMPLOYEE_ID = user.pk

    // Add synchronous checks (that don't depend on database requests) and return false if the check fails.
    // The condition in the fails() call should be positive (eg. isValid(something)).
    // if ( fails( condition, failureMessage, user, object) ), return false
    if (fails(user.somePositiveConditionThatMustBeMet, "The condition wasn't met!", user, object)) return false

    // If there are no asynchronous checks, then don't do anything else (no need to return anything, the function will return undefined,
    // which means that the validation passed).

    // Add any asynchronous checks using "await" (and make sure to add "async" in the definition if using "await")
    const someObjects = await db.getObjectsWithQuery("SELECT PK FROM TABLE")
    // Do some checks on the objects retrieved from the database
    if (someObjects) {
    }
}

validator.PROJECTS = async (user, object) => {
    object.DATE_RECEIVED = utils.now()
    object.STATUS = C_.psQuote
    object.INITIAL_SOURCE_WORDS = object.SOURCE_WORDS
    if (object.SOURCE_WORDS >= 10000) object.IS_BIG = true

    // Get the next available project number to set it to this project. If we didn't get any number
    // (it could happen very rarely, in case we get this request milliseconds after the server restarted)
    // wait for a while and request it again.
    let projectNumber = store.getNextProjectNumber()
    if (!projectNumber) {
        console.log("Waiting for next project number...")
        await utils.delay(2000)
        projectNumber = store.getNextProjectNumber()
    }

    if (fails(projectNumber, "PROJECTS Could not get next project number", user, object)) return false
    object.PROJECT_NUMBER = `Q-${projectNumber}`
}

validator.SUBPROJECTS = (user, object) => {
    object.parentKey = "PROJECT_ID"
}

validator.CLIENTS = (user, object) => {
    object.CREATION_DATE = utils.now()
    if (!object.ADDRESS) object.ADDRESS = ""
    if (!object.PHONE_NUMBERS) object.PHONE_NUMBERS = ""
}

validator.EMPLOYEES_LANGUAGES = async (user, object) => {
    if (fails(object.SOURCE_LANGUAGE_ID !== object.TARGET_LANGUAGE_ID, `Identical source and target language IDs: ${object.SOURCE_LANGUAGE_ID}`, user, object)) return false

    // Check if the language pair already exists and fail
    const languages = await db.getObjectsWithQuery(
        `SELECT PK FROM EMPLOYEES_LANGUAGES WHERE EMPLOYEE_ID = ${object.EMPLOYEE_ID} AND SOURCE_LANGUAGE_ID = ${object.SOURCE_LANGUAGE_ID} AND TARGET_LANGUAGE_ID = ${object.TARGET_LANGUAGE_ID}`
    )
    if (fails(languages.length === 0, "EMPLOYEE_LANGUAGE already exists", user, object)) return false
}

validator.MB_POSTS = (user, object) => {
    if (fails((object.TEXT || "").trim() != "", "Blank TEXT", user, object)) return false

    object.TEXT = object.TEXT.replace(/<img .+>/gi, "")
    object.DATE = utils.now()
    object.EMPLOYEE_ID = user.pk
    object.parentKey = "MB_THREAD_ID"
}

validator.MB_THREADS = (user, object) => {
    if (fails((object.SUBJECT || "").trim() != "", "Blank SUBJECT", user, object)) return false

    object.DATE = utils.now()
    object.EMPLOYEE_ID = user.pk
}

validator.TIPS = (user, object) => {
    object.DATE = utils.now()
    object.DESCRIPTION = object.DESCRIPTION.replace(/<img .+>/gi, "")
}

validator.TIPS_MANAGERS = (user, object) => {
    object.DATE = utils.now()
    object.DESCRIPTION = object.DESCRIPTION.replace(/<img .+>/gi, "")
}

validator.PROJECTS_FILES = async (user, object) => {
    object.UPLOAD_TIME = utils.now()
    if (!user.isServer) object.EMPLOYEE_ID = user.pk

    if (user.isTranslator) {
        if (fails(typeof object.SUBPROJECT_ID === "number", "Invalid PROJECTS_FILES.SUBPROJECT_ID", user, object)) return false
        if (fails(typeof object.PROJECT_ID === "number", "Invalid PROJECTS_FILES.PROJECT_ID", user, object)) return false

        const project = await db.getObjectWithQuery(`SELECT PK,STATUS FROM PROJECTS WHERE PK = ${object.PROJECT_ID}`)
        if (fails(project, "Invalid project when inserting into PROJECTS_FILES", user, object)) return false

        // Check if the translator is assigned to that project and allowed to upload
        // and also if they are uploading the correct file type (ie. don't upload a proofread file if assigned for translation)
        const assignments =
            (await db.getObjectsWithQuery(
                `SELECT STATUS FROM TRANSLATIONS WHERE EMPLOYEE_ID = ${object.EMPLOYEE_ID} AND SUBPROJECT_ID = ${object.SUBPROJECT_ID} AND STATUS > 0`
            )) || []

        if (fails(assignments.length, "Translator uploading to forbidden project", user, object)) return false

        // Check if trying to upload Reopened file to a project that is not reopened and viceversa
        if ([C_.psReopened, C_.psCompletedAfterReopen].includes(project.STATUS)) {
            if (fails([C_.pfReopenedTranslated, C_.pfReopenedProofread].includes(object.FILE_TYPE), "Forbidden file type for upload", user, object)) return false
        } else {
            if (fails([C_.pfTranslated, C_.pfProofread].includes(object.FILE_TYPE), "Forbidden file type for upload", user, object)) return false
        }

        let canUpload = false
        assignments.forEach(a => {
            if ([C_.tsTranslating, C_.tsUnassignedTranslation].includes(a.STATUS) && [C_.pfTranslated, C_.pfReopenedTranslated].includes(object.FILE_TYPE)) canUpload = true
            if ([C_.tsProofreading, C_.tsUnassignedProofreading].includes(a.STATUS) && [C_.pfProofread, C_.pfReopenedProofread].includes(object.FILE_TYPE)) canUpload = true
        })

        if (fails(canUpload, "Forbidden file type for upload", user, object)) return false
    }
}

validator.PROJECTS_MESSAGES = async (user, object) => {
    object.MESSAGE_TIME = utils.now()
    object.parentKey = "PROJECT_ID"

    if (user.isTranslator) {
        if (object.SENDER != user.pk) {
            log("VALIDATION", `${user.fullName} [${user.pk}] attempted to insert PROJECT_MESSAGE with SENDER = ${object.SENDER} - ${JSON.stringify(object)}`)
            object.SENDER = user.pk
        }

        if (fails(["GM", "DM", "AM", "MT", "CCM", "T2C"].includes(object.RECIPIENT), "Invalid PROJECTS_MESSAGES.RECIPIENT", user, object)) return false

        if (fails(typeof object.SUBPROJECT_ID === "number", "Invalid PROJECTS_MESSAGES.SUBPROJECT_ID", user, object)) return false

        // Check if the PROJECT_ID matches the SUBPROJECT_ID
        const subprojects = await db.getObjectsWithQuery(`SELECT PROJECT_ID FROM SUBPROJECTS WHERE PK = ${object.SUBPROJECT_ID}`)
        if (fails(subprojects[0] && subprojects[0].PROJECT_ID == object.PROJECT_ID, "Subproject-Project mismatch at insert PROJECTS_MESSAGES", user, object)) return false

        // Check if the translator is assigned to that project
        const assignments =
            (await db.getObjectsWithQuery(`SELECT STATUS FROM TRANSLATIONS WHERE EMPLOYEE_ID = ${object.SENDER} AND SUBPROJECT_ID = ${object.SUBPROJECT_ID} AND STATUS > 0`)) || []

        if (fails(assignments.length, "Translator inserting PROJECTS_MESSAGES to forbidden project", user, object)) return false
    }
}

validator.PROJECTS_HISTORY = (user, object) => {
    object.DATE = utils.now()
    object.EMPLOYEE_ID = object.isBySystem ? 0 : user.pk
    if (object.overrideEmployeeID) object.EMPLOYEE_ID = object.overrideEmployeeID
}

validator.PROJECTS_SERVICES = (user, object) => {
    object.SERVICE_DATE = utils.now()
    object.parentKey = "PROJECT_ID"
}

validator.PROJECTS_PAYMENTS = (user, object) => {
    if (!object.DATE) object.DATE = utils.now()
}

validator.EMPLOYEES_MESSAGES = (user, object) => {
    object.MESSAGE_TIME = utils.now()
    object.MESSAGE = object.MESSAGE.replace(/<img .+>/gi, "")

    if (user.isTranslator && object.token != utils.getChatToken(object.TO_ID)) return false

    if (!object.FROM_ID) {
        object.FROM_ID = user.pk
        object.metadata = { FULL_NAME: user.fullName }
    }
}

validator.EMPLOYEES_FILES = (user, object) => {
    if (user.isTranslator && object.token != utils.getChatToken(object.TO_ID)) return false

    object.FROM_ID = user.pk
    object.UPLOAD_TIME = utils.now()
    object.metadata = { FULL_NAME: user.fullName }
}

validator.TRANSLATIONS = async (user, object) => {
    if (!user.isManager && !user.isServer) {
        if (fails(object.EMPLOYEE_ID == user.pk, "Invalid TRANSLATIONS.EMPLOYEE_ID", user, object)) return false
        if (fails([1, 2, 3, 4].includes(object.REPLY), "Invalid TRANSLATIONS.REPLY", user, object)) return false
    }

    // Check if already exists a reply for this subproject and skip
    const assignments = await db.getObjectsWithQuery(`SELECT PK FROM TRANSLATIONS WHERE EMPLOYEE_ID = ${object.EMPLOYEE_ID} AND SUBPROJECT_ID = ${object.SUBPROJECT_ID}`)

    if (assignments.length) return false

    // If the user is a translator, check if they can reply to this project (so they don't reply to projects for which
    // they don't have the language pairs)
    if (!user.isManager) {
        let canReply = false
        let results

        // If the reply includes proofreading, check if the translator has the native language required for proofreading
        if ([C_.trProofreading, C_.trBoth].includes(object.REPLY)) {
            results = await db.getObjectsWithQuery(
                `SELECT EMPLOYEES.PK FROM EMPLOYEES JOIN SUBPROJECTS ON (LANGUAGE_ID = NATIVE_LANGUAGE_1_ID OR LANGUAGE_ID = NATIVE_LANGUAGE_2_ID) AND SUBPROJECTS.PK = ${object.SUBPROJECT_ID} AND EMPLOYEES.PK = ${object.EMPLOYEE_ID}`
            )
            if (fails(results.length, "Translator replied proofreading to inexisting or not allowed project", user, object)) return false
        }

        // Check if the translator has the language pair
        results = await db.getObjectsWithQuery(
            `SELECT EMPLOYEES_LANGUAGES.PK FROM EMPLOYEES_LANGUAGES JOIN SUBPROJECTS ON LANGUAGE_ID = TARGET_LANGUAGE_ID AND SUBPROJECTS.PK = ${object.SUBPROJECT_ID} AND EMPLOYEE_ID = ${object.EMPLOYEE_ID} JOIN PROJECTS ON PROJECT_ID = PROJECTS.PK AND EMPLOYEES_LANGUAGES.SOURCE_LANGUAGE_ID = PROJECTS.SOURCE_LANGUAGE_ID`
        )
        if (results.length) canReply = true

        // If the translator doesn't have the language pair, check if the subproject has ALLOW_PROOFREADERS_SPECIAL
        // and the translator has a matching native language, and the reply is either None or Proofreading Only
        if (!canReply && [C_.trNone, C_.trProofreading].includes(object.REPLY)) {
            results = await db.getObjectsWithQuery(
                `SELECT EMPLOYEES.PK FROM EMPLOYEES JOIN SUBPROJECTS ON (LANGUAGE_ID = NATIVE_LANGUAGE_1_ID OR LANGUAGE_ID = NATIVE_LANGUAGE_2_ID) AND ALLOW_PROOFREADERS_SPECIAL > 0 AND SUBPROJECTS.PK = ${object.SUBPROJECT_ID} AND EMPLOYEES.PK = ${object.EMPLOYEE_ID}`
            )
            if (results.length) canReply = true
        }

        // If canReply is still false, check if the subproject has an intermediate language and if the translator has the pair
        // project.language_id -> subproject.intermediate_language_id
        if (!canReply) {
            results = await db.getObjectsWithQuery(
                `SELECT EMPLOYEES_LANGUAGES.PK FROM EMPLOYEES_LANGUAGES JOIN SUBPROJECTS ON INTERMEDIATE_LANGUAGE_ID = TARGET_LANGUAGE_ID AND SUBPROJECTS.PK = ${object.SUBPROJECT_ID} AND EMPLOYEE_ID = ${object.EMPLOYEE_ID} JOIN PROJECTS ON PROJECT_ID = PROJECTS.PK AND EMPLOYEES_LANGUAGES.SOURCE_LANGUAGE_ID = PROJECTS.SOURCE_LANGUAGE_ID`
            )
            if (results.length) canReply = true
        }

        // If canReply is still false, check if the subproject has an intermediate language and if the translator has the pair
        // subproject.intermediate_language_id -> subproject.language_id
        if (!canReply) {
            results = await db.getObjectsWithQuery(
                `SELECT EMPLOYEES_LANGUAGES.PK FROM EMPLOYEES_LANGUAGES JOIN SUBPROJECTS ON SOURCE_LANGUAGE_ID = INTERMEDIATE_LANGUAGE_ID AND TARGET_LANGUAGE_ID = LANGUAGE_ID AND SUBPROJECTS.PK = ${object.SUBPROJECT_ID} AND EMPLOYEE_ID = ${object.EMPLOYEE_ID}`
            )
            if (results.length) canReply = true
        }

        if (!canReply) return false
    }

    if (user.isManager && [C_.tsTranslating, C_.tsProofreading].includes(object.STATUS)) object.TIME_ASSIGNED = utils.now()
}

validator.INVOICES = (user, object) => {
    // If we didn't get the INVOICE_DATE (we only get it when the server creates monthly invoices), set the date to now
    if (!object.INVOICE_DATE) object.INVOICE_DATE = utils.now()
    // If the invoice was set to paid on creation, set the DATE_PAID
    if (object.STATUS === 1) object.DATE_PAID = utils.now()
}

validator.TWILIO_MESSAGES = (user, object) => {
    object.SENDER_ID = user.pk === "Server" ? 1000000 : user.pk
    if (object.overrideSenderID != undefined) object.SENDER_ID = object.overrideSenderID
    object.MESSAGE_TIME = utils.now()
}

validator.EMPLOYEES_HOLIDAYS = (user, object) => {
    if (user.isServer) return true
    if (fails(user.permissions.holidaysCalendar, "Not allowed to add holidays", user, object)) return false
}

// Performs general validation on an object and returns true if it failed
function failsGeneralValidation(user, object) {
    // --- Check if the object is indeed an Object
    if (fails(object !== null && typeof object === "object", "Object is not an Object", user, object)) return true
    if (fails(typeof user === "object", "User is not an Object", user, object)) return true

    const table = object.table

    // --- Check if the table exists
    if (fails(dbs.tableExists(table), `Invalid table ${table}`, user, object)) return true

    // --- Check if the user is allowed to insert into this table
    if (fails(dbs[table].Insertable || (dbs[table].InsertableByManagers && user.isManager) || user.isServer, `Can't insert into ${table}`, user, object)) return true

    // --- Check if all the children (if any) have the correct table, based on the childrenTable property
    if (Array.isArray(object.children)) {
        for (let child of object.children) {
            if (fails((dbs[table].allowedChildrenTables || "").includes(child.table), `Table ${table} can't have ${child.table} children`, user, object)) return true
            if (fails((dbs[table].allowedChildrenTables || "").includes(child.table), `Table ${table} can't have ${child.table} children`, user, object)) return true
        }
    }

    // --- Check if all the required fields are present

    // Get a list of all required fields and a list of all optional fields
    const requiredFields = []
    const requiredFieldsForManagers = []
    const optionalFields = []
    const optionalFieldsForManagers = []

    // Build the lists
    for (let key in dbs[table]) {
        // key = PK, PROJECT_NUMBER, CLIENT_ID etc.
        const value = dbs[table][key] // value = Int, [Int, Required], [Str, Optional] etc.
        if (Array.isArray(value))
            for (let symbol of value) {
                if (symbol === dbs.symbols.Required) requiredFields.push(key)
                if (symbol === dbs.symbols.RequiredForManagers) requiredFieldsForManagers.push(key)
                if (symbol === dbs.symbols.Optional) optionalFields.push(key)
                if (symbol === dbs.symbols.OptionalForManagers) optionalFieldsForManagers.push(key)
            }
    }

    // Check if any required field is missing
    for (let field of requiredFields) {
        if (fails(object[field] !== undefined, `Missing required field ${field}`, user, object)) return true
    }
    if (user.isManager)
        for (let field of requiredFieldsForManagers) {
            if (fails(object[field] !== undefined, `Missing required field ${field}`, user, object)) return true
        }

    // Check if there are other fields besides the optional and required fields and fail if true
    // and also check the validity of the fields in the same iteration

    for (let key in object) {
        if (!key) {
            log("VALIDATION", `!!! Blank key ${user.pk} ${JSON.stringify(object)}`)
            continue
        }

        // If the key is not in the format of a table field (eg. PK, PROJECT_NUMBER), ignore it.
        // So ignore keys like insertID, parentKey, children etc.
        if (key !== key.toUpperCase()) continue

        if (
            fails(
                requiredFields.includes(key) ||
                    optionalFields.includes(key) ||
                    (user.isManager && requiredFieldsForManagers.includes(key)) ||
                    (user.isManager && optionalFieldsForManagers.includes(key)) ||
                    user.isServer,
                `Forbidden additional key ${key}`,
                user.pk,
                object
            )
        )
            return true

        // Check if the value is valid based on the field's type
        let fieldType = dbs.fieldType(table, key)
        if (!fieldType) {
            log("VALIDATION", `Invalid fieldType for ${table}.${key} - user.pk = ${user.pk} - ${JSON.stringify(object)}`)
            return true
        }

        const fieldTypeDescription = typeof fieldType.description === "function" ? fieldType.description() : table + "." + key
        if (fails(dbs.isFieldValueValid(table, key, object[key]), `Invalid ${fieldTypeDescription} value for key ${key}`, user, object)) return true

        // Check if the value is valid for special field types (Employee, Language, Country)
        if (fieldType === dbs.symbols.Language) {
            if (fails(isValidLanguage(object[key]), `Invalid ${fieldTypeDescription} value ${object[key]} for key ${key}`, user, object)) return true
        }
        if (fieldType === dbs.symbols.Employee) {
            if (fails(isValidEmployee(object[key]), `Invalid ${fieldTypeDescription} value ${object[key]} for key ${key}`, user, object)) return true
        }
    }
}

// Recursively add all the children of an object to an array
function addAllChildrenToArray(childrenArray, object, errors) {
    if (!object || typeof object !== "object" || Array.isArray(object)) {
        errors.error = true
        return
    }
    if (Array.isArray(object.children)) {
        for (let child of object.children) {
            childrenArray.push(child)
            addAllChildrenToArray(childrenArray, child, errors)
        }
    }
}

async function validateInsert(user, object, successCallback, failureCallback) {
    // Create an array with all the objects to be checked (the main object + all its descendants)
    const objectErrors = {}
    const objectsToCheck = [object]
    addAllChildrenToArray(objectsToCheck, object, objectErrors)

    // If the main object or any of its descendants isn't an Object, return
    if (objectErrors.error) {
        logger.logInsert("Object or child is not an Object", user, object)
        if (failureCallback) failureCallback("Object or child is not an Object")
        return
    }

    // --- Perform general validation on all the objects (the main object + all its descendants)
    // based on the information in DatabaseStructure (table exists, users can insert, fields are valid etc.)

    for (let o of objectsToCheck) {
        // If any of the objects failed general validation, invoke the failure callback and return
        if (failsGeneralValidation(user, o)) {
            if (failureCallback) failureCallback("General validation")
            return
        }
    }

    // --- Perform specific validation on all objects, using the validator functions for each table

    // For each object (the main object + all children) ...
    for (let o of objectsToCheck) {
        // Remove all advanced unicode characters
        for (let key in o) {
            if (key === key.toUpperCase() && typeof o[key] === "string") o[key] = o[key].replace(/[\u{10000}-\u{FFFFF}]/gu, "")
        }

        // If there is no validation function for this table, continue
        if (!validator[o.table]) continue

        // Execute the validation function and, if failed (ie. returns false), invoke the failure callback and return
        // to see if the function returned a promise or a boolean
        const validationFunctionResult = await validator[o.table](user, o)
        if (validationFunctionResult === false) {
            if (failureCallback) failureCallback("Specific validation")
            return
        }
    }

    // If we got this far, it means all the general validations were successful
    // and all the specific validation functions that didn't return a promise were successful
    successCallback()
}

module.exports = validateInsert
