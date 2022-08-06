<template lang="pug">
PageBase(headerText="Overdue Invoices")
    #overdue-invoices-wrapper(slot="page-contents")
        #overdue-invoices-filters-wrapper
            div(style="margin-right: 20px")
                TWDropdown(defaultText="All months" :obj="filters" field="MONTH" :change="updateFilter" :items="monthsForDropdown" itemKey="MONTH" showall style="width: 120px")
            div(style="margin-right: 20px")
                TWDropdown(defaultText="All years" :obj="filters" field="YEAR" :change="updateFilter" :items="yearsForDropdown" itemKey="YEAR" style="width: 100px")
            div(style="margin-right: 20px")
                TWDropdown(defaultText="All regions" :obj="filters" field="REGION" :change="updateFilter" :items="regionsForDropdown" itemKey="REGION" style="width: 180px")
            div(style="margin-left: 100px")
                .ui.small.green.button(@click="saveList") Save list
                #overdue-invoices-save-placeholder(style="display: none")
        #table-wrapper
            ScrollableTable
                thead(slot="thead")
                    th.two.wide.no-select(style="cursor: pointer" @click="sortList('invoice')") Invoice
                    th.two.wide.no-select(style="cursor: pointer" @click="sortList('date')") Date
                    th.two.wide.no-select(style="cursor: pointer" @click="sortList('price')") Price
                    th.ten.wide.no-select(style="cursor: pointer" @click="sortList('client')") Client
                tbody(slot="tbody")
                    tr(v-for="invoice in overdueInvoices")
                        td.two.wide {{ invoice.invoiceNumber() }}
                        td.two.wide {{ utils.formatDate(invoice.INVOICE_DATE, "D MMM YYYY") }}
                        td.two.wide(style="text-align: right") {{ utils.roundPrice(invoice.TOTAL_AMOUNT).toFixed(2) }}
                        td.twn.wide {{ invoice.clientNameWithTag() }}
                tfoot(slot="tfoot")
                    tr
                        th(colspan="5") {{ overdueInvoices.length }} overdue invoices
</template>

<script>
import { store, cmg, constants as C_, utils } from "../CoreModules"
import moment from "moment"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import ScrollableTable from "../../Shared/components/ScrollableTable"

export default {
    mixins: [CoreMixin, CoreMixinManagers],

    components: { ScrollableTable },

    data() {
        return {
            invoices: undefined,
            filters: {},
            sortMethod: "",
            sortDirection: -1
        }
    },

    computed: {
        monthsForDropdown() {
            return [{ PK: 0, MONTH: "All months" }, ...C_.monthsForDropdown]
        },

        yearsForDropdown() {
            return [{ PK: 0, YEAR: "All years" }, ...C_.yearsForDropdownFrom2005]
        },

        regionsForDropdown() {
            return [{ PK: 0, REGION: "All regions" }, ...C_.regions]
        },

        overdueInvoices() {
            this.invoices = store.invoices.filter(invoice => {
                if (invoice.STATUS === C_.isPaid) return false

                if (this.filters.MONTH && utils.month(invoice.INVOICE_DATE) != this.filters.MONTH) return false
                if (this.filters.YEAR && utils.year(invoice.INVOICE_DATE) != this.filters.YEAR) return false
                if (this.filters.REGION && invoice.REGION != this.filters.REGION) return false

                return store.serverTime() - invoice.INVOICE_DATE > (invoice.PAYMENT_TERMS || 30) * 86400
            })

            /* prettier-ignore */
            if (this.sortMethod === "invoice") this.invoices.sort((a, b) => this.sortDirection * (a.PK - b.PK))
            else if (this.sortMethod === "date") this.invoices.sort((a, b) => this.sortDirection * (a.INVOICE_DATE - b.INVOICE_DATE))
            else if (this.sortMethod === "price") this.invoices.sort((a, b) => this.sortDirection * (a.TOTAL_AMOUNT - b.TOTAL_AMOUNT))
            else if (this.sortMethod === "client") this.invoices.sort((a, b) => this.sortDirection * a.clientNameWithTag().trim().localeCompare(b.clientNameWithTag().trim()))
            else this.invoices.sort((a, b) => (a.PK - b.PK))

            return this.invoices
        }
    },

    methods: {
        saveList() {
            let text = "INVOICE\tDATE\tPRICE\tCLIENT\n\n"
            for (let invoice of this.overdueInvoices)
                text += `${invoice.invoiceNumber()}\t${utils.formatDate(invoice.INVOICE_DATE, "D MMM YYYY")}\t${utils
                    .roundPrice(invoice.TOTAL_AMOUNT)
                    .toFixed(2)}\t${invoice.clientNameWithTag()}\n`

            const data = "data:application/csv;charset=utf-8," + encodeURIComponent(text)
            const exportLink = document.createElement("a")
            exportLink.setAttribute("href", data)
            exportLink.setAttribute("download", "Overdue invoices.xls")
            exportLink.setAttribute("target", "_blank")
            exportLink.appendChild(document.createTextNode("Overdue invoices.xls"))

            document.getElementById("overdue-invoices-save-placeholder").appendChild(exportLink)
            exportLink.click()
        },

        sortList(method) {
            this.sortMethod = method
            this.sortDirection = -this.sortDirection
        },

        updateFilter(field, value) {
            this.$set(this.filters, field, value)
        }
    }
}
</script>

<style scoped>
#overdue-invoices-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
}

#overdue-invoices-filters-wrapper {
    padding: 5px 20px;
    display: flex;
}

#table-wrapper {
    padding: 15px;
    flex-grow: 1;
}
</style>
