<template lang="pug">
#projects-pricing-page-wrapper(style="height: 100%")
    .ui.grid(v-if="store.myself.MANAGER_TYPE != C_.emtDeadline")
        .ui.nine.wide.column.form
            PricingComponent(:project="project")
            div(style="padding-top: 20px; padding-right: 70px")
            //- This was used when projects were shipped to the clients. Not used anymore.
            //- div(style="padding-top: 20px; padding-right: 70px")
                h5.ui.dividing.header(v-if="project.IS_CERTIFIED") Shipping
                .field(v-if="project.IS_CERTIFIED")
                    .field
                        TWDropdown.disabled(defaultText="Shipping" :obj="project" field="SHIPPING_METHOD" :items="C_.shippingMethods" :change="updateProject" itemKey="METHOD")
                    .fields.inline
                        .ui.right.labeled.input.disabled
                            TWInput(integer :obj="project" field="SHIPPING_COST" placeholder="Shipping cost" :change="updateProject" style="width: 15px; text-align: right")
                            .ui.basic.label(style="width: 30px") {{ C_.currencySymbols[project.CURRENCY] || "" }}
                        .ui.button.basic.teal.small(style="margin-left: 30px" @click="editShippingAddress") Edit&nbsp;shipping&nbsp;address
            h5.ui.dividing.header(style="padding-top: 30px") Payment (translators & proofreaders)
            .two.fields
                .field
                    TWDropdown(defaultText="Translator" :obj="project" field="PAYMENT_TRANSLATOR" :items="C_.translatorPayments" :change="updatePaymentTranslator" itemKey="PAYMENT")
                .field
                    TWDropdown(defaultText="Proofreader" :obj="project" field="PAYMENT_PROOFREADER" :items="C_.translatorPayments" :change="updatePaymentTranslator" itemKey="PAYMENT")
            .two.fields
                .field
                    TWInput(v-if="project.PAYMENT_TRANSLATOR === C_.ptFixedPrice" float :obj="project" field="TRANSLATOR_PRICE" placeholder="Translator job price" :change="updateProject" style="text-align: right")
                .field
                    TWInput(v-if="project.PAYMENT_PROOFREADER === C_.ptFixedPrice" float :obj="project" field="PROOFREADER_PRICE" placeholder="Proofreader job price" :change="updateProject" style="text-align: right")
            .two.fields
                .field
                    div(v-if="project.UPWORK_PRICE > 0" field="TPWORK_PRICE" style="text-align: right") Upwork Id : {{project.UPWORK_ID}}
                .field
                    div(v-if="project.UPWORK_PRICE > 0" field="TPWORK_PRICE" style="text-align: right") Upwork Price : {{project.UPWORK_PRICE}} €
        .ui.seven.wide.column(style="padding-left: 20px")
            .ui.form( style="text-align: right; padding-top: 3px; padding-right: 10px")
                div(v-if="invoiceNumber")
                    .field(style="text-align: right") Invoice: {{ invoiceNumber }}
                        i.icon.external.alternate.small.grey(style="padding-left: 10px; margin-right: -5px" @click="goToProjectInvoice")
                .ui.button.basic.purple.tiny(v-if="!project.INVOICE_ID" @click="sendProformaInvoice") Send proforma invoice
                h5.ui.dividing.header(style="margin-bottom: 5px") Totals
                div(style="line-height: 30px;")
                    div(style="text-align: right; white-space:pre") Price per language:  {{ project.totalPricePerLanguage().toFixed(2) }} {{ project.currencySymbol() }}
                    div(style="text-align: right; white-space:pre") {{ extraServicesText }}
                    div(style="text-align: right; white-space:pre") Total price:  {{ project.totalPrice().toFixed(2) }} {{ project.currencySymbol() }}
                h5.ui.dividing.header(style="margin-bottom: 5px" v-if="store.permissions.viewProjectProfit") Profit
                div(style="line-height: 30px;" v-if="store.permissions.viewProjectProfit")
                    div(style="text-align: right; white-space:pre" v-if="project.hasTranslation()") Translation cost:  {{ project.translationCost().toFixed(2) }} €
                    div(style="text-align: right; white-space:pre" v-if="project.hasProofreading()") Proofreading cost:  {{ project.proofreadingCost().toFixed(2) }} €
                    div(style="text-align: right; white-space:pre") Total project cost:  {{ (project.translationCost() + project.proofreadingCost()).toFixed(2) }} €
                    div(style="text-align: right; white-space:pre") {{ netProfitText }}
                h5.ui.dividing.header(v-if="project.PREPAYMENT_STATUS") Prepayment requested: {{ project.REQUIRED_PREPAYMENT_PERCENT }} %
                .field(v-if="project.PREPAYMENT_STATUS")
                    TWTextArea(:rows="4" readonly :obj="project" field="PAYMENT_DETAILS" placeholder="No payment details provided")
                    .ui.button.basic.teal.tiny(v-if="project.PREPAYMENT_STATUS === C_.ppsPrepaymentPartlyDone" style="margin-top: 20px" @click="markAsFullyPrepaid") Mark project as fully prepaid
                .fields(v-if="project.IS_NOTARIZED" style="padding: 10px 0")
                    .field.vertical-center Notary number
                    .field(style="width: 100%")
                        TWInput(:obj="project" field="NOTARY_NUMBER" :change="updateProject")
    div(style="padding: 20px 0")
        ProjectPayments(:project="project")
    div(style="padding: 10px 0")
        ProjectRefunds(:project="project")
    .div-zero
        SendInvoice(ref="SendInvoice" :invoice="project" :isProforma="true")
</template>

<script>
import { store, cmg, constants as C_ } from "../CoreModules"
import PricingComponent from "./Components/ProjectPricing"
import ProjectPayments from "./Components/ProjectPayments"
import ProjectRefunds from "./Components/ProjectRefunds"
import SendInvoice from "../Invoices/SendInvoice"

export default {
    props: {
        project: Object
    },

    components: {
        PricingComponent,
        ProjectPayments,
        ProjectRefunds,
        SendInvoice
    },

    created() {
        this.C_ = C_
        this.store = store
    },

    computed: {
        invoiceNumber() {
            const invoice = this.project.PK && this.project.invoice()
            return invoice ? invoice.invoiceNumber() : ""
        },

        extraServicesText() {
            let result = ""
            for (let service of this.project.services())
                if (service.WAS_INITIAL) {
                    let serviceName = "Extra service"
                    for (let srv of C_.projectServiceTypes) if (srv.PK === service.SERVICE_TYPE) serviceName = srv.SERVICE_TYPE
                    result += `${serviceName}: ${service.COST} $\n`
                }
            return result
        },

        netProfitText() {
            const price = this.project.totalPrice()
            if (!price) return "-"

            const cost = this.project.translationCost() + this.project.proofreadingCost()
            const profit = price - cost
            const profitPercent = Math.round((profit * 100) / price)
            let result = `${profit.toFixed(2)} ${this.project.currencySymbol()}`
            if (this.project.CURRENCY != "EUR") result = "~ " + result
            return `Net profit ( ${profitPercent}% ): ` + result
        }
    },

    methods: {
        updateProject(field, value) {
            cmg.updateObject(this.project, field, value)
        },

        updatePaymentTranslator(field, value) {
            if (this.project.hasStatus([C_.psQuote, C_.psSetup])) {
                this.updateProject(field, value)
            } else if (this.project.hasStatus([C_.psPending, C_.psTranslation, C_.psProofreading, C_.psCheckPhase])) {
                this.updateProject(field, value)

                // Ask if we should update the payment of all the assigned translators / proofreaders
                const assignedTranslations = this.project
                    .assignedTranslations()
                    .filter(
                        translation =>
                            (field === "PAYMENT_TRANSLATOR" && translation.STATUS === C_.tsTranslating) ||
                            (field === "PAYMENT_PROOFREADER" && translation.STATUS === C_.tsProofreading)
                    )
                /* prettier-ignore */
                if (assignedTranslations.length) {
                    this.$dialogCheckWithCallback(`Do you want to update the payment of all the assigned ${field === "PAYMENT_TRANSLATOR" ? "translators" : "proofreaders"}?`, response => {
                        if (response) assignedTranslations.forEach(translation => cmg.updateObject(translation, "PAYMENT_METHOD", value)) 
                    })
                }
            } else {
                this.$showMessage(`You are not allowed to change this value.`)
                return false
            }
        },

        editShippingAddress() {
            // Not used anymore
        },

        goToProjectInvoice() {
            store.goToObject(this.project.invoice())
            this.$emit("addToHistory", { invoice: this.project.invoice() })
        },

        sendProformaInvoice() {
            this.$refs.SendInvoice.sendInvoice()
        },

        async markAsFullyPrepaid() {
            if (await this.$dialogCheck("Are you sure you want to mark the project as fully prepaid (the payment has been received)?")) {
                cmg.updateObject(this.project, "PREPAYMENT_STATUS", C_.ppsPrepaymentDone)
                this.$set(this.project, "PREPAYMENT_STATUS", C_.ppsPrepaymentDone)
            }
        }
    }
}
</script>

<style scoped>
#projects-pricing-page-wrapper {
    width: 100%;
    padding: 0 20px;
}
</style>
