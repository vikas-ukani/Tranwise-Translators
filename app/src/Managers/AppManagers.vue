<template lang="pug">
#app
    ConnectionFeedback(ref="ConnectionFeedback")
    .full-height
        LoginLoadingBase(v-if="isLoading", :loginItemsCount="40", :loginItemsReceivedCount="loginItemsReceivedCount")
        #active-wrapper(v-else)
            textarea#clipboard-helper(style="width: 0; height: 0; position: fixed; top: -100; left: -100; opacity: 0")
            #top-bar
                #main-area
                    MainMenu(
                        @mainMenuChangeActivePage="changeActivePage",
                        @mainMenuHistoryGoBack="historyGoBack",
                        @mainMenuHistoryGoForward="historyGoForward",
                        :monthlyActions="store.permissions.monthlyActions",
                        :overdueInvoices="store.permissions.overdueInvoices"
                    )
                    .ui.icon.buttons(style="margin: 0 10px; background-color: #f7f6f6")
                        .ui.icon.button.history-button(@click="historyGoBack")
                            i.arrow.left.icon
                        .ui.icon.button.history-button(@click="historyGoForward")
                            i.right.arrow.icon
                    SearchBar(@goToObject="goToObject")
                    #download-progress-wrapper(v-show="downloadProgresses.length") Downloads:
                        .download-progress.tooltip(
                            v-for="file in downloadProgresses",
                            :key="file.idForList",
                            :data-tippy-content="file.FILE_NAME",
                            :data="initializeTooltip('.download-progress.tooltip')"
                        )
                            RadialProgress(:progress="file.downloadProgress")
                #blue-area(style="color: lightblue; text-align: right; padding-right: 8px; display: flex")
                    div(style="cursor: pointer; margin: 0px 10px 5px 10px; position: relative", @click="changeActivePage('ProjectsMessagesMain')")
                        .floating.ui.mini.red.circular.label(v-if="problemProjectsMessagesCount", style="margin-left: -1em !important; font-weight: 700; line-height: 10px") {{ problemProjectsMessagesCount }}
                        img(src="static/icons/ProjectsMessages.svg")
                    div(v-if="store.showNewTwilioIcon", style="cursor: pointer; margin: 0px 10px 5px 10px; position: relative", @click="goToTwilioChat")
                        img(src="static/icons/GoToTwilioChat.svg")
                    div(style="flex-grow: 1")
                    .clickable(@click="versionClick") v. {{ version }}
            #main-wrapper
                #component-wrapper(:style="{ 'max-width': showChatArea ? '1080px' : '10000px' }")
                    component(
                        :is="activeComponentName",
                        :ref="activeComponentName",
                        :settings="activeComponentSettings",
                        @showProjectsForClient="showProjectsForClient",
                        :clientForProjectsFilter="clientForProjectsFilter",
                        :objectFromFind="objectFromFind",
                        @goToObject="goToObject",
                        @addToHistory="addToHistory",
                        @goToPage="changeActivePage"
                    )
                #chat-wrapper(v-show="showChatArea")
                    ChatBase(:isVisible="showChatArea")
                #right-area
                    NotificationArea(:filters="notificationFilters")
                    NotificationAreaFilters(@updateNotificationsFilter="updateNotificationsFilter")
            #popup-target
            ChatWindowBase(v-show="!showChatArea", :isVisible="!showChatArea")
    ModalDialog(ref="modalDialog")
    TransferManager(ref="transferManager")
</template>

<script>
import Cookie from "js-cookie"
import LoginLoadingBase from "../Shared/components/LoginLoadingBase"
import ConnectionFeedback from "../Shared/components/ConnectionFeedback"
import MainMenu from "./MainMenu"
import SearchBar from "./SearchBar"
import NotificationArea from "./Notifications/NotificationArea"
import NotificationAreaFilters from "./Notifications/NotificationAreaFilters"
import ModalDialog from "../Shared/components/ModalDialog"
import TransferManager from "../Shared/components/TransferManager"
import History from "../Shared/History"
import AppMixin from "../Shared/Mixins/AppMixin"

import ProjectsMain from "./Projects/ProjectsMain"
import ProjectsMessagesMain from "./ProjectsMessages/ProjectsMessagesMain"
import OverdueProjects from "./OverdueProjects/OverdueProjects"
import WatchedProjects from "./WatchedProjects/WatchedProjects"
import EmployeesMain from "./Employees/EmployeesMain"
import ClientsMain from "./Clients/ClientsMain"
import InvoicesMain from "./Invoices/InvoicesMain"
import OverdueInvoices from "./OverdueInvoices/OverdueInvoices"
import TwilioChat from "./TwilioChat/TwilioChat"
import MessageBoardBase from "../Shared/MessageBoard/MessageBoardBase"
import EmployeesMessagesBase from "../Shared/EmployeesMessages/EmployeeMessagesBase"
import Tips from "./Tips/Tips"
import Holidays from "./Holidays/Holidays"
import MonthlyActions from "./MonthlyActions/MonthlyActions"
import ChatBase from "../Shared/Chat/ChatBase"
import ChatWindowBase from "../Shared/Chat/ChatWindowBase"
import RadialProgress from "../Shared/components/RadialProgress"
import TooltipMixin from "../Shared/Mixins/TooltipMixin"

import Setup from "./Setup"
import cmg from "./ConnectionManager"
import store from "./Store/Store"
import utils from "./Utils"
import benchmark from "../Shared/BenchmarkManager"
import changeLog from "./ChangeLog"

export default {
    name: "AppManagers",

    mixins: [AppMixin, TooltipMixin],

    data() {
        return {
            // This is the only place where store is declared in data()
            // and it is enough to make it reactive throughout the entire app
            store,
            isLoggedIn: false,
            loginResult: "",
            loginItemsReceivedCount: 0,
            isLoading: false,
            activeComponentName: "",
            showChatArea: false,
            clientForProjectsFilter: undefined,
            objectFromFind: undefined,
            shouldShowReconnectionFeedback: false,
            notificationFilters: {},
            // Used to store the fileInfo's of requested files, to be used in AppManager to show the download progress
            downloadProgresses: [],
            version: "3.0.16"
        }
    },

    components: {
        ConnectionFeedback,
        TransferManager,
        ModalDialog,
        LoginLoadingBase,
        MainMenu,
        SearchBar,
        NotificationArea,
        NotificationAreaFilters,
        ProjectsMain,
        ProjectsMessagesMain,
        OverdueProjects,
        WatchedProjects,
        Holidays,
        TwilioChat,
        MessageBoardBase,
        ClientsMain,
        InvoicesMain,
        OverdueInvoices,
        EmployeesMain,
        Tips,
        MonthlyActions,
        EmployeesMessagesBase,
        RadialProgress,
        ChatBase,
        ChatWindowBase
    },

    methods: {
        login(loginToken) {
            Cookie.remove("t")
            this.loginResult = ""
            cmg.login(
                loginToken,
                this.version,
                (loginResult, token) => {
                    this.loginResult = loginResult
                    if (loginResult === "granted") {
                        this.isLoggedIn = true
                        sessionStorage.setItem("s", token)
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

        setActiveComponentName(componentName, skipModalsRemoval) {
            if (this.activeComponentName === componentName) return

            // Remove all the .modal dialogs from the .modals div, so they are recreated the next time
            // this page is visited. Exception: Don't remove the modals that have the class .persistent
            // like "show-dialog-modal"
            if (!skipModalsRemoval)
                $("body .modals")
                    .find(".modal")
                    .not(".persistent")
                    .remove()

            this.activeComponentName = componentName
        },

        changeActivePage(pageName) {
            // Reset the client filter
            this.clientForProjectsFilter = null

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
        // and watched for inside that component (eg. in ProjectsMain, EmployeesMain)
        goToObject(object) {
            // Set isFromFind on the object, so the target screen knows it should show it in the list,
            // even though normally it would filter it out (eg. show completed projects or disabled employees)
            this.$set(object, "isFromFind", true)

            // Change the details component if needed
            let newComponentName
            if (object.table === "PROJECTS" && this.activeComponentName !== "ProjectsMain") newComponentName = "ProjectsMain"
            if (object.table === "INVOICES" && this.activeComponentName !== "InvoicesMain") newComponentName = "InvoicesMain"
            if (object.table === "CLIENTS" && this.activeComponentName !== "ClientsMain") newComponentName = "ClientsMain"
            if (object.table === "EMPLOYEES" && this.activeComponentName !== "EmployeesMain") newComponentName = "EmployeesMain"
            if (object.table === "TWILIO_MESSAGES" && this.activeComponentName !== "TwilioChat") newComponentName = "TwilioChat"

            // If we have to change the component
            if (newComponentName) {
                this.objectFromFind = object
                this.setActiveComponentName(newComponentName)
            }
            // ... otherwise (if we didn't change the component)
            else {
                // Set objectFromFind to undefined first, so that the watchers notice a change if selecting the same object twice
                this.objectFromFind = undefined
                this.$nextTick(() => {
                    this.objectFromFind = object
                })
            }
        },

        goToTwilioChat() {
            this.changeActivePage("TwilioChat")
            this.$set(store, "showNewTwilioIcon", false)
        },

        showProjectsForClient(client) {
            this.clientForProjectsFilter = client
            if (client) this.setActiveComponentName("ProjectsMain")
        },

        versionClick() {
            this.$showMessage(changeLog)
        },

        goToHistoryObject(object) {
            if (!object) return
            if (object.page) this.changeActivePage(object.page)
            else if (object.project) this.goToObject(object.project)
            else if (object.employee) this.goToObject(object.employee)
            else if (object.client) this.goToObject(object.client)
            else if (object.invoice) this.goToObject(object.invoice)
        },

        updateNotificationsFilter(filter, value) {
            this.$set(this.notificationFilters, filter, value)
        }
    },

    computed: {
        chatPartner() {
            return store.chat.partners[0]
        },

        problemProjectsMessagesCount() {
            const count = store.projectsMessages.filter(m => m.IS_PROBLEM).length
            document.title = count ? `(${count}) Tranwise` : "Tranwise"
            return count
        }
    },

    mounted() {
        Setup()
        store.vue = this
    },

    // More actions are taken in the AppMixin
    created() {
        $("#loading-app").remove()

        setInterval(() => {
            if (store.myself && store.myself.ONLINE_STATUS === 0) cmg.updateObject(store.myself, "ONLINE_STATUS", 1)
        }, 1000 * 60)

        // Just define the requestDatabase function, which is used in the login() function
        this.requestDatabase = () => {
            // Request this employee's full details and make store.myself poing to that employee
            cmg.requestSelfEmployee(employee => {
                store.setMyself(store.employee(employee.PK))
            })

            cmg.requestServerTime()

            cmg.requestDatabase(() => {
                this.addWelcomeNotification()
                this.setActiveComponentName("ProjectsMain")
                this.addToHistory({ page: this.activeComponentName })
                this.isLoading = false
                cmg.sendPostLoginMessages(this.version)

                // Request the server time and store the serverTimeDelta, to be able to calculate at any point
                // the time on the server based on the local time. And request it every 1 minute.
                setInterval(cmg.requestServerTime(), 1000 * 60)

                store.computeProjectCompletionStatuses(this)
                store.addObjectsMetadata()
                store.buildTwilioThreads()
            })
        }

        store.eventBus.$on("goToObject", obj => this.goToObject(obj))

        store.eventBus.$on("goToTwilioMessage", obj => this.goToObject(obj))

        store.eventBus.$on("receivedLoginItem", () => this.loginItemsReceivedCount++)

        store.eventBus.$on("showDownloadProgress", file => {
            // Remove the completed downloads and any existing instances of the same file
            this.downloadProgresses = this.downloadProgresses.filter(f => f.downloadProgress < 100 && f != file)

            file.idForList = utils.getUniqueID()
            this.downloadProgresses.push(file)
        })

        this.isLoggedIn = false
        this.isLoading = true

        const loginToken = sessionStorage.getItem("t")

        if (loginToken) {
            this.login(loginToken)
        } else if (Cookie.get("dm") && Cookie.get("um") && Cookie.get("pm")) {
            // This is used when running the app locally. You have to manually create the following cookies on the page provided by webpack:
            // dm - http://localhost:3343/ManagerEdition
            // um - the username of the manager account you are using for testing
            // pm - the password hash, calculated as md5(user's password + "2147483648")
            //      eg. if the test user's password is "verysecure", this cookie should be set to the value of md5("verysecure2147483648")
            $.ajax(Cookie.get("dm"), {
                type: "POST",
                data: { username: Cookie.get("um"), password: Cookie.get("pm") },
                success: data => this.login(data)
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

#download-progress-wrapper {
    padding: 8px 5px 0 10px;
    background-color: #dfeef1;
    border-left: thin solid rgb(144, 190, 190);
    display: flex;
}

.download-progress {
    padding: 0 3px;
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
