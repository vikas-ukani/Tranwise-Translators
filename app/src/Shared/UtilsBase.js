import $ from "jquery"
import momentLib from "moment"
import linkifyHtml from "linkifyjs/html"

const utils = {}

utils.moment = function(...args) {
    return momentLib(...args)
}

utils.pluralS = function(number) {
    return number == 1 ? "" : "s"
}

utils.returnsToSpaces = function(text) {
    return utils.replaceReturns(text, " ")
}

utils.replaceReturns = function replaceReturns(str, replaceWith) {
    return (str || "")
        .replace(/\r\n/g, replaceWith)
        .replace(/\n\r/g, replaceWith)
        .replace(/\r/g, replaceWith)
        .replace(/\n/g, replaceWith)
}

utils.openURL = function(url, shouldAddHTTP) {
    url = url.toLowerCase().trim()
    if (!url) return
    if (shouldAddHTTP && !url.startsWith("http://") && !url.startsWith("https://")) url = "http://" + url
    // eslint-disable-next-line no-undef
    window.open(url)
}

utils.getUniqueID = function() {
    return (
        Math.random()
            .toString(36)
            .substring(2) + new Date().getTime().toString(36)
    )
}

utils.isValidEmail = function(email) {
    const emailRegex = /^([A-Za-z0-9_\-.+])+@([A-Za-z0-9_\-.])+\.([A-Za-z]{2,})$/
    return emailRegex.test(email.trim())
}

utils.formatDate = function(date, format) {
    // This ensures that the timestamp is converted and displayed in the server time, not the local time

    const deltaFromServer = new Date().getTimezoneOffset() * 60
    const timestamp = date + deltaFromServer

    if (!format) format = this.isThisYear(timestamp) ? "D MMM, H:mm" : "D MMM YYYY, H:mm"

    return this.moment(timestamp * 1000).format(format)
}

utils.isSameDay = function(timestamp1, timestamp2) {
    const date1 = new Date(timestamp1 * 1000)
    const date2 = new Date(timestamp2 * 1000)
    return date1.getDate() === date2.getDate() && date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear()
}

utils.isThisYear = function(timestamp) {
    const date1 = new Date(timestamp * 1000)
    const date2 = new Date()
    return date1.getFullYear() === date2.getFullYear()
}

utils.day = function(timestamp) {
    const date = new Date(timestamp * 1000)
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    return result.getTime()
}

utils.date = function(timestamp) {
    const deltaFromServer = new Date().getTimezoneOffset() * 60
    const date = new Date((timestamp + deltaFromServer) * 1000)
    return date
}

utils.month = function(timestamp) {
    const deltaFromServer = new Date().getTimezoneOffset() * 60
    const date = new Date((timestamp + deltaFromServer + 3600) * 1000)
    return date.getMonth() + 1
}

utils.year = function(timestamp) {
    const deltaFromServer = new Date().getTimezoneOffset() * 60
    const date = new Date((timestamp + deltaFromServer + 3600) * 1000)
    return date.getFullYear()
}

utils.roundPrice = function(price, decimals) {
    if (decimals === undefined) decimals = 2
    return parseFloat(price.toFixed(decimals))
}

utils.delay = function(time) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, time)
    })
}

utils.isNotBlank = function(text) {
    if (!text) return false
    return this.returnsToSpaces(text).trim() != ""
}

utils.isBlank = function(text) {
    if (!text) return true
    return !this.isNotBlank(text)
}

utils.showModal = function(modalID, extraOptions) {
    // eslint-disable-next-line no-undef
    const options = {
        transition: "fade up",
        closable: false,
        allowMultiple: true
    }

    if (extraOptions) Object.assign(options, extraOptions)

    // Show the modal after 100ms, to allow any previous modals to hide
    setTimeout(() => {
        $(modalID)
            .modal(options)
            .modal("show")
    }, 100)
}

utils.formatByteSize = function(bytes) {
    const B = 1
    const KB = 1024 * B
    const MB = 1024 * KB
    const GB = 1024 * MB

    if (bytes > GB) return `${Math.round(bytes / GB, 1)} GB`
    else if (bytes > MB) return `${Math.round(bytes / MB, 1)} MB`
    else if (bytes > 1024) return `${Math.round(bytes / KB, 1)} KB`
    else if (bytes > 0) return `0.${Math.round((bytes * 10) / KB, 1)} KB`

    return "N/A"
}

utils.linkify = function(text) {
    return linkifyHtml(text, {
        validate: {
            url: function(value) {
                return /^(http|ftp)s?:\/\//.test(value)
            }
        }
    })
}

utils.escapeString = function(text, omitDash) {
    let result = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    if (!omitDash) result = result.replace(/-/g, "\\-")
    return result
}

/* eslint-disable */
utils.showDesktopNotification = function(title, body, requireInteraction) {
    // If the browser doesn't support notifications, return
    if (!("Notification" in window)) return

    const options = { body, requireInteraction }

    // Check whether notification permissions have already been granted
    if (Notification.permission === "granted") new Notification(title, options)
    // Otherwise, we need to ask the user for permission (if the user didn't deny earlier)
    else if (Notification.permission !== "denied")
        Notification.requestPermission().then(function(permission) {
            if (permission === "granted") new Notification(title, options)
        })
}
/* eslint-enable */

export default utils
