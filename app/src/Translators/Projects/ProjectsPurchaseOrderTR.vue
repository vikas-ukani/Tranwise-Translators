<template lang="pug">
#modal-purchase-order.ui.modal
    .header Purchase Order no. {{ purchaseOrderNumber }}
    i.close.icon
    .content(style="font-size: 12px")
        .ui.form
            .field(style="white-space: pre-wrap; text-align: right; padding-bottom: 20px; font-size: 12px") {{ header }}
        .ui.grid
            .ui.eight.wide.column(style="white-space: pre-wrap") {{ projectDetails }}
            .ui.eight.wide.column(style="white-space: pre-wrap") {{ translatorDetails }}
        .ui.form(style="font-size: 11px")
            .field(style="white-space: pre-wrap; padding-top: 20px") {{ instructions }}
    .actions
        .ui.cancel.button Close
</template>

<script>
import store from "../Store/StoreTR"

export default {
    props: {
        project: Object,
        subproject: Object,
        translation: Object
    },

    computed: {
        purchaseOrderNumber() {
            return this.translation.PK ? this.translation.PONumber() : ""
        },

        projectDetails() {
            return (
                `Project number: ${this.project.PROJECT_NUMBER}\n` +
                `Source language: ${this.sourceLanguage}\n` +
                `Target language: ${this.targetLanguage}\n` +
                `Source words: ${this.project.SOURCE_WORDS}\n` +
                `Target words: ${this.translation.TARGET_WORDS}`
            )
        },

        translatorDetails() {
            const country = store.country(store.myself.COUNTRY_ID)
            return `Name: ${store.myself.fullName()}\n` + `Address: ${store.myself.ADDRESS}\n` + `Country: ${country ? country.COUNTRY : ""}\n` + `Email: ${store.myself.EMAIL}`
        },

        sourceLanguage() {
            return this.subproject.sourceOrIntermediate ? this.subproject.sourceOrIntermediate() : ""
        },

        targetLanguage() {
            return this.subproject.targetOrIntermediate ? this.subproject.targetOrIntermediate() : ""
        },

        header() {
            return `Universal Translation Services Main Office
ROOM 1502-15, EASEY COMMERCIAL BUILDING,
253-261 HENNESSY ROAD, WANCHAI, HONGKONG`
        },

        instructions() {
            return `General instructions for this job:
1. Please proof-read your translation against the original, then read it again for style.
2. Don't forget to use your computer's spelling and grammar check function before returning your work.
3. Client files: if we send you a client file, please work on that file. Don't forget the headers/footers/footnotes.
4. Never send us incomplete translations (i.e. with "$$$", "***", etc.). 
5. If a relevant website address appears in the text, check it out!

General notes:
1. By accepting this job, you agree with our general conditions, available upon request.
2. Delivery and return of documents is at your own expense.
3. Payment: all payments for a certain month are going to be paid in the first week of the next month. All jobs of that month in total. (eg. everything translated or proofread in April, will be paid in the first week of May).

PLEASE ENSURE THAT ALL YOUR WORK IS CHECKED AND FREE OF GRAMMATICAL AND SPELLING ERRORS, ANY ERRORS WILL BE CORRECTED AND THE CORRECTION COST WILL BE DEDUCTED FROM YOUR INVOICE. LATE DELIVERY OF THE PROJECT CAN RESULT ALSO IN A DEDUCTION FROM YOUR INVOICE.`
        }
    }
}
</script>
