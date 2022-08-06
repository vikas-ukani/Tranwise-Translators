<template lang="pug">
#employee-payments-wrapper.ui.raised.segment.padded(style="max-width: 750px")
    #employee-payments-header {{ store.fullName(employee.PK) }}
    #employee-payments-content
        div(style="display: flex; height: 475px")
            #paymentsheets-list
                .paymentsheet-row(v-for="sheet in paymentSheets" :class="sheet === paymentSheet && 'selected-paymentsheet'" @click="selectPaymentSheet(sheet)")
                    div(style="margin-right: 3px")
                        i.dollar.sign.icon.red(v-if="sheet.PAYMENT_STATUS === 0")
                        i.pause.icon.purple(v-if="sheet.PAYMENT_STATUS === 1")
                        i.check.icon.red(v-if="sheet.PAYMENT_STATUS === 2")
                        i.check.icon.teal(v-if="sheet.PAYMENT_STATUS === 3")
                    div(style="white-space: nowrap; padding-right: 20px") {{ C_.longMonthNames[sheet.MONTH] + " " + sheet.YEAR }}  
            div
                .ui.grid
                    .ui.form.eight.wide.column(style="padding-right: 20px")
                        .field(style="padding-bottom: 10px")
                            TWTextArea(:rows="5" :readonly="paymentSheet == undefined" :obj="paymentSheet" field="COMMENTS" placeholder="Payment details / comments" :change="updatePaymentSheet")
                    .ui.form.eight.wide.column.tw-size(v-show="paymentSheet")
                        .field.inline.vertical-center.right.aligned(v-if="paymentSheet && paymentSheet.EXTRA_AMOUNT != 0" style="display: flex")
                            label(style="display: inline-block; width: 80px; text-align: right; font-size: 13px !important; flex-grow: 1; color: #884000") Total to pay: {{ totalToPayText }}
                        .field.inline.vertical-center.right.aligned(v-else style="display: flex")
                            label(style="display: inline-block; width: 80px; text-align: right; font-size: 13px !important; flex-grow: 1") &nbsp;
                        .field.inline.vertical-center.right.aligned(style="display: flex")
                            label(style="display: inline-block; width: 80px; text-align: right; font-size: 13px !important; flex-grow: 1") Total amount: {{ paymentSheetTotalAmountText }}
                        .field.inline.vertical-center(style="display: flex")
                            label(style="display: inline-block; width: 80px; text-align: right; font-size: 13px !important; flex-grow: 1") Correction amount
                            TWInput(style="width: 80px; text-align: right" float negative :readonly="!store.myself.PERMISSIONS.includes('PAYMENT_SHEETS.EXTRA_AMOUNT')" :obj="paymentSheet" field="EXTRA_AMOUNT" :change="updateExtraAmount")
                        .field.inline.vertical-center
                            label(style="display: inline-block; text-align: right; font-size: 13px !important; flex-grow: 1") Payment status
                            TWDropdown(defaultText="Status" zeroBased :obj="paymentSheet" field="PAYMENT_STATUS" :change="updatePaymentStatus" :items="C_.paymentSheetStatuses" itemKey="text" style="width: 130px")
                .ui.grid(style="margin-top: -10px")
                    .ui.form.eight.wide.column(style="padding-right: 20px")
                        label(style="font-size: 13px") Employee's comments about sheet
                        .field(style="padding-top: 5px")
                            TWTextArea(:rows="3" readonly :obj="paymentSheet" field="EMPLOYEE_COMMENTS")
                    .ui.form.eight.wide.column
                        label(style="font-size: 13px") Global comments about employee
                        .field(style="padding-top: 5px")
                            TWTextArea(:rows="3" :obj="employee" field="PAYMENT_COMMENTS" :change="updateEmployee")
                div(style="padding-top: 20px")
                    div(style="height: 208px")
                        ScrollableTable(small)
                            thead(slot="thead" style="font-size: 13px")
                                th.three.wide Project
                                th.four.wide PO number
                                th.two.wide Price
                                th.three.wide Correction
                                th.four.wide Payment type
                            tbody(slot="tbody")
                                tr(v-for="translation in translations")
                                    td.three.wide {{ translation.subproject().project().PROJECT_NUMBER }}
                                    td.four.wide {{ translation.PONumber() }}
                                    td.two.wide(style="text-align: right") {{ translation.translationPrice().toFixed(2) }}
                                    td.three.wide {{ translation.amountCorrectionAsString("€") }}
                                    td.four.wide {{ translatorPaymentStrings[translation.PAYMENT_METHOD] }}
                                tr(v-if="this.paymentSheet && this.paymentSheet.TEST_TRANSLATIONS_COUNT")
                                    td.seven.wide {{ this.paymentSheet.TEST_TRANSLATIONS_COUNT + " test translations checked" }}
                                    td.two.wide(style="text-align: right") {{ (this.paymentSheet.TEST_TRANSLATIONS_COUNT * 0.5).toFixed(2) }}
                                    td.seven.wide 
        div(style="flex: 1 1 auto")
            div(style="display: flex; padding: 10px 0 6px 0")
                h5.ui.header(style="padding-top: 20px; margin-bottom: 0") Payment corrections
                div(style="flex-grow: 1")
                .ui.button.teal.small(@click="addPaymentCorrection") Add correction
            div(style="height: calc(100% - 53px)")
                ScrollableTable(small)
                    thead(slot="thead" style="font-size: 13px")
                        th.one.wide
                        th.three.wide Project
                        th.two.wide Amount
                        th.two.wide Manager
                        th.eight.wide Comments
                    tbody(slot="tbody")
                        tr(v-for="correction in paymentCorrections")
                            td.one.wide
                                div(style="display: flex; margin: 0 -4px" v-if="!correction.IS_APPROVED")
                                    i.x.icon.red.clickable(style="padding-right: 2px" @click="deleteCorrection(correction)")
                                    i.check.icon.green.clickable(@click="approveCorrection(correction)")
                            td.three.wide {{ correction.PROJECT }}
                            td.two.wide(style="text-align: right") {{ correction.AMOUNT.toFixed(2) }}
                            td.two.wide {{ correctionManagerName(correction) }}
                            td.eight.wide {{ correction.COMMENTS }}
    .div-zero
        #modal-add-employee-payment-correction.ui.small.modal
            .header Add amount correction
            i.close.icon
            .content
                .ui.form
                    .field
                        input(type="text" v-model="newPaymentCorrection.PROJECT" placeholder="Project number")
                    .field
                        TWInput(float negative :obj="newPaymentCorrection" field="AMOUNT" placeholder="Amount" :change="updateNewPaymentCorrection")
                    .field
                        textarea(rows="5" v-model="newPaymentCorrection.COMMENTS" placeholder="Message (max. 500 characters)")
                p(style="color: red; padding-top: 13px") {{ newPaymentCorrection.warning }}
            .actions
                .ui.cancel.button Cancel
                .ui.button.green(@click="doAddPaymentCorrection") Add correction
                //- This hidden button is used to close the modal. The one above should not close it, as there might be errors in the form.
                .ui.button.positive#dummy-add-employee-payment-correction-button(style="display: none")
</template>

<script>
import { store, cmg, constants as C_, utils } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import ScrollableTable from "../../Shared/components/ScrollableTable"

export default {
    mixins: [CoreMixin, CoreMixinManagers],

    components: { ScrollableTable },

    props: {
        employee: Object
    },

    data() {
        return {
            paymentSheet: undefined,
            newPaymentCorrection: {}
        }
    },

    created() {
        this.C_ = C_
        this.translatorPaymentStrings = ["", "Fixed price", "By source words", "", "By CAT Analysis"]
    },

    computed: {
        paymentSheets() {
            return store.paymentSheets.filter(sheet => sheet.EMPLOYEE_ID === this.employee.PK).sort((a, b) => b.PK - a.PK)
        },

        translations() {
            if (!this.paymentSheet) return []
            return store.translations.filter(translation => translation.PAYMENT_SHEET_ID === this.paymentSheet.PK).sort((a, b) => a.PK - b.PK)
        },

        paymentCorrections() {
            return store.employeesPaymentCorrections.filter(correction => correction.EMPLOYEE_ID === this.employee.PK).sort((a, b) => b.PK - a.PK)
        },

        paymentSheetAmount() {
            if (!this.paymentSheet) return 0
            if (!this.translations.length && !this.paymentSheet.TEST_TRANSLATIONS_COUNT) return 0
            const translationsTotal = this.translations.reduce((a, c) => a + c.translationPrice(), 0)
            const testTranslationsTotal = this.paymentSheet.TEST_TRANSLATIONS_COUNT * 0.5
            return utils.roundPrice(translationsTotal) + testTranslationsTotal
        },

        paymentSheetTotalAmountText() {
            if (!this.paymentSheet) return ""
            if (!this.translations.length && !this.paymentSheet.TEST_TRANSLATIONS_COUNT) return ""
            return this.paymentSheetAmount.toFixed(2)
        },

        totalToPayText() {
            if (!this.paymentSheet) return ""
            return (this.paymentSheetAmount + this.paymentSheet.EXTRA_AMOUNT).toFixed(2)
        }
    },

    methods: {
        updateEmployee(field, value) {
            cmg.updateObject(this.employee, field, value)
        },

        updatePaymentSheet(field, value) {
            cmg.updateObject(this.paymentSheet, field, value)
        },

        updatePaymentStatus(field, value) {
            if (!this.paymentSheet) return
            if (value === C_.pssPaid) this.updatePaymentSheet("COMMENTS", `Paid on ${utils.formatDate(store.serverTime(), "D MMM YYYY")}.\n\n${this.paymentSheet.COMMENTS}`)
            cmg.updateObject(this.paymentSheet, field, value)
        },

        updateExtraAmount(field, value) {
            this.updatePaymentSheet(field, value)
        },

        async selectPaymentSheet(paymentSheet) {
            this.paymentSheet = paymentSheet
            cmg.requestObject(this.paymentSheet, "PAYMENT_SHEETS_DETAILS")
            await cmg.requestObjectsForObject(this.paymentSheet, "PROJECTS_FOR_PAYMENT_SHEET")
            await cmg.requestObjectsForObject(this.paymentSheet, "SUBPROJECTS_FOR_PAYMENT_SHEET")
            cmg.requestObjectsForObject(this.paymentSheet, "TRANSLATIONS_FOR_PAYMENT_SHEET")
        },

        correctionManagerName(correction) {
            const manager = store.employee(correction.MANAGER_ID)

            if (!manager) {
                cmg.requestObjectWithPK(correction.MANAGER_ID, "EMPLOYEES_DETAILS")
                return ""
            }
            return manager.FIRST_NAME
        },

        updateNewPaymentCorrection(field, value) {
            this.$set(this.newPaymentCorrection, field, value)
        },

        addPaymentCorrection() {
            if (!this.employee.PK) return

            this.$delete(this.newPaymentCorrection, "PROJECT")
            this.$delete(this.newPaymentCorrection, "AMOUNT")
            this.$delete(this.newPaymentCorrection, "COMMENTS")
            this.$delete(this.newPaymentCorrection, "warning")

            this.showModal("#modal-add-employee-payment-correction")
        },

        doAddPaymentCorrection() {
            if (!this.newPaymentCorrection.PROJECT || !this.newPaymentCorrection.COMMENTS) this.$set(this.newPaymentCorrection, "warning", "Please fill in all the fields.")
            else if (!this.newPaymentCorrection.AMOUNT) this.$set(this.newPaymentCorrection, "warning", "Please specify a valid correction amount.")
            else this.$delete(this.newPaymentCorrection, "warning")
            if (this.newPaymentCorrection.warning) return

            const correction = {
                table: "EMPLOYEES_PAYMENT_CORRECTIONS",
                EMPLOYEE_ID: this.employee.PK,
                MANAGER_ID: store.myself.PK,
                PROJECT: this.newPaymentCorrection.PROJECT,
                AMOUNT: this.newPaymentCorrection.AMOUNT,
                COMMENTS: this.newPaymentCorrection.COMMENTS
            }
            cmg.insertObject(correction)

            $("#dummy-add-employee-payment-correction-button").click()
        },

        async deleteCorrection(correction) {
            if (!store.myself.PERMISSIONS.includes(`"PAYMENT_SHEETS.EXTRA_AMOUNT"`)) return
            if (!correction || correction.IS_APPROVED) return

            if (!(await this.$dialogCheck(`Are you sure you want to discard this correction?`))) return

            cmg.deleteObject(correction)
        },

        async approveCorrection(correction) {
            if (!store.myself.PERMISSIONS.includes(`"PAYMENT_SHEETS.EXTRA_AMOUNT"`)) return

            if (!correction || correction.IS_APPROVED) return
            if (!correction.AMOUNT) return
            if (this.$checkWithMessage(!this.paymentSheet || !this.paymentSheet.PK, "Please select a payment sheet first.")) return
            if (this.paymentSheet.PAYMENT_STATUS === C_.pssPaid)
                if (!(await this.$dialogCheck("The payment sheet you have selected is already paid. Are you sure you want to modify its correction amount?"))) return

            const newExtraAmount = (this.paymentSheet.EXTRA_AMOUNT || 0) + correction.AMOUNT
            if (this.$checkWithMessage(typeof newExtraAmount != "number", "The extra amount is not valid.")) return

            cmg.updateObject(this.paymentSheet, "EXTRA_AMOUNT", newExtraAmount)
            cmg.updateObject(correction, "IS_APPROVED", true)
        }
    },

    watch: {
        employee(newValue, oldValue) {
            if (newValue !== oldValue) this.paymentSheet = null
        }
    }
}
</script>

<style scoped>
#employee-payments-wrapper {
    display: flex;
    flex-direction: column;
    padding: 0;
    border-radius: 6px;
    height: 100%;
}

#employee-payments-header {
    padding: 18px 22px;
    background-color: #7ac859;
    border-radius: 5px 5px 0 0;
    font-size: 20px;
    font-weight: 300;
    color: white;
}

#employee-payments-content {
    padding: 20px;
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

#paymentsheets-list {
    border: 1px solid lightgray;
    border-radius: 5px;
    background-color: white;
    min-width: 160px;
    margin-right: 10px;
    overflow-y: auto;
    font-size: 12.5px;
}

.paymentsheet-row {
    padding: 7px 10px;
    cursor: pointer;
    display: flex;
    width: 100%;
    border-top: 1px solid white;
    border-bottom: 1px solid white;
}

.paymentsheet-row:first-of-type {
    border-top: 1px solid white;
}

.selected-paymentsheet {
    background-color: rgb(247, 247, 247);
    border-top: 1px solid #e2e2e2;
    border-bottom: 1px solid #e2e2e2;
    color: rgb(0, 0, 0);
}
</style>
