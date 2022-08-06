<template lang="pug">
PageBase(headerText="Invoices" headerWidth="366")
    #header-buttons-wrapper(slot="header-buttons" v-if="invoice.PK")
        .ui.button.coolblue.small(@click="savePDF") Save PDF
        .ui.button.coolblue.small(@click="sendInvoice") Send invoice
    ListAndDetailsBase(ref="list" slot="page-contents" :items="invoices" :selectedObject="invoice" :listWidth="350" :listItemHeight="40" )
        #list-header(slot="list-header")
            div(style="display: flex; border-bottom: 1px solid #aeb3b6")
                .ui.icon.input(style="width: 130px; margin-right: 5px; flex-basis: 150px")
                    input#input-filter-invoices(type="text" v-model="textFilter" placeholder="Filter invoices...")
                    i.close.link.icon(v-show="textFilter" @click="textFilter = ''")
                InvoicesClientFilter(ref="InvoicesClientFilter" @selectClientID="selectClientFromSearch" @clearClient="clearClientFromSearch")
        .list-item(style="outline: none" tabindex="0" @keydown="onListItemKeyDown" slot="list-item" slot-scope="{item}" @click="selectInvoice(item.PK)" @contextmenu.prevent="contextMenu($event, item)")
            .invoice-line-wrapper
                .invoice-status-icon
                    img(:src="'/static/icons/Invoices/InvoiceStatus' + item.STATUS + '.svg'" width="12")
                .invoice-name-list {{ item.invoiceNumber() + "&nbsp;&nbsp;&nbsp;&nbsp;" + item.clientNameWithTag() }}
        #invoices-filter-wrapper(slot="list-footer")
            InvoicesFilter(:filter="filter" @updateFilter="updateFilter")
        #invoice-details-container.ui.form(slot="details")
            InvoicesDetails(:invoice="invoice" v-if="invoice.PK" @goToProject="goToProject")
    .div-zero(slot="page-extras")
        SendInvoice(ref="SendInvoice" :invoice="invoice")
        TWContextMenu(ref="listContextMenu")
            .menu(slot="menu-items")
                .item(@click="showInvoicesForClient") Show invoices for client
</template>

<script>
import { store, cmg, utils, constants as C_ } from "../CoreModules"
import TWObject from "../Store/TWObject"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import InvoicesDetails from "./InvoicesDetails"
import InvoicesFilter from "./InvoicesFilter"
import InvoicesClientFilter from "./InvoicesClientFilter"
import SendInvoice from "./SendInvoice"

export default {
    mixins: [CoreMixin, CoreMixinManagers],

    components: {
        InvoicesDetails,
        InvoicesFilter,
        InvoicesClientFilter,
        SendInvoice
    },

    props: {
        // When selecting an object from the search bar (or any other find method), the object is stored in this prop
        objectFromFind: Object
    },

    data() {
        return {
            pageState: ["textFilter", "invoice", "filter", "previousClientIDsForFilter", "clientForFilter"],
            invoice: {},
            clientForFilter: undefined,
            invoiceForContext: undefined,
            previousClientIDsForFilter: [],
            textFilter: "",
            filter: {},
            filterRefresher: 0
        }
    },

    computed: {
        invoices() {
            if (this.filterRefresher) {
            }

            const textFilter = utils.escapeString(this.textFilter.toLowerCase(), true)
            const serverTime = store.serverTime()
            const lowercaseFilterPaymentName = this.filter.filterInvoicesWithPaymentName ? this.filter.filterInvoicesWithPaymentName.toLowerCase() : ""

            return store.invoices
                .filter(invoice => {
                    // If we have a client filter in place and the invoice is not for that client, return
                    if (this.clientForFilter && invoice.CLIENT_ID && invoice.CLIENT_ID != this.clientForFilter.PK) return false

                    // If we don't have a client filter in place and the invoice is paid and it's for a client that we previously searched for, return
                    // So we don't show all the invoices loaded for searches by client
                    if (!this.clientForFilter && invoice.STATUS === C_.isPaid && this.previousClientIDsForFilter.includes(invoice.CLIENT_ID)) return false

                    if (this.filter.filterOnlyPartlyPaidInvoices && !this.partlyPrepaidInvoiceIDs.includes(invoice.PK)) return false
                    if (this.filter.filterOnlyClientsInvoicedOnline && !this.clientsInvoicedOnline.includes(invoice.CLIENT_ID)) return false
                    if (this.filter.filterOnlyOverdueInvoices) {
                        if (invoice.STATUS === C_.isPaid) return false
                        // If the invoice is older than that, it's definitely overdue
                        if (invoice.PK > 95000) {
                            let paymentTerms = 30
                            if (this.clientsWithSpecialPaymentTerms.includes(invoice.CLIENT_ID)) {
                                let client = store.client(invoice.CLIENT_ID)
                                if (!client) {
                                    store.log("blank client", invoice)
                                    return false
                                }
                                paymentTerms = client.PAYMENT_TERMS
                            }
                            const termSeconds = paymentTerms * 86400
                            if (serverTime - invoice.INVOICE_DATE < termSeconds) return false
                        }
                    }
                    if (this.filter.filterInvoicesWithPaymentName) {
                        if (!invoice.FILTER_PAYMENT_NAME) return false
                        if (!invoice.FILTER_PAYMENT_NAME.includes(lowercaseFilterPaymentName)) return false
                    }
                    if (textFilter) {
                        if (invoice.filterText) {
                            return invoice.filterText.includes(textFilter)
                        } else {
                            return invoice.invoiceNumber().includes(textFilter)
                            const client = store.client(invoice.CLIENT_ID)
                            return client && !client.CLIENT_NAME.toLowerCase().includes(textFilter)
                        }
                    }
                    return true
                })
                .sort((a, b) => a.PK - b.PK)
        }
    },

    mounted() {
        // If objectFromFind is set, then we came here from a find request, so set the employee to objectFromFind
        if (this.objectFromFind && this.objectFromFind.table === "INVOICES") {
            this.selectInvoice(this.objectFromFind.PK)
            setTimeout(() => {
                this.$refs.list.scrollToItemWithPK(this.objectFromFind.PK)
            }, 100)
        }

        if (this.clientForFilter) this.$refs.InvoicesClientFilter.setText(this.clientForFilter.CLIENT_NAME)

        this.partlyPrepaidInvoiceIDs = store.projects
            .filter(project => project.REQUIRED_PREPAYMENT_PERCENT > 0 && project.REQUIRED_PREPAYMENT_PERCENT < 100)
            .map(project => project.INVOICE_ID)
            .filter(invoiceID => invoiceID > 0)

        this.clientsInvoicedOnline = store.clients.filter(client => client.IS_INVOICED_ONLINE).map(client => client.PK)

        this.clientsWithSpecialPaymentTerms = store.clients.filter(client => client.PAYMENT_TERMS != 0 && client.PAYMENT_TERMS != 30).map(client => client.PK)
    },

    methods: {
        onListItemKeyDown(event) {
            if (event.key === "ArrowDown") {
                let previousInvoice
                for (let invoice of this.invoices) {
                    if (previousInvoice) {
                        this.selectInvoice(invoice.PK)
                        break
                    }
                    if (invoice.PK === this.invoice.PK) previousInvoice = invoice
                }
            }

            if (event.key === "ArrowUp") {
                let previousInvoice
                for (let invoice of this.invoices) {
                    if (invoice.PK === this.invoice.PK) {
                        if (previousInvoice) this.selectInvoice(previousInvoice.PK)
                        break
                    }
                    previousInvoice = invoice
                }
            }
        },

        async selectInvoice(pk) {
            const selectedInvoice = store.invoice(pk)

            this.invoice = selectedInvoice
            cmg.requestObject(selectedInvoice, "INVOICE_DETAILS")

            const client = store.client(this.invoice.CLIENT_ID)
            this.$set(this.invoice, "client", client)
            cmg.requestObject(client, "CLIENTS_DETAILS")

            cmg.requestObjectsForObject(selectedInvoice, "INVOICE_REMINDERS_FOR_INVOICE")
            const projects = await cmg.requestObjectsForObject(selectedInvoice, "PROJECTS_FOR_INVOICE")

            cmg.requestObjectsForObject(client, "PROJECTS_PAYMENTS_FOR_UNPAID_INVOICES")

            if (!selectedInvoice.projects) this.$set(selectedInvoice, "projects", [])
            selectedInvoice.projects.splice(0)
            projects.forEach(project => {
                selectedInvoice.projects.push(store.project(project.PK))
                cmg.requestObjectsForObject(project, "PROJECTS_PAYMENTS_FOR_PROJECT")
            })

            this.$emit("addToHistory", { invoice: this.invoice })
        },

        showInvoicesForClient() {
            const client = store.client(this.invoiceForContext.CLIENT_ID)
            if (!client) return
            this.$refs.InvoicesClientFilter.setText(client.CLIENT_NAME)
            this.setClientForFilter(client.PK)
        },

        contextMenu(event, item) {
            this.invoiceForContext = item
            this.$refs.listContextMenu.show(event)
            if (window.getSelection) window.getSelection().removeAllRanges()
        },

        setClientForFilter(clientID) {
            this.clientForFilter = store.client(clientID)
            this.previousClientIDsForFilter.push(clientID)
            cmg.requestObjects("INVOICES_FOR_CLIENT", { CLIENT_ID: clientID })
        },

        selectClientFromSearch(clientID) {
            this.setClientForFilter(clientID)
        },

        clearClientFromSearch() {
            this.clientForFilter = null
        },

        savePDF() {
            cmg.requestPDFInvoice(this.invoice.PK)
        },

        sendInvoice() {
            this.$refs.SendInvoice.sendInvoice()
        },

        goToProject(project) {
            this.$emit("goToObject", project)
        },

        updateFilter(filter) {
            for (let [key, value] of Object.entries(filter)) this.filter[key] = value

            // Payment name
            if (filter.filterInvoicesWithPaymentName) {
                cmg.requestObjects("INVOICES_WITH_PAYMENT_NAME", { PAYMENT_NAME: filter.filterInvoicesWithPaymentName }).then(invoices => {
                    this.filterRefresher++
                })
                return
            }

            this.filterRefresher++
        }
    },

    watch: {
        objectFromFind(object, oldObject) {
            if (object && object !== oldObject && object.table === "INVOICES") {
                this.selectInvoice(object.PK)
                this.$refs.list.scrollToItemWithPK(object.PK)
            }
        },

        textFilter(newValue) {
            if (!newValue) return
            let query = newValue
            if (RegExp("^[0-9]{3}-[0-9]{1,6}$").test(query) || RegExp("^[0-9]{1,6}$").test(query)) {
                if (query.includes("-")) query = query.substr(query.indexOf("-") + 1)
                cmg.requestObjects("INVOICES_WITH_NUMBER", { INVOICE_NUMBER: query })
            }
        }
    }
}
</script>

<style scoped>
#header-buttons-wrapper {
    padding: 10px;
    padding-right: 22px;
}

.invoice-name-list {
    padding: 10px 10px;
    font-weight: 300;
    width: 315px;
    text-overflow: ellipsis;
    overflow: hidden;
}

#input-filter-invoices {
    border-radius: 0;
    border: 0;
    border-bottom: 1px solid #cad0d3;
    border-top: 1px solid #cad0d3;
    border-right: solid 1px #cad0d3;
    margin-bottom: 1px;
}

#invoices-filter-wrapper {
    border-top: thin solid #aeb3b6;
    border-right: thin solid #aeb3b6;
    background-color: rgb(249, 253, 253);
    padding: 10px;
}

#invoice-details-container {
    height: 100%;
}

.invoice-line-wrapper {
    display: flex;
}

.invoice-status-icon {
    padding: 10px 0 0 10px;
}
</style>
