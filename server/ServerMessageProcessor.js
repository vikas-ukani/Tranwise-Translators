const validateUpdate = require("./Validation/UpdateValidator")
const validateInsert = require("./Validation/InsertValidator")
const validateDelete = require("./Validation/DeleteValidator")
const db = require("./DatabaseManager")
const serverActions = require("./ServerActions")
const tableViews = require("./TableViews")
const clientErrorManager = require("./ServerClientErrorManager")
const utils = require("./Utils")
const C_ = require("./Constants")
const guardian = require("./Guardian")
const config = require("./serverConfig")
const log = require("./Logger")
const fs = require("fs")
const path = require("path")
const requestedFiles = require("./RequestedFiles")

const messageProcessor = {}
serverActions.setMessageProcessor(messageProcessor)

messageProcessor.allowedMessagesByTranslators = [
    "REQUEST_SELF_EMPLOYEE",
    "REQUEST_OBJECT",
    "REQUEST_OBJECTS",
    "REQUEST_OBJECTS_FOR_ID",
    "REQUEST_DATABASE_OBJECTS",
    "REQUEST_OBJECTS_FOR_EMPLOYEE",
    "REQUEST_TRANSLATED_FILES",
    "REQUEST_PROJECTS_MESSAGES_FOR_TRANSLATOR",
    "INSERT_OBJECT",
    "UPDATE_OBJECT",
    "DELETE_OBJECT",
    "BECOME_PREFERRED_TRANSLATOR",
    "CHAT",
    "CLIENT_ERROR",
    "SERVER_TIME",
    "REQUEST_CHAT_HISTORY",
    "SUBMIT_BUG_REPORT",
    "COMPLETED_LOGIN",
    "RESET_PASSWORD",
    "DEBUG"
]

function logMessage(employeeID, message) {
    const stringToLog = `[${utils.formatNow("YYYY/MM/DD HH:mm:ss")}] ${message}`
    fs.appendFile(config.activityLogsFolder + employeeID + ".log", `${stringToLog}\n`, "utf8", err => {
        if (err) console.log(err)
    })
}

messageProcessor.UPDATE_OBJECT = function (pk, table, field, value) {
    // "this" is bound to the user
    const self = this

    if (value == "SERVER_TIME_TAG") value = utils.now()
    if (typeof value === "string") value = value.replace(/\$SERVER_TIME\$/g, utils.nowAsString())
    if (typeof value === "string") value = value.replace(/\$SERVER_TIME_AT\$/g, utils.nowAsStringAt())
    if (value === null) value = ""

    // Validate the update request.
    // The validation function will call either the success or the failure callback.
    validateUpdate(
        self, // <- the User
        pk,
        table,
        field,
        value,
        async function validationSuccess(validPK, validTable, validField, validValue) {
            // First get the full object from the database, so we can access the old value if needed
            let existingObject
            let skipLoading = false

            // Skip loading of the existing object if table = "TRANSLATIONS" and field = "PAYMENT_SHEET_ID".
            // The existing object is not needed in that case and the translations are updated in bulk, so avoid thousands of queries.
            if (table === "TRANSLATIONS" && field === "PAYMENT_SHEET_ID") skipLoading = true

            if (!skipLoading) existingObject = await db.getObjectWithQuery(`SELECT * FROM ${validTable} WHERE PK = ${validPK}`)

            db.updateObject(validPK, validTable, validField, validValue, () => {
                self.forwardMessage("UPDATE_OBJECT", validPK, validTable, validField, validValue, existingObject)
                serverActions.performUpdateActions.call(self, existingObject, validPK, validTable, validField, validValue)
                logMessage(self.pk, `Update: ${validTable}.${validField}.${validPK} = ${validValue}`)
            })
        }
    )
}

messageProcessor.INSERT_OBJECT = function insertObject(object, onInsertSuccess, onInsertFailure) {
    // "this" is bound to the user
    let self = this

    validateInsert(
        this,
        object,
        function onValidationSuccess() {
            db.insertObject(
                object,
                function onDatabaseInsertSuccess(insertedObject) {
                    // Create a new object based on insertedObject and remove the children and some other properties
                    const objectToForward = { ...insertedObject }
                    delete objectToForward.children
                    delete objectToForward.parentKey

                    // If the object has a detailsToken property, set it to the correct details token based on
                    // the PK we got after the insert
                    if (object.detailsToken) objectToForward.detailsToken = utils.getDetailsToken(objectToForward.table, objectToForward.PK)

                    // Forward the object to interested users
                    self.forwardMessage("INSERT_OBJECT", objectToForward)

                    // Perform the actions to be taken when an insert is done
                    serverActions.performInsertActions(insertedObject)

                    if (onInsertSuccess) onInsertSuccess(insertedObject)

                    logMessage(self.pk, `Insert: ${JSON.stringify(insertedObject)}`)
                },
                function onDatabaseInsertFailure() {
                    if (onInsertFailure) onInsertFailure()
                }
            )
        },
        function onValidationFailure() {
            if (onInsertFailure) onInsertFailure()
        }
    )
}

messageProcessor.DELETE_OBJECT = function deleteObject(pk, table) {
    // "this" is bound to the user
    let self = this

    // Validate the delete request.
    // The validation function will call either the success or the failure callback.
    validateDelete(
        this, // <- the User
        pk,
        table,
        async function success() {
            // First get the full object from the database, so we can access the old value if needed
            const existingObject = await db.getObjectWithQuery(`SELECT * FROM ${table} WHERE PK = ${pk}`)

            db.deleteObject(pk, table, () => {
                serverActions.performDeleteActions.call(self, existingObject, pk, table)
                self.forwardMessage("DELETE_OBJECT", pk, table)
                logMessage(self.pk, `Delete: ${table}.${pk}`)
            })
        },
        function failure() {}
    )
}

messageProcessor.SUBMIT_BUG_REPORT = function submitBugReport(object, onInsertSuccess, onInsertFailure) {
    db.insertObject(
        object,
        function onDatabaseInsertSuccess(insertedObject) {
            if (onInsertSuccess) onInsertSuccess(insertedObject)
        },
        function onDatabaseInsertFailure() {
            if (onInsertFailure) onInsertFailure()
        }
    )
}

messageProcessor.BECOME_PREFERRED_TRANSLATOR = function becomePreferredTranslator() {
    serverActions.updateObject(this.PK, "EMPLOYEES", "RATE_TRANSLATION", 0.02)
}

messageProcessor.SEND_TELEGRAM_TO_EMPLOYEE = function sendTelegram(employeeID, message) {
    serverActions.sendTelegramToEmployee(employeeID, message)
}

messageProcessor.SEND_SMS = function sendSMS(employeeID, message) {
    serverActions.sendSMSToEmployee(employeeID, message)
}

messageProcessor.SEND_EMAIL = function sendCustomEmail(from, to, subject, body) {
    serverActions.sendCustomEmail(from, to, subject, body)
}

messageProcessor.SEND_EMAIL_WITH_TYPE = function sendEmailWithType(emailType, objectID) {
    serverActions.sendEmailWithTypeForProject(emailType, objectID)
}

messageProcessor.SEND_EMAIL_WITH_PAYMENT_LINK = function sendEmailWithPaymentLink(projectID, amount) {
    serverActions.sendEmailWithPaymentLink(projectID, amount)
}

messageProcessor.SEND_PROJECT_FINAL_FILE = function sendProjectFinalFile(fileID, email) {
    serverActions.sendProjectFinalFile(fileID, email)
}

messageProcessor.SEND_REOPENED_PROJECT_FILE = function sendReopenedProjectFile(fileID, email) {
    serverActions.sendProjectReopenedFile(fileID, email)
}

messageProcessor.SEND_TRANSLATED_FILE_FOR_CHECK = function sendTranslatedFileForCheck(fileID) {
    serverActions.sendTranslatedFileForCheck(fileID)
}

messageProcessor.OCR_FILE = function ocrFile(fileID, projectID, employeeID, fileName) {
    serverActions.sendFileToOCR(fileID, projectID, employeeID, fileName)
}

messageProcessor.READ_ALL_TWILIO_MSG = function readAllTwilioMsg() {
    serverActions.readAllTwilioMsg()
}

messageProcessor.CONVERT_FILE_TO_AI = function transactionWiaAI(fileID, projectID, employeeID, fileName) {
    serverActions.sendFileToAI(fileID, projectID, employeeID, fileName)
}

messageProcessor.UNLOCK_FILE_IN_ONLINE_EDITOR = function unlockFileInOnlineEditor(projectID, fileID) {
    serverActions.unlockFileInOnlineEditor(projectID, fileID)
}

messageProcessor.SEND_INVOICE = function sendInvoice(invoiceID, email, comments) {
    serverActions.sendInvoice(invoiceID, email, comments)
}

messageProcessor.SEND_PROFORMA_INVOICE = function sendProformaInvoice(projectID, email, comments) {
    serverActions.sendProformaInvoice(projectID, email, comments)
}

messageProcessor.RESEND_SUBPROJECT_TO_TRANSLATORS = function resendSubprojectToTranslators(_projectID, subprojectID) {
    // projectID is not used anymore in Tranwise 3
    serverActions.resendSubprojectToTranslators(subprojectID)
}

messageProcessor.REQUEST_FILES_FOR_NOTARIZED_PROJECT = function requestFilesForNotarizedProject(projectID, code) {
    serverActions.createFilesForNotarizedProject(projectID, zipName => {
        const fileName = zipName.split("0B_REQUESTED_FILES/").pop()
        requestedFiles[code] = fileName
        this.sendMessage("REQUEST_FILES_FOR_NOTARIZED_PROJECT", fileName.split("/").pop(), code)
    })
}

messageProcessor.REQUEST_PDF_INVOICE = async function requestPDFInvoice(invoiceID, code) {
    const result = await serverActions.createPDFInvoice(invoiceID)
    requestedFiles[code] = result.documentPath
    this.sendMessage("REQUEST_PDF_INVOICE", path.basename(result.documentPath), code)
}

messageProcessor.REQUEST_TURNOVER_AMOUNT = function requestTurnoverAmount(month, year) {
    if (!hasPermissions("monthlyActions", this, "RequestTurnoverAmount")) return
    serverActions.getTurnoverAmountForMonth(month, year, amount => {
        this.sendMessage("REQUEST_TURNOVER_AMOUNT", amount)
    })
}

messageProcessor.REQUEST_PAYMENT_SHEETS_HISTORY = function requestPaymentSheetsHistory() {
    if (!hasPermissions("monthlyActions", this, "RequestPaymentSheetsHistory")) return
    serverActions.getPaymentSheetsHistory(history => {
        this.sendMessage("REQUEST_PAYMENT_SHEETS_HISTORY", history)
    })
}

messageProcessor.REQUEST_GENERATED_FILE = function requestGeneratedFile(details, code) {
    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    if (details.type === "MonthlyProjectsReport") {
        serverActions.generateMonthlyProjectsReport(details.month, details.year, () => {
            const fileName = `Monthly Projects Report - ${monthNames[details.month]} ${details.year}.xls`
            requestedFiles[code] = fileName
            this.sendMessage("REQUEST_GENERATED_FILE", fileName, code)
        })
    }

    if (details.type === "MonthlyProjectsReportForCheck") {
        const fileName = `Monthly Projects Report - ${monthNames[details.month]} ${details.year} - FOR CHECK.xls`
        requestedFiles[code] = fileName
        this.sendMessage("REQUEST_GENERATED_FILE", fileName, code)
    }

    if (details.type === "PaymentSheets") {
        serverActions.savePaymentSheets(details.month, details.year, details.exchangeRate, details.shouldNotifyEmployeesWithProblems, zipName => {
            const fileName = zipName.split("0B_REQUESTED_FILES/").pop()
            requestedFiles[code] = fileName
            this.sendMessage("REQUEST_GENERATED_FILE", fileName.split("/").pop(), code)
        })
    }

    if (details.type === "Turnover") {
        serverActions.saveTurnover(details.month, details.year, fileName => {
            requestedFiles[code] = fileName
            this.sendMessage("REQUEST_GENERATED_FILE", fileName, code)
        })
    }
}

messageProcessor.RESEND_DIGITAL_CERTIFICATION_OR_NOTARIZATION = function sendDigitalCertificationOrNotarization(projectFileID, email) {
    serverActions.sendDigitalCertificationOrNotarization(projectFileID, email)
}

function hasPermissions(permission, user, command, data) {
    if (!user.permissions[permission]) {
        guardian.trespass(command, user, data)
        return false
    }
    return true
}

messageProcessor.CREATE_MONTHLY_INVOICES = function createMonthlyInvoices(month, year) {
    if (!hasPermissions("monthlyActions", this, "CreateMonthlyInvoices")) return
    serverActions.createMonthlyInvoices(month, year, () => {
        // When completed, send the notification to the user
        this.sendMessage("CREATED_MONTHLY_INVOICES")
    })
}

messageProcessor.CREATE_PAYMENT_SHEETS = function createPaymentSheets(month, year) {
    if (!hasPermissions("monthlyActions", this, "CreatePaymentSheets")) return
    serverActions.createPaymentSheets(month, year, () => {
        // When completed, send the notification to the user
        this.sendMessage("CREATED_PAYMENT_SHEETS")
    })
}

messageProcessor.MARK_PAYMENT_SHEETS_AS_PAID = function markPaymentSheetsAsPaid(month, year, selectedPaymentMethod) {
    if (!hasPermissions("monthlyActions", this, "MarkPaymentSheetsAsPaid")) return
    serverActions.markPaymentSheetsAsPaid(month, year, selectedPaymentMethod, () => {
        // When completed, send the notification to the user
        this.sendMessage("MARKED_PAYMENT_SHEETS_AS_PAID", selectedPaymentMethod)
    })
}

messageProcessor.DEBUG = function debugFromClient(object) {
    log("DEBUG", object)
}

messageProcessor.RESET_PASSWORD = function resetPassword(userID, newPassword) {
    if (!newPassword) return guardian.trespass("ResetPasswordBlankPassword", this, { userID, newPassword })

    if (newPassword.length > 48) return guardian.trespass("ResetPasswordPasswordTooLong", this, { userID, newPassword })

    // If the reset is for my own user, allow it
    if (userID && userID === this.pk) {
        const firstHash = utils.md5(newPassword + "2147483648")
        const secondHash = utils.md5(firstHash + "TranwisePasswordDoubleHashSalt-$*")
        serverActions.updateObject(userID, "EMPLOYEES", "PASSWORD_HASH", secondHash)

        log("SECURITY", `=== ${this.fullName} reset the password for ${userID}: ${newPassword}`, true)
        return
    }

    // If the reset is not for my own user, first check if this user is a manager
    if (!this.isManager) return guardian.trespass("ResetPasswordTranslatorForAnotherUser", this, { userID, newPassword })

    // Then get the Employee with userID and make sure it's either Pending or Translator
    // Don't allow resetting the password of managers

    // First check if userID is a number
    if (!userID || isNaN(userID)) return guardian.trespass("ResetPasswordMissingUserID", this, { userID, newPassword })

    db.getObject("EMPLOYEES_DETAILS", userID, (table, employee) => {
        if (!employee) return guardian.trespass("ResetPasswordInvalidUserID", this, { userID, newPassword })

        if (![C_.etPending, C_.etTranslator].includes(employee.EMPLOYEE_TYPE)) return guardian.trespass("ResetPasswordWrongEmployeeType", this, { userID, newPassword })

        const firstHash = utils.md5(newPassword + "2147483648")
        const secondHash = utils.md5(firstHash + "TranwisePasswordDoubleHashSalt-$*")
        serverActions.updateObject(userID, "EMPLOYEES", "PASSWORD_HASH", secondHash)

        log("SECURITY", `=== ${this.fullName} reset the password for ${userID}: ${newPassword}`, true)
    })
}

messageProcessor.REQUEST_CHAT_HISTORY = function requestChatHistory(partnerID) {
    if (!this.pk) return
    if (!parseInt(partnerID, 10)) {
        log("SECURITY", `Requested chat history for invalid id "${partnerID}", pk = ${this.pk} `)
        return guardian.trespass("RequestInvalidChatHistory", this, { partnerID })
    }

    const fileName = `${Math.min(this.pk, partnerID)}-${Math.max(this.pk, partnerID)}.log`
    const filePath = config.chatLogsFolder + fileName

    fs.readFile(filePath, "utf8", (err, contents) => {
        if (err) this.sendMessage("REQUEST_CHAT_HISTORY", partnerID, contents)
        else this.sendMessage("REQUEST_CHAT_HISTORY", partnerID, contents)
    })
}

messageProcessor.REQUEST_ACTIVITY_LOG = function requestActivityLog(employeeID) {
    if (!hasPermissions("viewManagersActivity", this, "REQUEST_ACTIVITY_LOG")) return
    if (!employeeID) return

    const filePath = config.activityLogsFolder + employeeID + ".log"

    fs.readFile(filePath, "utf8", (err, contents) => {
        if (err || !contents || typeof contents != "string" || employeeID === 237) {
            this.sendMessage("REQUEST_ACTIVITY_LOG", employeeID, "")
            return
        }

        // Send the last 1MB of the log file
        this.sendMessage("REQUEST_ACTIVITY_LOG", employeeID, contents.length > 1000000 ? contents.slice(contents.length - 1000000) : contents)
    })
}

// Request all the details of the User's employee
messageProcessor.REQUEST_SELF_EMPLOYEE = function requestSelfEmployee(callbackID) {
    if (!this.pk) return

    this.listenForObject("EMPLOYEES_DETAILS_SELF", this.pk)
    db.getObject("EMPLOYEES_DETAILS_SELF", this.pk, (table, objectData) => {
        // Add chat tokens to each employee if needed
        if (table === "EMPLOYEES") addChatTokens(objectData)

        this.sendMessage("REQUEST_SELF_EMPLOYEE", table, objectData, callbackID)
    })
}

// Count how many requests for clients or employees have been made by the managers
// and send an email for every 20th request.
function processRequestCounts(tableView) {
    // Skip for Alex and Anita
    if ([237, 238].includes(this.pk)) return

    if (tableView === "CLIENTS_DETAILS") {
        this.clientRequestsCount = this.clientRequestsCount + 1 || 1
        if (this.clientRequestsCount % 20 === 0) {
            const subject = `Tranwise: Project manager ${this.fullName} requested data for ${this.clientRequestsCount} clients`

            const body = `Project manager ${this.fullName} requested data for ${this.clientRequestsCount} clients during this login session, started on ${utils
                .moment(this.loginTimestamp * 1000)
                .format("D MMM YYYY, HH:mm")}`

            serverActions.sendEmail(serverActions.settings("SYSTEM_EMAIL"), serverActions.settings("GENERAL_MANAGER_EMAIL"), subject, body)
        }
    }

    if (tableView === "EMPLOYEES_DETAILS_FULL") {
        this.employeeRequestsCount = this.employeeRequestsCount + 1 || 1
        if (this.employeeRequestsCount % 20 === 0) {
            const subject = `Tranwise: Project manager ${this.fullName} requested data for ${this.employeeRequestsCount} employees`
            const body = `Project manager ${this.fullName} requested data for ${this.employeeRequestsCount} employees during this login session, started on ${utils
                .moment(this.loginTimestamp * 1000)
                .format("D MMM YYYY, HH:mm")}`

            serverActions.sendEmail(serverActions.settings("SYSTEM_EMAIL"), serverActions.settings("GENERAL_MANAGER_EMAIL"), subject, body)
        }
    }
}

// Request all the details of an object
// Eg. all the details of an EMPLOYEES object
messageProcessor.REQUEST_OBJECT = function requestObject(tableViewName, request, callbackID) {
    if (!this.canRequestTableView(tableViewName)) return

    const pk = getPKFromRequest.call(this, request, tableViewName)
    if (!pk) return

    processRequestCounts.call(this, tableViewName)

    const tableView = tableViews[tableViewName]

    if (!tableView.Unlistenable) this.listenForObject(tableViewName, pk)
    db.getObject(tableViewName, pk, (table, objectData) => {
        if (!objectData) {
            if (!["PROJECTS_DETAILS", "EMPLOYEES_DETAILS"].includes(tableViewName)) log("ERROR", `Undefined object for request: ${tableViewName} - ${request}`)
            return
        }

        // If the tableView has an ownIDField property, check if the object's field matches the user's PK
        if (tableView.ownIDField && objectData && objectData[tableView.ownIDField] != this.pk) {
            guardian.trespass("RequestObjectWithDifferentOwnID", this, { tableViewName, pk })
            return
        }

        // Add chat tokens to each employee if needed
        if (table === "EMPLOYEES") addChatTokens(objectData)

        // Add some tokens in a few specific cases
        if (tableViewName === "TRANSLATION_DETAILS_TR") objectData.subprojectToken = utils.getDetailsToken("SUBPROJECTS", objectData.SUBPROJECT_ID)
        if (tableViewName === "SUBPROJECT_DETAILS_TR") objectData.projectToken = utils.getDetailsToken("PROJECTS", objectData.PROJECT_ID)

        if (tableView.includeDetailsTokens) objectData.t = utils.getDetailsToken(table, objectData.PK)

        this.sendMessage("REQUEST_OBJECT", table, objectData, callbackID)
    })
}

messageProcessor.COMPLETED_LOGIN = function completedLogin() {}

// Request a list of objects
// Eg. EMPLOYEES_LIST (just the list - pk, employee_type, first_name, last_name)
messageProcessor.REQUEST_DATABASE_OBJECTS = function requestDatabaseObjects(tableViewName) {
    if (tableViewName.includes("SETTINGS")) log("GLOBAL", "Started synchronization: " + this.fullName + " " + this.token, true)

    if (!this.canRequestTableView(tableViewName)) return

    const tableView = tableViews[tableViewName]

    // If the tableView requires details token, requesting of multiple objects is not allowed
    if (tableView.requiresDetailsToken) return guardian.trespass("RequestDatabaseObjectsForInvalidTableView", this, { tableViewName })

    // If this tableView has a token associated with it, generate the token and add it to the upload tokens list
    const uploadToken = this.getUploadTokenForTableView(tableViewName)

    // Some tableviews (EMPLOYEE_RESUME_TR, EMPLOYEE_DIPLOMA_TR) are used just for getting an upload token
    // so send a blank list of objects and return
    if (tableView.onlyForToken) {
        this.sendMessage("REQUEST_DATABASE_OBJECTS", tableViewName, tableView.table, [], uploadToken)
        return
    }

    // Listen for all the objects of this tableView
    if (!tableView.Unlistenable) this.listenForObject(tableViewName, 0)
    db.getObjects(
        tableViewName,
        (table, objects) => {
            // Add chat tokens to each employee if needed
            if (table === "EMPLOYEES") addChatTokens(objects)

            if (tableView.includeDetailsTokens) addDetailsTokens(objects, table)

            this.sendMessage("REQUEST_DATABASE_OBJECTS", tableViewName, table, objects, uploadToken)
        },
        this.pk
    )
}

messageProcessor.REQUEST_OBJECTS_FOR_EMPLOYEE = function requestObjectsForEmployee(tableViewName, callbackID) {
    if (!this.canRequestTableView(tableViewName)) return

    const tableView = tableViews[tableViewName]

    // If the tableView requires details token, requesting of multiple objects is not allowed
    if (tableView.requiresDetailsToken) return guardian.trespass("RequestObjectsForEmployeeForInvalidTableView", this, { tableViewName })

    // Listen for all the objects of this tableView.
    if (!tableView.Unlistenable) this.listenForObject(tableViewName, 0)
    db.getObjects(
        tableViewName,
        (table, objects) => {
            if (tableView.includeDetailsTokens) addDetailsTokens(objects, table)
            this.sendMessage("REQUEST_OBJECTS", table, objects, callbackID)
        },
        this.pk
    )
}

// Request the objects related to an object
// Eg. EMPLOYEES_LANGUAGES with EMPLOYEE_ID = id
messageProcessor.REQUEST_OBJECTS_FOR_ID = async function requestObjectsForID(tableViewName, request, callbackID) {
    if (!this.canRequestTableView(tableViewName)) return
    const tableView = tableViews[tableViewName]

    const pk = getPKFromRequest.call(this, request, tableViewName)
    if (!pk) return

    // If the tableView requires the translator to be assigned (eg. EMPLOYEES_FOR_SUBPROJECT_TR)
    // check if the translator is assigned before sending the data
    if (tableView.requiresAssignment) {
        const assignment = await db.getObjectWithQuery(
            `SELECT STATUS FROM TRANSLATIONS JOIN SUBPROJECTS ON SUBPROJECT_ID = SUBPROJECTS.PK AND EMPLOYEE_ID = ${this.pk} AND SUBPROJECT_ID = ${pk}`
        )
        if (!assignment || assignment.STATUS < 1) return guardian.trespass("RequestObjectsWhenNotAssigned", this, { tableViewName, pk })
    }

    db.getObjectsForID.call(this, tableView, pk, (table, objects) => {
        // Listen for all the objects that we got from the database
        if (!tableView.Unlistenable) this.listenForObjects(tableViewName, objects)

        // Add chat tokens to each employee if needed
        if (table === "EMPLOYEES") addChatTokens(objects)

        if (tableView.includeDetailsTokens) addDetailsTokens(objects, table)

        this.sendMessage("REQUEST_OBJECTS", table, objects, callbackID)
    })
}

// A special method for translators to request translated and proofread files when they are assigned
messageProcessor.REQUEST_TRANSLATED_FILES = async function requestTranslatedFiles(subprojectID, callbackID) {
    if (!subprojectID || typeof subprojectID != "number" || subprojectID <= 0) return guardian.trespass("RequestTranslatedFilesWithWrongID", this, { subprojectID })

    // Check if the translator is assigned, otherwise they can't request the translated and proofread files
    const assignment = await db.getObjectWithQuery(
        `SELECT STATUS FROM TRANSLATIONS JOIN SUBPROJECTS ON SUBPROJECT_ID = SUBPROJECTS.PK AND EMPLOYEE_ID = ${this.pk} AND SUBPROJECT_ID = ${subprojectID}`
    )
    if (!assignment || assignment.STATUS < 1) return guardian.trespass("RequestTranslatedFilesWhenNotAssigned", this, { subprojectID })

    db.getObjectsWithCriteria("TRANSLATED_PROJECTS_FILES_FOR_SUBPROJECT_TR", { SUBPROJECT_ID: subprojectID }, (table, objects) => {
        this.sendMessage("REQUEST_OBJECTS", table, objects, callbackID)
    })
}

// A special method for translators to request project messages when they are assigned
messageProcessor.REQUEST_PROJECTS_MESSAGES_FOR_TRANSLATOR = async function requestProjectMessagesForTranslator(subprojectID, callbackID) {
    if (!subprojectID || typeof subprojectID != "number" || subprojectID <= 0) return guardian.trespass("RequestProjectMessagesWithWrongID", this, { subprojectID })

    // Check if the translator is assigned, otherwise they can't request the project messages
    const assignment = await db.getObjectWithQuery(
        `SELECT STATUS FROM TRANSLATIONS JOIN SUBPROJECTS ON SUBPROJECT_ID = SUBPROJECTS.PK AND EMPLOYEE_ID = ${this.pk} AND SUBPROJECT_ID = ${subprojectID}`
    )
    if (!assignment || assignment.STATUS < 1) return guardian.trespass("RequestProjectMessagesWhenNotAssigned", this, { subprojectID })

    db.getObjectsWithCriteria("PROJECTS_MESSAGES_FOR_SUBPROJECT_TR", { SUBPROJECT_ID: subprojectID, OWN_ID: this.pk }, (table, objects) => {
        this.sendMessage("REQUEST_OBJECTS", table, objects, callbackID)
    })
}

// Request a list of objects with some specific criteria
// Eg. EMPLOYEES (just the list - pk, employee_type, first_name, last_name)
messageProcessor.REQUEST_OBJECTS = function requestObjects(tableViewName, criteria, callbackID) {
    if (!this.canRequestTableView(tableViewName)) return
    const tableView = tableViews[tableViewName]

    // REQUEST_OBJECTS allows adding custom criteria by the user. In order to protect the database,
    // the tableViews that are for translators need to have the AllowsCriteria property set,
    // so translators can't request other tableViews using this message (REQUEST_OBJECTS) and
    // pass abusive criteria.
    if (this.isTranslator && !tableView.AllowsCriteria) return guardian.trespass("RequestObjectsThatDontAllowCriteria", this, { tableViewName })

    // If the tableView requires details token, requesting of multiple objects is not allowed
    if (tableView.requiresDetailsToken) return guardian.trespass("RequestObjectsForInvalidTableView", this, { tableViewName })

    if (!criteria) criteria = {}
    criteria.OWN_ID = this.pk

    db.getObjectsWithCriteria(tableViewName, criteria, (table, objects) => {
        // Listen for all the objects that we got from the database
        if (!tableView.Unlistenable) this.listenForObjects(tableViewName, objects)

        // Add chat tokens to each employee if needed
        if (table === "EMPLOYEES") addChatTokens(objects)

        if (tableView.includeDetailsTokens) addDetailsTokens(objects, table)

        // Send the message with the objects
        this.sendMessage("REQUEST_OBJECTS", table, objects, callbackID)
    })
}

messageProcessor.CHAT = function chat(data) {
    if (!this.pk || this.pk != data.senderID) {
        guardian.trespass("FakeChatSender", this, data)
        return
    }

    if (!data.recipientID) {
        guardian.trespass("MissingChatRecipient", this, data)
        return
    }

    if (data.token != utils.getChatToken(data.recipientID)) {
        guardian.trespass("WrongChatToken", this, data)
        return
    }

    // Delete the token, so it's not forwarded to the recipient
    delete data.token

    // Add a token for the sender. In case the recipient doesn't have the sender employee loaded,
    // they will request their details (name, online status) and they need to provide this token.
    data.senderToken = utils.getDetailsToken("EMPLOYEES", data.senderID)

    this.forwardMessage("CHAT", data)

    // Log the message to a file like 123-456.log which contains the conversations between employees
    // with PKs 123 and 456. Always the lower PK is first and the higher PK is second.
    // So all messages set from 123 to 456 and from 456 to 123 are logged to the file "123-456.log"
    // The messages are marked with "A:" for the lower PK and "B:" for the higher PK
    if (data.text) {
        const logFileName = `${Math.min(data.senderID, data.recipientID)}-${Math.max(data.senderID, data.recipientID)}.log`
        const senderCode = data.senderID === Math.min(data.senderID, data.recipientID) ? "A" : "B"
        const stringToLog = `[${utils.formatNow("M/D/YYYY HH:mm:ss")}] ${senderCode}: ${data.text}`
        fs.appendFile(config.chatLogsFolder + logFileName, `${stringToLog}\n`, "utf8", err => {
            if (err) console.log(err)
        })
    }

    if (data.text) serverActions.processChat(data, this.fullName)
}

messageProcessor.SERVER_TIME = function serverTime() {
    const timestamp = Math.floor(Date.now() / 1000)
    // This ensures that we send the real server time, not the UTC timestamp
    const timezoneOffset = new Date().getTimezoneOffset() * 60
    this.sendMessage("SERVER_TIME", timestamp - timezoneOffset)
}

messageProcessor.CLIENT_ERROR = function clientError(data) {
    // "this" is bound to the user, so pass it on
    clientErrorManager.processClientError.call(this, data)
}

messageProcessor.PING = function ping() {
    this.sendMessage("PONG")
}

function getPKFromRequest(request, tableViewName) {
    if (!request || !tableViewName) return

    const tableView = tableViews[tableViewName]
    if (!tableView) return

    // The request can be either a number (the PK of the object) or an object with two properties:
    // PK and token
    // The token is required when requesting objects by translators, to make sure that they don't
    // request things they don't have access to
    let pk, token
    if (typeof request === "number") pk = request
    if (typeof request === "string" && +request == request) pk = request

    if (typeof request === "object") {
        if (typeof request.PK === "number") pk = request.PK
        if (typeof request.PK === "string" && +request.PK == request.PK) pk = request.PK

        if (!pk) return guardian.trespass("InvalidRequestObject", this, request)

        token = request.token
        if (!token) return guardian.trespass("MissingTokenOnRequestObject", this, request)

        // Get the table for the token. Most of the tableViews have requiresDetailsToken: true,
        // which means the detailsToken is generated based on the tableView's table.
        // But some tableViews have requiresDetailsToken: "PROJECTS", which means that the token
        // is generated based on the specified table name, not the tableView's table
        let tableForToken = tableView.table
        if (typeof tableView.requiresDetailsToken === "string") tableForToken = tableView.requiresDetailsToken

        // Check if the token matches the PK (only if the tableView requires details token)
        if (tableView.requiresDetailsToken) if (token != utils.getDetailsToken(tableForToken, pk)) return guardian.trespass("WrongDetailsToken", this, { request, tableViewName })
    }

    // If the tableView requires a details token, check if we received it
    if (tableView.requiresDetailsToken && !token) return guardian.trespass("MissingDetailsToken", this, tableViewName + " " + JSON.stringify(request))

    if (!pk || pk <= 0) return guardian.trespass("RequestObjectForInvalidPK", this, request)

    return pk
}

function addChatTokens(employees) {
    if (Array.isArray(employees))
        // We got an array of objects
        employees.forEach(employee => (employee.chatToken = utils.getChatToken(employee.PK)))
    // We got a single object
    else if (employees) employees.chatToken = utils.getChatToken(employees.PK)
}

function addDetailsTokens(objects, tableName) {
    if (Array.isArray(objects))
        // We got an array of objects
        objects.forEach(object => (object.t = utils.getDetailsToken(tableName, object.PK)))
    // We got a single object
    else if (objects) objects.t = utils.getDetailsToken(tableName, objects.PK)
}

module.exports = messageProcessor
