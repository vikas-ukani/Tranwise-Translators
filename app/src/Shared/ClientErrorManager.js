import cmg from "./ConnectionManagerBase"
import utils from "./UtilsBase"

const errors = []

// Sends an error message that occurred on the client (JavaScript) to the server
// to be logged there and checked by the developer
function processError(error) {
    let foundError
    for (let e of errors) {
        if (e.message === error.message && e.stack === error.stack) {
            foundError = e
            break
        }
    }

    // If we find the same error in the list of previous errors, just send the id of the error to the server
    // so the error count can be incremented
    if (foundError) {
        foundError.count++
        // If the error occurred more than 10 times, only send it for every 20th, 30th etc. occurrence
        if (foundError.count > 10) {
            // If the error occurred more than 100 times (in this sesssion), don't send it to the server anymore
            if (foundError.count % 10 === 0 && foundError.count <= 100) cmg.sendClientError([foundError.id, foundError.count])
        } else cmg.sendClientError([foundError.id, foundError.count])
    }
    // ... otherwise, create a new error object, add it to the array and send it to the server
    else {
        const newError = {
            message: error.message,
            stack: error.stack,
            id: utils.getUniqueID(),
            count: 1
        }
        errors.push(newError)
        cmg.sendClientError(newError)
    }
}

export default {
    processError
}
