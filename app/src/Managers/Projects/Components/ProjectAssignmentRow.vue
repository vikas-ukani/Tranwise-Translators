<template lang="pug">
.project-assignment-row-wrapper(v-if="project.isDataLoaded" :class="{'grey-background': index % 2}")
    .column(@click="assignUnassignTranslation" :class="{clickable: canTranslate}")
        img(:src="iconPath + replyTranslationIcon")
    .column(@click="assignUnassignProofreading" :class="{clickable: canProofread}")
        img(:src="iconPath + replyProofreadingIcon")
    .column(@click="showReplyComments" :class="{clickable: translation.REPLY_COMMENTS && translation.REPLY_COMMENTS.trim()}")
        img(v-if="translation.REPLY_COMMENTS && translation.REPLY_COMMENTS.trim()" :src="iconPath + 'TranslationReplyComments.svg'")
    .column
        img(v-if="intermediateLanguageIcon" :src="iconPath + intermediateLanguageIcon")
    .column(@click="clickStatusText" :class="{clickable: statusTextIcon}")
        img(v-if="statusTextIcon" :src="iconPath + statusTextIcon")
    .column.clickable(@click="clickRating" :class="{clickable: ratingIcon}")
        img(v-if="ratingIcon" :src="ratingIcon")
    .column.clickable(@click="clickResponsiveness" :class="{clickable: responsivenessIcon}") 
        img(v-if="responsivenessIcon" :src="iconPath + responsivenessIcon" :style="{opacity: responsivenessIcon.includes('2') ? 0.5 : 1.0}") 
    .column.clickable(@click="showLateDeliveriesStatus" :class="{clickable: lateDeliveriesStatusIcon}")
        img(v-if="lateDeliveriesStatusIcon" :src="lateDeliveriesStatusIcon")
    .column.clickable(@click="clickEmployeeStatus" :class="{clickable: employeeStatusIcon}")
        img(:src="employeeStatusIcon")
    .column.column-preferred-translator {{ preferredTranslatorTag }}
    .column-employee-name(@contextmenu.prevent="contextMenuEmployee($event)") {{ employeeNameString }}
    .column-cat-tools {{ catToolsString }}
    .column-target-words.clickable(@click="editTargetWords") {{ translation.STATUS > 0 && translation.TARGET_WORDS != undefined ? translation.TARGET_WORDS + (translation.TARGET_WORDS < 1000 ? " wds" : " w") : "" }}
    .column-translation-price.clickable(@click="clickTranslationPrice") {{  translation.STATUS > 0 ? translation.translationPrice().toFixed(2) + "&nbsp;€" : "" }}
</template>

<script>
import { store, cmg, utils, constants as C_ } from "../../CoreModules"
import ProjectComponentsMixin from "./ProjectComponentsMixin"
import ProjectAssignmentDeadlinesRowMixin from "./ProjectAssignmentDeadlinesRowMixin"

export default {
    props: {
        translation: Object,
        subproject: Object,
        project: Object,
        index: Number // Used for alternating the colors of rows
    },

    data() {
        return {
            reactivityCounter: 0
        }
    },

    mixins: [ProjectComponentsMixin, ProjectAssignmentDeadlinesRowMixin],

    created() {
        this.iconPath = "/static/icons/Projects/Assignment/"
    },

    computed: {
        // this.translation can be either a TRANSLATIONS object or an EMPLOYEES object (for employees that didn't reply),
        // so calculate the true employee
        employee() {
            return this.translation.table === "EMPLOYEES" ? this.translation : this.translation.employee()
        },

        // These two functions, canTranslate and canProofread, return whether the translator could do it (based on the language pairs, native language,
        // intermediate language of the project). It doesn't reflect a negative reply. Even if the translator replied with No, these functions would
        // return true if the translator could perform the operation.
        canTranslate() {
            if (this.project.PROJECT_TYPE === C_.ptProofread) return false
            if (this.translation.table === "TRANSLATIONS") return true

            return (
                this.employee.hasLanguagePair(this.project.SOURCE_LANGUAGE_ID, this.subproject.LANGUAGE_ID) ||
                this.employee.hasLanguagePair(this.project.SOURCE_LANGUAGE_ID, this.subproject.INTERMEDIATE_LANGUAGE_ID) ||
                this.employee.hasLanguagePair(this.subproject.INTERMEDIATE_LANGUAGE_ID, this.subproject.LANGUAGE_ID)
            )
        },

        canProofread() {
            if (this.project.PROJECT_TYPE === C_.ptTranslate) return false
            // If the subproject has an intermediate language, proofreading can only be done for the second pair (intermediate -> target)
            if (this.subproject.INTERMEDIATE_LANGUAGE_ID) return this.intermediateLanguageIcon === "IntermediateLanguage2.svg"
            if (this.translation.table === "TRANSLATIONS") return true

            if (!this.employee.hasNativeLanguage(this.subproject.LANGUAGE_ID)) return false
            return (
                this.employee.hasLanguagePair(this.project.SOURCE_LANGUAGE_ID, this.subproject.LANGUAGE_ID) ||
                this.employee.hasLanguagePair(this.subproject.INTERMEDIATE_LANGUAGE_ID, this.subproject.LANGUAGE_ID) ||
                this.subproject.ALLOW_PROOFREADERS_SPECIAL
            )
        },

        replyTranslationIcon() {
            if (this.reactivityCounter) {
            }

            if (!this.canTranslate) return "TranslationReplyTBlank.svg"

            const tr = this.translation
            if (tr.STATUS === C_.tsTranslating) return "TranslationReplyTAssigned" + (tr.CONFIRMED ? ".svg" : "NotConfirmed.svg")
            if (tr.STATUS === C_.tsUnassignedTranslation) return "TranslationReplyTUnassigned.svg"
            if (tr.REPLY === C_.trNone || tr.REPLY === C_.trProofreading) return "TranslationReplyTNo.svg"
            if (tr.REPLY === C_.trBoth || tr.REPLY === C_.trTranslation) return "TranslationReplyTYes.svg"
            return "TranslationReplyTNone.svg"
        },

        replyProofreadingIcon() {
            if (this.reactivityCounter) {
            }

            if (!this.canProofread) return "TranslationReplyPBlank.svg"

            const tr = this.translation
            if (tr.STATUS === C_.tsProofreading) return "TranslationReplyPAssigned" + (tr.CONFIRMED ? ".svg" : "NotConfirmed.svg")
            if (tr.STATUS === C_.tsUnassignedProofreading) return "TranslationReplyPUnassigned.svg"
            if (tr.REPLY === C_.trNone || tr.REPLY === C_.trTranslation) return "TranslationReplyPNo.svg"
            if (tr.REPLY === C_.trBoth || tr.REPLY === C_.trProofreading) return "TranslationReplyPYes.svg"
            return "TranslationReplyPNone.svg"
        },

        intermediateLanguageIcon() {
            if (!this.subproject.INTERMEDIATE_LANGUAGE_ID) return ""
            if (!this.employee) return ""
            for (let el of store.employeesLanguages) {
                if (el.EMPLOYEE_ID != this.employee.PK) continue
                if (el.SOURCE_LANGUAGE_ID === this.project.SOURCE_LANGUAGE_ID && el.TARGET_LANGUAGE_ID === this.subproject.INTERMEDIATE_LANGUAGE_ID)
                    return "IntermediateLanguage1.svg"
                if (el.SOURCE_LANGUAGE_ID === this.subproject.INTERMEDIATE_LANGUAGE_ID && el.TARGET_LANGUAGE_ID === this.subproject.LANGUAGE_ID) return "IntermediateLanguage2.svg"
            }
            return ""
        },

        ratingIcon() {
            if (!this.employee) return ""
            const totalPoints = this.employee.PLUS_POINTS - this.employee.MINUS_POINTS
            if (isNaN(totalPoints)) return ""
            let result = "/static/icons/Employees/Rating"
            if (totalPoints > 0) result += "High"
            if (totalPoints < 0) result += "Low"
            if (totalPoints === 0) result += "Medium"
            if (this.employee.POINTS_COMMENTS) result += "Comments"
            return result + ".svg"
        },

        lateDeliveriesStatusIcon() {
            if (!this.employee) return ""
            if (Math.round(this.employee.LATE_DELIVERIES_STATUS / 100000) * 5 > this.employee.LATE_DELIVERIES_STATUS % 100000) return "/static/icons/Employees/LateTranslator.svg"
            return ""
        },

        preferredTranslatorTag() {
            if (!this.employee) return ""
            return this.employee.RATE_TRANSLATION <= 0.02 ? "P$" : ""
        },

        employeeNameString() {
            if (!this.employee) return ""
            const emp = this.employee
            const months = emp.monthsSinceLastLogin()
            return emp.fullNameFit() + (emp.IS_BELGIAN ? " [B]" : "") + (emp.IS_NEW_TRANSLATOR ? " [NEW]" : "") + (months >= 6 ? ` [${months}]` : "")
        },

        catToolsString() {
            if (!this.employee) return ""
            return this.employee.catToolsString()
        }
    },

    methods: {
        contextMenuEmployee(event) {
            this.$emit("showEmployeeContextMenu", event, this.employee, this.translation)
        },

        async unassignTranslation(translation, employee) {
            const response = await this.$showDialog({
                header: "Unassign " + employee.fullName(),
                message: `Type the reason why you are unassigning ${employee.fullName()} from this project, so the translator can see it.`,
                inputText: "",
                buttons: ["Cancel", "Unassign"],
                buttonClasses: ["", "negative"]
            })

            if (response.selection === "Unassign") {
                const newStatus = translation.STATUS === C_.tsTranslating ? C_.tsUnassignedTranslation : C_.tsUnassignedProofreading
                this.$set(translation, "STATUS", newStatus)
                this.reactivityCounter++
                cmg.updateObject(translation, "STATUS", newStatus)
                cmg.updateObject(translation, "UNASSIGN_REASON", response.text || "")
                cmg.updateObject(translation, "AMOUNT_CORRECTION_PERCENT", -100)

                // Add the action to the project's history
                store.addToProjectsHistory(
                    translation.subproject().project(),
                    newStatus === C_.tsUnassignedTranslation ? C_.phUnassignTranslator : C_.phUnassignProofreader,
                    `${employee.fullName()} from ${translation.subproject().languageName()}`
                )
            }
        },

        async unassignOrConfirmTranslation(translation) {
            const emp = store.employee(translation.EMPLOYEE_ID)
            if (!emp) return
            if (!translation.isAssigned()) return
            const translationString = translation.isTranslating() ? "translation" : "proofreading"

            let response = { selection: "Unassign" }

            // If the translation is not confirmed, ask the manager what they want to do (confirm or unassign)
            if (!translation.CONFIRMED) {
                response = await this.$showDialog({
                    header: "Unassign or confirm assignment?",
                    message: `${emp.fullName()} has not confirmed the assignment for ${translationString}.\n\nDo you want to confirm it or unassign the translator?`,
                    buttons: ["Cancel", "Unassign", "Confirm"],
                    buttonClasses: ["", "negative", "positive"]
                })
                await utils.delay(100)
            }

            if (response.selection === "Confirm") {
                this.$set(translation, "CONFIRMED", true)
                this.reactivityCounter++
                cmg.updateObject(translation, "CONFIRMED", true)
            }

            if (response.selection === "Unassign") {
                this.unassignTranslation(translation, emp)
            }
        },

        // Perform the actual assignment, after all the checks have been passed on assignTranslation()
        doAssignTranslation(translation, project, subproject, employee, theBadTranslation, forTranslation, forceFixedPrice) {
            // If the translation doesn't exist (ie. the translator didn't reply), create it
            if (!translation) {
                const newTranslation = {
                    table: "TRANSLATIONS",
                    EMPLOYEE_ID: employee.PK,
                    SUBPROJECT_ID: subproject.PK,
                    STATUS: forTranslation ? C_.tsTranslating : C_.tsProofreading,
                    CONFIRMED: project.STATUS === C_.psReopened,
                    PAYMENT_METHOD:
                        project.STATUS === C_.psReopened || forceFixedPrice ? C_.ptFixedPrice : forTranslation ? project.PAYMENT_TRANSLATOR : project.PAYMENT_PROOFREADER
                }
                if (theBadTranslation) newTranslation.PRICE = utils.roundPrice(theBadTranslation.translationPrice() * 0.15)
                if (forTranslation && newTranslation.PAYMENT_METHOD === C_.ptFixedPrice && project.TRANSLATOR_PRICE) newTranslation.PRICE = project.TRANSLATOR_PRICE
                if (forTranslation && newTranslation.PAYMENT_METHOD != C_.ptFixedPrice) newTranslation.PRICE = employee.RATE_TRANSLATION || 0
                if (!forTranslation && newTranslation.PAYMENT_METHOD === C_.ptFixedPrice && project.PROOFREADER_PRICE) newTranslation.PRICE = project.PROOFREADER_PRICE
                store.addToProjectsHistory(project, forTranslation ? C_.phAssignTranslator : C_.phAssignProofreader, `${employee.fullName()} for ${subproject.languageName()}`)
                cmg.insertObject(newTranslation)
            }

            // If the translation already exists, just update the values
            if (translation) {
                this.$set(translation, "STATUS", forTranslation ? C_.tsTranslating : C_.tsProofreading)
                this.reactivityCounter++
                cmg.updateObject(translation, "STATUS", forTranslation ? C_.tsTranslating : C_.tsProofreading)
                cmg.updateObject(translation, "TIME_ASSIGNED", "SERVER_TIME_TAG")
                if (translation.AMOUNT_CORRECTION_PERCENT === -100) cmg.updateObject(translation, "AMOUNT_CORRECTION_PERCENT", 0)
                cmg.updateObject(translation, "CONFIRMED", project.STATUS === C_.psReopened)

                let paymentMethod = forTranslation ? project.PAYMENT_TRANSLATOR : project.PAYMENT_PROOFREADER
                if (project.STATUS === C_.psReopened || forceFixedPrice) paymentMethod = C_.ptFixedPrice
                cmg.updateObject(translation, "PAYMENT_METHOD", paymentMethod)

                if (forTranslation && paymentMethod === C_.ptFixedPrice && project.TRANSLATOR_PRICE > 0 && translation.PRICE == 0)
                    cmg.updateObject(translation, "PRICE", project.TRANSLATOR_PRICE)
                if (forTranslation && paymentMethod != C_.ptFixedPrice && employee.RATE_TRANSLATION) cmg.updateObject(translation, "PRICE", employee.RATE_TRANSLATION)
                if (!forTranslation && paymentMethod === C_.ptFixedPrice && project.PROOFREADER_PRICE > 0 && translation.PRICE == 0)
                    cmg.updateObject(translation, "PRICE", project.PROOFREADER_PRICE)

                if (theBadTranslation) cmg.updateObject(translation, "PRICE", utils.roundPrice(theBadTranslation.translationPrice() * 0.15))
                else if (project.STATUS === C_.psReopened) cmg.updateObject(translation, "PRICE", 0)
                store.addToProjectsHistory(project, forTranslation ? C_.phAssignTranslator : C_.phAssignProofreader, `${employee.fullName()} for ${subproject.languageName()}`)
            }
        },

        // forTranslation is true if attempting to assign to translation or false if attempting to assign to proofreading
        async assignTranslation(translation, forTranslation) {
            let emp
            if (translation.table === "TRANSLATIONS") emp = store.employee(translation.EMPLOYEE_ID)
            if (translation.table === "EMPLOYEES") {
                emp = translation
                // Make the translation null, so that below we can check whether we have a TRANSLATIONS object or we are attempting
                // to assign an employee that didn't reply
                translation = null
            }
            if (!emp) return
            const forProofreading = !forTranslation
            const project = this.project
            const subproject = this.subproject

            if (project.STATUS === C_.psQuote) return this.$showMessage("Please convert this quote to a project before assigning translators to it.")
            if (project.STATUS === C_.psSetup) return this.$showMessage("Please set the status of this project to Pending before assigning translators to it.")

            // Check if trying to assign a translator for a PR-only project or vice-versa
            if (this.$checkWithMessage(forTranslation && project.PROJECT_TYPE === C_.ptProofread, "This is a Proofreading only project. You can't assign translators to it."))
                return

            if (this.$checkWithMessage(forProofreading && project.PROJECT_TYPE === C_.ptTranslate, "This is a Translation only project. You can't assign translators to it."))
                return

            // Compute all the translations assigned to this subproject
            const assignedTranslations = store.translations.filter(
                tr => tr.SUBPROJECT_ID === subproject.PK && tr.STATUS === (forTranslation ? C_.tsTranslating : C_.tsProofreading)
            )

            // If the project is not big or reopened or has an intermediate language, we can't assign more than one translator and one proofreader
            if (!project.IS_BIG && assignedTranslations.length && project.STATUS != C_.psReopened && !subproject.INTERMEDIATE_LANGUAGE_ID) {
                return this.$showMessage(
                    `This project is not marked as a big project. You are not allowed to assign more than one ` +
                        `${forTranslation ? "translator" : "proofreader"} for each target language.`
                )
            }

            // If the project is on hold, make sure we want to assign a translator
            if (project.IS_ON_HOLD) if (!(await this.$dialogCheck("This project is ON HOLD.\n\nAre you sure you want to assign this employee to it?"))) return

            // If the translator is not a preferred translator and at least one preferred translator replied, show a warning
            if (forTranslation && emp.RATE_TRANSLATION > 0.02) {
                let preferredReplies = ""
                for (let tr of store.translations) {
                    if (tr.SUBPROJECT_ID != subproject.PK) continue
                    if (tr.STATUS > 0) continue
                    if (tr.REPLY != C_.trTranslation && tr.REPLY != C_.trBoth) continue

                    const employee = store.employee(tr.EMPLOYEE_ID)
                    if (!employee) continue

                    if (employee.RATE_TRANSLATION <= 0.02) preferredReplies += employee.fullName() + "\n"
                }

                if (
                    preferredReplies &&
                    !(await this.$dialogCheck(
                        `The following preferred translators have replied to this project:\n\n${preferredReplies}\nAre you sure you want to assign ${emp.fullName()}, which is not a preferred translator?`
                    ))
                )
                    return
            }

            // The translation can be null if attempting to assign a translator that didn't reply
            // (ie. didn't create a TRANSLATIONS object). Check if we really want to do that.
            if (!translation) {
                const message = `${emp.fullName()} has not replied for ${forTranslation ? "translation" : "proofreading"}. Are you sure you want to assign ${emp.himHer()}?`
                if (!(await this.$dialogCheck(message))) return
            }

            // If the translation is not null (ie. the translator has replied)
            if (translation) {
                // Check if the translator was already assigned and unassigned later
                /* prettier-ignore */
                if (translation.STATUS === (forTranslation ? C_.tsUnassignedTranslation : C_.tsUnassignedProofreading))
                    if (!(await this.$dialogCheck(`${emp.fullName()} was unassigned from this job for the reason below. Are you sure you assign ${emp.himHer()} again?\n\n${translation.UNASSIGN_REASON}`))) return

                // Are you sure you want to assign a translator that replied No?
                if (![forTranslation ? C_.trTranslation : C_.trProofreading, C_.trBoth].includes(translation.REPLY))
                    if (!(await this.$dialogCheck(`You are attempting to assign a translator that didn't reply positively to this job. Are you sure you want to do this?`))) return

                // Make sure that's what we want, to move from doing translation to proofreading or vice-versa
                if (translation.STATUS === (forTranslation ? C_.tsProofreading : C_.tsTranslating)) {
                    const message =
                        `${emp.fullName()} is already assigned for ${forTranslation ? "proofreading" : "translation"}. ` +
                        `Are you sure you want to assign ${emp.himHer()} for ${forTranslation ? "translation" : "proofreading"} instead?`
                    if (!(await this.$dialogCheck(message))) return
                }
            }

            // If the project is reopened, select one of the current translators that did a bad job
            // and will have an amount deducted from their translation and added to the new translator
            if (project.STATUS === C_.psReopened) {
                // The translators to be show in the modal dialog's dropdown
                const employeesForSelect = assignedTranslations.map(tr => {
                    return { PK: tr.PK, NAME: store.fullName(tr.EMPLOYEE_ID) }
                })
                employeesForSelect.unshift({ PK: 0, NAME: "None" })

                // The message for the modal dialog
                const message =
                    `Select the ${forTranslation ? "translator" : "proofreader"} who should have 15% deducted from the payment.\n\n` +
                    `The deducted amount will be added to ${emp.fullName()}'s payment sheet.\n\n` +
                    `If you don't want to deduct 15% from any translator's payment, please select "None" and don't forget to set the payment amount of ${emp.fullName()}.`

                const response = await this.$showDialog({
                    message: message,
                    dropdownDefaultText: "Select an employee",
                    dropdownItems: employeesForSelect,
                    dropdownKey: "NAME",
                    dropdownField: "PK"
                })

                // If clicked Cancel on the modal dialog, cancel the process (don't make any assignment)
                if (response.selection !== "OK") {
                    this.$showMessage("No assignment has been made. Please try again and choose a valid option.")
                    return
                }

                // The bad translation is the translation that was selected in the dialog or undefined if None was selected
                const theBadTranslation = store.translation(response.value)
                if (theBadTranslation) {
                    const theBadEmployee = store.employee(theBadTranslation.EMPLOYEE_ID)
                    if (!theBadEmployee) return

                    // If the other translator confirmed the reopend project, make sure they want to deduct from them
                    if (theBadTranslation.CONFIRMED) {
                        const message =
                            `${theBadEmployee.fullName()} confirmed to work to solve the problem for the project.\n\n` +
                            `Are you sure you want to assign somebody else and deduct 15% from ${theBadEmployee.himHer()}?`
                        if (!(await this.$dialogCheck(message))) return
                    } else {
                        const message = `Are you sure you want to assign ${emp.fullName()} to correct this project and deduct 15% from the payment of ${theBadEmployee.fullName()}?`
                        if (!(await this.$dialogCheck(message))) return
                    }

                    // If the bad translator already has an amount correction, then the correction has to be dealt with manually
                    if (theBadTranslation.AMOUNT_CORRECTION !== 0 || theBadTranslation.AMOUNT_CORRECTION_PERCENT !== 0)
                        this.$showMessage(
                            `You have successfully assigned ${emp.fullName()} to correct this project and added 15% to their payment sheet.\n\n` +
                                `However, ${theBadEmployee.fullName()} already has an amount correction for this translation, ` +
                                `therefore the 15% can't be deducted from their payment. Please solve this problem manually.`
                        )
                    else cmg.updateObject(theBadTranslation, "AMOUNT_CORRECTION_PERCENT", -15)

                    cmg.updateObject(theBadTranslation, "UNASSIGNED_AFTER_REOPEN", true)
                    store.sendEmployeeMessage(theBadEmployee, `Someone else has been assigned to correct project ${project.PROJECT_NUMBER}. Please don't work on it anymore.`)
                } else {
                    // If None was selected for deduction
                    this.$showMessage(
                        `You have successfully assigned ${emp.fullName()} to correct this project.\n\n` +
                            `Since you haven't selected any translator to deduct 15% from, ${emp.fullName()}'s payment has been set to 0. ` +
                            `Please correct the price to match what the translator should receive for this correction.`
                    )
                }
                this.doAssignTranslation(translation, project, subproject, emp, theBadTranslation, forTranslation, false)
            }

            // If the project is not reopened (the reopened case is treated above)
            if (project.STATUS !== C_.psReopened) {
                let shouldUpdateToFixedPrice = assignedTranslations.length > 0 && subproject.INTERMEDIATE_LANGUAGE_ID === 0

                this.doAssignTranslation(translation, project, subproject, emp, null, forTranslation, shouldUpdateToFixedPrice)

                if (shouldUpdateToFixedPrice) {
                    assignedTranslations.forEach(tr => {
                        if (tr.PAYMENT_METHOD != C_.ptFixedPrice) cmg.updateObject(tr, "PAYMENT_METHOD", C_.ptFixedPrice)
                    })

                    this.$showMessage(
                        `Since there is more than one ${
                            forTranslation ? "translator" : "proofreader"
                        } assigned for this language, all their payments have been set to Fixed price.\n\n` +
                            `Please make sure to update the payment for each ${forTranslation ? "translator" : "proofreader"} accordingly.`
                    )
                }
            }
        },

        assignUnassignTranslation() {
            if (!this.canTranslate) return

            if (this.translation.table === "TRANSLATIONS" && this.translation.isTranslating()) this.unassignOrConfirmTranslation(this.translation)
            else if (this.project.PROJECT_TYPE === C_.ptProofread) return
            else this.assignTranslation(this.translation, true)
        },

        assignUnassignProofreading() {
            if (!this.canProofread) return

            if (this.translation.table === "TRANSLATIONS" && this.translation.isProofreading()) this.unassignOrConfirmTranslation(this.translation)
            else if (this.project.PROJECT_TYPE === C_.ptTranslate) return
            else this.assignTranslation(this.translation, false)
        },

        showReplyComments() {
            if (this.translation.REPLY_COMMENTS && this.translation.REPLY_COMMENTS.trim()) this.$showMessage("Employee's reply comments", this.translation.REPLY_COMMENTS)
        },

        async clickRating() {
            const emp = store.employee(this.translation.EMPLOYEE_ID)
            if (!emp) return
            let text = emp.POINTS_COMMENTS || ""
            if (text.trim()) text = "\n\n" + text.trim()

            const nameAndTime = `[ ${store.myself.fullName()} - ${utils.formatDate(store.serverTime(), "D MMM YYYY, HH:mm")}]\n\n`
            const nameAndTimeLength = nameAndTime.length // Used below to set the caret position

            text = `${nameAndTime}` + text

            const response = await this.$showDialog({
                header: `Comments about ${emp.fullName()}`,
                message:
                    `Add or edit the comments about this employee, then click the Save button.` +
                    `\n\n${emp.fullName()} has ${emp.PLUS_POINTS} plus points and ${emp.MINUS_POINTS} minus points.`,
                textAreaText: text,
                caretPosition: nameAndTimeLength,
                buttons: ["Cancel", "Save"],
                buttonClasses: ["", "positive"]
            })

            if (response.selection === "Save") cmg.updateObject(emp, "POINTS_COMMENTS", response.text)
        },

        clickEmployeeStatus() {
            const emp = store.employee(this.translation.EMPLOYEE_ID)
            if (emp) store.chatWithEmployee(emp)
        },

        showLateDeliveriesStatus() {
            const emp = store.employee(this.translation.EMPLOYEE_ID)
            if (!emp) return
            const lateCount = Math.round(emp.LATE_DELIVERIES_STATUS / 100000)
            const totalProjects = emp.LATE_DELIVERIES_STATUS % 100000
            this.$showMessage(`${emp.fullName()} was late for ${lateCount} out of ${totalProjects} projects.`)
        },

        async editTargetWords() {
            if (!this.translation.STATUS) return
            const emp = store.employee(this.translation.EMPLOYEE_ID)
            if (!emp) return

            const response = await this.$showDialog({
                message: `Target words for ${emp.fullName()}:`,
                inputText: this.translation.TARGET_WORDS
            })

            if (response.selection === "OK" && parseInt(response.text, 10) == response.text) {
                cmg.updateObject(this.translation, "TARGET_WORDS", parseInt(response.text, 10))
            }
        },

        async clickTranslationPrice() {
            if (!this.translation || !this.translation.STATUS) return
            const emp = store.employee(this.translation.EMPLOYEE_ID)
            if (!emp) return

            // prettier-ignore
            if (this.$checkWithMessage(this.translation.PAYMENT_SHEET_ID > 0, "You are not allowed to edit this price because this translation has already been added to a payment sheet.")) return
            let fixedPriceWarning = ""

            if (this.translation.PAYMENT_METHOD != C_.ptFixedPrice) fixedPriceWarning = "Warning! The payment of the translator will be changed to fixed price.\n\n"
            const response = await this.$showDialog({
                header: "Edit job price",
                message: `${fixedPriceWarning}Job price for ${emp.fullName()}:`,
                inputText: this.translation.translationPrice().toFixed(2)
            })

            if (response.selection !== "OK") return
            let floatValue = parseFloat(response.text)
            if (floatValue != response.text) return
            if (floatValue === this.translation.PRICE && floatValue != 0) return
            if (floatValue < 0) return
            floatValue = utils.roundPrice(floatValue)
            cmg.updateObject(this.translation, "PRICE", floatValue)
            cmg.updateObject(this.translation, "PAYMENT_METHOD", C_.ptFixedPrice)

            await utils.delay(100) // Wait for the other dialog to close

            const response2 = await this.$showDialog({
                header: "Inform the employee about the change",
                message: "If this change affects the employee's payment, please specify the reason, so we can inform them:",
                textAreaText: `Dear translator,\n\nWe have updated your payment for project ${
                    this.project.PROJECT_NUMBER
                }-${this.subproject.languageName()} to ${floatValue} euro for the following reason:\n\n`,
                buttons: ["Don't send any message", "Send message"],
                buttonClasses: ["", "positive"]
            })

            if (response2.selection === "Send message") store.sendEmployeeMessage(emp, response2.text)
        }
    }
}
</script>

<style scoped>
.project-assignment-row-wrapper {
    padding: 3px 10px;
    display: flex;
}

.grey-background {
    background-color: rgb(243, 248, 252);
}

.column {
    padding-top: 5px;
    width: 20px;
    text-align: center;
}

.column.clickable {
    cursor: pointer;
}

.column-employee-name {
    padding: 5px 10px;
    width: 230px;
    font-size: 11.5px;
    white-space: nowrap;
    overflow: hidden;
}

.column-cat-tools {
    padding: 5px 5px;
    width: 95px;
    font-size: 11px;
    color: rgb(77, 91, 114);
    white-space: nowrap;
}

.column-target-words {
    padding: 5px 5px;
    width: 55px;
    text-align: left;
    font-size: 11.5px;
    white-space: nowrap;
}

.column-translation-price {
    padding: 5px 5px;
    width: 70px;
    text-align: right;
    font-size: 11.5px;
    white-space: nowrap;
}

.column-preferred-translator {
    margin-left: 8px;
    font-size: 11px;
    font-weight: 700;
    color: rgb(51, 192, 51);
}
</style>
