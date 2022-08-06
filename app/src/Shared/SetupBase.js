/* eslint no-undef: 0 */

import Vue from "vue"
import ErrorManager from "./ClientErrorManager"

export default function setupApplication() {
    // Disable the back button of the browser, to prevent accidental navigation away from the page
    history.pushState(null, null, "")
    window.onpopstate = () => history.pushState(null, null, "")

    window.onbeforeunload = () => "Are you sure you want to close Tranwise?"

    // Set up the error manager that sends the errors to the server
    Vue.config.errorHandler = function(error) {
        ErrorManager.processError(error)
        throw error
    }
}
