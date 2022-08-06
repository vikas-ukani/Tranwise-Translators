import cmg from "../Shared/ConnectionManagerBase"
import messageProcessor from "./ClientMessageProcessor"
import utils from "./Utils"
import store from "./Store/Store"

const tableViewsToRequestAtLogin = {
    SETTINGS: false,
    PROJECTS_LIST: false,
    RECENT_QUOTES: false,
    EMPLOYEES_LIST: false,
    SUBPROJECTS_FOR_OPEN_PROJECTS: false,
    ASSIGNED_TRANSLATIONS_FOR_OPEN_PROJECTS: false,
    EMPLOYEES_FOR_OPEN_PROJECTS: false,
    EMPLOYEES_WITH_SPECIAL_RATES: false,
    CERTIFICATE_TEMPLATES: false,
    UNPAID_INVOICES_LIST: false,
    PROJECTS_MESSAGES_WITH_PROBLEM: false,
    PROJECTS_FOR_PROJECTS_MESSAGES: false,
    SUBPROJECTS_FOR_PROJECTS_MESSAGES: false,
    EMPLOYEES_FOR_PROJECT_MESSAGES_LIST: false,
    EMPLOYEES_HOLIDAYS: false,
    EMPLOYEES_FOR_EMPLOYEES_HOLIDAYS: false,
    EMPLOYEES_MESSAGES: false,
    EMPLOYEES_FILES: false,
    PREQUOTES_NOT_COMPLETED: false,
    MB_THREADS: false,
    TWILIO_MESSAGES_LIST: false,
    TWILIO_MESSAGES_WITH_CLIENT_ID: false,
    TIPS: false,
    TIPS_MANAGERS: false,
    LANGUAGES: false,
    COUNTRIES: false,
    DIVISIONS: false,
    CLIENTS_LIST_SMALL_1: false,
    CLIENTS_LIST_SMALL_2: false,
    CLIENTS_LIST_SMALL_3: false,
    CLIENTS_LIST_SMALL_4: false,
    CLIENTS_LIST_SMALL_5: false,
    CLIENTS_LIST_SMALL_6: false,
    CLIENTS_LIST_SMALL_7: false,
    CLIENTS_LIST_SMALL_8: false,
    CLIENTS_LIST_SMALL_9: false,
    CLIENTS_LIST_SMALL_10: false,
    CLIENTS_LAST_TWILIO_PROJECT_ID: false,
    CLIENTS_INVOICED_ONLINE: false,
    CLIENTS_FILES: false,
    PROJECTS_FOR_INVOICES_WITH_PARTIAL_PREPAYMENT: false,
    PROJECTS_FOR_TWILIO_MESSAGES: false,
    SMS_TEMPLATES: false
}

cmg.messageHeaders = {
    SEND_TRANSLATED_FILE_FOR_CHECK: "SEND_TRANSLATED_FILE_FOR_CHECK",
    SEND_PROJECT_FINAL_FILE: "SEND_PROJECT_FINAL_FILE",
    SEND_REOPENED_PROJECT_FILE: "SEND_REOPENED_PROJECT_FILE",
    SEND_TELEGRAM_TO_EMPLOYEE: "SEND_TELEGRAM_TO_EMPLOYEE",
    SEND_EMAIL: "SEND_EMAIL",
    SEND_SMS: "SEND_SMS",
    SEND_EMAIL_WITH_TYPE: "SEND_EMAIL_WITH_TYPE",
    SEND_EMAIL_WITH_PAYMENT_LINK: "SEND_EMAIL_WITH_PAYMENT_LINK",
    OCR_FILE: "OCR_FILE",
    SEND_INVOICE: "SEND_INVOICE",
    SEND_PROFORMA_INVOICE: "SEND_PROFORMA_INVOICE",
    UNLOCK_FILE_IN_ONLINE_EDITOR: "UNLOCK_FILE_IN_ONLINE_EDITOR",
    RESEND_SUBPROJECT_TO_TRANSLATORS: "RESEND_SUBPROJECT_TO_TRANSLATORS",
    REQUEST_FILES_FOR_NOTARIZED_PROJECT: "REQUEST_FILES_FOR_NOTARIZED_PROJECT",
    RESEND_DIGITAL_CERTIFICATION_OR_NOTARIZATION: "RESEND_DIGITAL_CERTIFICATION_OR_NOTARIZATION",
    REQUEST_PDF_INVOICE: "REQUEST_PDF_INVOICE",
    REQUEST_GENERATED_FILE: "REQUEST_GENERATED_FILE",
    REQUEST_ACTIVITY_LOG: "REQUEST_ACTIVITY_LOG",
    CONVERT_FILE_TO_AI : "CONVERT_FILE_TO_AI",
    READ_ALL_TWILIO_MSG : "READ_ALL_TWILIO_MSG"
}

// Used to store the requests sent for files generated on the server (eg. files for notarization, PDF invoices).
// When getting back a message that a requested file is available, we check if the requestID is in this array
// and only then download the file.
cmg.requestedFilesIDs = []

Object.assign(cmg.tableViewsToRequestAtLogin, tableViewsToRequestAtLogin)

messageProcessor.cmg = cmg
cmg.setMessageProcessor(messageProcessor)

// After login is completed, send these messages to the server
cmg.sendPostLoginMessages = () => {
    cmg.sendMessage("COMPLETED_LOGIN")
    cmg.updateObject(store.myself, "ONLINE_STATUS", 1) // C_.eoOnline
}

cmg.sendEmailWithType = function(emailType, objectID) {
    this.sendMessage(this.messageHeaders.SEND_EMAIL_WITH_TYPE, emailType, objectID)
}

cmg.sendEmail = function(from, to, subject, body) {
    this.sendMessage(this.messageHeaders.SEND_EMAIL, from, to, subject, body)
}

cmg.sendEmailWithPaymentLink = function(project, amount) {
    this.sendMessage(this.messageHeaders.SEND_EMAIL_WITH_PAYMENT_LINK, project.PK, amount)
}

cmg.requestFilesForNotarizedProject = function(projectID) {
    const requestID = utils.getUniqueID()
    this.requestedFilesIDs.push(requestID)
    this.sendMessage(cmg.messageHeaders.REQUEST_FILES_FOR_NOTARIZED_PROJECT, projectID, requestID)
}

cmg.requestPDFInvoice = function(invoiceID) {
    const requestID = utils.getUniqueID()
    this.requestedFilesIDs.push(requestID)
    this.sendMessage(cmg.messageHeaders.REQUEST_PDF_INVOICE, invoiceID, requestID)
}

cmg.requestGeneratedFile = function(details) {
    const requestID = utils.getUniqueID()
    this.requestedFilesIDs.push(requestID)
    this.sendMessage(cmg.messageHeaders.REQUEST_GENERATED_FILE, details, requestID)
}

export default cmg
