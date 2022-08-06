const utils = {}

utils.currencySymbols = { EUR: "€", USD: "$", GBP: "£", SEK: "K", CAD: "$" }

utils.openURL = function(url, shouldAddHTTP) {
    url = url.toLowerCase().trim()
    if (!url) return
    if (shouldAddHTTP && !url.startsWith("http://") && !url.startsWith("https://")) url = "http://" + url
    // eslint-disable-next-line no-undef
    window.open(url)
}

utils.pluralS = function(number) {
    return number == 1 ? "" : "s"
}

utils.projectStatusNames = {
    2: "Finding translator",
    3: "Finding translator",
    4: "In translation",
    5: "In translation",
    6: "In check phase",
    7: "Reopened"
}

module.exports = utils
