const db = require("./DatabaseManager")
const C_ = require("./Constants")
const utils = require("./Utils")

function forward(messageType, ...args) {
    // "this" is bound to an object containing the users list from the server

    // Forward UPDATE_OBJECT messages
    if (messageType === "UPDATE_OBJECT") {
        let pk = args[0]
        let table = args[1]
        let field = args[2]
        let value = args[3]
        let existingObject = args[4] // This is the object before the update, as loaded from the database (with the old value)

        forwardUpdate(this.users, pk, table, field, value, existingObject)
    }

    // Forward INSERT_OBJECT messages
    if (messageType === "INSERT_OBJECT") {
        let insertedObject = args[0]
        forwardInsert(this.users, insertedObject)
    }

    // Forward DELETE_OBJECT messages
    if (messageType === "DELETE_OBJECT") {
        let pk = args[0]
        let table = args[1]

        forwardDelete(this.users, pk, table)
    }

    // Forward CHAT messages
    if (messageType === "CHAT") {
        const message = args[0]
        if (!message) return
        if (!message.recipientID) return

        for (let key in this.users) {
            const user = this.users[key]
            if (user.pk === message.recipientID) user.sendMessage("CHAT", message)
        }
    }

    // Forward NEW_PROJECT messages to translators. These messages are generated in ServerActions
    if (messageType === "NEW_PROJECT") {
        const projectData = args[0]
        if (!projectData) return

        for (let key in this.users) {
            const user = this.users[key]
            if (user.isTranslator) user.sendMessage("NEW_PROJECT", projectData)
        }
    }

    if (messageType === "TRANSLATOR_RATING") {
        const projectData = args[0]
        if (!projectData) return
        for (let key in this.users) {
            const user = this.users[key]
            if (user.isManager) {
                user.sendMessage("TRANSLATOR_RATING", projectData)
            }
        }
    }
}

async function forwardUpdate(users, pk, table, field, value, object) {
    // In case we didn't get the object for some reason, create a dummy object,
    // so we can freely access its properties below (they will all be undefined,
    // but won't crash the server)
    if (!object) object = {}

    // Some update messages need to send metadata about the object
    let metadata

    // The specific situations below (eg. translations) add id's of users that should get the message
    // even though they might not listen for changes on this object
    const includeUsers = []

    // Set this to true if you want to forward a message to all users
    let sendToAllUsers = false

    // Set this to true if you want to prevent all the translators from receiving this message
    let skipTranslators = false

    // Some tables require certain permissions on the user in order to forward the message
    let requiredPermissions = ""

    if (table === "PENDING_CHATS") {
        requiredPermissions = "viewManagersActivity"
    }

    if (table === "PROJECTS") {
        // The translators listen to some of the fields of PROJECT because loaded tableViews like OPENED_PROJECTS_TR.
        // However, not all updates to those fields should be sent to them.
        if (field === "PROJECT_NUMBER") skipTranslators = true
        if (field === "STATUS" && value <= C_.psPending) skipTranslators = true
    }

    if (table === "TRANSLATIONS") {
        // If changes are made to any of the following fields, forward the update to the translator who has this translation
        const fields =
            "REPLY,REPLY_COMMENTS,STATUS,COMMENTS,PAYMENT_METHOD,PRICE,UNASSIGN_REASON,CONFIRMED,STATUS_TEXT,TARGET_WORDS,AMOUNT_CORRECTION,AMOUNT_CORRECTION_PERCENT,PAYMENT_SHEET_ID,UPLOADED_ALL_FILES,WATCH_STATUS,UNASSIGNED_AFTER_REOPEN"
        if (fields.split(",").includes(field)) includeUsers.push(object.EMPLOYEE_ID)

        // If changes are made to STATUS or COMMENTS, forward the changes to all the translators assigned to that subproject
        if (["STATUS", "COMMENTS", "UPLOADED_ALL_FILES"].includes(field)) {
            metadata = {
                detailsToken: utils.getDetailsToken("TRANSLATIONS", pk),
                employeeID: object.EMPLOYEE_ID
            }

            let assignedTranslators = await db.getObjectsWithQuery(`SELECT EMPLOYEE_ID FROM TRANSLATIONS WHERE STATUS > 0 AND SUBPROJECT_ID = ${object.SUBPROJECT_ID}`)
            assignedTranslators.forEach(t => includeUsers.push(t.EMPLOYEE_ID))
        }
    }

    // Forward any update to EMPLOYEES_MESSAGES.IS_READ to the message's recipient
    if (table === "EMPLOYEES_MESSAGES") {
        if (field === "IS_READ") includeUsers.push(object.TO_ID)
    }

    // Forward any update to EMPLOYEES_FILES.IS_DOWNLOADED to the file's recipient
    if (table === "EMPLOYEES_FILES") {
        if (field === "IS_DOWNLOADED") includeUsers.push(object.TO_ID)
    }

    // Forward any update to PAYMENT_SHEETS to the sheet's employee
    if (table === "PAYMENT_SHEETS") {
        const fields = "PAYMENT_STATUS,COMMENTS,EMPLOYEE_COMMENTS,EXTRA_AMOUNT"
        if (fields.split(",").includes(field)) includeUsers.push(object.EMPLOYEE_ID)
    }

    if (table === "EMPLOYEES") {
        // Forward updates to the fields below to all users
        if (["ONLINE_STATUS", "IS_NOT_AVAILABLE"].includes(field)) sendToAllUsers = true
        // Forward updates to the fields below to all users (including translators) if the update is for a manager account
        if (["FIRST_NAME", "LAST_NAME"].includes(field) && object.EMPLOYEE_TYPE === C_.etManager) sendToAllUsers = true
    }

    for (let key in users) {
        const user = users[key]

        if (!user || !user.pk || user.isBanned) continue

        if (skipTranslators && !user.isManager) continue

        // If requiredPermissions was set above, include (force) all users that have the permission
        // and continue otherwise, to skip all the users that don't have the permission
        if (requiredPermissions) {
            if (user.permissions[requiredPermissions]) includeUsers.push(user.pk)
            else continue
        }

        // If the user is listening for the object or if it's included in includeUsers, forward the message
        if (user.isListeningForObject(table, field, pk) || includeUsers.includes(user.pk) || sendToAllUsers) {
            user.sendMessage("UPDATE_OBJECT", pk, table, field, value, metadata)
        }
    }
}
async function forwardInsert(users, insertedObject) {
    if (!insertedObject) return
    const o = insertedObject
    const pk = insertedObject.PK
    const table = insertedObject.table
    if (!pk || !table) return

    // The specific situations below (eg. translations) add id's of users that should get the message
    // even though they might not listen for changes on this object
    const includeUsers = []

    // In the specific situations below (eg. translated or proofread files), this list is populated with
    // the translators that should get the message. If selectTranslators is defined, then skip all users that are not
    // managers and that are not included in the list.
    let selectTranslators

    // This is used to skip all users (managers or translators) that are not included in the list.
    // Some of the tables have a field like ownIDField: "TO_ID" in the DatabaseStructure, which ensures that
    // new objects for that table are only sent to the recipient. This array can be used for more special cases,
    // where the default skipping can't be implemented.
    // If defined, skip all users that are not included in the list.
    let selectUsers

    // For some tables, for the translators we have to create a different object that doesn't include all the fields.
    // If we define it below, use it for translators.
    let objectForTranslators

    // Some tables require certain permissions on the user in order to forward the message
    let requiredPermissions = ""

    if (table === "PENDING_CHATS") {
        requiredPermissions = "viewManagersActivity"
    }

    if (table === "EMPLOYEES_MESSAGES") {
        // Add an employeeToken so the translators can request the uploader's details
        o.employeeToken = utils.getDetailsToken("EMPLOYEES", o.FROM_ID)
    }

    if (table === "EMPLOYEES_FILES") {
        // Add an employeeToken so the translators can request the uploader's details
        o.employeeToken = utils.getDetailsToken("EMPLOYEES", o.FROM_ID)
    }

    if (table === "EMPLOYEES_LANGUAGES") {
        includeUsers.push(o.EMPLOYEE_ID)
    }

    if (table === "TRANSLATIONS") {
        if (!o.CONFIRMED) o.CONFIRMED = false
        o.subprojectToken = utils.getDetailsToken("SUBPROJECTS", o.SUBPROJECT_ID)
        o.employeeToken = utils.getDetailsToken("EMPLOYEES", o.EMPLOYEE_ID)

        // Send the translation object only to the employee it belongs to
        selectTranslators = [o.EMPLOYEE_ID]

        // Plus to all the translators assigned on that subproject
        let assignedTranslators = await db.getObjectsWithQuery(`SELECT EMPLOYEE_ID FROM TRANSLATIONS WHERE STATUS > 0 AND SUBPROJECT_ID = ${o.SUBPROJECT_ID}`)
        assignedTranslators.forEach(t => selectTranslators.push(t.EMPLOYEE_ID))
    }

    if (table === "PROJECTS_FILES") {
        // Add an employeeToken so the translators can request the uploader's details
        o.employeeToken = utils.getDetailsToken("EMPLOYEES", o.EMPLOYEE_ID)

        // Add a subprojectToken so the translators can request the subproject and project
        if (o.SUBPROJECT_ID) o.subprojectToken = utils.getDetailsToken("SUBPROJECTS", o.SUBPROJECT_ID)

        // Send only some fields to the translators
        objectForTranslators = { table: "PROJECTS_FILES" }
        const fieldsToCopy = ["PK", "PROJECT_ID", "SUBPROJECT_ID", "FILE_TYPE", "FILE_NAME", "SIZE", "EMPLOYEE_ID", "UPLOAD_TIME", "PREFIX", "employeeToken", "subprojectToken"]
        fieldsToCopy.forEach(field => (objectForTranslators[field] = insertedObject[field]))

        // If the file is translated or proofread or edited, send it only to the translators assigned to the project
        if ([C_.pfTranslated, C_.pfProofread, C_.pfReopenedTranslated, C_.pfReopenedProofread, C_.pfEdited].includes(o.FILE_TYPE)) {
            let assignedTranslators = await db.getObjectsWithQuery(`SELECT EMPLOYEE_ID FROM TRANSLATIONS WHERE STATUS > 0 AND SUBPROJECT_ID = ${o.SUBPROJECT_ID}`)
            selectTranslators = assignedTranslators.map(t => t.EMPLOYEE_ID)
        }

        // If the file type is not included in the list below, don't send it to any translator
        else if (![C_.pfMain, C_.pfReopenedMain, C_.pfReference, C_.pfCATAnalysis, C_.pfCATMemory].includes(o.FILE_TYPE)) {
            selectTranslators = []
        }
    }

    if (table === "PROJECTS_MESSAGES") {
        if (!o.metadata) {
            let projects = await db.getObjectsWithQuery(`SELECT PK, PROJECT_NUMBER FROM PROJECTS WHERE PK = ${o.PROJECT_ID}`)
            if (projects[0]) o.metadata = { PROJECT_NUMBER: projects[0].PROJECT_NUMBER }
        }

        // If clientToTranslator is set on the object, it means that the insert was generated in ServerActions when approving
        // a client's project-message for the translator, and this insert should be sent only to the translator
        if (o.clientToTranslator) selectUsers = [o.RECIPIENT]

        // Don't forward it to translators
        selectTranslators = []
        // Unless the recipient or the sender is a translator's id
        if (!isNaN(o.RECIPIENT)) selectTranslators.push(parseInt(o.RECIPIENT, 10))
        if (!isNaN(o.SENDER)) selectTranslators.push(parseInt(o.SENDER, 10))
    }

    if (table === "EMPLOYEES") {
        // Don't forward new translator registrations to other translators
        selectTranslators = []
    }

    for (let key in users) {
        const user = users[key]
        if (!user || !user.pk || user.isBanned) continue

        let table = insertedObject.table

        // If selectUsers was defined in one of the conditions above, skip all users that are not included in the list.
        if (selectUsers && !selectUsers.includes(user.pk)) continue

        // If selectTranslators was defined in one of the conditions above, skip all the translators that are not included in the list.
        if (selectTranslators && !user.isManager && !selectTranslators.includes(user.pk)) continue

        // If requiredPermissions was set above, include (force) all users that have the permission
        // and continue otherwise, to skip all the users that don't have the permission
        if (requiredPermissions) {
            if (user.permissions[requiredPermissions]) includeUsers.push(user.pk)
            else continue
        }

        if (user.isListeningForNewObjects(table, insertedObject) || includeUsers.includes(user.pk)) {
            // Make the user listen to changes on this new object
            user.listenForNewObjectChanges(table, insertedObject.PK)

            // Send the new object to the user. If objectForTranslators is defined, send that one to the translators.
            // Otherwise, send the inserted object.
            let objectToSend = insertedObject
            if (objectForTranslators && !user.isManager) objectToSend = objectForTranslators

            user.sendMessage("INSERT_OBJECT", objectToSend)
        }
    }
}

function forwardDelete(users, pk, table) {
    for (let key in users) {
        const user = users[key]
        if (!user || !user.pk || user.isBanned) continue

        // If the user is listening for new objects, it will receive deletes too
        if (user.isListeningForNewObjects(table)) {
            user.sendMessage("DELETE_OBJECT", pk, table)
        }
    }
}

module.exports = {
    forward,
    forwardUpdate,
    forwardInsert,
    forwardDelete
}
