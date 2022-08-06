import utilsBase from "../Shared/UtilsBase"

const utils = { ...utilsBase }

utils.simpleHash = function(text) {
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

// The intervals which are in DST in Europe for 2020 - 2030
const dstIntervals = [
    "1585440000-1603584000", // 2020
    "1616889600-1635638400", // 2021
    "1648339200-1667088000", // 2022
    "1679788800-1698537600", // 2023
    "1711843200-1729987200", // 2024
    "1743292800-1761436800", // 2025
    "1774742400-1792886400", // 2026
    "1806192000-1824940800", // 2027
    "1837641600-1856390400", // 2028
    "1869091200-1887840000", // 2029
    "1901145600-1919289600" // 2030
]

function timestampIsDST(timestamp) {
    for (let interval of dstIntervals) {
        if (timestamp > interval.split("-")[0] && timestamp < interval.split("-")[1]) return true
    }
    return false
}

utils.formatDateToLocalTime = function(date) {
    if (!date) return ""

    // Convert the date from the server (CET time) to UTC
    // The server is UTC + 2 in the summer (when it's in DST) and UTC + 1 in the winter (when it's not in DST)
    const serverCorrection = timestampIsDST(date) ? 7200 : 3600
    date -= serverCorrection

    // Adjust for the local timezone offset
    const localCorrection = new Date(date * 1000).getTimezoneOffset() * 60
    date -= localCorrection

    const format = this.isThisYear(date) ? "D MMM, H:mm" : "D MMM YYYY, H:mm"
    return this.moment(date * 1000)
        .utc()
        .format(format)
}

export default utils
