import messageProcessor from "../Shared/ClientMessageProcessorBase"
import store from "../Shared/StoreBase"
import utils from "../Shared/UtilsBase"
import C_ from "./Constants"
import cmg from "./ConnectionManager"
import moment from "moment"
import Vue from "vue"

messageProcessor.performDatabasePreInsertActions = function(tableView, table) {
    // Does a pseudo-compression on the CLIENTS table
    if (table === "CLIENTS" && tableView != "CLIENTS_LAST_TWILIO_PROJECT_ID" && tableView != "CLIENTS_INVOICED_ONLINE") {
        let fields = [
            { from: "A", to: "PK" },
            { from: "B", to: "CLIENT_NAME" },
            { from: "C", to: "NAME_TAG" },
            { from: "D", to: "DIVISION_ID" },
            { from: "E", to: "IS_LOCKED_FOR_PROJECTS" },
            { from: "F", to: "PAYER_TYPE" },
            { from: "G", to: "PAYMENT_TERMS" }
        ]
        return { fields, insertFunction: "insertOrUpdateObject" }
    }
}

async function ensureExistence(storeAccessor, pk, tableView) {
    let result = store[storeAccessor](pk)
    if (!result) result = await cmg.requestObjectWithPK(pk, tableView)
    return result
}

// Add processing only for managers here

// This function is executed when receiving an UPDATE_OBJECT message, before the object's value is updated the store,
// and it contains actions that have to be taken before the object is updated into the store
messageProcessor.actions.updateObjectPreActions = async function(object, pk, table, field, value) {
    if (table === "PROJECTS" && ["STATUS", "PREPAYMENT_STATUS"].includes(field)) {
        if (!object || !object.STATUS) await cmg.requestObjectWithPK(pk, "PROJECTS_DETAILS")
    }

    if (table === "EMPLOYEES" && field === "ONLINE_STATUS") {
        if (value === C_.eoOffline && store.myself && pk === store.myself.PK) {
            // If we got back an online status for myself = 0 (because of a disconnect in another client),
            // send the current status (online, idle) back to the server.
            if (store.myself && store.myself.ONLINE_STATUS != C_.eoOffline) cmg.updateObject(store.myself, "ONLINE_STATUS", store.myself.ONLINE_STATUS)
        }
    }
}

messageProcessor.actions.updateObjectActions = async function(object, pk, table, field, value) {
    if (table === "PROJECTS" && field === "PREPAYMENT_STATUS" && value === C_.ppsPrepaymentDone) {
        if (!object) object = await cmg.requestObjectWithPK(pk, "PROJECTS_DETAILS")

        store.addNotification("PrepaymentDone", "Prepayment for project " + object.PROJECT_NUMBER, "has been made by the client", {
            text: `Prepayment for project ${object.PROJECT_NUMBER}\nhas been made by the client`,
            project: object
        })
    }

    if (table === "PROJECTS" && field === "STATUS" && value === C_.psReopened && object) object.isBeingCompleted = false

    if (table === "PREQUOTES" && field === "STATUS" && [C_.pqCompleted, C_.pqCancelled].includes(value)) {
        store.eventBus.$emit("prequoteStatusChange")
    }

    if (table === "PROJECTS_FILES" && field === "CLIENT_APPROVAL_STATUS") {
        if (![C_.casApproved, C_.casNotApproved, C_.casEdited].includes(value)) return

        if (!object) object = await cmg.requestObjectWithPK(pk, "PROJECTS_FILES_DETAILS")
        let project = store.project(object.PROJECT_ID)
        if (!project) project = await cmg.requestObjectWithPK(object.PROJECT_ID, "PROJECTS_DETAILS")

        if (value === C_.casApproved)
            store.addNotification("ClientApprovedFile", "The client has approved a file", "for certified project " + project.PROJECT_NUMBER, {
                text: `The client has approved a file\nfor certified project ${project.PROJECT_NUMBER}.`,
                project: project
            })
        if (value === C_.casEdited)
            store.addNotification("ClientEditedFile", "The client has edited a file", "for certified project " + project.PROJECT_NUMBER, {
                text: `The client has approved a file\nfor certified project ${project.PROJECT_NUMBER}.`,
                project: project
            })
        if (value === C_.casNotApproved)
            store.addNotification("ClientHadCommentsForFile", "The client had comments", "about certified project " + project.PROJECT_NUMBER, {
                text: `The client had comments\nabout certified project ${project.PROJECT_NUMBER}.`,
                project: project
            })
    }

    if (table === "TRANSLATIONS") {
        if (!["REPLY", "CONFIRMED", "STATUS_TEXT", "COMMENTS"].includes(field)) return

        if (!object) object = await cmg.requestObjectWithPK(pk, "TRANSLATIONS_DETAILS")

        let employee = store.employee(object.EMPLOYEE_ID)
        if (!employee) employee = await cmg.requestObjectWithPK(object.EMPLOYEE_ID, "EMPLOYEES_DETAILS")

        let subproject = store.subproject(object.SUBPROJECT_ID)
        if (!subproject) subproject = await cmg.requestObjectWithPK(object.SUBPROJECT_ID, "SUBPROJECTS_DETAILS")

        if (!subproject) return

        let project = store.project(subproject.PROJECT_ID)
        if (!project) project = await cmg.requestObjectWithPK(subproject.PROJECT_ID, "PROJECTS_DETAILS")

        if (field === "REPLY") {
            const replies = { 1: "None", 2: "Translate", 3: "Proofread", 4: "Trans & Proof" }

            store.addNotification(
                "Translation",
                employee.fullName() + " replied again to",
                `${project.PROJECT_NUMBER}-${store.languageName(subproject.LANGUAGE_ID).substring(0, 3)}: ${replies[value]}`,
                {
                    text: `${employee.fullName()} replied again\nto project ${project.PROJECT_NUMBER} - ${store.languageName(subproject.LANGUAGE_ID)}\n\n${replies[value]}`,
                    project: project
                }
            )
        }

        if (field === "CONFIRMED" && value === true)
            store.addNotification(
                "Translation",
                employee.fullName() + " confirmed",
                `working on ${project.PROJECT_NUMBER} - ${store.languageName(subproject.LANGUAGE_ID).substring(0, 3)}`,
                {
                    text: `${employee.fullName()} confirmed\nworking on ${project.PROJECT_NUMBER} - ${store.languageName(subproject.LANGUAGE_ID)}`,
                    project: project
                }
            )

        if (field === "STATUS_TEXT" && utils.isNotBlank(value) && value != "<$A$>")
            store.addNotification(
                "Translation",
                employee.fullName() + " updated",
                `the status for ${project.PROJECT_NUMBER} - ${store.languageName(subproject.LANGUAGE_ID).substring(0, 3)}`,
                {
                    title: `${employee.fullName()} updated\nthe status for ${project.PROJECT_NUMBER} - ${store.languageName(subproject.LANGUAGE_ID)}`,
                    text: value,
                    project: project
                }
            )

        if (field === "COMMENTS" && utils.isNotBlank(value) && project.STATUS === C_.psReopened)
            store.addNotification(
                "Translation",
                employee.fullName() + " added",
                `comments for ${project.PROJECT_NUMBER} - ${store.languageName(subproject.LANGUAGE_ID).substring(0, 3)}`,
                {
                    title: `${employee.fullName()} added\ncomments for ${project.PROJECT_NUMBER} - ${store.languageName(subproject.LANGUAGE_ID)}`,
                    text: value,
                    project: project
                }
            )
    }

    if (table === "CLIENTS") {
        if (field === "CLIENT_NAME")
            object.filterClientName = value
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")

        if (field === "LAST_TWILIO_PROJECT_ID") {
            if (!store.project(value)) await cmg.requestObjectWithPK(value, "PROJECTS_DETAILS")
            for (let thread of store.twilioThreads) {
                let foundMessage = false
                for (let message of thread.messages) {
                    if (message.CLIENT_ID === pk) {
                        Vue.set(thread, "lastProject", store.project(value))
                        Vue.set(thread, "partnerString", store.partnerStringForTwilioThread(thread))
                        foundMessage = true
                        break
                    }
                }
                if (foundMessage) break
            }
        }
    }

    if (table === "TWILIO_MESSAGES" && field === "CLIENT_ID") {
        for (let thread of store.twilioThreads) {
            let foundMessage = false
            for (let message of thread.messages) {
                if (message.PK === pk) {
                    Vue.set(thread, "client", store.client(value))
                    Vue.set(thread, "partnerString", store.partnerStringForTwilioThread(thread))
                    foundMessage = true
                    break
                }
            }
            if (foundMessage) break
        }
    }
}

// This function is executed when receiving an INSERT_OBJECT message, before the object is added to the store,
// and it contains actions that have to be taken before the object is inserted into the store
// eg. loading the employee for a translation if it's not available
messageProcessor.actions.insertObjectPreActions = async function(object) {
    if (object.table === "TRANSLATIONS") {
        const employee = await ensureExistence("employee", object.EMPLOYEE_ID, "EMPLOYEES_DETAILS")
        if (!employee.RATE_TRANSLATION || !employee.RATE_PROOFREADING) await cmg.requestObjectWithPK(object.EMPLOYEE_ID, "EMPLOYEES_DETAILS")
        const subproject = await ensureExistence("subproject", object.SUBPROJECT_ID, "SUBPROJECTS_DETAILS")
        await ensureExistence("project", subproject.PROJECT_ID, "PROJECTS_DETAILS")
    }

    if (object.table === "PREQUOTES") {
        if (object.STATUS === undefined) object.STATUS = 0
    }

    if (object.table === "PROJECTS_FILES") {
        await ensureExistence("project", object.PROJECT_ID, "PROJECTS_DETAILS")
        if (object.EMPLOYEE_ID) await ensureExistence("employee", object.EMPLOYEE_ID, "EMPLOYEES_DETAILS")
        if (object.SUBPROJECT_ID) await ensureExistence("subproject", object.SUBPROJECT_ID, "SUBPROJECTS_DETAILS")
    }

    if (object.table === "PROJECTS_MESSAGES") {
        if (object.PROJECT_ID) await ensureExistence("project", object.PROJECT_ID, "PROJECTS_DETAILS")
        if (object.SENDER == parseInt(object.SENDER, 10)) await ensureExistence("employee", object.SENDER, "EMPLOYEES_DETAILS")
        if (object.RECIPIENT == parseInt(object.RECIPIENT, 10)) await ensureExistence("employee", object.RECIPIENT, "EMPLOYEES_DETAILS")
    }

    if (object.table === "EMPLOYEES_MESSAGES" && object.TO_ID === store.myself.PK) {
        await ensureExistence("employee", object.FROM_ID, "EMPLOYEES_DETAILS")
    }

    if (object.table === "EMPLOYEES_FILES" && object.TO_ID === store.myself.PK) {
        await ensureExistence("employee", object.FROM_ID, "EMPLOYEES_DETAILS")
    }
}

// This function is executed when receiving an INSERT_OBJECT message, after the object was added to the store
messageProcessor.actions.insertObjectActions = async function(object) {
    if (object.table === "TRANSLATIONS") {
        const employee = store.employee(object.EMPLOYEE_ID)
        const subproject = store.subproject(object.SUBPROJECT_ID)
        const project = store.project(subproject.PROJECT_ID)

        const replies = { 1: "None", 2: "Translate", 3: "Proofread", 4: "Trans & Proof" }

        if (object.REPLY > 0)
            store.addNotification(
                "Translation",
                employee.fullName() + " replied to",
                `${project.PROJECT_NUMBER}-${store.languageName(subproject.LANGUAGE_ID).substring(0, 3)}: ${replies[object.REPLY]}`,
                {
                    text: `${employee.fullName()} replied \nto project ${project.PROJECT_NUMBER} - ${store.languageName(subproject.LANGUAGE_ID)}\n\n${replies[object.REPLY]}`,
                    project: project
                }
            )
    }

    if (object.table === "PROJECTS_FILES") {
        if (![C_.pfTranslated, C_.pfProofread, C_.pfReopenedTranslated, C_.pfReopenedProofread].includes(object.FILE_TYPE)) return

        const project = store.project(object.PROJECT_ID)
        const employee = store.employee(object.EMPLOYEE_ID)
        const subproject = store.subproject(object.SUBPROJECT_ID)

        if (project.WORKING_MANAGER_ID != store.myself.PK) return

        const fileTypeString = [C_.pfTranslated, C_.pfReopenedTranslated].includes(object.FILE_TYPE) ? "translation" : "proofreading"
        store.addNotification(
            "Translation",
            employee.fullName() + " uploaded",
            `a ${fileTypeString} for ${project.PROJECT_NUMBER}-${store.languageName(subproject.LANGUAGE_ID).substring(0, 3)}`,
            {
                text: `${employee.fullName()} uploaded \na ${fileTypeString} for ${project.PROJECT_NUMBER} - ${store.languageName(subproject.LANGUAGE_ID)}\n\n`,
                project: project
            }
        )
    }

    if (object.table === "PROJECTS_HISTORY") {
        if (object.ACTION === C_.phSendFinalFile) {
            let project = store.project(object.PROJECT_ID)
            if (!project) project = await cmg.requestObjectWithPK(object.PROJECT_ID, "PROJECTS_DETAILS")

            let employee = store.employee(object.EMPLOYEE_ID)
            if (!employee) employee = await cmg.requestObjectWithPK(object.EMPLOYEE_ID, "EMPLOYEES_DETAILS")

            store.addNotification("DeliveredFile", `${employee.FIRST_NAME} delivered a file`, `for ${project.PROJECT_NUMBER} at ${moment(new Date()).format("HH:mm")}`, {
                text: `${employee.FIRST_NAME} delivered a file for ${project.PROJECT_NUMBER} at ${moment(new Date()).format("HH:mm")}`,
                project: project
            })
        }
    }

    if (object.table === "PROJECTS_MESSAGES") {
        const project = store.project(object.PROJECT_ID)

        if (object.RECIPIENT === "T2C" && object.SENDER != store.myself.PK)
            store.addNotification("IMPORTANT", object.senderFirstName() + " added a message", "for the client about " + project.PROJECT_NUMBER, {
                title: object.sender() + " added a message\nfor the client about project " + project.PROJECT_NUMBER,
                message: object.MESSAGE,
                projectID: object.PROJECT_ID,
                isProjectMessage: true
            })

        if (object.SENDER === "C2T")
            store.addNotification("IMPORTANT", "The client of project " + project.PROJECT_NUMBER, "added a message for the translator", {
                title: "The client of project " + project.PROJECT_NUMBER + " has added\na message for the translator / deadline team",
                message: object.MESSAGE,
                projectID: object.PROJECT_ID,
                isProjectMessage: true
            })

        if (object.SENDER === "CLR")
            store.addNotification("IMPORTANT", "The client of reopened project " + project.PROJECT_NUMBER, "has added a message", {
                title: "The client of reopened project " + project.PROJECT_NUMBER + "\nhas added a message",
                message: object.MESSAGE,
                projectID: object.PROJECT_ID,
                isProjectMessage: true
            })
        if (object.RECIPIENT === "FFT")
            store.addNotification("FEEDBACK", "Feedback for translator project " + project.PROJECT_NUMBER, "", {
                title: "Feedback for translator project " + project.PROJECT_NUMBER + "\n",
                message: object.MESSAGE,
                projectID: object.PROJECT_ID,
                isProjectMessage: true
            })
        if (["DM", "AM", "GM", "CM", "MM", "MT"].includes(object.RECIPIENT) && object.SENDER != store.myself.PK)
            store.addNotification("IMPORTANT", "Message for " + object.recipient(), project ? "about project " + project.PROJECT_NUMBER : "from " + object.sender(), {
                title: "Message for " + object.recipient() + (project ? "\nabout project " + project.PROJECT_NUMBER : "\nfrom " + object.sender()),
                message: object.MESSAGE,
                projectID: object.PROJECT_ID,
                isForTemplateProject: project && project.WEBSITE_ORDER_ID,
                isProjectMessage: true
            })

        if (object.RECIPIENT === store.myself.PK && object.SENDER != store.myself.PK)
            store.addNotification("IMPORTANT", "You received a message", project ? "about project " + project.PROJECT_NUMBER : "from " + object.sender(), {
                title: "You received a message from " + object.sender() + (project ? "\nabout project " + project.PROJECT_NUMBER : "\nfrom " + object.sender()),
                message: object.MESSAGE,
                projectID: object.PROJECT_ID,
                isProjectMessage: true
            })
    }

    if (object.table === "CLIENTS") {
        if (!object.filterClientName)
            object.filterClientName = (object.CLIENT_NAME.trim() || "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
    }

    if (object.table === "PREQUOTES") {
        store.addNotification("IMPORTANT", object.WEBSITE_ORDER_ID ? "New template shop prequote" : "New prequote", "PQ-" + object.PK, {
            title: "Prequote PQ-" + object.PK,
            isForTemplateProject: object.WEBSITE_ORDER_ID,
            message: object.WEBSITE_ORDER_ID
                ? "A new prequote has been added by a client.\n\nNote: This is a template shop prequote."
                : "A new prequote has been added by a client."
        })
    }

    if (object.table === "TWILIO_MESSAGES") {
        if (object.SENDER_ID === 0) {
            store.addNotification("IMPORTANT", "Twilio message from " + object.PHONE_NUMBER, utils.returnsToSpaces(object.MESSAGE), {
                title: "Twilio message from " + object.PHONE_NUMBER,
                message: object.MESSAGE || "Attachment",
                twilioMessageID: object.PK
            })
            Vue.set(store, "showNewTwilioIcon", true)
        }

        let didFindThread = false
        for (let thread of store.twilioThreads) {
            if (thread.messages[0].PHONE_NUMBER === object.PHONE_NUMBER && thread.messages[0].DIVISION_ID === object.DIVISION_ID) {
                thread.messages.push(object)
                thread.lastMessage = object
                didFindThread = true
                break
            }
        }
        if (!didFindThread) store.twilioThreads.unshift({ PK: object.PK, messages: [object], lastMessage: object, receivedAllMessages: true, partnerString: object.PHONE_NUMBER })
    }

    if (object.table === "MB_THREADS") {
        store.addNotification("MESSAGE_BOARD", "New thread in the message board", object.SUBJECT)
    }

    if (object.table === "EMPLOYEES_MESSAGES" && object.TO_ID === store.myself.PK) {
        const employee = store.employee(object.FROM_ID)
        store.addNotification("IMPORTANT", "You received a message from", employee.fullName(), {
            title: "Message from " + employee.fullName(),
            message: object.MESSAGE,
            employeeMessage: object,
            markMessageAsRead: true
        })
    }

    if (object.table === "EMPLOYEES_FILES" && object.TO_ID === store.myself.PK) {
        const employee = store.employee(object.FROM_ID)
        store.addNotification("IMPORTANT", "New file from", employee.fullName(), {
            title: "You received a file from\n" + employee.fullName(),
            employeeFile: object
        })
    }
}

messageProcessor.REQUEST_FILES_FOR_NOTARIZED_PROJECT = function(fileName, requestID) {
    if (!cmg.requestedFilesIDs.includes(requestID)) return

    const file = { requestID, FILE_NAME: fileName }
    store.eventBus.$emit("downloadRequestedFile", file)
    store.eventBus.$emit("showDownloadProgress", file)
}

messageProcessor.REQUEST_PDF_INVOICE = function(fileName, requestID) {
    if (!cmg.requestedFilesIDs.includes(requestID)) return

    const file = { requestID, FILE_NAME: fileName }
    store.eventBus.$emit("downloadRequestedFile", file)
    store.eventBus.$emit("showDownloadProgress", file)
}

messageProcessor.REQUEST_GENERATED_FILE = function(fileName, requestID) {
    if (!cmg.requestedFilesIDs.includes(requestID)) return

    const file = { requestID, FILE_NAME: fileName }
    store.eventBus.$emit("downloadRequestedFile", file)
    store.eventBus.$emit("showDownloadProgress", file)
}

messageProcessor.CREATED_PAYMENT_SHEETS = function() {
    store.eventBus.$emit("createdPaymentSheets")
}

messageProcessor.CREATED_MONTHLY_INVOICES = function() {
    store.eventBus.$emit("createdMonthlyInvoices")
}

messageProcessor.MARKED_PAYMENT_SHEETS_AS_PAID = function(selectedPaymentMethod) {
    store.eventBus.$emit("markedPaymentSheetsAsPaid", selectedPaymentMethod)
}

messageProcessor.REQUEST_TURNOVER_AMOUNT = function(amount) {
    store.eventBus.$emit("receivedTurnoverAmount", amount)
}

messageProcessor.REQUEST_PAYMENT_SHEETS_HISTORY = function(history) {
    store.eventBus.$emit("receivedPaymentSheetsHistory", history)
}

messageProcessor.REQUEST_ACTIVITY_LOG = function(employeeID, activityLog) {
    const employee = store.employee(employeeID)
    if (!employee) return

    // We receive here the last 1MB of activity, which might be truncated, so use only full lines
    employee.activityLog = "\n" + activityLog.slice(activityLog.indexOf("\n[") + 1)
    store.eventBus.$emit("receivedActivityLog", employeeID)
}

export default messageProcessor