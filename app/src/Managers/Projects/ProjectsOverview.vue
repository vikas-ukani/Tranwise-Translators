<template lang="pug">
#main-overview-wrapper
    #overview-wrapper(v-if="project.PK" :data="initializeTooltip()")
        div(style="display: flex" )
            div(style="flex-grow: 1") #[strong {{ project.PROJECT_NUMBER }}] for #[strong {{ clientName }}]
                i.icon.external.alternate.ficon(style="padding-left: 10px; margin-right: -5px" @click="goToClient")
            #tags-container.inline
                #monthly-invoice.tag.no-select(v-show="isMonthlyInvoiced" style="background-color: #E67E22; padding-left: 8px; padding-right: 8px") MI
                #video-interpreting.tag.no-select(v-show="project.VIDEO_INTERPRETING_STATUS" style="background-color: #E67E22; padding-left: 8px; padding-right: 8px") VI
                #telephone-interpreting.tag.no-select(v-show="project.TELEPHONE_INTERPRETING_STATUS" style="background-color: #E67E22; padding-left: 8px; padding-right: 8px") TI
                #audio-translation.tag.no-select(v-show="project.AUDIO_TRANSLATION_STATUS" style="background-color: #E67E22; padding-left: 8px; padding-right: 8px") AT
                #ai-translation.tag.no-select(v-show="project.AI_TRANSLATION_STATUS" style="background-color: #E67E22; padding-left: 8px; padding-right: 8px") AI
                #template-editing.tag.no-select(v-show="project.WEBSITE_ORDER_ID" style="background-color: #E67E22; padding-left: 8px; padding-right: 8px" @click="openFileInTemplateEditor") TEMPLATE
                #watch-flow.tag.no-select(v-show="project.IS_PROGRESS_WATCHED" style="background-color: #ff99cc; padding-left: 8px; padding-right: 8px") W
                .tag(:class="{'tag-disabled': isTagDisabled(tag), 'tag-hidden': isTagHidden(tag), 'tag-red': tag === 'P'}" :id="'tag-' + tag.replace('!', '')"  v-for="tag in tags") {{ tag }}
                .tag#tag-TP(v-html="tagTP")
        #status-buttons-wrapper
            .status-button#ButtonQuote.tooltip
                img.button-image(:src="`${iconsPath}/Quote${statusIconOn(C_.psQuote)}.svg`")
            .divider(style="width: 15px")
            .status-button#SendQuote.tooltip
                img.ui.button-image(:src="`${iconsPath}/${sendQuoteIcon}.svg`" @click="sendQuote")
            .divider(style="width: 15px")
            .status-button#ButtonSetup.tooltip
                img.button-image(:src="`${iconsPath}/Setup${statusIconOn(C_.psSetup)}.svg`" @click="setStatusSetup")
            .divider(style="width: 30px")
            .status-button#ButtonPending.tooltip
                img.button-image(:src="`${iconsPath}/Pending${statusIconOn(C_.psPending)}.svg`" @click="setStatusPending")
            .divider(style="width: 15px")
            .status-button#SendPending.tooltip
                img.ui.button-image(:src="`${iconsPath}/${sendPendingIcon}.svg`" @click="sendPendingEmail")
            .divider(style="width: 15px")
            .status-button#ButtonInTranslation.tooltip
                img.button-image(:src="`${iconsPath}/InProgressTranslation${statusIconOn(C_.psTranslation)}.svg`" @click="setStatusInProgress(C_.psTranslation)")
            .divider(style="width: 15px")
            .status-button#SendInProgress.tooltip
                img.ui.button-image(:src="`${iconsPath}/${sendInProgressIcon}.svg`" @click="sendInProgressEmail")
            .divider(style="width: 15px")
            .status-button#ButtonInProofreading.tooltip(v-show="[1, 3].includes(project.PROJECT_TYPE)")
                img.button-image(:src="`${iconsPath}/InProgressProofreading${statusIconOn(C_.psProofreading)}.svg`" @click="setStatusInProgress(C_.psProofreading)")
            .divider(style="width: 15px")
            .status-button#SendLateDelivery.tooltip
                img.ui.button-image(:src="`${iconsPath}/${sendLateDeliveryIcon}.svg`" @click="sendLateDeliveryEmail")
            .divider(style="width: 15px")
            .status-button#ButtonInCheckPhase.tooltip
                img.button-image(:src="`${iconsPath}/InProgressCheckPhase${statusIconOn(C_.psCheckPhase)}.svg`" @click="setStatusInProgress(C_.psCheckPhase)")
            .divider-flex
            .status-button#ButtonReopened.tooltip
                img.button-image(:src="`${iconsPath}/Reopened${statusIconOn(C_.psReopened)}.svg`" @click="reopenProject")
            .divider-flex
            .status-button#ButtonCompleteCancel.tooltip
                img.button-image(:src="`${iconsPath}/${lastButtonIcon()}.svg`" @click="clickLastButton" @contextmenu.prevent="contextMenu")
        #overview-details-wrapper
            div(style="flex: 1 1") {{ languagePairsText }}
            #DeadlineText.tooltip(style="flex: 1 1; white-space: pre")  {{ deadlineText }}
            div(style="flex: 1 1; display: flex")
                .overview-claimed-tag.claimed-certification(v-if="certificationClaimedName") C
                .overview-claimed-name.claimed-certification(v-if="certificationClaimedName") {{ certificationClaimedName }}
                .overview-claimed-tag.claimed-issue(v-if="issueClaimedName") I
                .overview-claimed-name.claimed-issue(v-if="issueClaimedName") {{ issueClaimedName }}
            div.clickable(style="flex: 0 1; padding-right: 10px" @click="showHistory") History
        .div-zero
            CompleteProject(ref="CompleteProject" :project="project")
            ReopenProject(ref="ReopenProject" :project="project")
            TWContextMenu(ref="CancelProjectContextMenu")
                .menu(slot="menu-items")
                    .item(@click="cancelProject" v-if="showCancelOption") Cancel project
                    .item(v-else) Project can't be cancelled
            #modal-prepayment-status.ui.small.modal
                .header Prepaid project {{ project.PROJECT_NUMBER }}
                .content
                    .ui.form
                        .field Warning!
                        .field This project requires payment in advance and has not been marked as paid.
                        .field Please select one of the two options below:
                        .field(style="padding-top: 1px")
                        .field
                            TWCheckbox(label="The invoice is paid, but did not show automatically in Tranwise" :obj="prepaymentStatus" :change="updatePrepaymentStatus" field="optionA")
                        .field
                            TWCheckbox(label="The invoice is partly paid by bank or by PayPal or credit card" :obj="prepaymentStatus" :change="updatePrepaymentStatus" field="optionB")
                        .field(v-if="prepaymentStatus.optionA" style="padding-top: 10px; color: red") Note! The invoice is put on paid, please fill in the details in Tranwise.
                        .field(v-else-if="prepaymentStatus.optionB" style="padding-top: 10px; color: red") Note! Invoice will NOT be put on paid. Don't forget to fill the details of the partly paid invoice in Tranwise.
                        .field(v-else style="padding-top: 10px") &nbsp;
                .actions
                    .ui.cancel.button Cancel
                    .ui.button.green(@click="setPrepaymentStatus" :class="{disabled: !prepaymentStatus.optionA && !prepaymentStatus.optionB}") Continue
                    //- This hidden button is used to close the modal. The one above should not close it, as there might be questions in the form.
                    .ui.button.positive.dummy-prepayment-status-button(style="display: none")

</template>

<script>
import { store, utils, cmg, constants as C_ } from "../CoreModules"
import CompleteProject from "./CompleteProject"
import ReopenProject from "./ReopenProject"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import tippy from "tippy.js"
import TooltipMixin from "../../Shared/Mixins/TooltipMixin"

export default {
    props: {
        project: Object
    },

    data() {
        return {
            wasSentQuoteEmail: false,
            prepaymentStatus: {
                optionA: undefined,
                optionB: undefined
            }
        }
    },

    mixins: [CoreMixin, TooltipMixin],

    components: { CompleteProject, ReopenProject },

    computed: {
        showCancelOption() {
            return [C_.psQuote, C_.psSetup, C_.psPending, C_.psTranslation, C_.psProofreading, C_.psCheckPhase].includes(this.project.STATUS)
        },

        clientName() {
            const client = store.client(this.project.CLIENT_ID)
            if (!client) return ""
            return client.CLIENT_NAME.length > 50 ? client.CLIENT_NAME.substring(0, 47) + "..." : client.CLIENT_NAME
        },

        isMonthlyInvoiced() {
            const client = store.client(this.project.CLIENT_ID)
            if (!client) return ""
            return client.IS_INVOICED_MONTHLY;
        },

        iconsPath() {
            return "/static/icons/Projects/Overview"
        },

        sendQuoteIcon() {
            for (let ob of store.projectsHistory) if (ob.PROJECT_ID === this.project.PK && ob.ACTION === C_.phSendQuote) return "EmailDetails"
            return "Email"
        },

        sendPrepaymentLinkIcon() {
            for (let ob of store.projectsHistory) if (ob.PROJECT_ID === this.project.PK && ob.ACTION === C_.phSendPrepaymentLink) return "EmailDetails"
            return "Email"
        },

        sendPendingIcon() {
            for (let ob of store.projectsHistory) if (ob.PROJECT_ID === this.project.PK && ob.ACTION === C_.phSendPending) return "EmailDetails"
            return "Email"
        },

        sendInProgressIcon() {
            for (let ob of store.projectsHistory) if (ob.PROJECT_ID === this.project.PK && ob.ACTION === C_.phSendInProgress) return "EmailDetails"
            return "Email"
        },

        sendLateDeliveryIcon() {
            return this.project.LATE_DELIVERY_INFORMED_COUNT > 0 ? "SendLateDeliveryDone" : "SendLateDelivery"
        },

        tagTP() {
            if (this.project.PROJECT_TYPE === C_.ptTranslate) return "&nbsp;T&nbsp;"
            if (this.project.PROJECT_TYPE === C_.ptProofread) return "&nbsp;P&nbsp;"
            return "TP"
        },

        historyText() {
            const baseTexts = {}
            baseTexts[C_.phSendQuote] = "sent the quote"
            baseTexts[C_.phSendPending] = "sent the pending email"
            baseTexts[C_.phSendPrepaymentLink] = "sent the prepayment link"
            baseTexts[C_.phSendInProgress] = "sent the in-progress email"
            baseTexts[C_.phSendFinalFile] = "sent a final file"
            baseTexts[C_.phWorkOnDelivery] = "started working on delivery"
            baseTexts[C_.phAssignTranslator] = "assigned translator DETAILS"
            baseTexts[C_.phAssignProofreader] = "assigned proofreader DETAILS"
            baseTexts[C_.phUnassignTranslator] = "unassigned translator DETAILS"
            baseTexts[C_.phUnassignProofreader] = "unassigned proofreader DETAILS"
            baseTexts[C_.phAddPaymentDetails] = "added payment details DETAILS"
            baseTexts[C_.phAddProjectRefund] = "added a refund: DETAILS"
            baseTexts[C_.phSendFileToCheckOldMethod] = "sent file for checking with old method: DETAILS"
            baseTexts[C_.phSendFileToCheckInOnlineEditor] = "sent file for checking in online editor: DETAILS"

            // prettier-ignore
            const projectStatusNames = ["", "QUOTE", "SETUP", "PENDING", "IN PROGRESS (TRANSLATION)", "IN PROGRESS (PROOFREADING)", "IN PROGRESS (CHECK PHASE)", "REOPENED", "COMPLETED", "COMPLETED (AFTER REOPEN)", "CANCELLED"]
            const historyItems = []

            for (let ob of store.projectsHistory) {
                if (ob.PROJECT_ID != this.project.PK) continue
                if (ob.EMPLOYEE_ID === 0) continue

                const employee = store.employee(ob.EMPLOYEE_ID)
                const employeeName = employee ? employee.FIRST_NAME : ""
                const dateString = utils.formatDate(ob.DATE, "D MMM YYYY\tHH:mm  ")

                let text = ""
                if (ob.ACTION === C_.phActionWithDetails) text = ob.DETAILS
                if (baseTexts[ob.ACTION]) text = baseTexts[ob.ACTION].replace("DETAILS", ob.DETAILS)
                if (ob.ACTION <= 10) text = `set the status to ${projectStatusNames[ob.ACTION]}`

                historyItems.push({ date: ob.DATE, text: `${dateString}\t ${employeeName} ${text}` })

                if (ob.ACTION === C_.phSendQuote) this.wasSentQuoteEmail = true
            }

            return historyItems
                .sort((a, b) => a.date - b.date)
                .map(item => item.text)
                .join("\n")
        },

        languagePairsText() {
            const sourceLanguage = store.languageName(this.project.SOURCE_LANGUAGE_ID).substring(0, 3)
            const subprojects = this.project.subprojects()
            if (!subprojects.length) return `Source: ${sourceLanguage}`

            let result = sourceLanguage + " ➜ "
            let count = 0
            subprojects.forEach(subproject => {
                if (count > 2) return
                result += store.languageName(subproject.LANGUAGE_ID).substring(0, 3)
                if (subproject.INTERMEDIATE_LANGUAGE_ID) result += ` *`
                result += ", "
                count++
            })

            result = result.slice(0, -2)
            if (subprojects.length > 3) result += ` + ${subprojects.length - 3}`
            return result
        },

        deadlineText() {
            if (this.project.SOURCE_WORDS === undefined) return
            return `${this.project.SOURCE_WORDS} wds, due ${utils.formatDate(this.project.deadline(), "D MMM  HH:mm")}`
        },

        certificationClaimedName() {
            if (!this.project.CLAIMED_BY) return ""
            const employee = store.employee(this.project.CLAIMED_BY)
            return employee ? employee.FIRST_NAME : "Claimed"
        },

        issueClaimedName() {
            let result = ""
            store.projectsMessages
                .filter(m => m.PROJECT_ID === this.project.PK && m.CLAIMED_BY)
                .forEach(m => {
                    const employee = store.employee(m.CLAIMED_BY)
                    result = employee ? employee.FIRST_NAME : "Claimed"
                })
            return result
        }
    },

    methods: {
        // Updates the tippy instance for tooltips (it's called in tippy's onShow() )
        updateTooltip(instance) {
            const id = instance.reference.id
            let action = C_.hasOwnProperty("ph" + id) ? C_["ph" + id] : null
            let text
            let employee
            const status = this.project.STATUS

            // If it's a button, set the description of that button and return
            if (id === "ButtonQuote") text = `Received on ${utils.formatDate(this.project.DATE_RECEIVED, "D MMM YYYY, HH:mm")}`
            if (id === "ButtonSetup") text = status === C_.psSetup ? "Project's status is SETUP" : "Convert quote to project"
            if (id === "ButtonPending") text = status === C_.psPending ? "Project's status is PENDING" : "Mark project as PENDING and inform the translators"
            if (id === "ButtonInTranslation") text = "In progress (translation)"
            if (id === "ButtonInProofreading") text = "In progress (proofreading)"
            if (id === "ButtonInCheckPhase") text = "In progress (check phase)"
            if (id === "ButtonReopened") text = status === C_.psReopened ? "Project is reopened" : "Reopen project"
            if (id === "ButtonCompleteCancel") {
                if (status === C_.psCompleted || status === C_.psCompletedAfterReopen) text = `Completed on ${utils.formatDate(this.project.DATE_COMPLETED, "D MMM YYYY, hh:mm")}`
                else if (status === C_.psCancelled) text = "Project was cancelled"
                else if ([C_.psQuote, C_.psSetup, C_.psPending].includes(status)) text = "Cancel project"
                else text = "Complete project"
            }

            if (id === "DeadlineText") {
                let t = `Project: ${utils.formatDate(this.project.deadline(), "D MMM YYYY  HH:mm")}<br />`
                if (this.project.DEADLINE_INTERMEDIATE) t += `Intermediate: ${utils.formatDate(this.project.DEADLINE_INTERMEDIATE, "D MMM YYYY  HH:mm")}<br />`
                if (this.project.DEADLINE_TRANSLATOR) t += `Translators: ${utils.formatDate(this.project.DEADLINE_TRANSLATOR, "D MMM YYYY  HH:mm")}<br />`
                if (this.project.DEADLINE_PROOFREADER) t += `Proofreaders: ${utils.formatDate(this.project.DEADLINE_PROOFREADER, "D MMM YYYY  HH:mm")}`
                text = t
            }

            if (text) {
                instance.setContent(text)
                return true
            }

            // Search all projectsHistory for an action matching the id of the event sender
            for (let ob of store.projectsHistory)
                if (ob.PROJECT_ID === this.project.PK && ob.ACTION === action) {
                    employee = store.employee(ob.EMPLOYEE_ID)
                    text = `<br />by ${employee ? employee.fullName() : ""} on ${utils.formatDate(ob.DATE, "D MMM YYYY  HH:mm")}`
                }

            // If no projectHistory was found, try to show the description of the button
            if (!text) {
                if (id === "SendQuote") text = "Send the quote to the client"
                if (id === "SendPrepaymentLink") text = "Send email with prepayment link"
                if (id === "SendPending") text = "Inform the client that the project has been set up"
                if (id === "SendInProgress") text = "Inform the client that the project is in progress"
                if (id === "SendLateDelivery") text = "Inform the client about a late delivery"

                // If there is still no text to show at this point, return false, so the tooltip won't show
                if (!text) return false

                // Otherwise show the description and return true, so that the tooltip will show
                instance.setContent(text)
                return true
            }

            if (id === "SendQuote") instance.setContent("Quote sent to client" + text)
            if (id === "SendPrepaymentLink") instance.setContent("Email with prepayment link sent" + text)
            if (id === "SendPending") instance.setContent("The client was informed about the project being setup" + text)
            if (id === "SendInProgress") {
                if (employee) instance.setContent("The client was informed about the project being in progress" + text)
                else instance.setContent("Tranwise has informed the client about the project being in progress.")
            }
        },

        isTagDisabled(tag) {
            let p = this.project
            let result

            if (tag == "MAIL") result = p.SHOULD_BE_SENT_BY_POST && !p.IS_ON_HOLD
            if (tag == "ON HOLD") result = p.IS_ON_HOLD
            if (tag == "NC") result = p.IS_NOTARIZED || p.IS_CERTIFIED
            if (tag == "QA") result = p.NEEDS_QA_REPORT
            if (tag == "C!") result = p.client() && p.client().has("SPECIAL_INSTRUCTIONS")
            if (tag == "WD") result = p.has("WORK_DETAILS")
            if (tag == "CAT") result = p.hasCATTools()
            if (tag == "BIG") result = p.IS_BIG

            if (tag == "P") {
                for (let projectMessage of store.projectsMessages)
                    if (projectMessage.PROJECT_ID === p.PK && projectMessage.IS_PROBLEM) {
                        result = true
                        break
                    }
            }

            return !result
        },

        // Some tags (MAIL, ON HOLD, P) shoudln't be visible at all if they are disabled
        // ie. don't show the dimmed version, hide the tag altogether
        isTagHidden(tag) {
            return this.isTagDisabled(tag) && ["MAIL", "ON HOLD", "P"].includes(tag)
        },

        statusIconOn(status) {
            return this.project.STATUS === status ? "On" : ""
        },

        tagDescription(tag) {
            if (tag == "MAIL") return "Should be sent by post"
            if (tag == "ON HOLD") return "Project is on hold"
            if (tag == "NC") return "Project is notarized or certified"
            if (tag == "QA") return "Project needs QA report"
            if (tag == "C!") return "The client has special instructions"
            if (tag == "WD") return "The project has details for managers"
            if (tag == "CAT") return "The project has CAT tools"
            if (tag == "BIG") return "This is a big project"
        },

        showHistory() {
            this.$showMessage(`History for project ${this.project.PROJECT_NUMBER}:\n\n${this.historyText}`)
        },

        // This is the last button in the list, which can show one of these 3 statuses:
        // Completed, Completed after reopen, Cancelled
        lastButtonIcon() {
            if (this.project.STATUS === C_.psCompleted) return "CompletedOn"
            if (this.project.STATUS === C_.psCompletedAfterReopen) return "CompletedAfterReopenOn"
            if (this.project.STATUS === C_.psCancelled) return "CancelledOn"
            if ([C_.psQuote, C_.psSetup, C_.psPending].includes(this.project.STATUS)) return "Cancelled"
            return "Completed"
        },

        updateStatus(newStatus) {
            cmg.updateObject(this.project, "STATUS", newStatus)
            store.addToProjectsHistory(this.project, newStatus)
        },

        updateProject(field, value) {
            cmg.updateObject(this.project, field, value)
        },

        // Setting statuses

        setStatusSetup() {
            if (this.project.STATUS === C_.psSetup) return
            if (this.$checkWithMessage(this.project.STATUS !== C_.psQuote, "You are not allowed to change the status back to Setup.")) return
            this.updateStatus(C_.psSetup)
            this.updateProject("PROJECT_NUMBER", this.project.PROJECT_NUMBER.replace("Q", this.project.client().divisionCode()))
        },

        async setStatusPending() {
            if (this.project.STATUS === C_.psPending) return

            // prettier-ignore
            if (this.checkConditions([
                { test: this.project.STATUS === C_.psQuote, message: "Please convert this quote to a project by changing its status to Setup first." },
                { test: this.project.isCompleted(), message: "You are not allowed to change the status of a completed project back to Pending.\n\nIf you want to reopen the project, please use the Reopen button."},
                { test: this.project.STATUS !== C_.psSetup, message: "You are not allowed to change the status to Pending." }
            ])) return

            if (this.project.PROJECT_NUMBER.includes("Q")) this.updateProject("PROJECT_NUMBER", this.project.PROJECT_NUMBER.replace("Q", this.project.client().divisionCode()))

            this.prepaymentStatus.optionA = this.prepaymentStatus.optionB = false

            // If the project requires prepayment but wasn't paid yet, ask what is the status of the prepayment
            if (this.project.PREPAYMENT_STATUS === C_.ppsPrepaymentPending) {
                this.showModal("#modal-prepayment-status", { autofocus: false, duration: 0 })
                // Return, as the status is set when clicking the modal button, after making the selection
                return
            }

            this.setStatusToPending()
        },

        async setStatusToPending() {
            if (!(await this.$dialogCheck("Change the project's status to\n\nPENDING?\n\nThe translators will be informed about this project."))) return

            this.updateStatus(C_.psPending)
            if (this.project.SOURCE_WORDS >= 7000) this.updateProject("IS_PROGRESS_WATCHED", true)
            if (this.prepaymentStatus.optionA) this.updateProject("PREPAYMENT_STATUS", C_.ppsPrepaymentDone)
            if (this.prepaymentStatus.optionB) this.updateProject("PREPAYMENT_STATUS", C_.ppsPrepaymentPartlyDone)
        },

        updatePrepaymentStatus(field, value) {
            if (field === "optionA" && value && this.prepaymentStatus.optionB) this.prepaymentStatus.optionB = false
            if (field === "optionB" && value && this.prepaymentStatus.optionA) this.prepaymentStatus.optionA = false
            this.$set(this.prepaymentStatus, field, value)
        },

        async setPrepaymentStatus() {
            $(".dummy-prepayment-status-button").click()
            await utils.delay(50)
            this.setStatusToPending()
        },

        async setStatusInProgress(newStatus) {
            if (this.project.STATUS === newStatus) return

            const price = this.project.totalPrice()
            const minPricePerWord = this.CURRENCY === "GBP" ? 0.055 : 0.08
            const minPrice = this.SOURCE_WORDS * minPricePerWord

            // prettier-ignore
            if (this.checkConditions([
                { test: this.project.STATUS === C_.psQuote,
                    message: "Please convert this quote to a project by changing its status to Setup first." },
                { test: this.project.isCompleted(),
                    message: "You are not allowed to change the status of a completed project back to In Progress.\n\nIf you want to reopen the project, please use the Reopen button."},
                { test: this.project.STATUS === C_.psSetup,
                    message: "This project wasn't set on Pending, so translators have not been informed about it.\n\nPlease set the status to Pending first." },
                { test:
                    !price
                    && this.PAYMENT_CLIENT !== C_.ptByTargetWords
                    && !this.SOURCE_WORDS_NOT_COUNTABLE,
                    message: "Please fill in the project price before making this project in progress."},
                { test:
                    price + 0.01 < minPrice
                    && !this.SOURCE_WORDS_NOT_COUNTABLE
                    && !this.hasCATTools()
                    && this.PAYMENT_CLIENT !== C_.ptByCatAnalysis
                    && this.PAYMENT_CLIENT !== C_.ptByTargetWords
                    && this.PROJECT_TYPE === C_.ptTranslateProofread,
                    message: `The price of this project (${utils.roundPrice(price)} ${this.CURRENCY}) is less than source words x ${minPricePerWord} (${minPrice} ${this.CURRENCY}).\n\nPlease review the price and project's settings.`}
            ])) return

            // prettier-ignore
            const projectStatusNames = ["", "QUOTE", "SETUP", "PENDING", "IN PROGRESS (TRANSLATION)", "IN PROGRESS (PROOFREADING)", "IN PROGRESS (CHECK PHASE)", "REOPENED", "COMPLETED", "COMPLETED (AFTER REOPEN)", "CANCELLED"]

            if (!(await this.$dialogCheck(`Change the project's status to ${projectStatusNames[newStatus]}?`))) return

            let foundEmailSent
            for (let ph in store.projectsHistory)
                if (ph.PROJECT_ID === this.PK && ph.ACTION === C_.phSendInProgress) {
                    foundEmailSent = true
                    break
                }
            if (!foundEmailSent) store.addToProjectsHistory(this.project, C_.phSendInProgress, "", true)

            // This is done to ensure that the project has the correct calculated price.
            // When the server receives the PRICE update, it calculates the price automatically.
            if (this.project.totalPriceWithoutVAT() !== this.CALCULATED_PRICE) cmg.updateObject(this.project, "PRICE", this.project.PRICE)

            cmg.updateObject(this.project, "STATUS", newStatus)
            store.addToProjectsHistory(this.project, newStatus)
        },

        reopenProject() {
            if (this.$checkWithMessage(![C_.psCompleted, C_.psCompletedAfterReopen].includes(this.project.STATUS), "You can't reopen a project that was not completed.")) return
            this.$refs.ReopenProject.reopenProject()
        },

        // This is the button that can either complete the project or cancel it
        async clickLastButton() {
            const proj = this.project

            if (proj.STATUS === C_.psCancelled) {
                this.$showMessage(`The project was cancelled for the following reason:\n\n${proj.CANCEL_REASON}`)
                return
            }

            // Cancel the project
            if ([C_.psQuote, C_.psSetup, C_.psPending].includes(proj.STATUS)) {
                this.cancelProject()
            }
            // Complete the project
            else {
                this.$refs.CompleteProject.tryToCompleteProject()
            }
        },

        async cancelProject() {
            const proj = this.project

            const response = await this.$showDialog({
                header: `Reason for cancelling project ${proj.PROJECT_NUMBER}`,
                message: `Type the reason for cancelling ${proj.PROJECT_NUMBER}:`,
                textAreaText: "",
                blankTextWarning: "Please provide a reason for cancelling the project.",
                buttons: ["Abort", "Cancel project"],
                buttonClasses: ["", "positive"]
            })

            if (response.selection === "Cancel project") {
                cmg.updateObject(proj, "CANCEL_REASON", response.text)
                cmg.updateObject(proj, "STATUS", C_.psCancelled)
                cmg.updateObject(proj, "WORKING_MANAGER_ID", 0)
                store.addToProjectsHistory(proj, C_.psCancelled)
            }
        },

        contextMenu() {
            this.$refs.CancelProjectContextMenu.show(event)
            if (window.getSelection) window.getSelection().removeAllRanges()
        },

        // Sending messages

        async sendQuote() {
            const proj = this.project

            // prettier-ignore
            if (this.checkConditions([
                { test: proj.STATUS != C_.psQuote,
                    message: "This project is not a quote anymore." },
                { test: proj.WEBSITE_ORDER_ID,
                    message: "This project is for a template which the client has already paid for. Please convert the quote to a project and continue with it." },
                { test: !proj.PAYMENT_CLIENT && !proj.IS_CERTIFIED,
                    message: "This quote does not have the pricing method selected. Please correct this before sending the quote."},
                { test: !proj.PRICE && proj.PAYMENT_CLIENT != C_.ptByCatAnalysis && !proj.IS_CERTIFIED,
                    message: "This quote does not have a valid price. Please correct this before sending the quote."},
                { test: !utils.isValidEmail(proj.PROJECT_EMAIL),
                    message: "This quote does not have a valid project email set. Please correct this before sending the quote."},
                { test: proj.subprojects().length === 0,
                    message: "Please add at least one target language before sending the quote to the client."},
                { test: proj.TWILIO_STATUS > 0 && proj.QUOTE_COMMENTS.length > 200,
                    message: `This quote will be sent by SMS. The quote comments are ${proj.QUOTE_COMMENTS.length} characters long.\n\nPlease rephrase the quote comments to be less than 200 characters.`},
                { test: proj.IS_CERTIFIED && proj.CERTIFIED_PAYMENT_METHOD === 0,
                    message: "This certified quote does not have the pricing method selected. Please correct this before sending the quote."},
                { test: proj.IS_CERTIFIED && proj.totalCertifiedPrice() === 0,
                    message: "This quote does not have the price selected. Please correct this before sending the quote."},
                { test: !proj.EXTRA_COSTS && proj.EXTRA_COSTS_DETAILS.trim(),
                    message: "This quote has some extra costs details filled in, but the extra costs total is 0. Please correct this before sending the quote."},
            ])) return

            if (await this.$dialogCheck("Are you sure you want to send this quote to the client?")) {
                cmg.sendEmailWithType("QUOTE", proj.PK)
                store.addToProjectsHistory(proj, C_.phSendQuote)
                cmg.updateObject(proj, "IS_QUOTE_SENT", true)
            }
        },

        async sendPrepaymentLink() {
            const proj = this.project

            const message =
                proj.PREPAYMENT_STATUS === C_.ppsPrepaymentNone
                    ? "This project doesn't require prepayment."
                    : "Tranwise has already sent the payment link to the client in the email with the quote details."

            this.$showMessage(message)
        },

        async sendPendingEmail() {
            const proj = this.project

            // prettier-ignore
            if (this.checkConditions([
                { test: proj.STATUS != C_.psPending,
                    message: "You can only inform the client about the project being set up for Pending projects." },
                { test: proj.VIDEO_INTERPRETING_STATUS > 0,
                    message: "This is a video interpreting project. There is no reason to send this email." },
                { test: proj.WEBSITE_ORDER_ID,
                    message: "This is a template editing project. There is no reason to send this email." },
                { test: proj.PREPAYMENT_STATUS === C_.ppsPrepaymentDone,
                    message: "This project was prepaid by the client. There is no reason to send this message anymore." },
                { test: proj.PREPAYMENT_STATUS === C_.ppsPrepaymentPending,
                    message: "This project requires prepayment. There is no reason to send this message." },
                { test: !utils.isValidEmail(proj.PROJECT_EMAIL),
                    message: "This quote does not have a valid project email set. Please correct this before sending the quote."},
            ])) return

            if (await this.$dialogCheck("Are you sure you want to send an email to the client informing them that the project has been setup?")) {
                cmg.sendEmailWithType("NEW_PROJECT", proj.PK)
                store.addToProjectsHistory(proj, C_.phSendPending)
            }
        },

        async sendInProgressEmail() {
            const proj = this.project

            // prettier-ignore
            if (this.checkConditions([
                { test: ![C_.psTranslation, C_.psProofreading, C_.psCheckPhase].includes(proj.STATUS),
                    message: "You can only inform the client about the project being in progress after setting it In Progress." },
                { test: !utils.isValidEmail(proj.PROJECT_EMAIL),
                    message: "This project does not have a valid project email set. Please correct this before sending the email."},
            ])) return

            // prettier-ignore
            if (await this.$dialogCheck("Tranwise has already informed the client that the project is in progress.\n\nAre you sure you want to send another email to the client about this?")) {
                const emailType =
                    proj.PREPAYMENT_STATUS === C_.ppsPrepaymentPending || proj.PREPAYMENT_STATUS === C_.ppsPrepaymentDone ? "PROJECT_IN_PROGRESS_PREPAYMENT" : "PROJECT_IN_PROGRESS"
                cmg.sendEmailWithType(emailType, proj.PK)
                store.addToProjectsHistory(proj, C_.phSendInProgress)
            }
        },

        async sendLateDeliveryEmail() {
            const proj = this.project

            // prettier-ignore
            if (this.checkConditions([
                { test: ![C_.psPending, C_.psTranslation, C_.psProofreading, C_.psCheckPhase, C_.psReopened].includes(proj.STATUS),
                    message: "You can only inform the client about a late delivery for projects that are in progress." },
                { test: !utils.isValidEmail(proj.PROJECT_EMAIL),
                    message: "This quote does not have a valid project email set. Please correct this before sending the quote."},
            ])) return

            const division = proj.client().division()
            const text =
                "Dear client,\n\n" +
                "We are sending you this email because we need to inform you about the delivery of project " +
                proj.PROJECT_NUMBER +
                ". The delivery could be later than originally scheduled.\n\n" +
                "The reason for that is:\n\n" +
                "Estimated delay:\n\n" +
                "Expected delivery time:\n\n" +
                "We are working very hard to deliver ASAP.\n\n" +
                "Best regards,\n" +
                "Project Management Team\n" +
                division.EMAIL_SIGNATURE

            const response = await this.$showDialog({
                header: `Send email about late delivery of project ${proj.PROJECT_NUMBER}`,
                message: `Type your message to the client:`,
                textAreaText: text,
                blankTextWarning: "Please provide a text for the email",
                buttons: ["Cancel", "Send email"],
                buttonClasses: ["", "positive"]
            })

            if (response.selection === "Send email" && response.text) {
                cmg.sendEmail(division.EMAIL, proj.PROJECT_EMAIL, `Delivery of project "${proj.CLIENT_ORDER_NUMBER}" (no. ${proj.PROJECT_NUMBER})`, response.text)
                cmg.sendEmail(division.EMAIL, division.EMAIL, `Delivery of project "${proj.CLIENT_ORDER_NUMBER}" (no. ${proj.PROJECT_NUMBER}) (sent to client)`, response.text)
                cmg.updateObject(proj, "LATE_DELIVERY_INFORMED_COUNT", proj.LATE_DELIVERY_INFORMED_COUNT + 1)
            }
        },

        goToClient() {
            store.goToObject(this.project.client())
        },

        openFileInTemplateEditor() {
            if (this.project.TEMPLATE_EDITOR_LINK) utils.openURL(this.project.TEMPLATE_EDITOR_LINK)
        }
    },

    created() {
        this.tags = ["MAIL", "ON HOLD", "P", "NC", "QA", "C!", "WD", "CAT", "BIG"]
        this.C_ = C_
    },

    mounted() {
        tippy("#watch-flow", { content: "Project has watching flow" })
        tippy("#video-interpreting", { content: "Project is video interpreting" })
        tippy("#telephone-interpreting", { content: "Project is telephone interpreting" })
        tippy("#audio-translation", { content: "Project is audio translation" })
        tippy("#ai-translation", { content: "Project is AI transation" })
        tippy("#template-editing", { content: "Project is for a template editing" })
        tippy("#tag-TP", { content: "Project type (translate / proofread)" })
        tippy("#tag-P", { content: "Project has problem messages" })
        tippy("#monthly-invoice", { content: "Project is for monthly invoice" })
        for (let tag of this.tags) if (tag != "P") tippy(`#tag-${tag.replace("!", "")}`, { content: this.tagDescription(tag) })
    },

    watch: {
        project() {}
    }
}
</script>

<style scoped>
#main-overview-wrapper {
    padding: 0 20px 10px 20px;
}

#overview-wrapper {
    background: #ffffff;
    border: thin solid #d9e0ea;
    border-radius: 4px;
    width: 100%;
    padding: 8px 7px 0px 10px;
}

#tags-container {
    display: flex;
}

.tag-disabled {
    color: white !important;
    background-color: #c1e3ec !important;
}

.tag-hidden {
    display: none;
}

.tag-red {
    background-color: rgb(218, 100, 100) !important;
    padding-left: 9px !important;
    padding-right: 9px !important;
}

.tag {
    background-color: #00a4d3;
    border-radius: 3px;
    color: white;
    font-weight: 700;
    font-size: 11px;
    line-height: 9px;
    padding: 4px 5px 3px 5px;
    margin: 0 2px;
    cursor: default;
}

.status-button {
    display: inline-block;
    cursor: pointer;
}

.divider {
    display: inline-block;
}

.divider-flex {
    display: inline-block;
    flex: 1 1 auto;
}

#overview-details-wrapper {
    display: flex;
    padding-bottom: 10px;
}

#status-buttons-wrapper {
    height: 50px;
    margin-top: 10px;
    margin-right: 10px;
    background-image: url(/static/icons/Projects/Overview/Line.svg);
    display: flex;
}

.overview-claimed-tag {
    color: rgb(255, 255, 255);
    font-weight: 700;
    font-size: 12px;
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
    padding: 0 5px;
    margin-right: 1px;
    margin-left: 2px;
}

.overview-claimed-name {
    color: white;
    font-weight: 500;
    font-size: 11px;
    border-top-right-radius: 5px;
    border-bottom-right-radius: 5px;
    padding: 0 6px;
    margin-right: 2px;
}

.overview-claimed-tag.claimed-certification {
    background-color: rgb(47, 121, 121);
}

.overview-claimed-name.claimed-certification {
    background-color: rgb(61, 158, 158);
}

.overview-claimed-tag.claimed-issue {
    background-color: rgb(141, 70, 135);
}

.overview-claimed-name.claimed-issue {
    background-color: rgb(146, 101, 160);
}
</style>
