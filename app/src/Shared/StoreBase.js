import { TWObject } from "./TWObjectBase"
import Vue from "vue"
import moment from "moment"

const accessors = {}

let store = {
    warehouse: {
        languages: [],
        countries: [],
        projects: [],
        subprojects: [],
        translations: [],
        projectsMessages: [],
        projectsFiles: [],
        employees: [],
        employeesLanguages: [],
        employeesMessages: [],
        employeesFiles: [],
        paymentSheets: [],
        clients: [],
        clientsFiles: [],
        invoices: [],
        mbPosts: [],
        mbThreads: [],
        tips: [],
        tipsFiles: [],
        settings: [],
        notifications: []
    },

    accessor(tableName) {
        return accessors[tableName]
    },

    warehouseTableNames: {},

    // Convert the uppercase table name as found in the database (EMPLOYEES_MESSAGES)
    // to camelCase (employeesMessages), as used in the warehouse
    // and store it in "warehouseTableNames" for fast access
    getWarehouseTableName(databaseTableName) {
        if (!this.warehouseTableNames[databaseTableName]) this.warehouseTableNames[databaseTableName] = databaseTableName.toLowerCase().replace(/(_\w)/g, m => m[1].toUpperCase())
        return this.warehouseTableNames[databaseTableName]
    },

    build() {
        Object.keys(this.warehouse).forEach(key => {
            if (Array.isArray(this.warehouse[key])) {
                let singular = key.slice(0, -1)
                if (key === "countries") singular = "country"
                Vue.set(this, singular, pk => this.warehouse[key][accessors[key][pk]])
                accessors[key] = []
                Vue.set(this, key, this.warehouse[key])
            }
        })
    },

    eventBus: new Vue(),

    uploadTokens: {},

    pendingFileUploads: [],

    goToObject(obj) {
        if (!obj || !obj.PK) return
        this.eventBus.$emit("goToObject", obj)
    },

    update(obj, field, value) {
        obj[field] = value
    },

    // Return whether there are any objects with a specific table in the warehouse
    // Used when receiving the database, to know what insert function to use (insertObject or insertOrUpdateObject)
    hasObjectsWithTable(table) {
        return this.warehouse[this.getWarehouseTableName(table)].length
    },

    insertOrUpdateObject(obj, table, fields) {
        if (!obj) return

        // If the object has a "t" property, that's a details token
        if (obj.t) obj.detailsToken = obj.t

        if (fields) {
            let newObj = {}
            // Replace the properties from the pseudo-compression
            fields.forEach(field => (newObj[field.to] = obj[field.from]))
            if (obj.detailsToken) newObj.detailsToken = obj.detailsToken
            obj = newObj
        }

        // If the object has a FILE_NAME property, remove the pending upload created for this object
        if (obj.FILE_NAME) this.removePendingFileUpload(obj)

        const tableName = this.getWarehouseTableName(table)

        // Store the table name on the object
        if (table) obj.table = table

        // Set all the fields that came in as null to a blank string
        for (let key in obj) if (obj[key] === null && key === key.toUpperCase()) obj[key] = ""

        // Try to see if the object is already in the store
        let index = accessors[tableName][obj.PK]

        // If the object wasn't found, push it to the store and update the accessor array
        if (index === undefined) {
            index = this[tableName].length
            // this.warehouse[tableName][index] = Object.assign(new TWObject(), obj)
            const insertedObject = Object.assign(new TWObject(), obj)
            this.warehouse[tableName].push(insertedObject)
            accessors[tableName][obj.PK] = index
            // Return the inserted object, so it can be passed to the message processor
            return insertedObject
        } else {
            // If the object was found, store all the attributes of the incoming object on the existing object
            const existingObject = this.warehouse[tableName][index]
            for (let key in obj) if (key != "PK") Vue.set(existingObject, key, obj[key])
            return existingObject
        }
    },

    insertObject(obj, table) {
        const tableName = this.getWarehouseTableName(table)

        // Store the table name on the object
        if (table) obj.table = table

        // If the object has a "t" property, that's a details token
        if (obj.t) obj.detailsToken = obj.t

        // Set all the fields that came in as null to a blank string
        for (let key in obj) if (obj[key] === null && key === key.toUpperCase()) obj[key] = ""

        const index = this[tableName].length

        let addReactive = false
        // When loading ASSIGNED_TRANSLATIONS_FOR_OPEN_PROJECTS, if we don't add it with warehouse.push, it's partly not reactive for some reason.
        // Therefore we need to use warehouse.push for this particular table in order to get it fully reactive. *shrug*
        // To test it, comment the line below and try to change the price of a translation in the assignment row. It doesn't update immediately.
        if (table === "TRANSLATIONS") addReactive = true

        if (addReactive) {
            this.warehouse[tableName].push(Object.assign(new TWObject(), obj))
        } else {
            Object.setPrototypeOf(obj, TWObject.prototype)
            this.warehouse[tableName][index] = obj
        }

        accessors[tableName][obj.PK] = index
    },

    chat: { messages: [], partners: [], history: {} },

    disableChatSounds: false,

    addChatMessage(data) {
        // Get the partner (which is an EMPLOYEES object)
        const partnerID = data.senderID === this.myself.PK ? data.recipientID : data.senderID
        let partner = store.employee(partnerID)

        if (data.startedTyping) for (let partner of this.chat.partners) if (partner.PK === data.senderID) Vue.set(partner, "isTyping", true)

        if (data.cancelledTyping) for (let partner of this.chat.partners) if (partner.PK === data.senderID) Vue.set(partner, "isTyping", false)

        if (data.text) {
            // Ignore all the messages not for me. They should never be forwarded by the server, but just in case...
            if (!store.myself) return
            if (store.myself.PK != data.recipientID && store.myself.PK != data.senderID) return

            const message = {
                senderID: data.senderID,
                recipientID: data.recipientID,
                text: data.text,
                time: Math.floor(Date.now() / 1000) - new Date().getTimezoneOffset() * 60
            }

            // Set the partner as not typing, since we just got a message from them
            if (data.senderID === partnerID) Vue.set(partner, "isTyping", false)

            // Add the partner to the chat.partners array if not already in there
            if (!this.chat.partners.includes(partner)) this.chat.partners.push(partner)

            // Set the partner on the message
            message.partner = partner

            Vue.set(partner, "hasNewMessages", true)
            if (data.senderID != this.myself.PK && !partner.ONLINE_STATUS) Vue.set(partner, "ONLINE_STATUS", 1)

            if (data.senderID != this.myself.PK) this.eventBus.$emit("receivedChatMessage", partner)

            this.chat.messages.push(message)
        }
    },

    chatWithEmployee(employee) {
        if (!employee) return
        if (!this.chat.partners.includes(employee)) this.chat.partners.push(employee)
        this.eventBus.$emit("activateChat", employee)
    },

    deleteChatPartner(partnerID) {
        let index = -1
        for (let i = 0; i < this.chat.partners.length; i++) {
            if (this.chat.partners[i].PK === partnerID) index = i
        }
        if (index >= 0) this.chat.partners.splice(index, 1)
    },

    playChatSound(sound) {
        if (this.disableChatSounds) return
        if (this.skipChatSounds) return
        // Don't play the chat sound more than once in a 2s interval
        this.skipChatSounds = true
        setTimeout(() => {
            this.skipChatSounds = false
        }, 2000)
        sound.play()
    },

    processChatHistory(partnerID, chatHistory) {
        if (!chatHistory) {
            this.chat.history[partnerID] = []
            this.eventBus.$emit("receivedChatHistory", partnerID)
            return
        }

        const timestampOfFirstMessage = this.chat.messages.length ? this.chat.messages[0].time : 0
        const deltaFromServer = new Date().getTimezoneOffset() * 60 + 3600

        let partnerA = Math.min(this.myself.PK, partnerID)
        let partnerB = Math.max(this.myself.PK, partnerID)
        let lastMessage
        const messages = []

        chatHistory.split("\n").forEach(line => {
            const message = {}

            if (line.includes("] A: ")) {
                message.senderID = partnerA
                message.recipientID = partnerB
                message.text = line.substring(line.indexOf("] A: ") + 5)
            } else if (line.includes("] B: ")) {
                message.senderID = partnerB
                message.recipientID = partnerA
                message.text = line.substring(line.indexOf("] B: ") + 5)
            } else {
                if (lastMessage) lastMessage.text += "\n" + line
                return
            }

            const words = line.split(" ")
            const date = words[0].substring(1).split("/")
            const time = words[1].replace(/\]/g, "").split(":")
            const ampm = words[2].slice(0, 2)

            if (date[0][0] === "[") date[0] = date[0].substring(1)

            const dateValue = new Date(date[2], date[0] - 1, date[1], +time[0] + (ampm === "PM" ? 12 : 0), time[1], time[2])
            const timestamp = dateValue.getTime() / 1000 - deltaFromServer
            message.timeText = moment(timestamp * 1000).format("D MMM, H:mm")
            if (timestampOfFirstMessage && timestamp > timestampOfFirstMessage) return

            messages.push(message)
            lastMessage = message
        })

        this.chat.history[partnerID] = messages
        this.eventBus.$emit("receivedChatHistory", partnerID)
    },

    addNotification(type, title, text, options) {
        this.notifications.push({
            id: this.notifications.length + 1,
            type,
            title,
            text,
            options
        })
    },

    removeNotification(id) {
        for (let i = 0; i < this.notifications.length; i++)
            if (this.notifications[i].id === id) {
                this.notifications.splice(i, 1)
                return
            }
    },

    removePendingFileUpload(file) {
        let indexToRemove = -1
        for (let i = 0; i < this.pendingFileUploads.length; i++) {
            const pendingFile = this.pendingFileUploads[i]
            if (
                pendingFile.PROJECT_ID === file.PROJECT_ID &&
                pendingFile.SIZE === file.SIZE &&
                pendingFile.FILE_TYPE === file.FILE_TYPE &&
                pendingFile.FILE_NAME === file.FILE_NAME
            )
                indexToRemove = i
        }
        this.pendingFileUploads.splice(indexToRemove, 1)
    },

    countryName(countryID) {
        let c = this.country(countryID)
        return c ? c.COUNTRY : ""
    },

    languageName(languageID) {
        let l = this.language(languageID)
        return l ? l.LANGUAGE : ""
    },

    languageNameShort(languageID) {
        let l = this.language(languageID)
        return l ? l.LANGUAGE.substr(0, 3) : ""
    },

    fullName(employeeID) {
        const emp = this.employee(employeeID)
        return emp ? emp.fullName() : "?"
    },

    serverTime() {
        const timezoneOffset = new Date().getTimezoneOffset() * 60
        const localTime = Math.floor(Date.now() / 1000) - timezoneOffset
        return localTime + this.serverTimeDelta
    },

    Settings(parameter) {
        for (let s of this.warehouse.settings) if (s.PARAMETER === parameter) return s.VALUE
        return "SETTINGS_PARAMETER_NOT_FOUND"
    },

    Preferences(parameter) {
        if (!this.myself.PREFERENCES) return undefined
        let prefs
        try {
            prefs = JSON.parse(this.myself.PREFERENCES)
        } catch (error) {}
        if (!prefs) return undefined
        return prefs[parameter]
    }
}

export default store
