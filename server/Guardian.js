const log = require("./Logger")

const processor = {} // Processes different messages received by the guardian
let bannedUsers = [] // A list of PKs of users that have been banned
let bannedIPs = [] // A list of IPs that have been banned
let banReasons = {} // A list of reasons why PKs were banned

// Contains a list of all the invalid tokens received from an IP address (IP: [token1, token2])
let invalidTokens = {}

function trespass(message, user, data) {
    // This function should always return false, because the result false is used when it's called to exit that function
    log("GUARDIAN", message + " " + user.pk + " " + JSON.stringify(data))

    // If we have a custom function for a particular message, call it
    if (processor[message]) processor[message](user, data)

    // If the message is included in the list below, count the trespasses and ban the user if needed
    if (
        [
            "RequestInvalidChatHistory",
            "RequestInexistingTableView",
            "RequestDatabaseObjectsForInvalidTableView",
            "RequestObjectsForEmployeeForInvalidTableView",
            "RequestObjectsThatDontAllowCriteria",
            "RequestObjectsForInvalidTableView",
            "RequestObjectWithDifferentOwnID",
            "ResetPasswordTranslatorForAnotherUser",
            "FakeChatSender",
            "MissingChatRecipient",
            "WrongChatToken"
        ].includes(message)
    ) {
        // Check how many times the user has trespassed, and if it's more than 20 times, ban the user.
        // Allow a few trespasses in case of false positives.
        user.trespassCount = (user.trespassCount || 0) + 1
        if (user.trespassCount > 20) banUser(user, message)
    }

    return false
}

function isUserBanned(pk) {
    return pk && bannedUsers.includes(pk)
}

function isIPBanned(ip) {
    return ip && bannedIPs.includes(ip)
}

function banUser(user, reason) {
    if (!user) return
    if (user.pk && !bannedUsers.includes(user.pk)) bannedUsers.push(user.pk)
    banReasons[`${user.pk}`] = (banReasons[`${user.pk}`] || "") + reason + " "
    user.ban(reason)
}

function banIP(ip) {
    log("GUARDIAN", `Banning IP ${ip}`)
    if (ip && !bannedIPs.includes(ip)) bannedIPs.push(ip)
}

function unbanUser(pk) {
    if (pk === "All") {
        bannedUsers = []
    }
}

function unbanIP(ip) {
    if (ip === "All") {
        bannedIPs = []
        invalidTokens = {}
    } else {
        bannedIPs = bannedIPs.filter(x => x != ip)
    }
    log("GUARDIAN", `Unbanning IP ${ip}`)
}

function getSocketIP(socket) {
    let ip
    if (socket.conn && typeof socket.conn.remoteAddress === "string") ip = socket.conn.remoteAddress.replace("::ffff:", "")
    if (!ip && socket.handshake && typeof socket.handshake.address === "string") ip = socket.handshake.address.replace("::ffff:", "")
    return ip
}

function attemptedToUseInvalidToken(socket, token) {
    const ip = getSocketIP(socket)
    if (!ip) return

    if (!invalidTokens[ip]) invalidTokens[ip] = []
    if (!invalidTokens[ip].includes(token)) {
        invalidTokens[ip].push(token)
        if (invalidTokens[ip].length > 50) banIP(ip)
    }
}

function receivedValidToken(socket) {
    const ip = getSocketIP(socket)
    if (ip) invalidTokens[ip] = []
}

processor.InvalidMessage = user => {
    if (!user) return
    user.invalidMessageAttempts = (user.invalidMessageAttempts || 0) + 1
    if (user.invalidMessageAttempts > 10) banUser(user, "InvalidMessage")
}

processor.ForbiddenMessage = user => {
    if (!user) return
    user.forbiddenMessageAttempts = (user.forbiddenMessageAttempts || 0) + 1
    if (user.forbiddenMessageAttempts > 10) banUser(user, "ForbiddenMessage")
}

processor.RequestInvalidChatHistory = user => {
    banUser(user, "RequestInvalidChatHistory")
}

function getBans() {
    return { bannedUsers, banReasons, bannedIPs, invalidTokens }
}

module.exports = {
    trespass,
    attemptedToUseInvalidToken,
    receivedValidToken,
    getBans,
    banIP,
    unbanUser,
    unbanIP,
    isUserBanned,
    isIPBanned
}
