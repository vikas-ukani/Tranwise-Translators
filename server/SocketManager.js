const socketio = require("socket.io")
const axios = require("axios")
const db = require("./DatabaseManager")
const config = require("./serverConfig")
const User = require("./User")
const utils = require("./Utils")
const uploadManager = require("./UploadManager")
const messageForwarder = require("./MessageForwarder")
const log = require("./Logger")
const guardian = require("./Guardian")

const MESSAGE_LOGIN = "101"
const MESSAGE_TOKEN = "102"
const RECONNECT_DENIED = "103"
const RECONNECT_GRANTED = "104"

let io
const users = {}
const loginTokens = {}

function loadUsersFromStorage() {
    log("GLOBAL", "Loading users from storage...", true)

    axios
        .get("http://localhost:3353/users")
        .then(response => {
            for (let token in response.data) {
                const userData = response.data[token]
                const user = new User(token, null, userData.employee, messageForwarder.forward.bind({ users, senderID: userData.employee.PK }))
                user.addUploadToken = uploadManager.addUploadToken
                user.restoreFromData(userData)
                users[user.token] = user
            }
        })
        .catch(error => {
            log("ERROR", "Error in loadUsersFromStorage " + error.message)
        })
}

function processLogin(socket, loginToken, version) {
    log("SOCKET", `> > > Logging in with socket ${socket.id}, token: ${loginToken}, version: ${version}`)

    const employee = loginTokens[loginToken]

    if (!employee) {
        guardian.attemptedToUseInvalidToken(socket, loginToken)
        socket.disconnect()
        return
    }

    // If a matching user was found, create the User and add it to the list
    if (employee && !guardian.isUserBanned(employee.PK)) {
        const token = loginToken
        const user = new User(token, socket, employee, messageForwarder.forward.bind({ users, senderID: employee.PK }))
        user.addUploadToken = uploadManager.addUploadToken
        user.version = version
        users[user.token] = user
        socket.emit(MESSAGE_LOGIN, "granted", user.token)
        guardian.receivedValidToken(socket)
    } else {
        socket.emit(MESSAGE_LOGIN, "denied", "")
        socket.disconnect()
    }
}

function reconnectSocket(socket, token) {
    const user = users[token]

    if (user && user.preventReconnect) {
        socket.emit(RECONNECT_DENIED)
        setTimeout(() => socket.disconnect(), 5000)
        return
    }

    if (user && !user.isDisabled && !user.isBanned) {
        log("SOCKET", `Reconnecting socket ${socket.id} for ${token} - ${user.fullName}`)
        user.reconnect(socket)
        guardian.receivedValidToken(socket)
        socket.emit(RECONNECT_GRANTED)
    } else {
        log("SOCKET", `Attempting to reconnect inexisting token: ${token} socket = ${socket.id}`)
        guardian.attemptedToUseInvalidToken(socket, token)
        socket.emit(RECONNECT_DENIED)
        setTimeout(() => socket.disconnect(), 5000)
    }
}

function processDisconnect() {
    // "this" is bound to the socket
    const socket = this
    const user = socket.user
    if (!user) log("SOCKET", `Socket ${socket.id} disconnected: No user`)
    if (user) {
        log("SOCKET", `Socket ${socket.id} disconnected: ${user.token} for ${user.fullName}`)
        // Detach the socket
        user.socket = null
        // If the user doesn't reconnect within 5 seconds, inform everyone that the user was disconnected
        setTimeout(() => {
            if (user && !user.socket) {
                log("SOCKET", `User ${user.pk} disconnected for good: ${user.token}`)
                setTimeout(() => {
                    if (!user.socket) {
                        log("SOCKET", `Removing token ${user.token} for ${user.fullName}`)
                        axios.post("http://localhost:3353/removeToken", { token: user.token }).catch(error => log("ERROR", error))
                        delete users[user.token]
                    }
                }, 300000)
                // Inform everyone that the user is offline
                user.processLocalMessage("UPDATE_OBJECT", user.pk, "EMPLOYEES", "ONLINE_STATUS", 0)
            }
        }, 5000)
    } else {
        log("SOCKET", "Unidentified user has disconnected")
    }
}

function initIOServer(server) {
    loadUsersFromStorage()

    io = socketio(server, { pingTimeout: 60000 })
    io.set("heartbeat timeout", 20000)
    io.set("heartbeat interval", 10000)

    io.on("connection", socket => {
        log("SOCKET", `Socket connected: ${socket.id} - ${(socket.handshake.address || "").replace("::ffff:", "")} - ${socket.request.headers["user-agent"]}`)

        socket.on("disconnect", processDisconnect.bind(socket))

        socket.on(MESSAGE_LOGIN, (loginToken, version) => processLogin(socket, loginToken, version))

        socket.on(MESSAGE_TOKEN, token => {
            log("SOCKET", `Got token ${token} for socket ${socket.id}`)
            reconnectSocket(socket, token)
        })
    })

    server.listen(config.serverPort, () => log("GLOBAL", ` > > > Started Tranwise 3 Server on port ${config.serverPort}...`))
}

function getUsers() {
    const result = []
    let queueItemsCount = 0
    const queueItems = []
    for (let key in users) {
        const user = users[key]
        result.push({
            name: user.fullName,
            pk: user.pk,
            version: user.version,
            token: user.token,
            ip: user.ip,
            agent: user.socket && user.socket.request.headers["user-agent"]
        })
        queueItemsCount += user.messageQueue.length
        user.messageQueue.forEach(item => queueItems.push(item))
    }
    console.log(utils.roughObjectSize(queueItems))
    result.push({ queueItemsCount })
    return result
}

function getMessageForwarderFunction(senderID) {
    return messageForwarder.forward.bind({ users, senderID })
}

function disconnectAll() {
    for (let key in users) {
        const user = users[key]
        if (user && user.socket) user.socket.disconnect()
    }
}

function disconnectToken(token) {
    axios.post("http://localhost:3353/removeToken", { token: token }).catch(error => log("ERROR", error))
    for (let key in users) {
        const user = users[key]
        if (user && user.socket && user.token === token) {
            user.preventReconnect = true
            user.socket.disconnect()
        }
    }
}

async function disconnectAllTranslators() {
    let count = 0
    for (let key in users) {
        await utils.delay(100)
        const user = users[key]
        if (user && user.socket && user.isTranslator) {
            axios.post("http://localhost:3353/removeToken", { token: user.token }).catch(error => log("ERROR", error))
            user.preventReconnect = true
            user.socket.disconnect()
            count++
        }
    }

    db.runQuery("UPDATE EMPLOYEES SET ONLINE_STATUS = 0, AWAY_MESSAGE = '' WHERE EMPLOYEE_TYPE = 1 AND PK > 0")

    console.log(`Disconnected ${count} translators`)
}

function getUserWithToken(token) {
    for (let key in users) {
        const user = users[key]
        if (token && user.token === token) return user
    }
}

function disableUser(userID) {
    for (let key in users) {
        const user = users[key]
        if (user && user.pk === userID) {
            user.isDisabled = true
            user.save()
        }
    }
}

function logSize() {
    console.log(`io: ${utils.roughObjectSize(io)}`)
    console.log(`Users: ${utils.roughObjectSize(users)}`)
}

module.exports = {
    initIOServer,
    loginTokens,
    getUsers,
    getUserWithToken,
    logSize,
    getMessageForwarderFunction,
    disconnectAll,
    disconnectToken,
    disconnectAllTranslators,
    disableUser
}
