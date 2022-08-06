<template lang="pug">
#modal-complete-project.ui.small.modal
    .header Complete project {{ project.PROJECT_NUMBER }}
    i.close.icon
    .content
        #table-wrapper
            ScrollableTable()
                thead(slot="thead")
                    th.four.wide Target language
                    th.nine.wide Translator
                    th.three.wide Was late
                tbody(slot="tbody")
                    tr(v-for="translation in translations" )
                        td.four.wide {{ store.languageName(translation.subproject().LANGUAGE_ID) }} - {{ translation.translationSymbol() }}
                        td.nine.wide(v-if="translation.employee()") {{ translation.employee().fullName() }}
                        td.ten.wide(style="text-align: center")
                            TWCheckbox(:field="translation.PK.toString()" :change="checkWasLate")
        .ui.form(style="padding-top: 20px")
            .field
                TWTextArea(readonly :value="deadlinesText + uploadsText")
    .actions
        .ui.cancel.teal.button.transition Don't complete project yet
        .ui.ok.coolgreen.button.transition(@click="completeProject") Complete project
</template>

<script>
import { store, utils, cmg, constants as C_ } from "../CoreModules"
import ScrollableTable from "../../Shared/components/ScrollableTable"
import CoreMixin from "../../Shared/Mixins/CoreMixin"

export default {
    props: {
        project: Object
    },

    mixins: [CoreMixin],

    data() {
        return {
            lateTranslations: {},
            newStatus: undefined
        }
    },

    components: {
        ScrollableTable
    },

    created() {
        this.store = store
        this.C_ = C_
    },

    computed: {
        translations() {
            return this.project.assignedTranslations().sort((a, b) => a.SUBPROJECT_ID * 3 + a.STATUS - b.SUBPROJECT_ID * 3 - b.STATUS)
        },

        deadlinesText() {
            const proj = this.project
            let projectText = [C_.psReopened, C_.psCompletedAfterReopen].includes(proj.STATUS) ? "Project (R):" : "Project:\t"
            return (
                `${projectText}\t\t${utils.formatDate(proj.deadline())}\n` +
                (proj.DEADLINE_INTERMEDIATE ? `Intermediate:\t\t${utils.formatDate(proj.DEADLINE_INTERMEDIATE)}\n` : ``) +
                (proj.DEADLINE_TRANSLATOR ? `Translator:\t\t${utils.formatDate(proj.DEADLINE_TRANSLATOR)}\n` : ``) +
                (proj.DEADLINE_PROOFREADER ? `Proofreader:\t\t${utils.formatDate(proj.DEADLINE_PROOFREADER)}` : ``) +
                `\n\n`
            )
        },

        uploadsText() {
            let uploadsText = ""
            for (let file of this.project.projectsFiles()) {
                if (file.isTranslated()) {
                    const minutesLate = Math.floor((file.UPLOAD_TIME - this.project.DEADLINE_TRANSLATOR) / 60)
                    const lateText = minutesLate > 0 ? `   -   ${minutesLate} minutes late` : ""
                    uploadsText += `${file.employee() ? file.employee().fullName() : "Translator"} uploaded translation on ${utils.formatDate(file.UPLOAD_TIME)}${lateText}\n`
                }
                if (file.isProofread()) {
                    const minutesLate = Math.floor((file.UPLOAD_TIME - this.project.DEADLINE_PROOFREADER) / 60)
                    const lateText = minutesLate > 0 ? `   -   ${minutesLate} minutes late` : ""
                    uploadsText += `${file.employee() ? file.employee().fullName() : "Proofreader"} uploaded proofreading on ${utils.formatDate(file.UPLOAD_TIME)}${lateText}\n`
                }
            }
            return uploadsText
        }
    },

    methods: {
        checkWasLate(field, value) {
            this.lateTranslations[field] = value
        },

        async tryToCompleteProject() {
            const proj = this.project

            if (this.$checkWithMessage([C_.psCompleted, C_.psCompletedAfterReopen].includes(proj.STATUS), "This project is already completed.")) return
            if (this.$checkWithMessage(proj.isBeingCompleted, "This project is being completed. Please wait for the status to be updated on the server.")) return

            const client = proj.client()
            const oldStatus = proj.STATUS
            this.newStatus = oldStatus === C_.psReopened ? C_.psCompletedAfterReopen : C_.psCompleted
            if (proj.STATUS === C_.psCompleted || proj.STATUS === C_.psCompletedAfterReopen) return

            const price = proj.totalPrice()

            // Check if the PO file has been uploaded and if notarization / certification is done
            // To be used below in checkConditions
            let clientPOFileOK = false
            let isNotarizationCertificationDone = false
            for (let projectFile of proj.projectsFiles()) {
                if (projectFile.FILE_TYPE === C_.pfClientPO) clientPOFileOK = true
                if ([C_.pfFinal, C_.pfFinalSent, C_.pfReopenedFinal, C_.pfReopenedFinalSent].includes(projectFile.FILE_TYPE) && projectFile.CONTENTS === "NC")
                    isNotarizationCertificationDone = true
            }

            // Check if there are translators with payment problems or translators with a higher rate and calculate the total cost
            // To be used below.
            let problemWithPayments = ""
            let translatorsWithHigherRate = ""
            let totalCosts = 0

            for (let translation of proj.assignedTranslations()) {
                const price = translation.translationPrice()
                const employee = translation.employee()
                if (price === 0) problemWithPayments += "     " + employee.fullName() + "  -  " + store.languageName(translation.subproject().LANGUAGE_ID) + "\n\n"
                totalCosts += price

                if ([C_.ptBySourceWords, C_.ptByCatAnalysis].includes(translation.PAYMENT_METHOD)) {
                    if (translation.isTranslating() && employee.RATE_TRANSLATION > store.Settings("DEFAULT_RATE_TRANSLATION"))
                        translatorsWithHigherRate += `${employee.fullName()} ( ${employee.RATE_TRANSLATION} euro / word )\n`
                    if (translation.isProofreading() && employee.RATE_PROOFREADING > store.Settings("DEFAULT_RATE_PROOFREADING"))
                        translatorsWithHigherRate += `${employee.fullName()} ( ${employee.RATE_PROOFREADING} euro / word )\n`
                }
            }

            // prettier-ignore
            if (this.checkConditions([
                { test: proj.STATUS === C_.psQuote,
                    message: "You can not complete a quote. You can either convert it into a project or cancel it by right-clicking on the Complete button." },
                { test: proj.client() === undefined,
                    message: "This project doesn't have the client select. Please correct this before completing the project." },
                { test: proj.PROJECT_EMAIL === undefined,
                    message: "This project doesn't have the project email set. Please correct this before completing the project." },
                { test: proj.SOURCE_WORDS_NOT_COUNTABLE && proj.SOURCE_WORDS === proj.INITIAL_SOURCE_WORDS,
                    message: "This project was marked with words not countable. Please update the \"source words\" field to reflect the total target words before completing the project." },
                { test: price === 0,
                    message: "This project doesn't have the total price calculated. Please check the pricing settings before completing the project."},
                { test: !proj.CURRENCY,
                    message: "This project doesn't have the currency set. Please check the pricing settings before completing the project."},
               { test: this.newStatus === C_.psCompleted && client.IS_INVOICED_ONLINE && !clientPOFileOK,
                    message: "This client uses an online invoicing system, but this project doesn't have the clients PO uploaded. Please upload the client's PO in the files section before completing the project and don't forget to upload everything that is needed in the client's online system.\n\nIn the files section you can find a button that sends an automatic email to the client asking them to send the PO file." },
               { test: (proj.IS_NOTARIZED || proj.IS_CERTIFIED) && !isNotarizationCertificationDone,
                    message: "This is a certified project and it looks like the final files do not include the certified documents.\n\nThe general manager has been informed that the project is ready and will work on the additional files and will complete the project afterwards.\n\nThe project has not been marked as completed for now." },
            ])) return

            if (problemWithPayments && !store.permissions.completeLowProfitProjects) {
                const message = `The following translators have the payment amount set to 0:\n\n${problemWithPayments}Please correct the payment amounts of all the translators above before completing the project.\n\nIf you can't correct the prices, please ask the general manager to complete the project.`
                this.$showMessage(message)
                return
            }

            if (problemWithPayments) {
                const message = `The following translators have the payment amount set to 0:\n\n${problemWithPayments}Are you sure you want to complete the project?`
                if (!(await this.$dialogCheck(message))) return
            }

            // Check if the project is German into a nordic language and ask whether Tranwise should update the payment for translators
            if (store.languageName(proj.SOURCE_LANGUAGE_ID) === "German" && oldStatus != C_.psReopened) {
                let hasTargetNordicLanguages = false
                for (let subproject of proj.subprojects()) if (subproject.isIntoNordicLanguage()) hasTargetNordicLanguages = true

                if (hasTargetNordicLanguages && proj.PROJECT_TYPE != C_.ptProofread) {
                    proj.shouldUpdateTranslationPriceForNordicLanguages = await this.$dialogCheck(
                        `This project is a translation from German into a nordic language. Tranwise can automatically update the nordic translators payment as following:` +
                            `\n\n- translators paid by source words:\n\n     source words  x  0.04 Euro` +
                            `\n\n- translators paid by CAT analysis:\n\n     no match  x  0.04  +  fuzzy match  x  0.02  +  100% and reps  x  0.005` +
                            `\n\n- translators with a fixed price will remain unchanged` +
                            `\n\nDo you want Tranwise to automatically update the payment of all the nordic language translators accordingly?` +
                            `\n\nIf you have already set the translators' payment or you plan to do it manually, please select No.`
                    )
                }
            }

            // prettier-ignore
            if (translatorsWithHigherRate && !(await this.$dialogCheck(`The following translators have a rate that is higher than our standard rate:\n\n${translatorsWithHigherRate}\nAre you sure you want to complete the project?`)))
                return

            let lowProfitExplanation = ""
            // Exception for client Vertaal.nl
            if (proj.CLIENT_ID != 115) {
                if ((proj.CURRENCY === "USD" && price < 14.99) || (proj.CURRENCY === "EUR" && price < 14.99) || (proj.CURRENCY === "GBP" && price < 12.29)) {
                    lowProfitExplanation =
                        `Please note the we charge the following minimum amounts for projects:\n\n- 15 EUR\n- 15 USD\n- 12.30 GBP\n\n` +
                        `The project's total price is ${price} ${proj.CURRENCY}.`
                    if (price * 0.5 < totalCosts && proj.CURRENCY != "GBP")
                        lowProfitExplanation += `\n\nAlso note that this project has a net profit lower than 50% of the project price!`
                }
            } else if (price * 0.5 < totalCosts && proj.CURRENCY != "GBP") lowProfitExplanation = `This project has a net profit lower than 50% of the project price.`

            if (lowProfitExplanation && !store.permissions.completeLowProfitProjects) {
                this.$showMessage(lowProfitExplanation + "\n\nYou do not have the permissions to complete this project.")
                return
            }

            if (lowProfitExplanation) {
                if (!(await this.$dialogCheck(lowProfitExplanation + "\n\nAre you sure you want to complete the project?"))) return
            }

            const modals = $("body .modals")
                .find("#modal-complete-project")
                .each(function() {
                    if (!this.innerHTML.includes("Complete project " + proj.PROJECT_NUMBER)) this.remove()
                })

            this.showModal("#modal-complete-project", { duration: 0 })
        },

        async completeProject() {
            const proj = this.project
            if (proj.isBeingCompleted) return
            proj.isBeingCompleted = true

            // Update the late translations and the late deliveries status for each employee
            // and update the translation price for German -> Nordic translations, if needed
            for (let translation of this.project.assignedTranslations()) {
                if (this.lateTranslations[translation.PK]) cmg.updateObject(translation, "WAS_LATE", true)

                const employee = translation.employee()
                if (!employee) continue

                // Add a minus point if the translator was late
                if (this.lateTranslations[translation.PK]) {
                    cmg.updateObject(employee, "MINUS_POINTS", (employee.MINUS_POINTS || 0) + 1)
                    cmg.updateObject(employee, "POINTS_COMMENTS", (employee.POINTS_COMMENTS || "") + "\n- Minus point added automatically for being late on " + proj.PROJECT_NUMBER)
                }

                if (employee.LATE_DELIVERIES_STATUS != undefined && employee.LATE_DELIVERIES_STATUS != "") {
                    // Add 1 to the deliveries count of this employee
                    let lateDeliveriesStatus = (employee.LATE_DELIVERIES_STATUS || 0) + 1
                    // Add 100000 to the deliveris count of this employee if they were late
                    if (this.lateTranslations[translation.PK]) lateDeliveriesStatus += 100000
                    // This ratio (late deliveries : deliveries) is used in the assignment component to show translators that are usually late

                    cmg.updateObject(employee, "LATE_DELIVERIES_STATUS", lateDeliveriesStatus)
                }

                // Update the translation price for German -> Nordic translations, if needed
                if (proj.shouldUpdateTranslationPriceForNordicLanguages && translation.subproject().isIntoNordicLanguage() && translation.STATUS === C_.tsTranslating) {
                    if (translation.PAYMENT_METHOD === C_.ptBySourceWords || translation.PAYMENT_METHOD === C_.ptByTargetWords)
                        cmg.updateObject(translation, "PRICE", proj.SOURCE_WORDS * 0.04)
                    if (translation.PAYMENT_METHOD === C_.ptByCatAnalysis)
                        cmg.updateObject(translation, "PRICE", proj.WORDS_NO_MATCH * 0.04 + proj.WORDS_FUZZY_MATCH * 0.02 + proj.WORDS_REPS * 0.005)
                    cmg.updateObject(translation, "PAYMENT_METHOD", C_.ptFixedPrice)
                }
            }

            const wasCompletedBefore = proj.DATE_COMPLETED > 0

            cmg.updateObject(proj, "DATE_COMPLETED", "SERVER_TIME_TAG")
            cmg.updateObject(proj, "STATUS", this.newStatus)
            cmg.updateObject(proj, "WORKING_MANAGER_ID", 0)
            cmg.updateObject(proj, "REOPENED_TIME", 0)
            store.addToProjectsHistory(proj, this.newStatus)

            // Mark the initial services as completed
            for (let service of proj.services()) if (service.WAS_INITIAL && !service.IS_COMPLETED) cmg.updateObject(service, "IS_COMPLETED", true)

            const client = proj.client()
            // Create the invoice. Only for clients that are not invoiced monthy - or if the project requires prepayment, create the invoice for montly clients too
            if ((!client.IS_INVOICED_MONTHLY || proj.REQUIRED_PREPAYMENT_PERCENT > 0) && !proj.INVOICE_ID && this.newStatus === C_.psCompleted) {
                const invoice = {
                    table: "INVOICES",
                    CLIENT_ID: client.PK,
                    STATUS: C_.isNotPaid,
                    IS_USA_SPECIAL: client.DIVISION_ID === 7 && client.COUNTRY_ID === 241 // Division is UTS and country is United States
                }
                if (proj.TWILIO_STATUS > 0 || proj.PREPAID_INVOICE_NUMBER || (proj.REQUIRED_PREPAYMENT_PERCENT === 100 && proj.PREPAYMENT_STATUS === C_.ppsPrepaymentDone)) {
                    invoice.STATUS = C_.isPaid
                }

                // Insert the invoice and, upon receiving the new invoice, set the INVOICE_ID on the project
                cmg.insertObject(invoice).then(insertedInvoice => {
                    cmg.updateObject(proj, "INVOICE_ID", insertedInvoice.PK)
                })
            }

            // Ask whether to mark all problems as completed
            let messagesWithProblemCount = 0
            for (let message of proj.messages()) if (message.IS_PROBLEM) messagesWithProblemCount++
            if (messagesWithProblemCount > 0) {
                if (await this.$dialogCheck("Do you want Tranwise to mark all the messages for this project as completed now?")) {
                    for (let message of proj.messages()) if (message.IS_PROBLEM) cmg.updateObject(message, "IS_PROBLEM", false)
                }
            }

            // Ask whether to send an email to the client to ask them for a review
            if (!wasCompletedBefore) {
                if (await this.$dialogCheck("Should Tranwise ask the client to give a review on our website?")) {
                    if(proj.IS_CERTIFIED) {
                        cmg.sendEmailWithType("ASK_CLIENT_FOR_REVIEW_TRANSLATOR_AND_TRUSTPILOT", proj.PK)
                    } else {
                        cmg.sendEmailWithType("ASK_CLIENT_FOR_REVIEW_TRANSLATOR", proj.PK)
                    }
                }
            }
        }
    }
}
</script>

<style scoped>
#table-wrapper {
    height: 250px;
}
</style>
