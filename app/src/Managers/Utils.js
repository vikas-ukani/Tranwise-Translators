import utilsBase from "../Shared/UtilsBase"
import md5 from "./MD5"

const utils = { ...utilsBase }

utils.projectStatusIconName = function(status) {
    const iconNames = [
        "",
        "Quote",
        "Setup",
        "Pending",
        "InProgressTranslation",
        "InProgressProofreading",
        "InProgressCheckPhase",
        "Reopened",
        "Completed",
        "CompletedAfterReopen",
        "Cancelled"
    ]
    return "/static/icons/Projects/ProjectsMain/ProjectStatus" + iconNames[status] + ".svg"
}

utils.copyToClipboard = function(text) {
    // eslint-disable-next-line no-undef
    const doc = document
    const element = doc.getElementById("clipboard-helper")
    element.value = text
    element.select()
    doc.execCommand("Copy")
}

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

utils.getEmailAddress = function(raw) {
    var regex = /^(.*?)(\s*<(.*?)>)/g
    var match = regex.exec(raw)
    return match ? match[3].trim() : raw
}

utils.unity = function(number) {
    if (number > 0) return 1
    if (number < 0) return -1
    return 0
}

utils.md5 = md5

export default utils
