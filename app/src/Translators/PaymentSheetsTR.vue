<template lang="pug">
PageBase(headerText="Payment Sheets")
    ListAndDetailsBase(ref="list" slot="page-contents" :items="paymentSheets" :selectedObject="paymentSheet" :listWidth="200" :listItemHeight="35")
        div(slot="list-header" style="border-bottom: thin solid lightgrey")
        .paymentsheet-row(slot="list-item" slot-scope="{item}" :class="item.PK === paymentSheet.PK && 'selected-paymentsheet'" @click="selectPaymentSheet(item.PK)")
            div(style="margin-right: 3px")
                i.dollar.sign.icon.red(v-if="item.PAYMENT_STATUS === 0")
                i.pause.icon.purple(v-if="item.PAYMENT_STATUS === 1")
                i.check.icon.red(v-if="item.PAYMENT_STATUS === 2")
                i.check.icon.teal(v-if="item.PAYMENT_STATUS === 3")
            div(style="white-space: nowrap; padding-right: 20px") {{ C_.longMonthNames[item.MONTH] + " " + item.YEAR }}
        #details-wrapper(slot="details" style="max-width: 750px")
            div(v-if="!paymentSheets.length" style="padding-top: 10px; font-size: 15px") You have no payment sheets yet.
            div(v-if="!paymentSheets.length" style="padding-top: 10px") As soon as a payment sheet is created for you, it will show up on the left.
            .ui.grid#header(v-show="paymentSheet.PK")
                .eight.wide.column#title(style="font-size: 20px")
                    div Payment sheet for {{ C_.longMonthNames[paymentSheet.MONTH] + " " + paymentSheet.YEAR }}
                    .ui.button.coolblue.tiny#print-button(@click="print" style="margin-top: 20px") Print / Save as PDF
                .eight.wide.column.right.aligned.ui.form#amounts(style="display: flex")
                    div(style="flex: 1 1 auto; padding-right: 10px")
                        div Total:
                        div Correction amount:
                        div Payment status:
                    div(style="flex-basis: 65px; white-space: nowrap")
                        div {{ paymentSheetTotalAmount }} &euro;
                        div {{ paymentSheet.EXTRA_AMOUNT }} &euro;
                        div {{ paymentStatuses[paymentSheet.PAYMENT_STATUS] }}
            .ui.grid#comments(v-if="paymentSheet.PK")
                .ui.form.eight.wide.column(style="padding-right: 20px")
                    label(style="font-size: 13px") Your comments about this payment sheet
                    .field(style="padding-top: 5px")
                        TWTextArea(:rows="3" :obj="paymentSheet" field="EMPLOYEE_COMMENTS" :change="updatePaymentSheet")
                .ui.form.eight.wide.column
                    label(style="font-size: 13px") Payment details (editable only by the managers)
                    .field(style="padding-top: 5px")
                        TWTextArea(readonly :rows="3" :obj="paymentSheet" field="COMMENTS")
            .field(v-if="shouldShowPayoneerWarning" style="padding-top: 10px; font-size: 12px; color: #880000") Note: Payoneer has a minimum amount of 25 € / $ per transaction. If your payment sheet is lower than that, it will stay on pending until that amount is reached.
            div(style="padding-top: 20px; height: 100%" v-if="paymentSheet.PK")
                ScrollableTable(small)
                    thead(slot="thead" style="font-size: 13px")
                        th.three.wide Project
                        th.four.wide PO number
                        th.two.wide Price
                        th.three.wide Correction
                        th.four.wide Payment type
                    tbody(slot="tbody" v-if="paymentSheet.areProjectsLoaded")
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
            paymentSheet: {},
            paymentStatuses: ["Pending", "On hold", "Partly paid", "Paid"]
        }
    },

    created() {
        this.C_ = C_
        this.translatorPaymentStrings = ["", "Fixed price", "By source words", "", "By CAT Analysis"]
    },

    computed: {
        paymentSheets() {
            return [...store.paymentSheets].sort((a, b) => b.PK - a.PK)
        },

        translations() {
            if (!this.paymentSheet.PK) return []
            return store.translations.filter(translation => translation.PAYMENT_SHEET_ID === this.paymentSheet.PK).sort((a, b) => a.PK - b.PK)
        },

        paymentSheetTotalAmount() {
            if (!this.paymentSheet.areProjectsLoaded) return "..."
            if (!this.translations.length && !this.paymentSheet.TEST_TRANSLATIONS_COUNT) return 0
            const translationsTotal = this.translations.reduce((a, c) => a + c.translationPrice(), 0)
            const testTranslationsTotal = (this.paymentSheet.TEST_TRANSLATIONS_COUNT || 0) * 0.5
            return (utils.roundPrice(translationsTotal) + testTranslationsTotal).toFixed(2)
        },

        shouldShowPayoneerWarning() {
            if (!this.paymentSheet.PK) return
            if (![1, 2].includes(store.myself.PAYMENT_METHOD)) return
            if (this.paymentSheetTotalAmount >= 25) return
            if (this.paymentSheet.PAYMENT_STATUS > 0) return
            return true
        }
    },

    methods: {
        async selectPaymentSheet(pk) {
            this.paymentSheet = store.paymentSheet(pk)
            if (this.paymentSheet.areProjectsLoaded) return

            await cmg.requestObjectsForObject(this.paymentSheet, "PROJECTS_FOR_PAYMENT_SHEET_TR")
            await cmg.requestObjectsForObject(this.paymentSheet, "SUBPROJECTS_FOR_PAYMENT_SHEET_TR")
            await cmg.requestObjectsForObject(this.paymentSheet, "TRANSLATIONS_FOR_PAYMENT_SHEET_TR")

            this.$set(this.paymentSheet, "areProjectsLoaded", true)
        },

        updatePaymentSheet(field, value) {
            cmg.updateObject(this.paymentSheet, field, value)
        },

        print() {
            const w = window.open("", "_blank")
            const html =
                `<div id="instructions" style="font-size: 13px; padding-bottom: 20px; color: grey">Press <strong>Ctrl + P</strong> or right-click and <strong>Print</strong> to print the sheet or save it as PDF</div>` +
                $("#details-wrapper").html() +
                `<style>body { padding: 20px; width: 600px; font-family: "Open Sans", sans-serif } #header { display: flex } #title { flex: 1 1 auto } #print-button, #comments { display: none } ` +
                "#amounts { text-align: right } th, td { text-align: left; font-size: 12px } .two.wide { width: 60px; padding-right: 30px } .three.wide { width: 100px } .four.wide { width: 130px }</style>" +
                `<` +
                `script>window.onbeforeprint = function() { document.getElementById("instructions").style.display = "none" }<` +
                `/script>`
            w.document.write(html)
        }
    }
}
</script>

<style scoped>
#payment-sheets-wrapper {
    padding: 10px 10px 0 15px;
}

#details-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
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
