<template lang="pug">
    #app
        ConnectionFeedback(ref="ConnectionFeedback")
        .full-height
            LoginLoadingBase(v-if="isLoading" :loginItemsCount="17" :loginItemsReceivedCount="loginItemsReceivedCount")
            #active-wrapper(v-else)
                textarea#clipboard-helper(style="width: 0; height: 0; position: fixed; top: -100; left: -100; opacity: 0")
                #top-bar
                    #main-area
                        MainMenu(@mainMenuChangeActivePage="changeActivePage" @mainMenuHistoryGoBack="historyGoBack" @mainMenuHistoryGoForward="historyGoForward" @mainMenuSignOut="logout" @mainMenuAwayStatus="setAwayStatus" :isAway="isAway")
                        .ui.icon.buttons(style="margin: 0 10px; background-color: #f7f6f6")
                            .ui.icon.button.history-button(@click="historyGoBack")
                                i.arrow.left.icon
                            .ui.icon.button.history-button(@click="historyGoForward")
                                i.right.arrow.icon
                        .vertical-center(v-if="store.myself && store.myself.IS_NOT_AVAILABLE" style="padding: 0 20px; color: red; font-weight: 600") You are marked as not available
                        .vertical-center(v-if="store.myself && store.myself.IS_NOT_AVAILABLE" @click="markAsAvailable")
                            .ui.button.mini.coolgreen Mark me as available
                        .vertical-center(v-if="isAway && store.myself && !store.myself.IS_NOT_AVAILABLE" style="padding: 0 20px; color: red; font-weight: 600") Your status is set to Away
                        .vertical-center(v-if="isAway && store.myself && !store.myself.IS_NOT_AVAILABLE" @click="markAsAwayAvailable")
                            .ui.button.mini.coolgreen Mark me as available
                        .vertical-center(v-if="shouldEnableDesktopNotifications")
                            .ui.button.mini.teal(@click="enableNotifications") Enable notifications
                    #blue-area(style="color: lightblue; text-align: right; padding-right: 8px; display: flex")
                        .ui.button.mini(@click="showTips" style="background-color: #CCEBF9; padding: 3px 10px; margin: 2px 7px 7px 20px") Tips
                        div(style="flex-grow: 1")
                        div v. {{ version }}
                #main-wrapper
                    #component-wrapper(:style="{'max-width' : showChatArea ? '1080px' : '10000px'}")
                        component(:is="activeComponentName" :ref="activeComponentName" :settings="activeComponentSettings"
                            :objectFromFind="objectFromFind" @goToObject="goToObject" @addToHistory="addToHistory" @goToPage="changeActivePage")
                    #chat-wrapper(v-show="showChatArea")
                        ChatBase(:isVisible="showChatArea")
                    #right-area
                        NotificationArea
                #popup-target
                ChatWindowBase(v-show="!showChatArea" :isVisible="!showChatArea")
        ModalDialog(ref="modalDialog")
        TransferManager(ref="transferManager")
</template>

<script>
import Cookie from "js-cookie"
import AppMixin from "../Shared/Mixins/AppMixin"
import ConnectionFeedback from "../Shared/components/ConnectionFeedback"
import LoginLoadingBase from "../Shared/components/LoginLoadingBase"
import ModalDialog from "../Shared/components/ModalDialog"
import TransferManager from "../Shared/components/TransferManager"
import MainMenu from "./MainMenuTR"
import NotificationArea from "./Notifications/NotificationAreaTR"
import MessageBoardBase from "../Shared/MessageBoard/MessageBoardBase"
import EmployeesMessagesBase from "../Shared/EmployeesMessages/EmployeeMessagesBase"
import ProjectsMain from "./Projects/ProjectsMainTR"
import ContactProjectManagers from "./ContactProjectManagersTR"
import PersonalDetails from "./PersonalDetailsTR"
import PaymentSheets from "./PaymentSheetsTR"
import CompletedProjects from "./CompletedProjectsTR"
import Resources from "./ResourcesTR"
import GetExtension from "./GetExtensionTR"
import Tips from "./TipsTR"
import History from "../Shared/History"
import ChatBase from "../Shared/Chat/ChatBase"
import ChatWindowBase from "../Shared/Chat/ChatWindowBase"
import C_ from "./ConstantsTR"
import Setup from "./SetupTR"
import store from "./Store/StoreTR"
import utils from "./UtilsTR"
import cmg from "./ConnectionManagerTR"

export default {
    name: "AppTranslators",

    mixins: [AppMixin],

    components: {
        ConnectionFeedback,
        LoginLoadingBase,
        ModalDialog,
        TransferManager,
        History,
        Resources,
        GetExtension,
        MainMenu,
        NotificationArea,
        MessageBoardBase,
        EmployeesMessagesBase,
        Tips,
        ProjectsMain,
        ContactProjectManagers,
        PersonalDetails,
        PaymentSheets,
        CompletedProjects,
        ChatBase,
        ChatWindowBase
    },

    data() {
        return {
            // This is the only place where store is declared in data()
            // and it is enough to make it reactive throughout the entire app
            store,
            loginResult: "",
            loginItemsReceivedCount: 0,
            isLoading: false,
            isAway: false,
            isIdle: false,
            activeComponentName: "",
            showChatArea: false,
            objectFromFind: undefined,
            shouldShowReconnectionFeedback: false,
            shouldEnableDesktopNotifications: false,
            version: "3.0.6"
        }
    },

    created() {
        // Remove the extensionID from the localStorage in case the translator has removed the extension.
        // If the extension is active, it will reset it afterwards.
        localStorage.removeItem("TranwiseExtensionID")

        // Remove things like /TranslatorsAgreement
        const baseURL = window.location.protocol + "//" + window.location.host
        window.history.pushState({ path: baseURL }, "", baseURL)

        $("#loading-app").remove()

        // Just define the requestDatabase function, which is used in the login() function
        this.requestDatabase = () => {
            // Request this employee's full details and make store.myself poing to that employee
            cmg.requestSelfEmployee(employee => {
                store.setMyself(store.employee(employee.PK))
            })
            cmg.requestServerTime()
            cmg.requestDatabase(() => {
                // If we didn't get the self employee requested above, return, so we don't complete the login
                if (!store.myself) return

                store.prepare()

                this.addWelcomeNotification()
                this.addPendingProjectsMessagesNotifications()

                this.isLoading = false
                cmg.sendPostLoginMessages(this.version)

                // Show the projects page
                let firstComponentName = "ProjectsMain"

                // But if the translator didn't fill their phone number or country, show the Personal Details page
                if (!this.checkMandatoryDetails()) firstComponentName = "PersonalDetails"
                this.setActiveComponentName(firstComponentName)
                this.addToHistory({ page: this.activeComponentName })

                // Check the payment method and show a warning if needed, but only of there weren't any issues with
                // the mandatory details (phone number and country)
                if (firstComponentName === "ProjectsMain") this.checkPaymentMethod()

                // Query the idle state which is stored in localStorage by the extension
                setInterval(() => {
                    const idleState = localStorage.TranwiseIdleState
                    if (idleState === "idle" && store.myself.ONLINE_STATUS === C_.eoOnline) cmg.updateObject(store.myself, "ONLINE_STATUS", C_.eoIdle)
                    if (idleState === "active" && store.myself.ONLINE_STATUS === C_.eoIdle) cmg.updateObject(store.myself, "ONLINE_STATUS", C_.eoOnline)
                    this.isIdle = idleState === "idle"
                }, 5000)

                // Request the server time and store the serverTimeDelta, to be able to calculate at any point
                // the time on the server based on the local time. And request it every 1 minute.
                setInterval(cmg.requestServerTime(), 1000 * 60)
            })
        }

        store.eventBus.$on("goToObject", obj => this.goToObject(obj))

        store.eventBus.$on("receivedLoginItem", () => this.loginItemsReceivedCount++)

        // When receiving an offline status for myself, update the status back to online (or idle, or away)
        store.eventBus.$on("receivedOfflineStatusForSelf", () => {
            let status = C_.eoOnline
            if (this.isIdle) status = C_.eoIdle
            if (this.isAway) status = C_.eoAway
            cmg.updateObject(store.myself, "ONLINE_STATUS", status)
        })

        this.isLoggedIn = false
        this.isLoading = true

        const loginToken = sessionStorage.getItem("tt")

        if (loginToken) {
            this.login(loginToken)
        } else if (Cookie.get("dt")) {
            // This is used when running the app locally. You have to manually create the following cookies on the page provided by webpack:
            // dt - http://localhost:3343/
            // ut - the username of the translator account you are using for testing
            // pt - the password hash, calculated as md5(user's password + "2147483648")
            //      eg. if the test user's password is "verysecure", this cookie should be set to the value of md5("verysecure2147483648")
            $.ajax(Cookie.get("dt"), {
                type: "POST",
                data: { username: Cookie.get("ut"), password: Cookie.get("pt") },
                success: data => this.login(data)
            })
        }
    },

    mounted() {
        Setup()
        store.vue = this
        this.isChrome = !!window.chrome
        store.shouldEnableDesktopNotifications = "Notification" in window && Notification.permission === "denied"
        setInterval(() => (this.shouldEnableDesktopNotifications = "Notification" in window && Notification.permission === "denied"), 3000)
    },

    methods: {
        login(loginToken) {
            Cookie.remove("tt")
            this.loginResult = ""
            cmg.login(
                loginToken,
                this.version,
                (loginResult, token) => {
                    this.loginResult = loginResult
                    if (loginResult === "granted") {
                        this.requestDatabase()
                        store.downloadToken = loginToken
                    }
                },
                option => {
                    // The connection feedback function
                    if (option === "showReconnection") this.$refs.ConnectionFeedback.showReconnectionFeedback()
                    if (option === "reconnected") this.$refs.ConnectionFeedback.hideReconnectionFeedback()
                    if (option === "reconnectDenied") this.$refs.ConnectionFeedback.showReloadButton()
                }
            )
        },

        setActiveComponentName(componentName, skipModalRemoval) {
            if (this.activeComponentName === componentName) return

            // Remove all the .modal dialogs from the .modals div, so they are recreated the next time this page is visited.
            // Exception: Don't remove the modals that have the class .persistent like "show-dialog-modal"
            /* prettier-ignore */
            if (!skipModalRemoval) $("body .modals").find(".modal").not(".persistent").remove()

            this.activeComponentName = componentName
        },

        changeActivePage(pageName) {
            // Check if the translator has filled in the phone number and the country.
            // Otherwise, don't allow them to leave the Personal Details page
            if (!this.checkMandatoryDetails()) return

            // Reset the object from find
            this.objectFromFind = null

            // If moving from MessageBoardBase to MessageBoardBase (ie. from the translations board to the global board or viceversa)
            // don't remove the modals in setActiveComponentName called below
            const skipModalsRemoval = pageName.includes("MessageBoardBase") && this.activeComponentName.includes("MessageBoardBase")

            // If moving from MessageBoardBase to MessageBoardBase (ie. from the translations board to the global board or viceversa)
            // clear the thread that was selected
            if (pageName.includes("MessageBoardBase") && this.activeComponentName.includes("MessageBoardBase")) this.$refs.MessageBoardBase.clearThread()

            // This is required so that the page is updated even if the activeComponentName is the same
            // (eg. from going From MessageBoardBase to MessageBoardBaseForTranslations)
            if (pageName.includes("MessageBoardBase")) this.activeComponentName = ""

            this.activeComponentSettings = {}
            if (pageName === "MessageBoardBaseForTranslations") {
                this.activeComponentSettings = { isForTranslations: true }
                pageName = "MessageBoardBase"
            }

            this.setActiveComponentName(pageName, skipModalsRemoval)

            this.addToHistory({ page: pageName })
        },

        // objectFromFind is passed down as a prop to the details component that is going to display the object
        // and watched for inside that component (eg. in ProjectsMain)
        goToObject(object) {
            // First check if the translator has filled in the phone number and the country and don't allow them
            // to leave the Personal Details page if not
            if (!this.checkMandatoryDetails()) return

            // Set isFromFind on the object, so the target screen knows it should show it in the list,
            // even though normally it would filter it out (eg. show completed projects or disabled employees)
            this.$set(object, "isFromFind", true)

            // Change the details component if needed
            let newComponentName
            if (object.table === "SUBPROJECTS" && this.activeComponentName !== "ProjectsMain") newComponentName = "ProjectsMain"

            // If we have to change the component
            if (newComponentName) {
                this.objectFromFind = object
                this.setActiveComponentName(newComponentName)
            }
            // ... otherwise (if we didn't change the component)
            else {
                // Set objectFromFind to undefined first, so that the watchers notice a change if selecting the same object twice
                this.objectFromFind = undefined
                this.$nextTick(() => (this.objectFromFind = object))
            }
        },

        showTips() {
            const message = `<p>Tranwise 3 is able to adapt its layout automatically to your screen size, in order to show you as much information as possible. However, if you have a smaller screen, there are a few things you can do to make it even better:</p><p>1. You can zoom in and out the page by holding down the Ctrl key and press the + or - keys on your keyboard to find a better layout.</p><p>2. You can run the application in window mode. To do that, click the Chrome menu icon (the three dots on the right) => More tools => Create shortcut... => Check "Open as window" => Create. This will create a shortcut on your Desktop. Whenever you open that shortcut, the application will open in a separate window, without the tab bar and address bar.</p>`
            this.$showHTMLMessage(message)
        },

        logout() {
            Cookie.remove("lu")
            Cookie.remove("lp")
            window.onbeforeunload = null
            location.reload()
        },

        goToHistoryObject(object) {
            if (!object) return
            if (object.page) this.changeActivePage(object.page)
            else if (object.subproject) this.goToObject(object.subproject)
        },

        addPendingProjectsMessagesNotifications() {
            for (let m of store.projectsMessages) {
                if (m.RECIPIENT != store.myself.PK) return
                if (m.SENDER === "C2T") return
                if (!m.IS_PROBLEM || m.IS_READ) return
                const project = store.project(m.PROJECT_ID)
                if (!project || !project.PROJECT_NUMBER) return

                let subprojectID
                for (let subproject of store.subprojects) if (subproject.PROJECT_ID === m.PROJECT_ID) subprojectID = subproject.PK

                const fromTheClient = m.SENDER === "CL" ? " from the client" : ""

                store.addNotification("IMPORTANT", "You have an unread message", "about project " + project.PROJECT_NUMBER, {
                    title: "You have an unread message" + fromTheClient + " about project " + project.PROJECT_NUMBER,
                    note: "Note: You can find this message at the bottom of the project's details.",
                    message: m.MESSAGE,
                    subprojectID: subprojectID
                })
            }
        },

        async setAwayStatus(isAway) {
            if (isAway) {
                const response = await this.$showDialog({
                    message: `Set your away message:`,
                    inputText: this.awayMessage || ""
                })
                if (response.selection != "OK") return

                this.awayMessage = response.text
                cmg.updateObject(store.myself, "AWAY_MESSAGE", this.awayMessage)
            }

            this.isAway = isAway
            cmg.updateObject(store.myself, "ONLINE_STATUS", isAway ? C_.eoAway : C_.eoOnline)
        },

        // Removes the Away status (ONLINE_STATUS) - this is per session
        markAsAwayAvailable() {
            this.isAway = false
            cmg.updateObject(store.myself, "ONLINE_STATUS", C_.eoOnline)
        },

        // Removes the IS_NOT_AVAILABLE status - this status is not removed when the translator goes offline
        markAsAvailable() {
            cmg.updateObject(store.myself, "IS_NOT_AVAILABLE", false)
        },

        checkPaymentMethod() {
            if (!store.myself.PAYMENT_METHOD) this.$showMessage("Please select your preferred payment type on the Personal Details page.")
            if (store.myself.PAYMENT_METHOD === C_.epPayoneerEuro && !store.myself.PAYONEER_STATUS.includes("E"))
                this.$showMessage(
                    "You have selected the Payment in Euro using Payoneer payment option, but your Payoneer account has not been approved yet. " +
                        "Please make sure to have your Payoneer account approved before the next payment, or select a different payment type."
                )
            if (store.myself.PAYMENT_METHOD === C_.epPayoneerUSD && !store.myself.PAYONEER_STATUS.includes("U"))
                this.$showMessage(
                    "You have selected the Payment in US Dollars using Payoneer payment option, but your Payoneer account has not been approved yet. " +
                        "Please make sure to have your Payoneer account approved before the next payment, or select a different payment type."
                )
            if (store.myself.PAYMENT_METHOD === C_.epPayPal && !utils.isValidEmail(store.myself.PAYPAL_EMAIL))
                this.$showMessage(
                    "You have selected the PayPal payment option, but you haven't added a valid PayPal email address. " +
                        "Please make sure to set your PayPal email address, or select a different payment type."
                )
        },

        checkMandatoryDetails() {
            if (store.myself.PHONE_NUMBER.length < 11 && store.myself.MOBILE_NUMBER.length < 11) {
                this.$showMessage(
                    "Please fill in at least one of your phone numbers in order to continue using Tranwise. We need your phone number in order to contact you for deadlines or reopened projects.\n\nPlease fill in your phone number in international format:\n\n00 + country code + phone number (including area code)\n\nEg. 00 31 23456789 (spaces will be removed automatically)"
                )
                return false
            }

            if (!store.myself.COUNTRY_ID) {
                this.$showMessage("Please select your country in order to continue using Tranwise.")
                return false
            }

            return true
        },

        enableNotifications() {
            if (Notification.permission === "denied") {
                this.$showMessage(
                    "It seems you have denied notifications for the Tranwise webpage.\n\nIn order to enable the new job and assignment notifications, please follow these steps:\n\n- open Chrome's settings\n- select Privacy & Security at the left\n- open Site Settings\n- open Notifications\n- look for the Tranwise webpage under the Block section\n- click on the three dots at the right and select Allow"
                )
                return
            }

            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    const options = { body: "You will see new jobs here", requireInteraction: true }
                    new Notification("Notifications are enabled", options)
                    this.shouldEnableDesktopNotifications = false
                }
            })
        }
    },

    watch: {
        showChatArea(newValue) {
            if (newValue) store.eventBus.$emit("makeNotificationAreaShort", false)
        }
    }
}
</script>

<style scoped>
#active-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
}

#top-bar {
    display: flex;
    flex-direction: row;
    flex: 0 0 auto;
}

#main-area {
    flex: 1 1 auto;
    display: flex;
}

#main-wrapper {
    flex: 1 1 auto;
    display: flex;
    height: 100%;
}

#component-wrapper {
    flex: 1 1 auto;
    height: 100%;
}

#chat-wrapper {
    flex: 1 1 auto;
    height: 100%;
    max-width: calc(100vw - 1330px);
}

#right-area {
    width: 250px;
    flex: 0 0 250px;
    display: flex;
    flex-direction: column;
}

#blue-area {
    background-color: #004e63;
    height: 37px;
    width: 250px;
    border-bottom: 1px solid #003748;
    padding-top: 9px;
}

#popup-target {
    width: 1px;
    height: 1px;
    position: fixed;
    z-index: 10000;
}
</style>

<style>
html,
body,
#app {
    height: 100%;
    background-color: rgb(247, 247, 247);
}

body {
    font-size: 13px;
    letter-spacing: 0.02rem;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #2c3e50;
    margin: 0;
}

:not(.icon) {
    font-family: "Open Sans", sans-serif !important;
}

.ui.dropdown .menu {
    box-shadow: 0 0 17px 2px rgba(34, 36, 38, 0.15);
}

.ui.dropdown .menu .active.item {
    font-weight: 400 !important;
}

* {
    box-sizing: border-box;
}

textarea {
    line-height: 1.4rem !important;
}

.ui.label {
    font-weight: 500;
}

.ui.form .field > label {
    font-weight: 500 !important;
    font-size: 13px;
}

.ui.coolblue.button {
    background-color: #00a4d3;
    color: white;
}

.ui.coolgreen.button {
    background-color: #73bf40;
    color: white;
}

.ui.button {
    font-weight: 600 !important;
}

.ui.form {
    font-weight: 400 !important;
    font-size: 13px;
}

.scroller {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
}

.full-height {
    height: 100%;
}

.inline {
    display: inline-block;
}

.hidden {
    display: none !important;
}

.no-select {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

.vertical-center {
    display: flex;
    align-items: center;
}

.div-zero {
    width: 0;
    height: 0;
}

.component-fade-enter-active,
.component-fade-leave-active {
    transition: opacity 0.1s ease;
}

.component-fade-enter,
.component-fade-leave-to {
    opacity: 0;
}

i.close.icon::before {
    cursor: pointer;
    position: absolute;
    color: #550000;
    left: -40px;
    top: 57px;
}

.ui.tw-size.form input {
    padding: 7px 11px;
}

.ui.tw-size.form .field {
    margin-bottom: 8px !important;
}

.ui.tw-size.form .fields {
    margin-bottom: 0 !important;
}

.ui.tw-size.form .ui.labeled.input > .ui.basic.label {
    padding: 7px 11px;
}

.ui.tw-size.form .ui.dropdown {
    padding: 8px 11px 9px 11px;
    min-height: 0em;
}

.ui.tw-size.form .ui.dropdown .item {
    padding: 10px 16px !important;
}

.ui.tw-size.form textarea {
    padding: 7px 11px;
}

.ui.tw-size.form .ui.checkbox > label {
    font-size: 13px;
}

.ui.tw-size.form label {
    font-size: 13px !important;
}

.clickable {
    cursor: pointer;
}

.unselectable {
    -moz-user-select: -moz-none;
    -khtml-user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
    user-select: none;
}
</style>
