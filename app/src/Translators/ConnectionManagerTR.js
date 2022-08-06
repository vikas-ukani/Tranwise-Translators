import cmg from "../Shared/ConnectionManagerBase"
import messageProcessor from "./ClientMessageProcessorTR"
import store from "./Store/StoreTR"

const tableViewsToRequestAtLogin = {
    SETTINGS_TR: false,
    EMPLOYEE_RESUME_TR: false,
    EMPLOYEE_DIPLOMA_TR: false,
    EMPLOYEES_LANGUAGES_TR: false,
    EMPLOYEES_MESSAGES: false,
    EMPLOYEES_FILES: false,
    TIPS: false,
    LANGUAGES: false,
    COUNTRIES: false,
    OPENED_PROJECTS_TR: false,
    SUBPROJECTS_FOR_OPENED_PROJECTS_TR: false,
    TRANSLATIONS_FOR_OPENED_PROJECTS_TR: false,
    SUBPROJECTS_FOR_ASSIGNED_TRANSLATIONS_TR: false,
    PROJECTS_FOR_ASSIGNED_TRANSLATIONS_TR: false,
    ASSIGNED_TRANSLATIONS_FOR_EMPLOYEE_TR: false,
    PENDING_PROJECTS_MESSAGES_TR: false,
    EMPLOYEES_PAYMENT_SHEETS_TR: false,
    MANAGERS_LIST_TR: false
}

cmg.messageHeaders = {}

Object.assign(cmg.tableViewsToRequestAtLogin, tableViewsToRequestAtLogin)

messageProcessor.cmg = cmg
cmg.setMessageProcessor(messageProcessor)

// Request data from the server using a specific message name (eg. REQUEST_PROJECTS_MESSAGES_FOR_TRANSLATOR)
cmg.requestDataWithMessage = function requestDataWithMessage(messageName, objectID) {
    return new Promise(resolve => {
        // Prepare the callback
        let callbackID = messageProcessor.addRequestCallback((table, objects) => {
            for (let o of objects) store.insertOrUpdateObject(o, table)
            resolve(objects)
        })

        // Send the request to the server
        cmg.sendMessage(messageName, objectID, callbackID)
    })
}

// After login is completed, send these messages to the server
cmg.sendPostLoginMessages = () => {
    cmg.sendMessage("COMPLETED_LOGIN")
    cmg.updateObject(store.myself, "UTC_OFFSET", new Date().getTimezoneOffset() * 60 * -1)
    cmg.updateObject(store.myself, "ONLINE_STATUS", 1) // C_.eoOnline
}

export default cmg
