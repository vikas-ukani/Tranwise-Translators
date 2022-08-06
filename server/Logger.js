const axios = require("axios")
const fs = require("fs")
const config = require("./serverConfig.js")
const utils = require("./Utils.js")

function log(logType, data, skipConsole) {
    let logFileName = logType.toLowerCase()
    logFileName = logFileName[0].toUpperCase() + logFileName.slice(1) + ".log"

    if (typeof data === "object") data = JSON.stringify(data)

    const stringToLog = `[${utils.formatNow("YYYY/MM/DD HH:mm:ss")}] ${data}`

    fs.appendFile(config.server3LogsFolder + logFileName, `${stringToLog}\n`, "utf8", err => {
        if (err) console.log(err)
    })

    if (logType != "SOCKET" && logType != "MAILER" && logType != "API" && !skipConsole) console.log(`[${utils.formatNow("YYYY/MM/DD HH:mm:ss")}] ${data}`)

    axios
        .post("http://localhost:3363/", {
            type: logType,
            data: stringToLog
        })
        .then(function () {})
        .catch(function () {})
}

module.exports = log
