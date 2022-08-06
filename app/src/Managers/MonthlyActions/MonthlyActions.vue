<template lang="pug">
PageBase
    #monthly-actions-page-wrapper(slot="page-contents")
        .ui.form
            .ui.dividing.header Monthly invoices
            .fields
                .field
                    .ui.coolblue.button(@click="createMonthlyInvoices") Create monthly invoices
                .field.vertical-center(v-if="isCreatingMonthlyInvoices") Creating monthly invoices... Please wait...
                .field.vertical-center(v-else-if="completedCreatingMonthlyInvoices") Creating monthly invoices... Done.
                .field.vertical-center(v-else) This should be done only once every month
            .field
                .ui.teal.button(@click="saveTurnover") Save turnover for month
            .fields.inline(style="padding-top: 30px")
                .field
                    TWDropdown(defaultText="Month" :obj="settings" field="MONTH" :change="updateSettings" :items="C_.monthsForDropdown" itemKey="MONTH" showall style="width: 120px")
                .field
                    TWDropdown(defaultText="Year" :obj="settings" field="YEAR" :change="updateSettings" :items="C_.yearsForDropdown" itemKey="YEAR" style="width: 100px")
                .field
                    TWInput(ref="InputExchangeRate" float mandatory :obj="settings" field="EXCHANGE_RATE" placeholder="Exchange rate (1 EUR = ? USD)" :change="updateSettings" style="width: 250px")
            .ui.dividing.header(style="padding-top: 20px") Payment sheets
            .field
                .ui.purple.button(@click="downloadMonthlyProjectsReport") Download monthly projects report
            .fields
                .field
                    .ui.coolblue.button(style="width: 250px" @click="createPaymentSheets") Create payment sheets
                .field.vertical-center(v-if="isCreatingPaymentSheets") Creating payment sheets... Please wait...
                .field.vertical-center(v-else-if="completedCreatingPaymentSheets") Creating payment sheets... Done.
                .field.vertical-center(v-else) This should be done only once every month
            .fields
                .field
                    .ui.teal.button(style="width: 250px" @click="downloadPaymentSheets") Download payment sheets
                .field.vertical-center
                    TWCheckbox(label=" Notify translators with payment method issues" :obj="settings" :change="updateSettings" field="NOTIFY_EMPLOYEES")
            .fields
                .field
                    .ui.coolgreen.button(style="width: 250px" @click="markPaymentSheetsAsPaid") Mark payment sheets as paid
                .field.vertical-center {{ completedMarkPaymentSheetsAsPaid || "This should be done only once every month" }}
            .field
                textarea(rows="3" readonly placeholder="Loading history..." v-model="paymentSheetsHistoryText")
            .ui.dividing.header(style="padding-top: 20px") Current turnover
            .fields
                .field
                    .ui.teal.button(@click="requestTurnoverAmount") Refresh
                .field.vertical-center Current turnover: {{ currentTurnoverAmount || "..." }}
</template>

<script>
import { store, cmg, constants as C_, utils } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"

export default {
    mixins: [CoreMixin, CoreMixinManagers],

    data() {
        return {
            settings: {
                EXCHANGE_RATE: undefined,
                NOTIFY_EMPLOYEES: false,
                MONTH: 0,
                YEAR: 0,
                didCreatePaymentSheets: false,
                didCreateMonthlyInvoices: false
            },
            isCreatingPaymentSheets: false,
            completedCreatingPaymentSheets: false,
            isCreatingMonthlyInvoices: false,
            completedCreatingMonthlyInvoices: false,
            completedMarkPaymentSheetsAsPaid: "",
            currentTurnoverAmount: "",
            paymentSheetsHistory: []
        }
    },

    mounted() {
        let previousMonth = new Date(store.serverTime() * 1000)
        previousMonth.setDate(-2)
        this.settings.MONTH = previousMonth.getMonth() + 1
        this.settings.YEAR = previousMonth.getFullYear()

        store.eventBus.$on("createdPaymentSheets", () => {
            this.isCreatingPaymentSheets = false
            this.completedCreatingPaymentSheets = true

            // Add the current month to the history
            let shouldAdd = true
            for (let h of this.paymentSheetsHistory) if (h.MONTH === this.settings.MONTH && h.YEAR === this.settings.YEAR) shouldAdd = false
            if (shouldAdd) this.paymentSheetsHistory.unshift({ MONTH: this.settings.MONTH, YEAR: this.settings.YEAR })
        })

        store.eventBus.$on("createdMonthlyInvoices", () => {
            this.isCreatingMonthlyInvoices = false
            this.completedCreatingMonthlyInvoices = true
        })

        store.eventBus.$on("markedPaymentSheetsAsPaid", selectedPaymentMethod => {
            this.completedMarkPaymentSheetsAsPaid = "Marked " + selectedPaymentMethod + " payment sheets as paid"
        })

        store.eventBus.$on("receivedTurnoverAmount", amount => {
            this.currentTurnoverAmount = amount.toFixed(2)
        })

        store.eventBus.$on("receivedPaymentSheetsHistory", history => {
            this.paymentSheetsHistory = history
        })

        this.requestPaymentSheetsHistory()
    },

    computed: {
        paymentSheetsHistoryText() {
            if (!this.paymentSheetsHistory.length) return ""
            let result = "Payment sheets have been generated for the following months (last 12):\n"
            for (let h of this.paymentSheetsHistory) if (h.YEAR * h.MONTH > 0) result += `${h.YEAR} / ${h.MONTH}\n`
            return result
        }
    },

    methods: {
        updateSettings(field, value) {
            this.$set(this.settings, field, value)
        },

        async createMonthlyInvoices() {
            if (this.$checkWithMessage(this.settings.didCreateMonthlyInvoices, `You have already created the payment sheets for ${this.settings.MONTH} / ${this.settings.YEAR}.`))
                return
            if (!(await this.$dialogCheck(`Are you sure you want to create the monthly invoices for ${this.settings.MONTH} / ${this.settings.YEAR} ?`))) return
            this.settings.didCreateMonthlyInvoices = true
            cmg.sendMessage("CREATE_MONTHLY_INVOICES", this.settings.MONTH, this.settings.YEAR)
        },

        saveTurnover() {
            cmg.requestGeneratedFile({ type: "Turnover", month: this.settings.MONTH, year: this.settings.YEAR })
        },

        requestTurnoverAmount() {
            const date = new Date(store.serverTime() * 1000)
            cmg.sendMessage("REQUEST_TURNOVER_AMOUNT", date.getMonth() + 1, date.getFullYear())
        },

        requestPaymentSheetsHistory() {
            cmg.sendMessage("REQUEST_PAYMENT_SHEETS_HISTORY")
        },

        async downloadMonthlyProjectsReport() {
            cmg.requestGeneratedFile({ type: "MonthlyProjectsReport", month: this.settings.MONTH, year: this.settings.YEAR })
            await utils.delay(3000)
            cmg.requestGeneratedFile({ type: "MonthlyProjectsReportForCheck", month: this.settings.MONTH, year: this.settings.YEAR })
        },

        async createPaymentSheets() {
            if (this.$checkWithMessage(this.settings.didCreatePaymentSheets, `You have already created the payment sheets for ${this.settings.MONTH} / ${this.settings.YEAR}.`))
                return
            if (!(await this.$dialogCheck(`Are you sure you want to create the payment sheets for ${this.settings.MONTH} / ${this.settings.YEAR} ?`))) return
            this.settings.didCreatePaymentSheets = true
            this.isCreatingPaymentSheets = true
            cmg.sendMessage("CREATE_PAYMENT_SHEETS", this.settings.MONTH, this.settings.YEAR)
        },

        downloadPaymentSheets() {
            if (!this.settings.EXCHANGE_RATE || this.settings.EXCHANGE_RATE < 1.0 || this.settings.EXCHANGE_RATE > 2.0) {
                this.$refs.InputExchangeRate.highlightMandatory()
                this.$showMessage("Please select a valid exchange rate (between 1.00 and 2.00 US Dollars for 1 Euro).")
                return
            }

            cmg.requestGeneratedFile({
                type: "PaymentSheets",
                month: this.settings.MONTH,
                year: this.settings.YEAR,
                exchangeRate: this.settings.EXCHANGE_RATE,
                shouldNotifyEmployeesWithProblems: this.settings.NOTIFY_EMPLOYEES
            })

            if (this.settings.NOTIFY_EMPLOYEES) {
                this.$showMessage(
                    "The employees that have problems with their payment method have been notified.\n\nYou should not check the box anymore until next month, so they don't receive duplicate messages.\n\nThe box has been unchecked now."
                )
                this.settings.NOTIFY_EMPLOYEES = false
            }
        },

        async markPaymentSheetsAsPaid() {
            const response = await this.$showDialog({
                message: "Select which payment sheets you want to mark as paid:",
                dropdownDefaultText: "Select a payment type",
                dropdownItems: [
                    { PK: 1, TYPE: "All" },
                    { PK: 2, TYPE: "PayPal" },
                    { PK: 3, TYPE: "PayoneerEuro" },
                    { PK: 4, TYPE: "PayoneerUSD" }
                ],
                dropdownKey: "TYPE",
                dropdownField: "PK"
            })

            if (!response.text) return

            this.completedMarkPaymentSheetsAsPaid = "Marking " + response.text + " ... "
            cmg.sendMessage("MARK_PAYMENT_SHEETS_AS_PAID", this.settings.MONTH, this.settings.YEAR, response.text)
        }
    }
}
</script>

<style scoped>
#monthly-actions-page-wrapper {
    display: flex;
    padding: 30px;
}
</style>