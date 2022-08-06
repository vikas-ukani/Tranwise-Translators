<template lang="pug">
#invoice-details-wrapper.ui.raised.segment.padded(style="max-width: 850px")
    #invoice-details-content
        #invoice-information-wrapper
            .ui.grid
                .ui.form.eight.wide.column(style="padding-right: 20px")
                    div
                        .fields
                            .field Invoice: {{ invoice.invoiceNumber()}}
                            .field(v-show="invoice.INVOICE_DATE") Date: {{ utils.formatDate(invoice.INVOICE_DATE, "D MMM YYYY") }}
                        .fields
                            .field(style="width: 170px" :class="{ 'readonly-status': !store.permissions.changeInvoiceStatus }")
                                TWDropdown(defaultText="Status" zeroBased :obj="invoice" field="STATUS" :items="C_.invoiceStatuses" itemKey="STATUS" :change="updateInvoice")
                            .field(v-if="invoice.STATUS === 1" style="padding-top: 7px")
                                p on
                            .field(v-if="invoice.STATUS === 1" style="width: 160px")
                                TWCalendar(date-only :obj="invoice" placeholder="Date paid" field="DATE_PAID" :change="updateInvoice")
                        .fields(v-if="invoice.STATUS === 1")
                            .field(style="width: 170px")
                                TWDropdown(defaultText="Payment method" :obj="invoice" field="PAYMENT_METHOD" :items="C_.invoicePaymentMethods" itemKey="METHOD" :change="updateInvoice")
                            //- .field(style="width: 190px")
                            //-     TWInput(:obj="invoice" field="PAYMENT_METHOD_OTHER" placeholder="Other payment method" :change="updateInvoice")
                            .field(style="width: 190px")
                                TWInput(:obj="invoice" field="TRANSACTION_ID" placeholder="Transaction Id" :change="updateInvoice")
                        .fields
                            .field(style="width: 325px")
                                TWInput(:obj="invoice" field="PAYMENT_NAME" placeholder="Payment under name" :change="updateInvoice")
                            .field(v-if="store.permissions.changeInvoiceStatus")
                                i.copy.icon.clickable(style="padding-top: 10px" @click="setInvoicePaymentDetails")
                        .field(v-if="invoice.SET_ON_PAID_BY" style="white-space: pre") Set on paid by {{ invoice.SET_ON_PAID_BY }} - {{ utils.formatDate(invoice.SET_ON_PAID_AT, "D MMM YYYY, HH:mm") }}
                        .field(v-if="prepaymentText" style="white-space: pre") {{ prepaymentText }}
                        .field(v-if="prepaymentText || projectPaymentDetails" style="white-space: pre")
                            TWTextArea(:rows="3" readonly :value="projectPaymentDetails" placeholder="No payment details available")
                        .field(v-if="clientPaymentDetails" style="white-space: pre") {{ clientPaymentDetails }}
                        .field(v-if="invoice.client && invoice.client.IS_INVOICED_ONLINE") Client wants invoices uploaded to their system
                .ui.form.eight.wide.column
                    .field
                        label Comments about the invoice
                        TWTextArea(:rows="3" :obj="invoice" field="COMMENTS" :change="updateInvoice")
                    .field
                        label Invoice reminders
                        TWTextArea(readonly :rows="3" :value="invoiceReminders")
        #client-information-wrapper
            h4.ui.dividing.header Client information
            .ui.grid
                .ui.form.eight.wide.column(style="padding-right: 20px")
                    div(style="font-weight: 300; font-size: 1em; padding-bottom: 5px")
                        p(style="font-weight: 500") {{ invoice.client.CLIENT_NAME}}
                    div(style="font-weight: 300; font-size: 0.9em; overflow-y: auto; word-wrap: break-word; max-height: 180px")
                        pre(style="white-space: pre-wrap") {{ invoice.client.ADDRESS }}
                        p(v-if="invoice.client.CONTACT" style="font-weight: 300") Contact person: {{ invoice.client.CONTACT }}
                        p(style="font-weight: 300") Email: {{ clientEmailAddress }}
                        pre(v-if="invoice.client.PHONE_NUMBERS" style="font-weight: 300; white-space: pre-wrap") {{ invoice.client.PHONE_NUMBERS }}
                        pre(v-if="clientPortalDetails" style="font-weight: 300; white-space: pre-wrap") {{ clientPortalDetails}}
                .ui.form.eight.wide.column
                    .field(style="margin-bottom: 2px") Total outstanding: {{ totalOutstandingAmount }}
                    .field(style="color: #AAAAAA; font-size: 10px; padding-bottom: 5px") * the total of outstanding invoices minus partial payments
                    .field
                        label Comments about the client
                        TWTextArea(:rows="5" :obj="invoice.client" field="COMMENTS" :change="updateClient")
        #projects-wrapper(style="padding-top: 10px")
            ScrollableTable()
                thead(slot="thead")
                    th.twelve.wide Projects
                    th.four.wide.right.aligned
                        span(v-show="invoiceCurrencySymbol") Total: {{ totalAmount.toFixed(2) + " " + invoiceCurrencySymbol }}

                tbody(slot="tbody")
                    tr(v-for="project in invoice.projects" )
                        td.three.wide {{ project.PROJECT_NUMBER }}
                            i.icon.external.alternate.small.icon-go-to-project(@click="goToProject(project)")
                        td.eleven.wide(style="font-size: 13px") {{ project.CLIENT_ORDER_NUMBER}}
                        td.two.wide.right.aligned {{ project.CALCULATED_PRICE.toFixed(2) + " " + C_.currencySymbols[project.CURRENCY] }}
</template>

<script>
import { store, cmg, constants as C_, utils } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import ScrollableTable from "../../Shared/components/ScrollableTable"

export default {
    mixins: [CoreMixin, CoreMixinManagers],

    components: {
        ScrollableTable
    },

    props: {
        invoice: Object
    },

    computed: {
        totalAmount() {
            let totalAmount = 0
            if (!this.invoice.projects) return 0
            this.invoice.projects.forEach(project => (totalAmount += project.CALCULATED_PRICE))
            return utils.roundPrice(totalAmount)
        },

        prepaymentText() {
            if (!this.invoice.projects || this.invoice.projects.length != 1) return
            const project = this.invoice.projects[0]
            if (project.REQUIRED_PREPAYMENT_PERCENT > 0) return `Prepayment: ${project.REQUIRED_PREPAYMENT_PERCENT} %     Proforma invoice: PF-${project.PK}`
        },

        invoiceCurrencySymbol() {
            return this.invoice.projects && this.invoice.projects.length > 0 ? C_.currencySymbols[this.invoice.projects[0].CURRENCY] : ""
        },

        totalOutstandingAmount() {
            let totalAmount = 0

            // Add the total of unpaid invoices
            for (let invoice of store.invoices) {
                if (invoice.CLIENT_ID != this.invoice.CLIENT_ID) continue
                if (invoice.STATUS === C_.isPaid) continue
                totalAmount += invoice.TOTAL_AMOUNT
            }

            // Subtract the total of payments made for unpaid invoices
            for (let payment of store.projectsPayments) {
                // INVOICE_ID is not a field of PROJECTS_PAYMENTS, but we get it from the join when requesting PROJECTS_PAYMENTS_FOR_UNPAID_INVOICES
                let invoice = store.invoice(payment.INVOICE_ID)
                // If we didn't get the INVOICE_ID, try to get the invoice from the project
                if (!invoice) {
                    const project = store.project(payment.PROJECT_ID)
                    if (project) invoice = store.invoice(project.INVOICE_ID)
                }

                if (!invoice) continue
                if (invoice.CLIENT_ID != this.invoice.CLIENT_ID) continue
                if (invoice.STATUS === C_.isPaid) continue
                totalAmount -= payment.AMOUNT
            }

            if (isNaN(totalAmount)) return "calculating..."

            return totalAmount.toFixed(2) + " " + this.invoiceCurrencySymbol
        },

        invoiceReminders() {
            let result = ""
            store.invoiceReminders.filter(r => r.INVOICE_ID === this.invoice.PK).forEach(r => (result += `${utils.formatDate(r.DATE, "D MMM YYYY")}\n`))
            return result
        },

        clientEmailAddress() {
            // Try to get the email from the client's email for invoices
            if (this.invoice.client && this.invoice.client.EMAIL_FOR_INVOICES) return this.invoice.client.EMAIL_FOR_INVOICES

            // Try to get the email from the first project's email
            if (this.invoice.projects && this.invoice.projects.length > 0) return this.invoice.projects[0].PROJECT_EMAIL

            // Try to get the first email from the client's emails list
        },

        clientPaymentDetails() {
            let text = ""
            if (utils.isNotBlank(this.invoice.CLIENT_PAYMENT_METHOD)) text = this.invoice.CLIENT_PAYMENT_METHOD
            if (utils.isNotBlank(this.invoice.CLIENT_PAYPAL_TRANSACTION)) text += "\nPayPal ID: " + this.invoice.CLIENT_PAYPAL_TRANSACTION
            if (utils.isNotBlank(this.invoice.CLIENT_PAID_DATE)) text += "\nPaid on " + this.invoice.CLIENT_PAID_DATE
            if (utils.isNotBlank(this.invoice.CLIENT_WILL_PAY_DATE)) text += "\nWill pay on " + this.invoice.CLIENT_WILL_PAY_DATE
            if (text) text = "Client's payment information: " + text
            return text
        },

        clientPortalDetails() {
            const c = this.invoice.client
            if (!c || !this.invoice.client.IS_INVOICED_ONLINE) return ""
            return `Portal details:\n${c.PORTAL_URL}\nUsername: ${c.PORTAL_USERNAME}\nPassword: ${c.PORTAL_PASSWORD}`
        },

        projectPaymentDetails() {
            if (!this.invoice.projects || this.invoice.projects.length != 1) return
            const project = this.invoice.projects[0]
            if (!project) return

            let text = ""
            for (let payment of store.projectsPayments) {
                if (payment && payment.PROJECT_ID === project.PK)
                    text += `Paid ${payment.AMOUNT} $ on ${utils.formatDate(payment.DATE, "D MMM YYYY, hh:mm")}\n${payment.PAYMENT_ID}\n${payment.EMAIL}\n—\n`
            }
            return text.slice(0, text.length - 3)
        }
    },

    methods: {
        updateInvoice(field, value) {
            if (field === "STATUS" && !store.permissions.changeInvoiceStatus) return

            cmg.updateObject(this.invoice, field, value)

            if (field === "STATUS" && value === C_.isPaid) {
                cmg.updateObject(this.invoice, "SET_ON_PAID_BY", store.myself.FIRST_NAME)
                cmg.updateObject(this.invoice, "SET_ON_PAID_AT", "SERVER_TIME_TAG")
            }
        },

        updateClient(field, value) {
            if (this.invoice.client) cmg.updateObject(this.invoice.client, field, value)
        },

        goToProject(project) {
            this.$emit("goToProject", project)
        },

        async setInvoicePaymentDetails() {
            utils.copyToClipboard(this.invoice.TRANSACTION_ID);
            if (!store.permissions.changeInvoiceStatus) return

            const response = await this.$showDialog({
                header: `Copy payment details for invoices`,
                message: `Type below the numbers of invoices for which you want to copy the current details:`,
                textAreaText: "",
                buttons: ["Cancel", "Copy payment details"],
                buttonClasses: ["", "positive"]
            })

            if (response.selection === "Copy payment details") {
                const lines = response.text.replace(/[ ,;]/g, "\n").split("\n")

                for (let line of lines) {
                    line = line.trim()
                    if (line.includes("-")) line = line.slice(line.indexOf("-") + 1)
                    const pk = parseInt(line, 10)

                    if (!pk) continue

                    const dummyInvoiceObject = { PK: pk, table: "INVOICES" }
                    cmg.updateObject(dummyInvoiceObject, "PAYMENT_METHOD", this.invoice.PAYMENT_METHOD)
                    cmg.updateObject(dummyInvoiceObject, "PAYMENT_METHOD_OTHER", this.invoice.PAYMENT_METHOD_OTHER)
                    cmg.updateObject(dummyInvoiceObject, "PAYMENT_NAME", this.invoice.PAYMENT_NAME)
                    cmg.updateObject(dummyInvoiceObject, "DATE_PAID", this.invoice.DATE_PAID)
                    cmg.updateObject(dummyInvoiceObject, "TRANSACTION_ID", this.invoice.TRANSACTION_ID)

                    // If the invoice wasn't set on paid previously, set it on paid as well and update the required fields.
                    // First we need to check if the invoice is loaded (it will always be loaded if it's not marked paid).
                    const invoice = store.invoice(pk)
                    if (invoice && invoice.STATUS === C_.isNotPaid) {
                        cmg.updateObject(invoice, "STATUS", C_.isPaid)
                        cmg.updateObject(invoice, "SET_ON_PAID_BY", store.myself.FIRST_NAME)
                        cmg.updateObject(invoice, "SET_ON_PAID_AT", "SERVER_TIME_TAG")
                    }
                }
            }
        }
    }
}
</script>

<style scoped>
#invoice-details-wrapper {
    display: flex;
    flex-direction: column;
    padding: 0;
    border-radius: 6px;
    height: 100%;
    flex: 1 1;
}

#invoice-details-header {
    padding: 18px 22px;
    background-color: #7ac859;
    border-radius: 5px 5px 0 0;
    font-size: 20px;
    font-weight: 300;
    color: white;
}

#invoice-details-content {
    padding: 20px;
    flex: 1 1 auto;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    height: 0;
}

#client-information-wrapper {
    margin-top: 20px;
    flex: 1 1 auto;
}

#projects-wrapper {
    flex: 1 1 175px;
    min-height: 175px;
}

.icon-go-to-project {
    padding-left: 10px;
    cursor: pointer;
    color: rgb(167, 173, 180);
}

.readonly-status {
    pointer-events: none;
}
</style>
