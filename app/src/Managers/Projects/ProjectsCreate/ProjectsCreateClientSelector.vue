<template lang="pug">
.field
    .ui.grid
        .ui.eleven.wide.column
            .field(v-show="clientsFromEmail.length > 0")
                TWDropdown(defaultText="Select client" ref="dropdownClient" :items="clientsFromEmailForDropdown" :obj="project" field="CLIENT_ID" :change="onDropdownSelectClient" itemKey="CLIENT_NAME")
                .ui.pointing.red.basic.label(v-show="clientsFromEmail.length > 1 && !didSelectClient") There are multiple clients with this email address. Please select one.
            .field#client-selector-container(v-show="clientsFromEmail.length == 0")
            .ui.pointing.red.basic.label(v-if="didNotFindClientsWithEmail") There are no clients with this email address. Please select the client manually.
            .ui.pointing.red.basic.label(v-if="overdueInvoicesWarning" style="margin-bottom: 10px") {{ overdueInvoicesWarning }}
            .ui.pointing.red.basic.label(v-else-if="client && client.IS_LOCKED_FOR_PROJECTS" style="margin-bottom: 10px") No new quotes are allowed for this client. Please contact the Accounting department.
            .ui.pointing.orange.basic.label(v-else-if="client && client.PAYER_TYPE === 2" style="margin-bottom: 10px") This client is a slow payer.
            .ui.pointing.red.basic.label(v-else-if="client && client.PAYER_TYPE === 3" style="margin-bottom: 10px") This client is a bad payer. Please contact Accounting before setting up a quote for them.
        .ui.two.wide.column(style="padding-left: 0")
            div(style="padding-top: 6px" v-if="client && client.divisionName()") {{ client.divisionName() }}
        .ui.three.wide.column.right.aligned
            .ui.button.teal.small.basic(v-if="!hideCreateButton" @click="showClientCreator") Create client
    .div-zero
        ClientsCreate(:client="newClient" ref="clientsCreate" @createClient="doCreateClient")

</template>

<script>
import { store, cmg, utils, constants as C_ } from "../../CoreModules"
import ClientsCreate from "../../Clients/ClientsCreate"
import CoreMixin from "../../../Shared/Mixins/CoreMixin"

export default {
    mixins: [CoreMixin],

    props: {
        project: Object,
        hideCreateButton: Boolean
    },

    data() {
        return {
            clientsFromEmail: [],
            newClient: {},
            client: undefined,
            didSelectClient: false,
            didNotFindClientsWithEmail: false,
            overdueInvoicesWarning: ""
        }
    },

    components: {
        ClientsCreate
    },

    mounted() {
        $(".ui.dropdown").dropdown({ selectOnKeydown: false })
    },

    computed: {
        clientsFromEmailForDropdown() {
            const result = []
            this.clientsFromEmail.forEach(client => {
                const division = store.division(client.DIVISION_ID)
                result.push({ PK: client.PK, CLIENT_NAME: client.CLIENT_NAME + " (" + division.DIVISION_CODE + ")" })
            })
            return result
        }
    },

    methods: {
        onDropdownSelectClient(field, value) {
            this.didSelectClient = true
            this.selectClient(value, true)
        },

        selectClient(pk, preserveProjectEmail) {
            $("#client-selector-input").blur()

            this.client = store.client(pk)
            if (!this.client) return

            this.showUnpaidInvoicesWarning()

            // If the client is locked for projects, send the selector with pk = 0, so the parent can clear any previous client
            this.$emit("projectsCreateHasSelectedClient", this.client.IS_LOCKED_FOR_PROJECTS ? 0 : pk, preserveProjectEmail)
        },

        showUnpaidInvoicesWarning() {
            let unpaidAmountOfNotOverdueInvoices = 0
            let overdueInvoicesCount = 0

            for (let invoice of store.invoices) {
                if (invoice.CLIENT_ID != this.client.PK) continue
                if (invoice.STATUS === C_.isPaid) continue
                if (invoice.isOverdue()) overdueInvoicesCount++
                else unpaidAmountOfNotOverdueInvoices += invoice.TOTAL_AMOUNT
            }

            this.client.overdueInvoicesCount = overdueInvoicesCount

            if (overdueInvoicesCount)
                this.overdueInvoicesWarning = `This client has ${overdueInvoicesCount} overdue invoice${utils.pluralS(overdueInvoicesCount)}, which they need to pay first`
            else if (unpaidAmountOfNotOverdueInvoices > 1000)
                this.overdueInvoicesWarning = `This client has unpaid invoices (not overdue) in total of ${utils.roundPrice(
                    unpaidAmountOfNotOverdueInvoices,
                    0
                )}. Please contact invoicing dept.`
            else this.overdueInvoicesWarning = ""
        },

        reset() {
            this.clientsFromEmail = []
            this.client = null
            this.didSelectClient = false
            this.didNotFindClientsWithEmail = false
            // The search box behaves strangely if it's added in the template above, so we have to remove it and add it again
            // everytime we show the popup
            $("#client-selector").remove()
            $("#client-selector-container").append(
                '<div class="ui search" id="client-selector"><div class="ui icon input"><input id="client-selector-input" class="prompt" type="text" placeholder="Search clients..." /><i class="search icon" /></div><div class="results client-selector-results"></div></div>'
            )
            this.refreshSearchSettings([])
        },

        setClientName(clientName) {
            $("#client-selector").search("set value", clientName)
            this.clientsFromEmail.splice(0)
            this.didNotFindClientsWithEmail = false
        },

        showClientCreator(name, email, address) {
            this.newClient = { table: "CLIENTS" }
            if (name && typeof name === "string") {
                this.newClient = {
                    table: "CLIENTS",
                    CLIENT_NAME: name,
                    EMAILS: email,
                    ADDRESS: address || "",
                    SOURCE: 5, // Website form
                    COUNTRY_ID: 241, // United states
                    DIVISION_ID: 7, // UTS
                    CURRENCY: "USD",
                    PRICE: 0.12,
                    REQUIRES_PREPAYMENT: true
                }
            }
            this.$refs.clientsCreate.show()
        },

        async requestClientsWithEmailAddress(fromEmail) {
            const clients = await cmg.requestObjects("CLIENTS_WITH_EMAIL_FOR_NEW_PROJECT", { EMAIL: fromEmail })

            this.clientsFromEmail.splice(0)
            clients.forEach(client => this.clientsFromEmail.push(store.client(client.PK)))
            this.didSelectClient = false

            // If no clients match the email address
            if (clients.length == 0) {
                this.didNotFindClientsWithEmail = true
            }
            // If one client matches the email address, select it and set the project email
            else if (clients.length == 1) {
                const client = this.clientsFromEmail[0]
                this.selectClient(client.PK, true)
                this.$refs.dropdownClient.setText(client.CLIENT_NAME)
                this.didNotFindClientsWithEmail = false
            }
            // If more than one client matches the email address
            else {
                this.didNotFindClientsWithEmail = false
            }
        },

        buildSearchItems(query) {
            const maxItems = 10

            // Find clients
            const clientsThatStartWithText = store.clients.filter(client => client.CLIENT_NAME.toLowerCase().startsWith(query))
            const clientsThatIncludeText = store.clients.filter(client => !clientsThatStartWithText.includes(client) && client.CLIENT_NAME.toLowerCase().includes(query))

            const clients = [...clientsThatStartWithText, ...clientsThatIncludeText]
                .slice(0, maxItems)
                .sort((a, b) => a.CLIENT_NAME.toLowerCase().localeCompare(b.CLIENT_NAME.toLowerCase()))
                .map(client => {
                    return { id: client.PK, title: client.CLIENT_NAME + " ( " + client.divisionCode() + " )", category: "Clients" }
                })

            this.refreshSearchSettings(clients)
            $("#client-selector").search("search local", query)
        },

        refreshSearchSettings(source) {
            $("#client-selector").search({
                source: source,
                searchFields: ["title"],
                fullTextSearch: "exact",
                maxResults: 10,
                onSearchQuery: this.onSearchQuery,
                onSelect: this.onSearchSelect
            })
        },

        onSearchQuery(query) {
            this.buildSearchItems(query.toLowerCase().trim())
        },

        onSearchSelect(result, response) {
            this.selectClient(result.id)
        },

        async doCreateClient() {
            const insertedClient = await cmg.insertObject(this.newClient)
            insertedClient.isLoaded = true
            this.selectClient(insertedClient.PK)
        }
    }
}
</script>

<style scoped>
.client-selector-results {
    width: 500px !important;
}
</style>
