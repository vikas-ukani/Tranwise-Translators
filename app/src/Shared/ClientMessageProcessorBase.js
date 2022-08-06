import store from "./StoreBase"
import { TWObject } from "./TWObjectBase"
import Vue from "vue"

function snakeToCamel(s) {
    return s.toLowerCase().replace(/(_\w)/g, m => m[1].toUpperCase())
}

const insertCallbacks = {}
const requestCallbacks = {}
let requestCallbackIndex = 0
let receivedLoginTableViews = {}

function executeRequestCallback(callbackID, table, data) {
    let callback = requestCallbacks[callbackID]
    if (callback) {
        callback(table, data)
        delete requestCallbacks[callbackID]
    }
}

// The specific object (ClientMessageProcessor) sets actions on this object, to be executed for certain messages
// and be available only for managers or translators (eg. insertObjectActions)
const messageActions = {}

const messageProcessor = {
    actions: messageActions
}

const preLoginQueue = []
// Processes all the inserts, updates and deletes which where received while the database was being loaded.
// It is called when all the tableViews for login have been received.
messageProcessor.processPreLoginQueue = function() {
    preLoginQueue.forEach(item => {
        if (item.messageType === "UPDATE_OBJECT") messageProcessor.UPDATE_OBJECT(item.pk, item.table, item.field, item.value)
        if (item.messageType === "INSERT_OBJECT") messageProcessor.INSERT_OBJECT(item.object)
        if (item.messageType === "DELETE_OBJECT") messageProcessor.DELETE_OBJECT(item.pk, item.tableName)
    })
}

messageProcessor.addRequestCallback = function(callback) {
    let callbackID = requestCallbackIndex++
    requestCallbacks[callbackID] = callback
    return callbackID
}

messageProcessor.addInsertCallback = function(object, callback) {
    insertCallbacks[object.insertID] = callback
}

messageProcessor.UPDATE_OBJECT = async function(pk, table, field, value, metadata) {
    // if (field != "ONLINE_STATUS") store.log(`Received update for ${pk}, ${table}, ${field}, ${value}`)
    store.log(`Received update for ${pk}, ${table}, ${field}, ${value}`)

    // Force a page reload if the own account type has changed
    if (store.myself && store.myself.PK === pk && field === "EMPLOYEE_TYPE" && value != store.myself.EMPLOYEE_TYPE) {
        // eslint-disable-next-line no-undef
        window.onbeforeunload = null
        // eslint-disable-next-line no-undef
        location.reload()
    }

    // If the database wasn't loaded yet, add the message to the preLoginQueue, which will be processed
    // after the database is loaded
    if (!messageProcessor.databaseWasLoaded) {
        preLoginQueue.push({ messageType: "UPDATE_OBJECT", pk, table, field, value })
        return
    }

    // If the specific object for managers or translators version (ClientMessageProcessor) has defined this function, execute it
    // This function performs PreActions (ie. actions that should be taken before the object's value is updated in the store -
    messageActions.updateObjectPreActions && (await messageActions.updateObjectPreActions(object, pk, table, field, value, metadata))

    let storeTableName = snakeToCamel(table)
    const object = store[storeTableName][store.accessor(storeTableName)[pk]]
    if (object) Vue.set(object, field, value)

    // If the specific object for managers or translators (ClientMessageProcessor) has defined this function, execute it
    messageActions.updateObjectActions && messageActions.updateObjectActions(object, pk, table, field, value, metadata)
}

messageProcessor.INSERT_OBJECT = async function(object) {
    store.log(`Got new object for ${object.table}`, object)

    // If the database wasn't loaded yet, add the message to the preLoginQueue, which will be processed
    // after the database is loaded
    if (!messageProcessor.databaseWasLoaded) {
        preLoginQueue.push({ messageType: "INSERT_OBJECT", object })
        return
    }

    // If the specific object for managers or translators version (ClientMessageProcessor) has defined this function, execute it
    // This function performs PreActions (ie. actions that should be taken before the object is inserted into the store -
    // - eg. loading the employee for a translation), hence the 'await'
    messageActions.insertObjectPreActions && (await messageActions.insertObjectPreActions(object))

    const insertedObject = store.insertOrUpdateObject(object, object.table)

    // If there is any callback associated with this insert, execute it, then delete the callback
    if (object.insertID && insertCallbacks[object.insertID]) {
        insertCallbacks[object.insertID](object)
        delete insertCallbacks[object.insertID]
    }

    // If the specific object for managers or translators version (ClientMessageProcessor) has defined this function, execute it
    // The function gets as a parameter either the inserted object (that we got back from the store if there was an object inserted)
    // or the received object if the store.insert didn't return anything
    messageActions.insertObjectActions && messageActions.insertObjectActions(insertedObject || object)
}

messageProcessor.DELETE_OBJECT = function(pk, tableName) {
    // If the database wasn't loaded yet, add the message to the preLoginQueue, which will be processed
    // after the database is loaded
    store.log(`Received delete for ${pk}, ${tableName}`)

    if (!messageProcessor.databaseWasLoaded) {
        preLoginQueue.push({ messageType: "DELETE_OBJECT", pk, tableName })
        return
    }

    let storeTableName = snakeToCamel(tableName)
    const index = store.accessor(storeTableName)[pk]
    if (index === undefined) return

    // Instead of deleting the object, we create a dummy object and replace it for the old one,
    // so that when iterating over objects in store.someTable we don't get null objects
    Vue.set(store[storeTableName], index, new TWObject())
    store.accessor(storeTableName)[pk] = undefined
}

messageProcessor.CHAT = async function(data) {
    // Check if the sender of the message is in store, otherwise request it before adding the chat message
    const partnerID = data.senderID === store.myself.PK ? data.recipientID : data.senderID
    if (!store.employee(partnerID)) await messageProcessor.cmg.requestObjectWithPK(partnerID, "EMPLOYEES_DETAILS_FOR_CHAT")

    store.addChatMessage(data)
}

messageProcessor.TRANSLATOR_RATING = async function(data) {
    // console.log('TRANSLATOR_RATING', data)
}

messageProcessor.SERVER_TIME = function(time) {
    // This ensures that we get the real difference between the server time and the real local time (not UTC)
    const localTimestamp = Math.floor(Date.now() / 1000) - new Date().getTimezoneOffset() * 60
    store.serverTimeDelta = time - localTimestamp
}

messageProcessor.REQUEST_DATABASE_OBJECTS = function(tableView, table, objects, uploadToken) {
    // If we have aldready received this tableView, ignore it
    if (receivedLoginTableViews[tableView]) {
        store.log("====== Got twice ", tableView)
        return
    }

    store.log(`Got ${objects.length} for ${tableView}`)

    // Mark the tableView as recieved so we can ignore it if we get it twice because of connection issues
    receivedLoginTableViews[tableView] = true

    // If we got an upload token, store it (once with the table name and once with the tableView name,
    // so we can use either of them, because we will get multiple tokens with table "EMPLOYEES" in the
    // translators version - for resume and diploma)
    if (uploadToken) {
        store.uploadTokens[table] = uploadToken
        store.uploadTokens[tableView] = uploadToken
    }

    // Determine which insert function to use:
    // If there are objects of this type in the warehouse, don't overwrite them (use insertOrUpdateObject)
    let insertFunction = store.hasObjectsWithTable(table) ? "insertOrUpdateObject" : "insertObject"

    // fields is used for a pseudo-compression on some tableviews and is set in ClientMessageProcessor -> performDatabasePreInsertActions
    let fields

    // If there is an action set in the managers version or in the translators version, execute it
    if (messageProcessor.performDatabasePreInsertActions) {
        const result = messageProcessor.performDatabasePreInsertActions(tableView, table)
        if (result) {
            fields = result.fields
            insertFunction = result.insertFunction
        }
    }

    if (table === "LANGUAGES")
        objects.sort((a, b) => {
            if (a.PK < 32 && b.PK < 32) return a.PK - b.PK
            if (a.PK < 32 && b.PK >= 32) return -1
            if (a.PK >= 32 && b.PK < 32) return 1
            return a.LANGUAGE.localeCompare(b.LANGUAGE)
        })

    // Insert all the objects
    for (let obj of objects) store[insertFunction](obj, table, fields)

    // Inform the connection managers that we received the tableview
    messageProcessor.loginTableViewReceivedCallback(tableView)
}

messageProcessor.REQUEST_SELF_EMPLOYEE = function(table, object, callbackID) {
    executeRequestCallback(callbackID, table, object)
}

messageProcessor.REQUEST_OBJECT = function(table, objectData, callbackID) {
    executeRequestCallback(callbackID, table, objectData)
}

messageProcessor.REQUEST_OBJECTS = function(table, objects, callbackID) {
    executeRequestCallback(callbackID, table, objects)
}

messageProcessor.REQUEST_CHAT_HISTORY = function(partnerID, chatHistory) {
    store.processChatHistory(partnerID, chatHistory)
}

export default messageProcessor
