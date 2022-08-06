const moment = require("moment")
const archiver = require("archiver")
const fs = require("fs")
const path = require("path")
const md5 = require("./MD5")

// Add the description() property to the Symbol prototype,
// because for some reason Symbol.description is undefined in Node.js
;(Symbol.prototype.description = function () {
    return this.toString().slice(0, -1).replace("Symbol(", "")
})()

const utils = {}

utils.md5 = md5
utils.moment = moment

utils.getUniqueID = function () {
    return md5(Math.random().toString(36).substring(2) + new Date().getTime().toString(36))
}

utils.simpleHash = function (text) {
    let hash = 0
    if (text.length == 0) {
        return hash
    }
    for (var i = 0; i < text.length; i++) {
        var char = text.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash // Convert to 32bit integer
    }
    return hash
}

utils.delay = function (time) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, time)
    })
}

utils.pluralS = function (number) {
    return number == 1 ? "" : "s"
}

utils.roundPrice = function (price, decimals) {
    if (decimals === undefined) decimals = 2
    return parseFloat(price.toFixed(decimals))
}

utils.now = function () {
    const timestamp = Math.floor(Date.now() / 1000)
    // This ensures that we return the real server time, not the UTC timestamp
    const timezoneOffset = new Date().getTimezoneOffset() * 60
    return timestamp - timezoneOffset
}

utils.time = function () {
    const timestamp = Math.floor(Date.now())
    // This ensures that we return the real server time, not the UTC timestamp
    const timezoneOffset = new Date().getTimezoneOffset() * 60
    return timestamp - timezoneOffset * 1000
}

utils.getTimestamp = function (year, month, day) {
    const timestamp = Math.floor(new Date(year, month - 1, day) / 1000)
    // This ensures that we return the real server time, not the UTC timestamp
    const timezoneOffset = new Date().getTimezoneOffset() * 60
    return timestamp - timezoneOffset
}

utils.nowAsString = function () {
    return moment().format("D MMM YYYY, HH:mm")
}

utils.formatNow = function (format) {
    return moment().format(format)
}

utils.nowAsStringAt = function () {
    return moment().format("D MMM YYYY @ HH:mm")
}

utils.formatDate = function (date, format) {
    if (!format) format = "D MMM YYYY, HH:mm"
    // This ensures that we return the real server time, not the UTC timestamp
    const timezoneOffset = new Date().getTimezoneOffset() * 60
    return this.moment((date + timezoneOffset) * 1000).format(format)
}

utils.isValidEmail = function (email) {
    if (!email || typeof email != "string") return false
    const emailRegex = /^([A-Za-z0-9_\-.+])+@([A-Za-z0-9_\-.])+\.([A-Za-z]{2,})$/
    return emailRegex.test(email.trim())
}

utils.getEmailAddress = function (raw) {
    var regex = /^(.*?)(\s*<(.*?)>)/g
    var match = regex.exec(raw)
    return match ? match[3].trim() : raw
}

utils.zipFolder = function (sourceFolder, outputFile) {
    const archive = archiver("zip", { zlib: { level: 9 } })
    const stream = fs.createWriteStream(outputFile)

    return new Promise((resolve, reject) => {
        archive
            .directory(sourceFolder, false)
            .on("error", err => reject(err))
            .pipe(stream)

        stream.on("close", () => resolve())
        archive.finalize()
    })
}

utils.makeFolder = function (folder) {
    if (!fs.existsSync(folder)) fs.mkdirSync(folder)
}

utils.fileExists = function (filePath) {
    return new Promise(resolve => fs.access(filePath, fs.F_OK, error => resolve(error ? false : true)))
}

utils.moveFile = function (from, to) {
    return new Promise(resolve => fs.rename(from, to, error => resolve(error ? false : true)))
}

utils.copyFile = function (from, to) {
    return new Promise(resolve => fs.copyFile(from, to, error => resolve(error ? false : true)))
}

utils.deleteFile = function (path) {
    // eslint-disable-next-line no-unused-vars
    fs.unlink(path, _err => {})
}

// If the target file exists, append (1) or (2) etc. to the file name
utils.copyFileWithFallback = function (from, to) {
    return new Promise(async resolve => {
        let suffix = 0
        let exists = false
        let newDestination = to
        do {
            exists = await utils.fileExists(newDestination)
            if (exists)
                newDestination = path.join(
                    path.dirname(newDestination),
                    path.basename(newDestination, path.extname(newDestination)).replace(` (${suffix})`, "") + ` (${++suffix})` + path.extname(newDestination)
                )
        } while (exists && suffix < 100)

        fs.copyFile(from, newDestination, error => resolve(error ? false : true))
    })
}

utils.replaceReturns = function (str, replaceWith) {
    return (str || "").replace(/\r\n/g, replaceWith).replace(/\n\r/g, replaceWith).replace(/\r/g, replaceWith).replace(/\n/g, replaceWith)
}

utils.removeMultipleReturns = function (str) {
    let s = (str || "").replace(/\r\n/g, "\n").replace(/\n\r/g, "\n").replace(/\r/g, "\n")
    while (s.includes("\n\n")) s = s.replace(/\n\n/g, "\n")
    return s
}

utils.getDetailsToken = function (tableName, objectID) {
    return utils.md5(objectID + tableName + "TranwiseDetailsRequestToken").slice(8)
}

utils.getChatToken = function (employeeID) {
    return utils.md5(employeeID + "TranwiseEmployeeChatToken").slice(8)
}

utils.encodeURI = function (str) {
    try {
        return encodeURIComponent(str || "").replace(/!/g, "%21")
    } catch (error) {
        return ""
    }
}

utils.circularStringify = v => {
    const cache = new Set()
    return JSON.stringify(v, function (key, value) {
        if (typeof value === "object" && value !== null) {
            if (cache.has(value)) {
                try {
                    return JSON.parse(JSON.stringify(value))
                } catch (err) {
                    return
                }
            }
            cache.add(value)
        }
        return value
    })
}

utils.circularReplacer = () => {
    const seen = new WeakSet()
    return (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) return
            seen.add(value)
        }
        return value
    }
}

utils.roughObjectSize = o => {
    const size1 = JSON.stringify(o, utils.circularReplacer()).length
    const size2 = utils.circularStringify(o).length
    return `${size1} / ${size2}`
}

module.exports = utils
