import store from "../../Shared/StoreBase"
import { setTWObjectPrototypeFunctions } from "./TWObject"
import storeActions from "./StoreActions"

setTWObjectPrototypeFunctions(store)

Object.assign(store.warehouse, {
    divisions: [],
    projectsHistory: [],
    projectsServices: [],
    projectsPayments: [],
    projectsRefunds: [],
    tipsManagers: [],
    tipsFilesManagers: [],
    employeesHolidays: [],
    employeesPaymentCorrections: [],
    certificateTemplates: [],
    prequotes: [],
    twilioMessages: [],
    smsTemplates: [],
    invoiceReminders: [],
    pendingChats: []
})

Object.assign(store, storeActions)

store.build()

store.computeProjectCompletionStatuses = function(vm) {
    for (let project of this.projects) vm.$set(project, "completionStatus", project.completionStatusCalculation())
}

store.addObjectsMetadata = function() {
    // Add filter text to invoices
    this.invoices.forEach(invoice => {
        if (!invoice.filterText) {
            invoice.filterText = invoice.invoiceNumber()
            const client = invoice.client()
            if (client) {
                invoice.filterText += " " + client.CLIENT_NAME.toLowerCase()
                invoice.clientNameWithTagText = client.CLIENT_NAME
                if (client.NAME_TAG) invoice.clientNameWithTagText += ` [ ${client.NAME_TAG} ]`
            }
        }
    })

    // Add filter name for client
    this.clients.forEach(client => {
        if (!client.CLIENT_NAME.trim()) return
        if (!client.filterClientName) {
            client.filterClientName = client.CLIENT_NAME.trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
        }
    })
}

store.partnerStringForTwilioThread = function(thread) {
    let partnerString = thread.lastMessage.PHONE_NUMBER
    if (thread.client) partnerString = thread.client.CLIENT_NAME
    if (thread.lastProject) partnerString += `  /  ${thread.lastProject.PROJECT_NUMBER}`
    return partnerString
}

store.buildTwilioThreads = function() {
    let threads = {}

    // Make a list of threads based on the messages' PHONE_NUMBER. It's a dictionary with the PHONE_NUMBER as the key
    store.twilioMessages.forEach(twm => {
        if (!twm.PK) return
        let key = twm.PHONE_NUMBER + '__' + twm.DIVISION_ID;
        const thread = threads[key]
        // If we already have a thread with this number, just add the message it it
        if (thread) {
            thread.messages.push(twm)
        }
        // Otherwise create a thread and add it to the threads list
        else {
            threads[key] = { messages: [twm] }
        }
    })

    const threadsList = Object.values(threads)

    // For each of the created threads, sort the messages, set the last message (to be displayed in the list)
    // set the client name (if any) and the project number (if any)
    threadsList.forEach(thread => {
        // Sort the messages
        thread.messages.sort((a, b) => a.PK - b.PK)

        thread.lastMessage = thread.messages[thread.messages.length - 1]

        // Set the PK, to be used as key in the list
        thread.PK = thread.messages[0].PK

        // Set the client
        for (let message of thread.messages) {
            if (message.CLIENT_ID) {
                thread.client = store.client(message.CLIENT_ID)
                break
            }
        }

        // Set the project
        if (thread.client && thread.client.LAST_TWILIO_PROJECT_ID) thread.lastProject = store.project(thread.client.LAST_TWILIO_PROJECT_ID)

        // Set the partner string (phone number or client + project number, if available)
        thread.partnerString = this.partnerStringForTwilioThread(thread)
    })

    store.twilioThreads = threadsList
}

store.setMyself = function(myself) {
    store.myself = myself
    try {
        store.permissions = JSON.parse(store.myself.PERMISSIONS || "{}")
    } catch (error) {
        store.permissions = {}
    }
}

store.log = function(...args) {
    const now = new Date()
    /* prettier-ignore */
    const date = now.getUTCHours() + ":" + now.getUTCMinutes().toString().padStart(2, "0") + ":" + now.getUTCSeconds().toString().padStart(2, "0") + "." + now.getUTCMilliseconds().toString().padStart(3, "0")
    if (this.myself && this.myself.PK === 237) console.log(date + "   ", ...args)
}

store.languageWithName = function(languageName) {
    for (let language of this.languages) if (language.LANGUAGE === languageName) return language
}

export default store
