import io from "socket.io-client"
import store from "./StoreBase"
import utils from "./UtilsBase"
import Vue from "vue"
import Crypt from "./Crypt"

const MESSAGE_ENCODED_MESSAGE = "100"
const MESSAGE_LOGIN = "101"
const MESSAGE_TOKEN = "102"
const RECONNECT_DENIED = "103"
const RECONNECT_GRANTED = "104"
const REQUEST_SELF_EMPLOYEE = "REQUEST_SELF_EMPLOYEE"
const REQUEST_OBJECT = "REQUEST_OBJECT"
const REQUEST_OBJECTS = "REQUEST_OBJECTS"
const REQUEST_OBJECTS_FOR_ID = "REQUEST_OBJECTS_FOR_ID"
const REQUEST_DATABASE_OBJECTS = "REQUEST_DATABASE_OBJECTS"
const REQUEST_OBJECTS_FOR_EMPLOYEE = "REQUEST_OBJECTS_FOR_EMPLOYEE"
const INSERT_OBJECT = "INSERT_OBJECT"
const UPDATE_OBJECT = "UPDATE_OBJECT"
const DELETE_OBJECT = "DELETE_OBJECT"
const CHAT = "CHAT"
const CLIENT_ERROR = "CLIENT_ERROR"
const SERVER_TIME = "SERVER_TIME"
const REQUEST_CHAT_HISTORY = "REQUEST_CHAT_HISTORY"
const SUBMIT_BUG_REPORT = "SUBMIT_BUG_REPORT"
// Warning! When adding a new message type here (or when using cmg.sendMessage("SOME_MESSAGE")),
// make sure to add it to the list of messages accepted from the translators in ServerMessageProcessor -> allowedMessagesByTranslators

let socket
// Use a regular-looking string for the encryption key, so it doesn't look like anything special when looking
// at the app's code.
const crypter = Crypt("PROJECT_DELIVERY_INSTRUCTIONS")
const socketAddress = process.env.SOCKET_ADDRESS
let token

const receivedTableViews = {}
let tableViewsToRequestAtLogin = {}
let messageProcessor
let connectionFeedbackFunction
let isConnected = false
let reconnectDenied = false
let reconnectionRetries = 0

function addSocketEvents() {
    // If we already have a valid token (ie. the user has logged in before and this is a reconnect),
    // send the token to the server, so the server can restore the session for this user
    socket.on("connect", () => {
        if (token) socket.emit(MESSAGE_TOKEN, token)
    })

    socket.on("disconnect", () => {
        if (reconnectDenied) {
            console.warn("Disconnected for good")
            return
        }

        console.warn("Disconnected")
        isConnected = false
        setTimeout(() => socket.connect(), 200)

        setTimeout(() => {
            if (!isConnected && !reconnectDenied && typeof connectionFeedbackFunction === "function") connectionFeedbackFunction("showReconnection")
        }, 3000)
    })

    socket.on(MESSAGE_ENCODED_MESSAGE, (messageType, ...args) => {
        const decryptedArgs = crypter.parse(...args)
        if (decryptedArgs === "Error") return console.warn("Data Error")
        if (messageProcessor[messageType]) messageProcessor[messageType].call(this, ...decryptedArgs)
    })

    socket.on(RECONNECT_DENIED, () => {
        reconnectDenied = true
        console.warn("Reconnect denied")
        if (typeof connectionFeedbackFunction === "function") connectionFeedbackFunction("reconnectDenied")
    })

    socket.on(RECONNECT_GRANTED, () => {
        isConnected = true
        if (typeof connectionFeedbackFunction === "function") connectionFeedbackFunction("reconnected")
    })
}

function login(loginToken, version, callback, _connectionFeedbackFunction) {
    connectionFeedbackFunction = _connectionFeedbackFunction

    socket = io.connect(
        socketAddress,
        { secure: true }
    )

    socket.on(MESSAGE_LOGIN, (loginResult, receivedToken) => {
        if (loginResult === "granted") {
            addSocketEvents()
            token = receivedToken
            isConnected = true
        }
        callback(loginResult, receivedToken)
    })

    socket.on("connect_error", () => {
        console.warn("Connection error")
        isConnected = false

        // If we just got disconnected, retry to connect every half a second, to minimize the downtime.
        // But if we have been trying to reconnect without any success for a few times, try to reconnect
        // every 5 seconds, as reconnecting very often has a higher CPU usage
        const delay = reconnectionRetries < 30 ? 500 : 5000

        // If we retried more that 100 times (ie. more than 5 minutes), stop retrying, as the server
        // would disconnect us anyway after this interval.
        if (reconnectionRetries > 100) {
            if (!reconnectDenied && typeof connectionFeedbackFunction === "function") connectionFeedbackFunction("reconnectDenied")
            reconnectDenied = true
            return
        }

        setTimeout(() => {
            console.warn("Reconnecting")
            reconnectionRetries++
            socket.connect()
        }, delay)
    })

    socket.on("connect", () => {
        console.warn("Connected")
        reconnectionRetries = 0
    })

    socket.emit(MESSAGE_LOGIN, loginToken, version)
}

function disconnect() {
    socket.disconnect()
}

function reconnect() {
    socket.connect()
}

function didReceiveTableViewForPK(tableView, pk) {
    if (!tableView) return

    // If the tableView doesn't exist in the received object, add it and return false
    // (the object was not received)
    if (!receivedTableViews[tableView]) {
        receivedTableViews[tableView] = []
        return false
    } else {
        // If the tableView exists, check if it contains the pk
        return receivedTableViews[tableView].includes(pk)
    }
}

// This is called by the message processor whenever we receive a tableView from the database request
function loginTableViewReceivedCallback(tableView) {
    tableViewsToRequestAtLogin[tableView] = true

    store.eventBus.$emit("receivedLoginItem")

    // Check if all the tableViews have been received and call the callback if all of them are done
    if (Object.keys(tableViewsToRequestAtLogin).every(key => tableViewsToRequestAtLogin[key] === true)) {
        clearInterval(resendDatabaseRequestInterval)

        // Call the callback defined in the App
        postLoginCallback()

        messageProcessor.databaseWasLoaded = true
        // Process all the inserts, updates and deletes which where received while the database was being loaded
        messageProcessor.processPreLoginQueue()
    }
}

let postLoginCallback
let resendDatabaseRequestInterval

// This function is used both for the initial request and for subsequent requests that might be made because of connection errors
function sendDatabaseRequest() {
    let count = 1

    // Send the request for all the tableViews that were not received
    for (let key in tableViewsToRequestAtLogin) {
        if (tableViewsToRequestAtLogin[key] != true)
            setTimeout(() => {
                sendMessage(REQUEST_DATABASE_OBJECTS, key)
            }, 100 * count++)
    }
}

function requestDatabase(callback) {
    postLoginCallback = callback
    messageProcessor.loginTableViewReceivedCallback = loginTableViewReceivedCallback

    sendDatabaseRequest()

    let lastReceivedTableViewsCount = 0
    // Set an interval to request the missing tableViews again if we haven't received any table views in a little while
    resendDatabaseRequestInterval = setInterval(() => {
        // Check how many tableViews have been received so far
        let receivedTableViewsCount = 0
        Object.keys(tableViewsToRequestAtLogin).forEach(key => (receivedTableViewsCount += tableViewsToRequestAtLogin[key]))

        // If the number is different than the last count, it means we have received some tableviews in the meantime
        // so update the count and return
        if (receivedTableViewsCount != lastReceivedTableViewsCount) {
            lastReceivedTableViewsCount = receivedTableViewsCount
            return
        }

        // If we reached here, it means that we didn't receive any new tableview since the last time we checked.
        // Likely some of them were lost, so we have to request them again.
        // Note: Even if this is a false positive and we receive the same tableview twice, the message processor will ignore it.
        sendDatabaseRequest(true)

        // After we have re-requested the database, clear the interval, so we don't request it too many times
        clearInterval(resendDatabaseRequestInterval)
    }, 30000)
}

function _doRequestObjectsForObject(obj, tableView, additionalCallback, forceReload) {
    // If the object was already received, don't send the request again
    if (didReceiveTableViewForPK(tableView, obj.PK) && !forceReload) return

    // Prepare the callback
    let callbackID = messageProcessor.addRequestCallback((table, objects) => {
        receivedTableViews[tableView].push(obj.PK)
        for (let o of objects) store.insertOrUpdateObject(o, table)
        if (additionalCallback) additionalCallback(objects)
    })

    let request = obj.PK
    if (obj.detailsToken) request = { PK: obj.PK, token: obj.detailsToken }

    // Send the request to the server
    sendMessage(REQUEST_OBJECTS_FOR_ID, tableView, request, callbackID)
}

function requestObjectsForObject(obj, tableViews, forceReload) {
    return new Promise(resolve => {
        // If tableViews is an array of tableviews
        if (typeof tableViews === "object") {
            // Create an object that stores all the requested table views and keeps track of their loaded state
            // so that when all of them have been loaded, to call the callback received with the request
            const tableViewsLoadedStatus = {}
            for (let tv of tableViews) tableViewsLoadedStatus[tv] = false

            const statusCallback = function() {
                // "this" is bound to the tableView name

                // Mark the tableView as loaded
                tableViewsLoadedStatus[this] = true

                // Check if all the tableViews have been loaded. If at least one tableView status is false,
                // it means that the tableview wasn't loaded, so return (ie. don't resolve)
                for (let key in tableViewsLoadedStatus) if (!tableViewsLoadedStatus[key]) return

                // If we got here, it means that all the requested tableViews have been loaded,
                // so we can resolve the promise
                resolve()
            }

            for (let tv of tableViews) {
                _doRequestObjectsForObject(obj, tv, statusCallback.bind(tv), forceReload)
            }
        }

        // If we only got one tableview as a string
        if (typeof tableViews === "string") {
            _doRequestObjectsForObject(obj, tableViews, resolve, forceReload)
        }
    })
}

function doRequestObject(obj, tableView, callback) {
    if (!tableView) return

    // If the object was already received, don't send the request again
    // and return true, so the caller can do something about it if needed
    if (didReceiveTableViewForPK(tableView, obj.PK)) return true

    // Prepare the callback
    let callbackID = messageProcessor.addRequestCallback((_table, objectData) => {
        receivedTableViews[tableView].push(obj.PK)
        for (let key in objectData)
            if (key != "PK") {
                let value = objectData[key]
                // If the value came in as null, replace it with a blank string
                if (value === null) value = ""
                Vue.set(obj, key, value)
            }
        // Set isLoaded, to be used in the components
        Vue.set(obj, "isLoaded", true)
        if (callback) callback(objectData)
    })

    let request = obj.PK
    if (obj.detailsToken) request = { PK: obj.PK, token: obj.detailsToken }

    // Send the request to the server
    sendMessage(REQUEST_OBJECT, tableView, request, callbackID)
}

function requestObject(obj, tableView) {
    return new Promise(resolve => {
        // If the object was already received, don't send the request again
        if (didReceiveTableViewForPK(tableView, obj.PK)) resolve()
        // Otherwise, send the request to the server and resolve the promise upon receiving the object from the server
        else doRequestObject(obj, tableView, resolve)
    })
}

function requestObjectWithPK(pk, tableView) {
    return new Promise(resolve => {
        // Prepare the callback
        let callbackID = messageProcessor.addRequestCallback((table, object) => {
            const insertedObject = store.insertOrUpdateObject(object, table)
            resolve(insertedObject)
        })

        // Send the request to the server
        sendMessage(REQUEST_OBJECT, tableView, pk, callbackID)
    })
}

function requestObjects(tableView, criteria) {
    return new Promise(resolve => {
        // Prepare the callback
        let callbackID = messageProcessor.addRequestCallback((table, objects) => {
            for (let o of objects) store.insertOrUpdateObject(o, table)
            resolve(objects)
        })

        // Send the request to the server
        sendMessage(REQUEST_OBJECTS, tableView, criteria, callbackID)
    })
}

function requestObjectsForMyself(tableView) {
    return new Promise(resolve => {
        // Prepare the callback
        let callbackID = messageProcessor.addRequestCallback((table, objects) => {
            let compressionFields = messageProcessor.getCompressionFields(tableView)
            for (let o of objects) store.insertOrUpdateObject(o, table, compressionFields ? compressionFields.fields : undefined)
            resolve(objects)
        })

        // Send the request to the server
        sendMessage(REQUEST_OBJECTS_FOR_EMPLOYEE, tableView, callbackID)
    })
}

function requestSelfEmployee(callback) {
    // Prepare the callback
    let callbackID = messageProcessor.addRequestCallback((table, employee) => {
        store.insertOrUpdateObject(employee, table)
        if (callback) callback(employee)
    })

    // Send the request to the server
    sendMessage(REQUEST_SELF_EMPLOYEE, callbackID)
}

function updateObject(obj, field, value) {
    if (store.log) store.log("Update", value)
    sendMessage(UPDATE_OBJECT, obj.PK, obj.table, field, value)
}

function insertObject(object) {
    return new Promise(resolve => {
        // If the object doesn't have an insertID, add one
        if (!object.insertID) object.insertID = utils.getUniqueID()
        messageProcessor.addInsertCallback(object, resolve)

        sendMessage(INSERT_OBJECT, object)
    })
}

function deleteObject(object) {
    if (!object) return
    sendMessage(DELETE_OBJECT, object.PK, object.table)
}

function sendMessage(message, ...args) {
    socket.emit(MESSAGE_ENCODED_MESSAGE, message, crypter.generate(args))
}

function sendChat(data) {
    sendMessage(CHAT, data)
}

// Sends an error message that occurred on the client (a JavaScript error) to the server
// to be logged there and checked by the developer
function sendClientError(errorData) {
    sendMessage(CLIENT_ERROR, errorData)
}

function setPreference(parameter, value) {
    const prefs = JSON.parse(store.myself.PREFERENCES) || {}
    prefs[parameter] = value
    const stringValue = JSON.stringify(prefs)
    Vue.set(store.myself, "PREFERENCES", stringValue)
    this.updateObject(store.myself, "PREFERENCES", stringValue)
}

function setMessageProcessor(aMessageProcessor) {
    messageProcessor = aMessageProcessor
}

function requestServerTime() {
    sendMessage(SERVER_TIME)
}

function requestChatHistory(partnerID) {
    sendMessage(REQUEST_CHAT_HISTORY, partnerID)
}

function submitBugReport(text) {
    const bugReport = {
        table: "BUG_REPORTS",
        EMPLOYEE_ID: store.myself.PK,
        TEXT: text
    }
    sendMessage(SUBMIT_BUG_REPORT, bugReport)
}

function debug(object) {
    sendMessage("DEBUG", object)
}

function socketID() {
    return socket.id
}

export default {
    tableViewsToRequestAtLogin,
    login,
    requestSelfEmployee,
    requestDatabase,
    requestObjectsForMyself,
    requestObject,
    requestObjects,
    requestObjectsForObject,
    requestObjectWithPK,
    insertObject,
    updateObject,
    deleteObject,
    sendMessage,
    sendChat,
    sendClientError,
    setPreference,
    setMessageProcessor,
    requestServerTime,
    requestChatHistory,
    disconnect,
    reconnect,
    submitBugReport,
    debug,
    socketID
}
