<template lang="pug">
PageBase(headerText="Completed Projects")
    #completed-projects-wrapper(slot="page-contents")
        .ui.grid
            .ui.form.eight.wide.column
                .fields.inline
                    .field
                        TWDropdown(defaultText="Month" :obj="monthYear" field="MONTH" :change="selectMonth" :items="C_.monthsForDropdown" itemKey="MONTH" showall style="width: 120px")
                    .field
                        TWDropdown(defaultText="Year" :obj="monthYear" field="YEAR" :change="selectYear" :items="C_.yearsForDropdown" itemKey="YEAR" style="width: 100px")
            .eight.wide.column.right.aligned.ui.form(style="display: flex")
                div(style="flex: 1 1 auto; padding-right: 10px")
                    div Source words translated:
                    div Source words proofread:
                    div Total amount earned:
                div(style="flex-basis: 65px; white-space: nowrap")
                    div {{ sourceWordsTranslated }}
                    div {{ sourceWordsProofread }}
                    div {{ totalAmountEarned }} &euro;
        div(style="padding-top: 20px; flex: 1 1 auto")
            ScrollableTable(small)
                thead(slot="thead" style="font-size: 13px")
                    th.three.wide(style="cursor: pointer" @click="sortList('project')") Project
                    th.four.wide(style="cursor: pointer" @click="sortList('po')") PO number
                    th.two.wide(style="cursor: pointer" @click="sortList('price')") Price
                    th.three.wide(style="cursor: pointer" @click="sortList('correction')") Correction
                    th.four.wide(style="cursor: pointer" @click="sortList('payment')") Payment type
                tbody(slot="tbody")
                    tr(v-for="translation in translations")
                        td.three.wide {{ translation.subproject().project().PROJECT_NUMBER }}
                        td.four.wide {{ translation.PONumber() }}
                        td.two.wide(style="text-align: right") {{ translation.translationPrice().toFixed(2) }}
                        td.three.wide {{ translation.amountCorrectionAsString("€") }}
                        td.four.wide {{ translatorPaymentStrings[translation.PAYMENT_METHOD] }}
        
</template>

<script>
import CoreMixin from "../Shared/Mixins/CoreMixin"
import ScrollableTable from "../Shared/components/ScrollableTable"
import C_ from "./ConstantsTR"
import utils from "./UtilsTR"
import store from "./Store/StoreTR"
import cmg from "./ConnectionManagerTR"

export default {
    components: { ScrollableTable },

    data() {
        return {
            monthYear: {
                MONTH: 0,
                YEAR: 0
            },
            loadedMonths: {},
            sourceWordsTranslated: 0,
            sourceWordsProofread: 0,
            totalAmountEarned: 0,
            paymentStatuses: ["Pending", "On hold", "Partly paid", "Paid"],
            priceSorting: 0,
            sortMethod: "",
            sortDirection: -1
        }
    },

    created() {
        this.C_ = C_
        this.translatorPaymentStrings = ["", "Fixed price", "By source words", "", "By CAT Analysis"]
    },

    mounted() {
        let date = new Date(store.serverTime() * 1000)
        this.monthYear.MONTH = date.getMonth() + 1
        this.monthYear.YEAR = date.getFullYear()
        this.loadData()
    },

    computed: {
        translations() {
            let sourceWordsTranslated = 0
            let sourceWordsProofread = 0
            let totalAmountEarned = 0
            if (!this.monthYear.MONTH || !this.monthYear.YEAR) return []

            const result = store.translations.filter(translation => {
                const subproject = translation.subproject()
                if (!subproject) return false
                const project = subproject.project()
                if (!project) return false

                if (this.monthYear.MONTH != project.MONTH_COMPLETED || this.monthYear.YEAR != project.YEAR_COMPLETED) return false
                if (translation.STATUS != C_.tsTranslating && translation.STATUS != C_.tsProofreading) return false

                if (translation.STATUS === C_.tsTranslating) sourceWordsTranslated += project.SOURCE_WORDS
                if (translation.STATUS === C_.tsProofreading) sourceWordsProofread += project.SOURCE_WORDS
                totalAmountEarned += translation.translationPrice()
                return true
            })

            /* prettier-ignore */
            if (this.sortMethod === "project") result.sort((a, b) => this.sortDirection * (a.subproject().project().PROJECT_NUMBER.slice(2) - b.subproject().project().PROJECT_NUMBER.slice(2)))
            else if (this.sortMethod === "price") result.sort((a, b) => this.sortDirection * (a.translationPrice() - b.translationPrice()))
            else if (this.sortMethod === "payment") result.sort((a, b) => this.sortDirection * (a.PAYMENT_METHOD - b.PAYMENT_METHOD))
            else if (this.sortMethod === "correction") result.sort((a, b) => - a.amountCorrectionAsString().localeCompare(b.amountCorrectionAsString()))
            else result.sort((a, b) => this.sortDirection * (a.PK - b.PK))

            this.sourceWordsTranslated = sourceWordsTranslated
            this.sourceWordsProofread = sourceWordsProofread
            this.totalAmountEarned = totalAmountEarned.toFixed(2)

            return result
        },

        paymentSheetTotalAmount() {
            if (!this.loadedMonths[this.monthYear.MONTH + "-" + this.monthYear.YEAR]) return "..."
            const translationsTotal = this.translations.reduce((a, c) => a + c.translationPrice(), 0)
            const testTranslationsTotal = this.paymentSheet.TEST_TRANSLATIONS_COUNT * 0.5
            return (utils.roundPrice(translationsTotal) + testTranslationsTotal).toFixed(2)
        }
    },

    methods: {
        selectMonth(field, value) {
            this.monthYear.MONTH = value
            if (!this.monthYear.YEAR) return

            this.loadData()
        },

        selectYear(field, value) {
            this.monthYear.YEAR = value
            if (!this.monthYear.MONTH) return

            this.loadData()
        },

        sortList(method) {
            this.sortMethod = method
            this.sortDirection = -this.sortDirection
        },

        async loadData() {
            const monthYear = { MONTH: this.monthYear.MONTH, YEAR: this.monthYear.YEAR }

            await cmg.requestObjects("PROJECTS_COMPLETED_ON_MONTH_TR", monthYear)
            await cmg.requestObjects("SUBPROJECTS_COMPLETED_ON_MONTH_TR", monthYear)
            await cmg.requestObjects("TRANSLATIONS_COMPLETED_ON_MONTH_TR", monthYear)

            this.loadedMonths[this.monthYear.MONTH + "-" + this.monthYear.YEAR] = true
        }
    }
}
</script>

<style scoped>
#completed-projects-wrapper {
    padding: 10px 10px 15px 15px;
    max-width: 850px;
    height: 100%;
    display: flex;
    flex-direction: column;
}
</style>