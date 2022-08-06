<template lang="pug">
#modal-send-invoice.ui.small.modal
    .header {{ title }}
    i.close.icon
    .content
        .ui.form
            .field
                input(type="text" v-model="email" placeholder="Email (leave blank to send to the default address)")
            .field
                textarea(rows="12" v-model="comments" placeholder="Comments")
    .actions
        .ui.cancel.button.transition Cancel
        .ui.ok.coolgreen.button.transition(@click="doSendInvoice") {{ `Send ${this.isProforma ? "proforma " : ""} invoice` }}
</template>

<script>
import { store, utils, cmg, constants as C_ } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"

export default {
    props: {
        invoice: Object, // invoice can either be and invoice or a project, if isProforma is true
        isProforma: Boolean
    },

    mixins: [CoreMixin],

    data() {
        return {
            email: "",
            comments: ""
        }
    },

    computed: {
        title() {
            if (!this.invoice.PK) return ""
            const invoiceNumber = this.isProforma ? `PF-${this.invoice.PK}` : this.invoice.invoiceNumber()
            return `Send ${this.isProforma ? "proforma " : ""} invoice ${invoiceNumber}`
        }
    },

    methods: {
        sendInvoice() {
            this.email = this.comments = ""

            if (this.invoice.PK && !this.isProforma && this.invoice.STATUS != C_.isPaid) {
                const client = store.client(this.invoice.CLIENT_ID)
                const division = client.division()
                this.comments =
                    "Dear client,\n\n" +
                    "We have this invoice still outstanding in our system. Can you please send us the proof of payment if the invoice was paid, so we can track it in our system?\n\n" +
                    "If this invoice was not paid, please send payment as soon as possible.\n\n" +
                    "Thank you so much!\n\n" +
                    "Invoicing Department\n" +
                    division.EMAIL.replace("info@", "invoices@")
            }
            this.showModal("#modal-send-invoice")
        },

        doSendInvoice() {
            const header = this.isProforma ? "SEND_PROFORMA_INVOICE" : "SEND_INVOICE"
            cmg.sendMessage(cmg.messageHeaders[header], this.invoice.PK, this.email, this.comments)
        }
    }
}
</script>

<style scoped>
</style>
