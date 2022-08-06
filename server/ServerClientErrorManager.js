// Errors coming from the clients are stored in an array. Errors with the same message and stack
// are stored only once, and each error has an 'users' object that stores the number of occurrences
// of that error for each user.

const utils = require("./Utils")

// All the errors received from clients
const errors = {}

// An object matching the id's of errors got from the clients to the id's in the errors object
// so when an [id, count] message comes from the client, we can match it to a stored error
const idPairs = {}

function increaseErrorCountForUser(error, user, count) {
    let errorCountForThisUser = error.users[user.pk + " - " + user.fullName]
    if (!errorCountForThisUser) errorCountForThisUser = 0
    error.users[user.pk + " - " + user.fullName] = errorCountForThisUser + count
}

function processClientError(errorData) {
    // "this" is bound to the User that generated the error
    const user = this

    // If we got an array, it should include the error's id and count
    if (Array.isArray(errorData)) {
        const id = errorData[0]
        const count = errorData[1]
        if (!id || !count) return

        // Find the id of this error in our errors array based on the id we got from the user
        const error = errors[idPairs[id]]
        if (!error) return

        // If we found the error, add the count, otherwise don't do anything, cause we don't know
        // what this error is (we don't have it stored here and we only got an id and count, not the error itself)
        let countToAdd = 1
        if (count > 10) countToAdd = 10
        increaseErrorCountForUser(error, user, countToAdd)
    }
    // ... otherwise we got an object with the error information (message, stack, id, count = 1)
    else {
        let foundErrorKey
        let foundError
        // Iterate all the stored errors and try to see if the received error is already in the list
        for (let [key, e] of Object.entries(errors)) {
            if (e.message === errorData.message && e.stack === errorData.stack) {
                foundErrorKey = key
                foundError = e
                break
            }
        }

        // If we found the error in the array, increase the error count for this user
        if (foundError) {
            increaseErrorCountForUser(foundError, user, 1)
            // Add a pair that matches the id we got from the user to the id generated for this new error object
            // so that when we get just an id and count from the user, to be able to associate it with the error in our array
            idPairs[errorData.id] = foundErrorKey
        }
        // ... otherwise create a new error object, set the errorCount for this user and add it to the array
        else {
            const newErrorID = utils.getUniqueID()
            const newError = {
                message: errorData.message,
                stack: errorData.stack,
                users: {}
            }
            // Set the count for this user to 1 on the newly created error object
            newError.users[user.pk + " - " + user.fullName] = 1

            // Add the new error to the errors object
            errors[newErrorID] = newError

            // Add a pair that matches the id we got from the user to the id generated for this new error object
            // so that when we get just an id and count from the user, to be able to associate it with the error in our array
            idPairs[errorData.id] = newErrorID
        }
    }
}

function getErrors() {
    return errors
}

module.exports = {
    processClientError,
    getErrors
}
