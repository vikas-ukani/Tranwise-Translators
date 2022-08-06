const utils = require("./Utils")
const serverActions = require("./ServerActions")

const self = {}
const actions = []
let secondsCounter = 0

// Actions running at a fixed hour (12am, 1am, 7am)
actions.push({ hour: 0, method: "sendDailyInvoiceReminders" })
actions.push({ hour: 1, method: "sendEmailAboutUpcomingProjects" })
actions.push({ hour: 1, method: "sendOpenedProjectsReport" })
actions.push({ hour: 5, method: "performDatabaseBackup" })
actions.push({ hour: 7, method: "sendDailyEmailToNewTranslators" })

// Actions running every 10 minutes. Some of them are delayed by x minutes so they don't run all at once
actions.push({ minutes: 10, delay: 0, method: "sendDeadlineReminders" })
actions.push({ minutes: 10, delay: 1, method: "resendPendingQuotes" })

function processAction(action) {
    // If the action should be performed at a certain time (fixed hour)
    if (action.hour != undefined) {
        const time = utils.moment().local()
        if (time.hour() === action.hour) {
            // On minute :00 of that hour perform the action and set it as done
            if (time.minute() === 0 && !action.done) {
                action.done = true
                serverActions[action.method] && serverActions[action.method]()
            }
            // On minute :01 of that hour, set the action as not done, so it will be performed the next day
            if (time.minute() === 1) action.done = false
        }
    }

    // If the action should be performed every X minutes
    if (action.minutes) {
        if (secondsCounter % (action.minutes * 60) === action.delay * 60) serverActions[action.method] && serverActions[action.method]()
    }
}

setInterval(() => {
    if (self.inTestMode) return
    secondsCounter += 10
    for (let action of actions) processAction(action)
}, 10000)

module.exports = self
