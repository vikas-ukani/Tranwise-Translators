const tableViews = require("./TableViews")
const UserObjectListener = require("./UserObjectListener")
const messageProcessor = require("./ServerMessageProcessor")
const uploadTokenGenerator = require("./UploadTokenGenerator")
const axios = require("axios")
const log = require("./Logger")
const Crypt = require("./Crypt")
const guardian = require("./Guardian")

// Use a regular-looking string for the encryption key, so it doesn't look like anything special when looking
// at the app's code.
const crypter = Crypt("PROJECT_DELIVERY_INSTRUCTIONS")

const MESSAGE_ENCODED_MESSAGE = "100"

class User {
    constructor(token, socket, employee, forwardMessageCallback) {
        this.token = token
        this.employee = employee
        this.loginTimestamp = Math.floor(Date.now() / 1000)
        this.permissions = { fields: [] }
        if (this.employee) {
            this.fullName = employee.FIRST_NAME + " " + employee.LAST_NAME
            try {
                if (employee.PERMISSIONS) this.permissions = JSON.parse(employee.PERMISSIONS)
            } catch (error) {
                log("ERROR", `--- Error when parsing permissions for user ${employee.PK} ${employee.PERMISSIONS}`)
            }
        }
        this.forwardMessage = forwardMessageCallback
        this.objectListener = new UserObjectListener()
        this.isListeningForObject = this.objectListener.isListeningForObject.bind(this.objectListener)
        this.isListeningForNewObjects = this.objectListener.isListeningForNewObjects.bind(this.objectListener)
        this.uploadTokens = []
        this.initValues()
        this.messageQueue = []
        if (socket) {
            this.attachSocket(socket)
            this.save()
        }

        setInterval(() => {
            if (this.hasNewObjectsForListening) {
                axios
                    .post("http://localhost:3353/userData", {
                        token: this.token,
                        loadedObjects: this.objectListener.getLoadedObjects()
                    })
                    .catch(error => log("ERROR", error))
                this.hasNewObjectsForListening = false
            }
        }, 1000)
    }

    initValues() {
        this.pk = this.employee.PK
        this.PK = this.employee.PK
        this.employeeType = this.employee.EMPLOYEE_TYPE
        this.isManager = this.employeeType === 2
        this.isTranslator = this.employeeType === 1
        this.objectListener.isManager = this.isManager
        this.objectListener.isTranslator = this.isTranslator
        this.objectListener.pk = this.pk
    }

    listenForObject(tableView, pk) {
        this.objectListener.listenForObject(tableView, pk)
        this.hasNewObjectsForListening = true
    }

    listenForObjects(tableView, objects) {
        this.objectListener.listenForObjects(tableView, objects)
        this.hasNewObjectsForListening = true
    }

    listenForNewObjectChanges(table, pk) {
        // This function returns true if we are listening, so we know whether to update the session server or not
        if (this.objectListener.listenForNewObjectChanges(table, pk)) {
            axios
                .post("http://localhost:3353/userData", {
                    token: this.token,
                    newObjectsListeners: this.objectListener.getNewObjectsListeners()
                })
                .catch(error => log("ERROR", error))
        }
    }

    storeUploadToken(tokenData) {
        this.uploadTokens.push(tokenData)
        axios
            .post("http://localhost:3353/userData", {
                token: this.token,
                uploadTokens: this.uploadTokens
            })
            .catch(error => log("ERROR", error))
    }

    save() {
        axios
            .post("http://localhost:3353/user", {
                token: this.token,
                employee: this.employee,
                isDisabled: this.isDisabled,
                newObjectsListeners: this.objectListener.getNewObjectsListeners(),
                uploadTokens: this.uploadTokens
            })
            .catch(error => log("ERROR", error))
    }

    restoreFromData(userData) {
        this.token = userData.token
        this.employee = userData.employee
        this.isDisabled = userData.isDisabled
        userData.uploadTokens.forEach(uploadTokenData => this.getUploadTokenForTableView(uploadTokenData.tableViewName, uploadTokenData.tokenCode))
        this.initValues()
        if (userData.loadedObjects) this.objectListener.setLoadedObjects(userData.loadedObjects)
        if (userData.newObjectsListeners) this.objectListener.setNewObjectsListeners(userData.newObjectsListeners)
    }

    attachSocket(socket) {
        this.socket = socket
        if (socket.conn && typeof socket.conn.remoteAddress === "string") this.ip = socket.conn.remoteAddress.replace("::ffff:", "")
        socket.user = this
        this.addSocketEvents()
    }

    reconnect(socket) {
        if (this.isBanned) return

        this.attachSocket(socket)

        // Send all the message from the queue (the messages that were put there while the client was offline)
        while (this.messageQueue.length > 0) {
            const messageParams = this.messageQueue.pop()
            this.sendMessage(...messageParams)
        }
    }

    ban(reason) {
        log("SECURITY", `Banning ${this.fullName} - ${this.pk} for ${reason}`)
        this.isBanned = true
        this.socket.disconnect()
    }

    sendMessage(message, ...args) {
        if (this.isBanned) return

        // If the user doesn't have any socket connected, add the message to the queue,
        // so it can be delivered upon reconnect
        if (!this.socket) {
            // Add the message to the queue, so it can be delivered upon reconnect
            // Only if the user has an ip address set, otherwise it was too long since it disconnected
            if (this.ip) this.addMessageToQueue([message, ...args])
            return
        }

        let str = JSON.stringify(args)
        let encryptedStr = crypter.encrypt(str)

        this.socket.emit(MESSAGE_ENCODED_MESSAGE, message, encryptedStr)
    }

    addMessageToQueue(paramsArray) {
        this.messageQueue.unshift(paramsArray)
    }

    canRequestTableView(tableViewName) {
        const tableView = tableViews[tableViewName]

        if (!tableView) return guardian.trespass("RequestInexistingTableView", this, { tableViewName })

        let canRequest = false
        if (tableView.ForManagers && this.isManager) canRequest = true
        if (tableView.ForTranslators && this.isTranslator) canRequest = true

        if (!canRequest) guardian.trespass("RequestForbiddenTableView", this, { tableViewName })
        return canRequest
    }

    addSocketEvents() {
        let socket = this.socket
        if (!socket) return

        socket.on(MESSAGE_ENCODED_MESSAGE, this.processSocketMessage.bind(this))
    }

    getUploadTokenForTableView(tableViewName, tokenCode) {
        // If this tableView has a token associated with it, generate the token and add it to the upload tokens list
        const tableView = tableViews[tableViewName]
        if (tableView.uploadTokenGeneratorKey) {
            if (typeof uploadTokenGenerator[tableView.uploadTokenGeneratorKey] === "function") {
                if (typeof this.addUploadToken === "function") {
                    const uploadToken = uploadTokenGenerator[tableView.uploadTokenGeneratorKey](this, tokenCode)
                    this.addUploadToken(uploadToken)
                    if (!tokenCode) this.storeUploadToken({ tokenCode: uploadToken.token, tableViewName })
                    return uploadToken.token
                }
            } else {
                const errorMessage = `UploadTokenGenerator: uploadTokenGenerator.${tableView.uploadTokenGeneratorKey} is not a function.`
                throw Error(errorMessage)
            }
        }
    }

    processSocketMessage(messageType, ...args) {
        if (this.isBanned) return

        // Ignore all messages if the user has been disabled in the meantime
        if (this.isDisabled) return

        const decryptedArgs = crypter.decrypt(...args)

        if (decryptedArgs === "DECRYPTION_ERROR") return log("ERROR", "!!! DECRYPTION ERROR", args)

        if (!this.isManager && !messageProcessor.allowedMessagesByTranslators.includes(messageType)) {
            return guardian.trespass("ForbiddenMessage", this, { messageType })
        }

        if (messageProcessor[messageType]) messageProcessor[messageType].call(this, ...decryptedArgs)
        else {
            // If the messageProcessor doesn't know this message, it's invalid, so inform the guardian
            guardian.trespass("InvalidMessage", this, { messageType })
        }
    }

    processLocalMessage(messageType, ...args) {
        if (messageProcessor[messageType]) messageProcessor[messageType].call(this, ...args)
    }
}

module.exports = User
