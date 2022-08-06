<template lang="pug">
.ui.form.tiny
    div
        TWCheckbox(label="Only overdue invoices" :value="filterOnlyOverdueInvoices" :change="updateOverdueFilter")
    div(style="padding-top: 10px")
        TWCheckbox(label="Only clients invoiced online" :value="filterOnlyClientsInvoicedOnline" :change="updateClientsInvoicedOnlineFilter")
    div(style="padding-top: 10px")
        TWCheckbox(label="Only partly paid invoices" :value="filterOnlyPartlyPaidInvoices" :change="updatePartlyPaidFilter")
    div(style="padding-top: 8px; display: flex")
        div(style="margin: auto 10px auto 0")
            TWCheckbox(label="Payment name" :value="filterInvoicesWithPaymentName" :change="selectCheckboxPaymentNameFilter")
        div
            TWInput(:obj="specialFilter" field="paymentName" placeholder="Payment name" style="padding: 0.25rem 0.5rem" :change="updatePaymentName")       
</template>

<script>
import { store, cmg, constants as C_, utils } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"

export default {
    mixins: [CoreMixin],

    props: {
        result: String,
        filter: Object
    },

    data() {
        return {
            pageState: ["filterOnlyOverdueInvoices", "filterOnlyClientsInvoicedOnline", "filterOnlyPartlyPaidInvoices", "filterInvoicesWithPaymentName", "specialFilter"],
            filterOnlyOverdueInvoices: false,
            filterOnlyClientsInvoicedOnline: false,
            filterOnlyPartlyPaidInvoices: false,
            filterInvoicesWithPaymentName: false,
            specialFilter: {
                paymentName: "",
                amount: ""
            }
        }
    },

    created() {
        this.store = store
        this.C_ = C_
    },

    mounted() {
        this.ignoreNextCheckboxEvent = true
        setTimeout(() => {
            this.ignoreNextCheckboxEvent = false
        }, 300)
        if (this.filterOnlyOverdueInvoices) $("#checkbox-native-language").checkbox("set checked")
        if (this.filterTranslationArea) $("#checkbox-translation-area").checkbox("set checked")
        if (this.filterCATTool) $("#checkbox-cat-tool").checkbox("set checked")
    },

    methods: {
        updateOverdueFilter() {
            this.filterOnlyOverdueInvoices = !this.filterOnlyOverdueInvoices
            this.$emit("updateFilter", { filterOnlyOverdueInvoices: this.filterOnlyOverdueInvoices })
        },

        updateClientsInvoicedOnlineFilter() {
            this.filterOnlyClientsInvoicedOnline = !this.filterOnlyClientsInvoicedOnline
            this.$emit("updateFilter", { filterOnlyClientsInvoicedOnline: this.filterOnlyClientsInvoicedOnline })
        },

        updatePartlyPaidFilter() {
            this.filterOnlyPartlyPaidInvoices = !this.filterOnlyPartlyPaidInvoices
            this.$emit("updateFilter", { filterOnlyPartlyPaidInvoices: this.filterOnlyPartlyPaidInvoices })
        },

        updatePaymentName(field, value) {
            this.specialFilter.paymentName = value
            this.filterInvoicesWithPaymentName = value ? true : false
            this.$emit("updateFilter", { filterInvoicesWithPaymentName: value })
        },

        selectCheckboxPaymentNameFilter() {
            this.filterInvoicesWithPaymentName = !this.filterInvoicesWithPaymentName
            this.$emit("updateFilter", { filterInvoicesWithPaymentName: this.filterInvoicesWithPaymentName ? this.specialFilter.paymentName : false })
        }
    }
}
</script>

<style scoped>
#invoices-filter-wrapper {
    background-color: rgb(249, 253, 253);
}

label {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    cursor: pointer;
    font-size: 12.5px !important;
}
</style>
