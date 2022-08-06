<template lang="pug">
div
    div(style="height: 100px")
        ScrollableTable(small)
            thead(slot="thead")
                th.two.wide Refund
                th.five.wide Payment ID / Email
                th.two.wide Method
                th.five.wide Reason
                th.two.wide Completed
            tbody(slot="tbody")
                tr(v-for="refund in project.refunds().reverse()")
                    td.two.wide(style="vertical-align: top")
                        div(style="display: flex")
                            i.trash.alternate.icon.red(v-if="!refund.DATE_COMPLETED && store.myself.PERMISSIONS.includes(`PROJECTS_REFUNDS.DATE_COMPLETED`)" @click="deleteRefund(refund)")
                            div {{ refund.AMOUNT.toFixed(2) }}
                    td.five.wide(style="vertical-align: top") {{ refund.PAYMENT_ID }}
                    td.two.wide(style="vertical-align: top") {{ refund.PAYMENT_METHOD }}
                    td.five.wide(style="vertical-align: top") {{ refund.REASON }}
                    td.two.wide(v-if="refund.DATE_COMPLETED" style="background-color: #DAF3CA; vertical-align: top") {{ utils.formatDate(refund.DATE_COMPLETED, "D MMM YYYY")}}
                    td.two.wide(v-else style="vertical-align: top; padding-top: 5px")
                        .ui.button.mini.red(v-if="store.myself.PERMISSIONS.includes(`PROJECTS_REFUNDS.DATE_COMPLETED`)" style="padding: 5px 7px" @click="completeRefund(refund)") Complete
    #add-payments.ui.form.tw-size(style="padding-top: 10px")
        .fields(style="margin-bottom: 0")
            .field
                TWInput(mandatory float :obj="newRefund" placeholder="Amount" field="AMOUNT" :change="updateNewRefund" style="width: 70px; padding-left: 8px !important; padding-right: 8px !important" ) 
            .field
                TWInput(mandatory :obj="newRefund" placeholder="Payment ID / Email" field="PAYMENT_ID" :change="updateNewRefund") 
            .field
                TWInput(mandatory :obj="newRefund" placeholder="PayPal / Stripe" field="PAYMENT_METHOD" :change="updateNewRefund" style="width: 120px") 
            .field
                TWInput(mandatory :obj="newRefund" placeholder="Reason" field="REASON" :change="updateNewRefund" style="width: 260px") 
            .field
                .ui.button.teal.tiny(@click="addNewRefund") Add refund
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
            newRefund: {}
        }
    },

    methods: {
        updateNewRefund(field, value) {
            this.newRefund[field] = value
        },

        addNewRefund() {
            // Check if any of the mandatory fields are blank
            let hasMandatoryProblems = false
            for (let child of this.$children) {
                if (child.highlightMandatory && child.highlightMandatory()) hasMandatoryProblems = true
            }
            if (hasMandatoryProblems) return

            const refund = {
                table: "PROJECTS_REFUNDS",
                PROJECT_ID: this.project.PK,
                AMOUNT: this.newRefund.AMOUNT || 0,
                REASON: this.newRefund.REASON,
                PAYMENT_ID: this.newRefund.PAYMENT_ID.substring(0, 100),
                PAYMENT_METHOD: this.newRefund.PAYMENT_METHOD.substring(0, 100)
            }
            cmg.insertObject(refund)

            store.addToProjectsHistory(this.project, C_.phAddProjectRefund, `$${refund.AMOUNT} — ${refund.PAYMENT_ID} — ${refund.PAYMENT_METHOD}`)

            cmg.sendEmail(
                "SYSTEM_EMAIL",
                "GENERAL_MANAGER_EMAIL",
                `Tranwise: Refund for project ${this.project.PROJECT_NUMBER}`,
                `${store.myself.FIRST_NAME} added a refund for project ${this.project.PROJECT_NUMBER}:\n\n` +
                    `Amount: ${refund.AMOUNT}\nPayment ID / Email: ${refund.PAYMENT_ID}\nMethod: ${refund.PAYMENT_METHOD}\nReason: ${refund.REASON}`
            )

            this.$delete(this.newRefund, "AMOUNT")
            this.$delete(this.newRefund, "REASON")
            this.$delete(this.newRefund, "PAYMENT_ID")
            this.$delete(this.newRefund, "PAYMENT_METHOD")
        },

        completeRefund(refund) {
            cmg.updateObject(refund, "DATE_COMPLETED", "SERVER_TIME_TAG")
        },

        async deleteRefund(refund) {
            if (await this.$dialogCheck("Are you sure you want to delete this refund?")) cmg.deleteObject(refund)
        }
    }
}
</script>

<style scoped>
</style>