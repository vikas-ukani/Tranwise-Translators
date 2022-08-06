<template lang="pug">
div
    div
        ScrollableTable(small)
            thead(slot="thead")
                th.two.wide Amount
                th.three.wide Payment date
                th.four.wide Transaction ID
                th.five.wide Payment email
                th.who.wide Method
            tbody(slot="tbody")
                tr(v-for="payment in project.payments()")
                    td.two.wide 
                        div(style="display: flex")
                            i.trash.alternate.icon.red.clickable(v-if="store.myself.PERMISSIONS.includes(`PROJECTS_PAYMENTS.AMOUNT`)" @click="deletePayment(payment)")
                            div(@click="clickAmount($event, payment)" style="flex-grow: 1; text-align: right") {{ payment.AMOUNT.toFixed(2) }}
                    td.three.wide {{ utils.formatDate(payment.DATE, "D MMM YYYY, hh:mm")}}
                    td.four.wide(@click="clickPaymentID($event, payment)") {{ payment.PAYMENT_ID }}
                    td.five.wide(@click="clickEmail($event, payment)") {{ payment.EMAIL }}
                    td.two.wide {{ payment.METHOD }}
    #add-payments.ui.form.tw-size(style="padding-top: 10px")
        .fields(style="margin-bottom: 0")
            .field
                TWInput(mandatory float :obj="newPayment" placeholder="Amount" field="AMOUNT" style="width: 100px" :change="updateNewPayment") 
            .field(style="width: 150px")
                TWCalendar(ref="newPaymentDate" mandatory date-only :obj="newPayment" placeholder="Payment date" field="DATE" :change="updateNewPayment")
            .field
                TWInput(mandatory :obj="newPayment" placeholder="Transaction ID" field="PAYMENT_ID" :change="updateNewPayment") 
            .field
                TWInput(mandatory :obj="newPayment" placeholder="Email" field="EMAIL" :change="updateNewPayment") 
            .field
                TWInput(:obj="newPayment" placeholder="Method" field="METHOD" :change="updateNewPayment") 
            .field
                .ui.button.coolblue.tiny(@click="addNewPayment") Add&nbsp;payment
</template>

<script>
import { cmg, store, utils, constants as C_ } from "../../CoreModules"
import ProjectComponentsMixin from "./ProjectComponentsMixin"
import ScrollableTable from "../../../Shared/components/ScrollableTable"

export default {
    mixins: [ProjectComponentsMixin],

    components: {
        ScrollableTable
    },

    data() {
        return {
            newPayment: {}
        }
    },

    methods: {
        updateNewPayment(field, value) {
            this.newPayment[field] = value
        },

        addNewPayment() {
            // Check if any of the mandatory fields are blank
            let hasMandatoryProblems = false
            for (let child of this.$children) {
                if (child.highlightMandatory && child.highlightMandatory()) hasMandatoryProblems = true
            }
            if (hasMandatoryProblems) return

            const payment = {
                table: "PROJECTS_PAYMENTS",
                PROJECT_ID: this.project.PK,
                AMOUNT: this.newPayment.AMOUNT || 0,
                DATE: this.newPayment.DATE,
                PAYMENT_ID: this.newPayment.PAYMENT_ID.substring(0, 100),
                EMAIL: this.newPayment.EMAIL.substring(0, 100),
                METHOD: (this.newPayment.METHOD || "").substring(0, 20)
            }

            cmg.insertObject(payment)
            this.$delete(this.newPayment, "AMOUNT")
            this.$delete(this.newPayment, "PAYMENT_ID")
            this.$delete(this.newPayment, "EMAIL")
            this.$delete(this.newPayment, "DATE")
            this.$delete(this.newPayment, "METHOD")
            this.$refs.newPaymentDate.clearDate()

            store.addToProjectsHistory(this.project, C_.phAddPaymentDetails, `$${payment.AMOUNT} — ${payment.PAYMENT_ID}`)
        },

        async deletePayment(payment) {
            if (await this.$dialogCheck("Are you sure you want to delete this payment?")) cmg.deleteObject(payment)
        },

        async clickAmount(event, payment) {
            if (!event.ctrlKey && !event.metaKey) return
            if (!payment) return
            if (!store.myself.PERMISSIONS.includes(`"PROJECTS_PAYMENTS.AMOUNT"`)) return

            const response = await this.$showDialog({
                message: `Edit the payment amount:`,
                inputText: payment.AMOUNT.toFixed(2)
            })

            if (response.selection !== "OK") return
            let floatValue = parseFloat(response.text)
            if (floatValue != response.text) return
            if (floatValue === payment.AMOUNT && floatValue != 0) return
            if (floatValue < 0) return
            cmg.updateObject(payment, "AMOUNT", floatValue)
        },

        async clickPaymentID(event, payment) {
            if (!event.ctrlKey && !event.metaKey) return
            if (!payment) return
            if (!store.myself.PERMISSIONS.includes(`"PROJECTS_PAYMENTS.PAYMENT_ID"`)) return

            const response = await this.$showDialog({
                message: `Edit the transaction ID:`,
                inputText: payment.PAYMENT_ID,
                blankTextWarning: "Please type a value.",
                noSpellCheck: true
            })

            if (response.selection === "OK" && response.text) cmg.updateObject(payment, "PAYMENT_ID", response.text)
        },

        async clickEmail(event, payment) {
            if (!event.ctrlKey && !event.metaKey) return
            if (!payment) return
            if (!store.myself.PERMISSIONS.includes(`"PROJECTS_PAYMENTS.EMAIL"`)) return

            const response = await this.$showDialog({
                message: `Edit the email address:`,
                inputText: payment.EMAIL,
                blankTextWarning: "Please type a value.",
                noSpellCheck: true
            })

            if (response.selection === "OK" && response.text) cmg.updateObject(payment, "EMAIL", response.text)
        }
    }
}
</script>

<style scoped>
</style>