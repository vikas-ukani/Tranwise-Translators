import messageProcessor from "../Shared/ClientMessageProcessorBase"
import store from "./Store/StoreTR"
import utils from "./UtilsTR"
import cmg from "./ConnectionManagerTR"
import C_ from "./ConstantsTR"
import TWObject from "./Store/TWObjectTR"

// Request an object from the server if it wasn't found in the store
async function ensureExistence(storeAccessor, pk, tableView, detailsToken) {
    let result = store[storeAccessor](pk)
    if (result) return result

    // If we didn't find the object, request it from the server
    // If we got a detailsToken, include it in the request. Otherwise send just the pk with the request.
    const request = detailsToken ? { PK: pk, token: detailsToken } : pk
    return await cmg.requestObjectWithPK(request, tableView)
}

messageProcessor.performDatabasePreInsertActions = function(tableView) {
    if (
        [
            "PROJECTS_FOR_ASSIGNED_TRANSLATIONS_TR",
            "ALL_PROJECTS_FOR_TRANSLATIONS_TR",
            "SUBPROJECTS_FOR_ASSIGNED_TRANSLATIONS_TR",
            "ALL_SUBPROJECTS_FOR_TRANSLATIONS_TR",
            "ASSIGNED_TRANSLATIONS_FOR_EMPLOYEE_TR",
            "ALL_TRANSLATIONS_FOR_EMPLOYEE_TR",
            "TRANSLATIONS_FOR_OPENED_PROJECTS_TR"
        ].includes(tableView)
    )
        return messageProcessor.getCompressionFields(tableView)

    // Do other processing here if needed
}

messageProcessor.getCompressionFields = function(tableView) {
    // Does a pseudo-compression on the PROJECTS table
    if (["PROJECTS_FOR_ASSIGNED_TRANSLATIONS_TR", "ALL_PROJECTS_FOR_TRANSLATIONS_TR"].includes(tableView)) {
        let fields = [
            { from: "PK", to: "PK" },
            { from: "B", to: "PROJECT_NUMBER" },
            { from: "C", to: "STATUS" },
            { from: "D", to: "SOURCE_LANGUAGE_ID" },
            { from: "E", to: "DEADLINE_TRANSLATOR" },
            { from: "F", to: "DEADLINE_PROOFREADER" }
        ]
        return { fields, insertFunction: "insertOrUpdateObject" }
    }

    // Does a pseudo-compression on the SUBPROJECTS table
    if (["SUBPROJECTS_FOR_ASSIGNED_TRANSLATIONS_TR", "ALL_SUBPROJECTS_FOR_TRANSLATIONS_TR"].includes(tableView)) {
        let fields = [
            { from: "PK", to: "PK" },
            { from: "B", to: "PROJECT_ID" },
            { from: "C", to: "LANGUAGE_ID" },
            { from: "D", to: "INTERMEDIATE_LANGUAGE_ID" },
            { from: "E", to: "IS_REOPENED" },
            { from: "F", to: "ALLOW_PROOFREADERS_SPECIAL" }
        ]
        return { fields, insertFunction: "insertOrUpdateObject" }
    }

    // Does a pseudo-compression on the TRANSLATIONS table
    if (["ASSIGNED_TRANSLATIONS_FOR_EMPLOYEE_TR", "ALL_TRANSLATIONS_FOR_EMPLOYEE_TR", "TRANSLATIONS_FOR_OPENED_PROJECTS_TR"].includes(tableView)) {
        let fields = [
            { from: "PK", to: "PK" },
            { from: "B", to: "EMPLOYEE_ID" },
            { from: "C", to: "SUBPROJECT_ID" },
            { from: "D", to: "REPLY" },
            { from: "E", to: "STATUS" },
            { from: "F", to: "UPLOADED_ALL_FILES" }
        ]
        return { fields, insertFunction: "insertOrUpdateObject" }
    }
}

// This function is executed when receiving an UPDATE_OBJECT message, before the object's value is updated the store,
// and it contains actions that have to be taken before the object is updated into the store
messageProcessor.actions.updateObjectPreActions = async function(object, pk, table, field, value, metadata) {
    if (table === "TRANSLATIONS") {
        let translation = store.translation(pk)
        if (!translation) {
            // For any update to TRANSLATIONS we should receive metadata with the translation's employee id and details token
            // If the employee is not myself, request the details of the other translation (which are different - less fields -
            // than for a translation of myself)
            if (metadata && metadata.employeeID && metadata.employeeID != store.myself.PK)
                translation = await ensureExistence("translation", pk, "TRANSLATION_DETAILS_OTHER_TR", metadata.detailsToken)
            else translation = await ensureExistence("translation", pk, "TRANSLATION_DETAILS_TR")
        }

        if (!translation) return

        const subproject = await ensureExistence("subproject", translation.SUBPROJECT_ID, "SUBPROJECT_DETAILS_TR", translation.subprojectToken)
        if (subproject) await ensureExistence("project", subproject.PROJECT_ID, "PROJECT_DETAILS_TR", subproject.projectToken)
    }
}

messageProcessor.actions.updateObjectActions = async function(object, pk, table, field, value) {
    if (table === "TRANSLATIONS") {
        if (object.EMPLOYEE_ID === store.myself.PK && field === "STATUS" && value > 0) {
            announceAssignment(object)
            if ([C_.tsTranslating, C_.tsProofreading].includes(value)) {
                const translation = store.translation(pk)
                if (!translation) return
                const subproject = translation.subproject()
                if (!subproject) return
                cmg.requestObjectsForObject(subproject, "TRANSLATIONS_FOR_SUBPROJECT_TR")
                cmg.requestObjectsForObject(subproject, "EMPLOYEES_FOR_SUBPROJECT_TR")
                cmg.requestDataWithMessage("REQUEST_TRANSLATED_FILES", subproject.PK)
            }
        }
    }

    if (table === "EMPLOYEES") {
        // If we got an offline status for the user (because of a disconnect somewhere else), set us as online (or away, or idle)
        if (field === "ONLINE_STATUS" && value === C_.eoOffline && pk === store.myself.PK) store.eventBus.$emit("receivedOfflineStatusForSelf")
    }
}

// This function is executed when receiving an INSERT_OBJECT message, before the object is added to the store,
// and it contains actions that have to be taken before the object is inserted into the store
// eg. loading the sender employee for a message if it's not available
messageProcessor.actions.insertObjectPreActions = async function(object) {
    if (object.table === "EMPLOYEES_MESSAGES" && object.TO_ID === store.myself.PK) {
        await ensureExistence("employee", object.FROM_ID, "EMPLOYEES_DETAILS_TR", object.employeeToken)
    }

    if (object.table === "EMPLOYEES_FILES" && object.TO_ID === store.myself.PK) {
        await ensureExistence("employee", object.FROM_ID, "EMPLOYEES_DETAILS_TR", object.employeeToken)
    }

    if (object.table === "PROJECTS_FILES") {
        await ensureExistence("employee", object.EMPLOYEE_ID, "EMPLOYEES_DETAILS_TR", object.employeeToken)
    }

    if (object.table === "TRANSLATIONS") {
        const employee = store.employee(object.EMPLOYEE_ID)

        // If we don't have this employee, or it's missing the online status or UTC offset,
        // (ie.  we have receieved it from another tableview that didn't include these fields), request the employee
        if (!employee || employee.ONLINE_STATUS === undefined || !employee.UTC_OFFSET === undefined)
            await cmg.requestObjectWithPK({ PK: object.EMPLOYEE_ID, token: object.employeeToken }, "EMPLOYEES_DETAILS_TR")

        const subproject = await ensureExistence("subproject", object.SUBPROJECT_ID, "SUBPROJECT_DETAILS_TR", object.subprojectToken)
        if (subproject) await ensureExistence("project", subproject.PROJECT_ID, "PROJECT_DETAILS_TR", subproject.projectToken)
    }
}

// This function is executed when receiving an INSERT_OBJECT message, after the object was added to the store
messageProcessor.actions.insertObjectActions = async function(object) {
    if (object.table === "EMPLOYEES_MESSAGES" && object.TO_ID === store.myself.PK) {
        const employee = store.employee(object.FROM_ID)
        store.addNotification("IMPORTANT", "You received a message from", employee.fullName(), {
            title: "Message from " + employee.fullName(),
            message: object.MESSAGE,
            employeeMessage: object,
            markMessageAsRead: true
        })
        utils.showDesktopNotification(`Message from ${employee.fullName()}`, object.MESSAGE, true)
    }

    if (object.table === "EMPLOYEES_FILES" && object.TO_ID === store.myself.PK) {
        const employee = store.employee(object.FROM_ID)
        store.addNotification("IMPORTANT", "You received a file from", employee.fullName(), {
            title: "You received a file from\n" + employee.fullName(),
            employeeFile: object
        })
        utils.showDesktopNotification(`${employee.fullName()} sent you a file`, object.FILE_NAME, true)
    }

    if (object.table === "PROJECTS_MESSAGES") {
        const project = store.project(object.PROJECT_ID)
        let projectNumber = project ? project.PROJECT_NUMBER : ""
        if (!projectNumber && object.metadata) projectNumber = object.metadata.PROJECT_NUMBER

        if (object.RECIPIENT == store.myself.PK && object.SENDER != "C2T" && projectNumber) {
            let subprojectID
            for (let subproject of store.subprojects) if (subproject.PROJECT_ID === object.PROJECT_ID) subprojectID = subproject.PK

            const fromTheClient = object.SENDER === "CL" ? " from the client" : ""

            store.addNotification("IMPORTANT", object.SENDER === "CL" ? "New message from the client" : "You received a message", "about project " + projectNumber, {
                title: "You received a message" + fromTheClient + " about project " + projectNumber,
                note: "Note: You can find this message at the bottom of the project's details.",
                message: object.MESSAGE,
                subprojectID: subprojectID
            })
            utils.showDesktopNotification(`Message about project ${projectNumber}`, object.MESSAGE, true)
        }
    }

    // If the translator uploaded files for a project I am proofreading, show a notification
    if (object.table === "PROJECTS_FILES" && object.EMPLOYEE_ID != store.myself.PK && [C_.pfTranslated, C_.pfReopenedTranslated].includes(object.FILE_TYPE)) {
        const employee = await ensureExistence("employee", object.EMPLOYEE_ID, "EMPLOYEES_DETAILS_TR", object.employeeToken)
        if (!employee) return
        let subproject = await ensureExistence("subproject", object.SUBPROJECT_ID, "SUBPROJECT_DETAILS_TR", object.subprojectToken)
        if (!subproject) return
        let project = await ensureExistence("project", object.PROJECT_ID, "PROJECT_DETAILS_TR", subproject.projectToken)
        if (!project) return

        let isAssignedProofreading = false
        for (let translation of store.translations)
            if (translation.SUBPROJECT_ID === object.SUBPROJECT_ID && translation.EMPLOYEE_ID === store.myself.PK && translation.STATUS === C_.tsProofreading) {
                isAssignedProofreading = true
                break
            }

        if (!isAssignedProofreading) return

        store.addNotification("IMPORTANT", employee.FIRST_NAME + " uploaded", "a translated file for " + project.PROJECT_NUMBER, {
            title: employee.fullName() + " has uploaded a translated file for project " + project.PROJECT_NUMBER,
            subprojectID: subproject.PK
        })
        store.playNewJobSound()
        utils.showDesktopNotification("Translated file for " + project.PROJECT_NUMBER, employee.fullName() + " uploaded a translated file for " + project.PROJECT_NUMBER, true)
    }

    // If a project manager uploaded an edited file, show a notification
    if (object.table === "PROJECTS_FILES" && object.FILE_TYPE === C_.pfEdited) {
        const employee = await ensureExistence("employee", object.EMPLOYEE_ID, "EMPLOYEES_DETAILS_TR", object.employeeToken)
        if (!employee) return
        let subproject = await ensureExistence("subproject", object.SUBPROJECT_ID, "SUBPROJECT_DETAILS_TR", object.subprojectToken)
        if (!subproject) return
        let project = await ensureExistence("project", object.PROJECT_ID, "PROJECT_DETAILS_TR", subproject.projectToken)
        if (!project) return

        let isAssigned = false
        for (let translation of store.translations)
            if (translation.SUBPROJECT_ID === object.SUBPROJECT_ID && translation.EMPLOYEE_ID === store.myself.PK && translation.isAssigned()) {
                isAssigned = true
                break
            }

        if (!isAssigned) return

        store.addNotification("IMPORTANT", employee.FIRST_NAME + " uploaded", "an edited file for " + project.PROJECT_NUMBER, {
            title: employee.fullName() + " has uploaded a file edited by the client for project " + project.PROJECT_NUMBER,
            subprojectID: subproject.PK
        })
        store.playNewJobSound()
        utils.showDesktopNotification("Edited file for " + project.PROJECT_NUMBER, employee.fullName() + " uploaded an edited file for " + project.PROJECT_NUMBER, true)
    }

    if (object.table === "TRANSLATIONS") {
        if (object.EMPLOYEE_ID === store.myself.PK && object.STATUS > 0) announceAssignment(object)
    }

    if (object.table === "MB_THREADS") {
        if (object.LANGUAGE_ID) {
            // If the thread has a LANGUAGE_ID (ie. it is for the message board for translators)
            // show it only if the user knows that language
            let knowsLanguage = false
            if (store.myself.NATIVE_LANGUAGE_1_ID === object.LANGUAGE_ID || store.myself.NATIVE_LANGUAGE_2_ID === object.LANGUAGE_ID) knowsLanguage = true
            for (let empLang of store.employeesLanguages) {
                if (empLang.EMPLOYEE_ID === store.myself.PK)
                    if (empLang.SOURCE_LANGUAGE_ID === object.LANGUAGE_ID || empLang.TARGET_LANGUAGE_ID === object.LANGUAGE_ID) knowsLanguage = true
            }
            if (knowsLanguage) store.addNotification("MESSAGE_BOARD", "New thread on translations board", object.SUBJECT)
        } else store.addNotification("MESSAGE_BOARD", "New thread in the message board", object.SUBJECT)
    }
}

// When a new project data comes in, insert into the store the project and the associated subprojects
messageProcessor.NEW_PROJECT = async function(project) {
    project.table = "PROJECTS"

    // Get the subprojects as a separate object and delete them from the project data
    const subprojects = [...project.subprojects]
    delete project.subprojects

    // Insert the project
    await messageProcessor.INSERT_OBJECT(project)

    // Insert the subprojects
    for (let subproject of subprojects) {
        Object.setPrototypeOf(subproject, TWObject.prototype)
        subproject.table = "SUBPROJECTS"
        await messageProcessor.INSERT_OBJECT(subproject)
        if (store.myself.canWorkOnProject(project, subproject)) store.notifyNewProject(project, subproject)
    }
}

messageProcessor.CHAT = async function(data) {
    // Check if the sender of the message is in store, otherwise request it before adding the chat message
    // Only if the message is an actual chat text, not started or cancelled typing
    const partnerID = data.senderID === store.myself.PK ? data.recipientID : data.senderID
    if (!store.employee(partnerID) && data.text) {
        // In this particular case, we are sending a request object instead of a pk, because we need to provide the sender token
        // Otherwise, we won't get the details for the employee
        const request = { PK: partnerID, token: data.senderToken }
        await messageProcessor.cmg.requestObjectWithPK(request, "EMPLOYEES_DETAILS_FOR_CHAT_TR")
    }

    store.addChatMessage(data)
}

function announceAssignment(translation) {
    if (!translation) return
    const subproject = store.subproject(translation.SUBPROJECT_ID)
    if (!subproject) return
    const project = store.project(subproject.PROJECT_ID)
    if (!project) return

    if (translation.EMPLOYEE_ID != store.myself.PK) return
    if (![C_.tsTranslating, C_.tsProofreading, C_.tsUnassignedTranslation, C_.tsUnassignedProofreading].includes(translation.STATUS)) return

    let title = ""
    let desktopLine1 = ""
    let desktopLine2 = ""
    let line1 = ""
    let line2 = ""
    let type = ""
    let target = subproject.targetOrIntermediate()
    const projectNumber = project.PROJECT_NUMBER + " - " + (target.length > 8 ? target.slice(0, 3) : target)
    const isConfirmed = translation.CONFIRMED

    if (translation.STATUS === C_.tsTranslating) {
        line1 = "You are assigned to translate"
        line2 = projectNumber + (isConfirmed ? "" : ". Please confirm!")
        title = "You are assigned to translate " + project.PROJECT_NUMBER + " - " + target + (isConfirmed ? "" : ". Please confirm!")

        desktopLine1 = "You are assigned to translate"
        desktopLine2 = projectNumber + ". Please confirm!"

        type = "AssignmentTranslation"
    }
    if (translation.STATUS === C_.tsProofreading) {
        line1 = "You are assigned to proofread"
        line2 = projectNumber + ". Please confirm!"
        title = "You are assigned to proofread " + project.PROJECT_NUMBER + " - " + target + (isConfirmed ? "" : ". Please confirm!")

        desktopLine1 = "You are assigned to proofread"
        desktopLine2 = projectNumber + ". Please confirm!"

        type = "AssignmentProofreading"
    }
    if (translation.STATUS === C_.tsUnassignedTranslation) {
        line1 = "You are unassigned from " + project.PROJECT_NUMBER + "."
        line2 = "See why in the details."
        title = "You are unassigned from translating " + project.PROJECT_NUMBER + " - " + target

        desktopLine1 = "You have been unassigned"
        desktopLine2 = "from job " + projectNumber

        type = "Unassignment"
    }
    if (translation.STATUS === C_.tsUnassignedProofreading) {
        line1 = "You are unassigned from " + project.PROJECT_NUMBER + "."
        line2 = "See why in the details."
        title = "You are unassigned from proofreading " + project.PROJECT_NUMBER + " - " + target

        desktopLine1 = "You have been unassigned"
        desktopLine2 = "from job " + projectNumber

        type = "Unassignment"
    }

    store.addNotification(type, line1, line2, {
        title: title,
        subprojectID: subproject.PK
    })
    store.playNewJobSound()
    utils.showDesktopNotification(desktopLine1, desktopLine2, true)
}

export default messageProcessor
