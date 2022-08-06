<template lang="pug">
#app.pusher
    .ui.inverted.segment(style="border-radius: 0 !important; background-color: #1F618D")
        .ui.container
            .ui.large.inverted.secondary.pointing.menu(style="padding-top: 10px; border-width: 0")
                .item.portal-title.clickable(@click="changeActivePage('Welcome')") TRANSLATION PORTAL
                .right.item(style="white-space: pre-line; text-align: right; line-height: 1.8em; letter-spacing: 1px") {{ clientDetails }}
            .ui.large.inverted.secondary.pointing.menu(style="padding-top: 10px; border-width: 0; border-top: thin solid #5499C7")
                a.item(:class="{ active: activeComponentName === 'Welcome'}" @click="changeActivePage('Welcome')") Overview
                a.item(:class="{ active: activeComponentName === 'ProjectsMain'}" @click="changeActivePage('ProjectsMain')") Your projects
                a.item(:class="{ active: activeComponentName === 'QuotesMain'}" @click="changeActivePage('QuotesMain')") Your quotes
                a.item(:class="{ active: activeComponentName === 'InvoicesMain'}" @click="changeActivePage('InvoicesMain')") Your invoices
                a.right.item
                    .ui.button(@click="chat" style="background-color: #1ea8c1; color: white") Questions? Live chat with us
    .ui.main.text.container(style="padding-top: 30px; max-width: 10000px !important")
        component(:is="activeComponentName" :ref="activeComponentName" :store="store" @changeActivePage="changeActivePage" @showProjectDetails="showProjectDetails" :projectForInvoice="projectForInvoice")
</template>

<script>
import Welcome from "./WelcomeCL"
import ProjectsMain from "./Projects/ProjectsMainCL"
import ProjectForInvoice from "./Projects/ProjectForInvoiceCL"
import InvoicesMain from "./Invoices/InvoicesMainCL"
import QuotesMain from "./Quotes/QuotesMainCL"
import utils from "./UtilsCL"

export default {
    name: "AppClients",

    components: {
        Welcome,
        ProjectsMain,
        ProjectForInvoice,
        InvoicesMain,
        QuotesMain
    },

    data() {
        return {
            activeComponentName: "Welcome",
            projectForInvoice: undefined,
            store: {
                client: {},
                projects: {},
                completedProjects: {},
                files: {},
                quotes: {},
                invoices: {},
                didLoadClient: false,
                didLoadProjects: false,
                didLoadQuotes: false,
                didLoadInvoices: false
            }
        }
    },

    created() {
        $("#loading-app").remove()

        let url = window.location.href
        if (url.endsWith("/")) url = url.slice(0, -1)
        this.code = url.slice(url.lastIndexOf("/") + 1)

        // If the url contains some params, parse them and set into this.urlParams
        this.urlParams = new URLSearchParams(window.location.search)
        // and update the code
        if (this.code.includes("?")) this.code = this.code.slice(0, this.code.indexOf("?"))

        this.apiURL = url.includes("localhost") ? "http://localhost:3344/Clients/" : url.slice(0, url.indexOf(this.code))

        // Set the security code and the apiURL in the store, which is passed to the child components,
        // so the child components can make requests to the server
        this.store.code = this.code
        this.store.apiURL = this.apiURL

        // Add the axios instance to the store, so it can be used by child components
        this.store.axios = axios
    },

    mounted() {
        this.loadClient()
        this.loadProjects()
        this.loadCompletedProjects()
        this.loadQuotes()
        this.loadInvoices()
    },

    computed: {
        clientDetails() {
            let name = this.store.client.NAME

            let regex = /^(.*?)(\s*<(.*?)>)/g
            let match = regex.exec(this.store.client.EMAILS)
            let email = match ? match[3].trim() : this.store.client.EMAILS
            if (email && email.includes("\n")) email = email.split("\n")[0]

            return (name || "") + "\n" + (email || "")
        }
    },

    methods: {
        changeActivePage(componentName) {
            if (this.activeComponentName === componentName) return
            this.activeComponentName = componentName
        },

        chat() {
            window.open("https://www.universal-translation-services.com/chat-popup/", "_blank", "toolbar=yes,scrollbars=yes,resizable=yes,top=120,left=120,width=550,height=600")
        },

        loadClient() {
            axios(this.apiURL + "Client?c=" + this.code).then(response => {
                if (response.data) {
                    this.store.didLoadClient = true
                    this.store.client = response.data
                    this.$set(this.store, "client", response.data)
                }
            })
        },

        loadInvoices() {
            axios(this.apiURL + "Invoices?c=" + this.code).then(response => {
                if (response.data) {
                    this.store.didLoadInvoices = true
                    response.data.forEach(invoice => this.$set(this.store.invoices, invoice.PK, invoice))
                }
            })
        },

        loadProjects() {
            axios(this.apiURL + "Projects?c=" + this.code).then(response => {
                if (response.data) {
                    response.data.forEach(project => this.$set(this.store.projects, project.PK, project))
                    this.store.didLoadProjects = true
                }
            })
        },

        loadCompletedProjects() {
            axios(this.apiURL + "CompletedProjects?c=" + this.code).then(response => {
                if (response.data) {
                    response.data.forEach(project => this.$set(this.store.completedProjects, project.PK, project))
                }
            })
        },

        loadQuotes() {
            axios(this.apiURL + "Quotes?c=" + this.code).then(response => {
                if (response.data) {
                    this.store.didLoadQuotes = true
                    response.data.forEach(quote => this.$set(this.store.quotes, quote.PK, quote))

                    // If we got a quote ID with the link (like ?q=1439717), show its details
                    const quoteID = this.urlParams.get("q")
                    if (quoteID)
                        for (let quote of Object.values(this.store.quotes))
                            if (quote.PK == quoteID) {
                                this.store.quoteIDForDetails = quote.PK
                                this.changeActivePage("QuotesMain")
                            }
                }
            })
        },

        showProjectDetails(project) {
            this.projectForInvoice = project
            this.activeComponentName = "ProjectForInvoice"
        }
    },

    watch: {}
}
</script>

<style scoped></style>

<style>
body {
    overflow-y: scroll;
}

html,
body,
#app {
    height: 100%;
    background-color: rgb(247, 247, 247);
}

.clickable {
    cursor: pointer;
}

.portal-title {
    font-size: 30px;
    letter-spacing: 3px;
    padding-left: 20px !important;
}
</style>
