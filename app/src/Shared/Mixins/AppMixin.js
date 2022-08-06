/* eslint-disable no-undef */
import History from "../History"
import store from "../StoreBase"

export default {
    created() {
        window.addEventListener("resize", this.resizeEventHandler)
        this.activeComponentSettings = {}
        this.pageStates = {}
        this.minimumWidthForChatArea = 1760

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") document.title = document.title.replace(/• /g, "")
        })

        store.eventBus.$on("goToPage", obj => {
            this.changeActivePage(obj)
        })
    },

    mounted() {
        this.showChatArea = window.innerWidth >= this.minimumWidthForChatArea
        this.updateZoomFactor()
    },

    methods: {
        addToHistory(object) {
            History.add(object)
        },

        historyGoBack() {
            const historyObject = History.goBack()
            this.goToHistoryObject(historyObject)
        },

        historyGoForward() {
            const historyObject = History.goForward()
            this.goToHistoryObject(historyObject)
        },

        updateZoomFactor() {
            const width = window.innerWidth
            const height = window.innerHeight
            if (width >= 1270 && height >= 850) document.body.style.zoom = 1
            else if (width >= 1200 && height >= 770) document.body.style.zoom = 0.95
            else if (width >= 1080 && height >= 720) document.body.style.zoom = 0.85
            else document.body.style.zoom = 0.75
        },

        addWelcomeNotification() {
            const unreadMessagesCount = store.employeesMessages.filter(em => em.TO_ID === store.myself.PK && !em.IS_READ).length
            const notificationType = unreadMessagesCount ? "IMPORTANT" : "Welcome"
            let text = "Notifications will show up here"
            if (unreadMessagesCount === 1) text = "You have one unread message"
            if (unreadMessagesCount > 1) text = `You have ${unreadMessagesCount} unread messages`
            store.addNotification(notificationType, "Welcome to Tranwise 3!", text, {
                title: text,
                goToEmployeesMessages: true
            })
        },

        resizeEventHandler() {
            const width = window.innerWidth
            if (width < this.minimumWidthForChatArea && this.showChatArea) this.showChatArea = false
            if (width >= this.minimumWidthForChatArea && !this.showChatArea) this.showChatArea = true
            this.updateZoomFactor()
        }
    },

    destroyed() {
        window.removeEventListener("resize", this.resizeEventHandler)
    }
}
