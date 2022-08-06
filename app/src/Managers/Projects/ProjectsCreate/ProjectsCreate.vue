<template lang="pug">
div(style="width: 100%; background-color: white; padding: 20px")
    .ui.tw-size.form
        .ui.grid(v-show="!isConvertingPrequote" style="padding-bottom: 20px")
            .ui.eight.wide.column
                .fields.inline
                    .field
                        input(placeholder="Prequote code" v-model="prequoteCode" @keydown.enter="importPrequote" style="height: 34px !important")
                    .field
                        .ui.small.teal.button(@click="importPrequote") Import prequote
            .ui.eight.wide.column
                EmailManager(ref="EmailManager" @emailDataAvailable="setDataFromImportedEmail")
        h4.ui.dividing.header(style="padding-top: 0; margin-top: 0") Client information
        ClientSelector(ref="ClientSelector" :project="project" @projectsCreateHasSelectedClient="selectClient" :hideCreateButton="project.TWILIO_STATUS > 0")
        //- Project email and special instructions
        .fields
            .field.eight.wide
                TWDropdown(mandatory defaultText="Project email" ref="dropdownProjectEmail" :obj="project" field="PROJECT_EMAIL" :items="projectEmails" :change="updateProject" itemKey="EMAIL")
            .field.eight.wide
                TWInput(mandatory :obj="project" field="CLIENT_ORDER_NUMBER" placeholder="Client order number" :change="updateProject")
        .ui.form.warning(v-if="client && utils.isNotBlank(client.SPECIAL_INSTRUCTIONS)")
            .ui.warning.message(style="white-space: pre-wrap")
                .header Client has instructions for us
                p {{ client.SPECIAL_INSTRUCTIONS }}
            p
        h4.ui.dividing.header Project information
        .field
            .ui.grid
                .ui.six.wide.column
                    .inline.fields(style="margin: 10px 0")
                        .field
                            TWCheckbox.toggle(label="Translate" :obj="project" field="isTranslation" :change="updateProject")
                        .field
                            TWCheckbox.toggle(label="Proofread" :obj="project" field="isProofreading" :change="updateProject" style="padding-left: 16px !important")
                    .inline.fields(style="margin: 15px 0")
                        .field
                            TWCheckbox(label="Video interpreting" :obj="project" field="VIDEO_INTERPRETING_STATUS" :change="onClickVideoInterpreting")
                        .field
                            TWCheckbox(label="Telephone interpreting" :obj="project" field="TELEPHONE_INTERPRETING_STATUS" :change="onClickVideoInterpreting")
                    .fields.inline(v-show="this.showSourceWordsSection()" style="margin-top: 20px")
                        .field
                            .ui.right.labeled.input
                                TWInput(:mandatory="this.showSourceWordsSection()" integer :obj="project" field="SOURCE_WORDS" placeholder="Source" :change="updateProject" style="width: 70px")
                                .ui.basic.label words
                        .field
                            TWCheckbox(label="Not countable" :obj="project" field="SOURCE_WORDS_NOT_COUNTABLE" :change="onClickSourceWordsNotCountable")
                    .ui.pointing.orange.basic.label(v-show="project.SOURCE_WORDS_NOT_COUNTABLE") The payment for translators was set to Fixed price
                .ui.four.wide.column
                    .inline.fields(style="margin-top: 10px")
                        .field
                            TWCheckbox(label="Certified" :obj="project" :change="onClickCertifiedNotarized" field="IS_CERTIFIED")
                        .field(style="margin-left: 20px")
                            TWCheckbox(label="Notarized" :obj="project" :change="onClickCertifiedNotarized" field="IS_NOTARIZED")

                    .inline.fields(style="margin: 15px 0")
                        .field
                            TWCheckbox(label="Audio translation" :obj="project" field="AUDIO_TRANSLATION_STATUS" :change="onClickVideoInterpreting")
                        .field
                            TWCheckbox(label="AI translation" :obj="project" field="AI_TRANSLATION_STATUS" :change="onClickVideoInterpreting")



                    .field(style="margin-top: 20px")
                        TWCheckbox(v-if="project.IS_CERTIFIED" label="Digital certification" :obj="project" :change="updateProject" field="DIGITAL_CERTIFICATION_STATUS")
                .ui.six.wide.column.right.aligned
                    .field(style="display: flex")
                        div(style="flex-grow: 1")
                        TWDropdown(ref="dropdownAreaOfExpertise" mandatory zeroBased defaultText="Area of expertise" :obj="project" field="AREA_OF_EXPERTISE" :items="C_.areasOfExpertise" :change="updateProject" itemKey="AREA" style="width: 200px")
                    .field.inline(style="margin: 10px 0")
                        TWInput(mandatory :obj="project" placeholder="Responsible manager" field="RESPONSIBLE_MANAGER" :change="updateProject" style="width: 200px")
        h4.ui.dividing.header Comments
            i.caret.down.grey.icon.clickable(style="padding-left: 10px" @click="toggleArea('Comments')")
        .field(v-show="!hiddenAreas.includes('Comments')")
            .two.fields
                .field
                    label Email contents
                    TWTextArea(:rows="4" :obj="project" :value="emailBody")
                .field
                    label Quote comments
                    TWTextArea(:rows="4" :obj="project" field="QUOTE_COMMENTS" :change="updateProject")
        h4.ui.dividing.header Instructions
            i.caret.down.grey.icon.clickable(style="padding-left: 10px" @click="toggleArea('Instructions')")
        .field(v-show="!hiddenAreas.includes('Instructions')")
            .two.fields
                .field
                    label Instructions for project managers
                    TWTextArea(:rows="4" :obj="project" field="WORK_DETAILS" :change="updateProject")
                .field
                    label Instructions for translators
                    TWTextArea(:rows="4" :obj="project" field="SPECIAL_INSTRUCTIONS" :change="updateProject")
        h4.ui.dividing.header Language pairs
        .field
            .fields
                .field.five.wide
                    TWDropdown(mandatory search defaultText="Source language" :obj="project" field="SOURCE_LANGUAGE_ID" :items="store.languages" :change="updateProject" itemKey="LANGUAGE")
                .field.one.wide(style="padding-top: 8px") &nbsp;&nbsp;into
                .field.five.wide
                    TWDropdown(ref="dropdownTargetLanguage" search allowSelectionOfSameValue defaultText="Target language" :obj="project" field="" :items="store.languages" :change="addTargetLanguage" itemKey="LANGUAGE")
        .field
            .target-languages-wrapper
                p  {{ targetLanguages.length ? "Target languages:" : "Add target languages using the selector above &nbsp;&nbsp;&nbsp;↑"}}
                .ui.violet.label(v-for="tLang in targetLanguages") {{ tLang.LANGUAGE }}
                    i.delete.icon(@click="deleteTargetLanguage(tLang.PK)")
        h4.ui.dividing.header(v-show="project.IS_CERTIFIED && !project.WEBSITE_ORDER_ID") Certificate type
        .field(v-show="project.IS_CERTIFIED && !project.WEBSITE_ORDER_ID")
            .fields
                .field.four.wide
                    TWDropdown(showall :mandatory="project.IS_CERTIFIED && !project.WEBSITE_ORDER_ID" defaultText="Certificate type" :obj="project" field="CERTIFICATE_TYPE" :items="C_.certificateTypes" :change="updateProject" itemKey="CERTIFICATE_TYPE")
                .field.three.wide(v-show="project.CERTIFICATE_TYPE === 100")
                    TWInput(:obj="project" defaultValue="Certificate type" field="CERTIFICATE_TYPE_OTHER" :change="updateProject")
                .field.five.wide
                    TWDropdown(:mandatory="project.IS_CERTIFIED && !project.WEBSITE_ORDER_ID" search defaultText="Certificate country" :obj="project" field="CERTIFICATE_COUNTRY" :change="updateProject" :items="store.countries" itemKey="COUNTRY")
                .field.four.wide
                    .ui.button.teal.basic.tiny(v-if="hasCertificateTemplate && certificateTemplatesLinks" @click="showCertificateTemplate" style="height: 32px !important") Show template
                    div(v-else style="padding-top: 7px") No template found
            .fields
                .field
                    TWCheckbox(label="Translation has to be added to the template tool and shop" :obj="project" :change="updateProject" field="shouldSendEmailAboutTemplate")
        h4.ui.dividing.header(v-show="!project.VIDEO_INTERPRETING_STATUS") CAT Information
            i.caret.down.grey.icon.clickable(style="padding-left: 10px" @click="toggleArea('CATInformation')")
        CATTools(v-show="!project.VIDEO_INTERPRETING_STATUS && !hiddenAreas.includes('CATInformation')" :project="project" :updateProjectAction="onChangeCATTools")
        h4.ui.dividing.header Deadlines
        .fields
            .field.five.wide
                label Project
                TWCalendar(:obj="project" mandatory placeholder="Project deadline" field="DEADLINE" :change="updateProject")
            .field.one.wide(style="display: flex")
                DeadlinesOverview(ref="DeadlinesOverview" v-if="project.DEADLINE" position="right" :date="project.DEADLINE" style="align-self: flex-end; margin-left: -10px")
            .field.five.wide
                label Translator
                TWCalendar(:obj="project" :mandatory="project.isTranslation" placeholder="Translator deadline" field="DEADLINE_TRANSLATOR" :change="updateProject" :disabled="!project.isTranslation")
            .field.five.wide
                label Proofreader
                TWCalendar(:obj="project" :mandatory="project.isProofreading" placeholder="Proofreader deadline" field="DEADLINE_PROOFREADER" :change="updateProject" :disabled="!project.isProofreading")
        .ui.grid
            .ui.eight.wide.column(style="padding-top: 30px")
                h4.ui.dividing.header Pricing (client)
                .fields.inline
                    .field
                        .ui.right.labeled.input(style="width: 100px")
                            TWInput(integer :obj="project" field="REQUIRED_PREPAYMENT_PERCENT" placeholder="Prepayment" :change="updateProject" style="text-align: right")
                            .ui.basic.label %
                    .field
                        label(v-if="client.NO_PREPAID_QUOTES" style="padding-left: 40px; color: #CDA500") * No prepayment for this client
                        label(v-else-if="client.PAYS_BY_CHECK" style="padding-left: 40px; color: #CDA500") * Client pays by check (no prepayment)
                        label(v-else-if="client.REQUIRES_PREPAYMENT" style="padding-left: 40px; color: #CDA500") * Client requires 100% prepayment
                Pricing(ref="pricingSection" :project="project" :updateProjectAction="updateProject")
            .ui.eight.wide.column(style="padding-top: 30px")
                    h4.ui.dividing.header Payment (translators & proofreaders)
                    .two.fields
                        .field
                            TWDropdown(defaultText="Translator" :mandatory="project.isTranslation" :obj="project" field="PAYMENT_TRANSLATOR" :items="C_.translatorPayments" :change="onChangePaymentTranslator" itemKey="PAYMENT")
                        .field
                            TWDropdown(defaultText="Proofreader" :mandatory="project.isProofreading" :obj="project" field="PAYMENT_PROOFREADER" :items="C_.translatorPayments" :change="onChangePaymentTranslator" itemKey="PAYMENT")
                    .two.fields
                        .field
                            TWInput(v-if="project.PAYMENT_TRANSLATOR === C_.ptFixedPrice" float :obj="project" field="TRANSLATOR_PRICE" placeholder="Translator job price" :change="updateProject" style="text-align: right")
                        .field
                            TWInput(v-if="project.PAYMENT_PROOFREADER === C_.ptFixedPrice" float :obj="project" field="PROOFREADER_PRICE" placeholder="Proofreader job price" :change="updateProject" style="text-align: right")
                    //- This part was used for shipping. Not used anymore.
                    //- h4.ui.dividing.header(v-if="project.IS_CERTIFIED") Shipping
                    //- .field(v-if="project.IS_CERTIFIED")
                        .field
                            TWDropdown(defaultText="Shipping" :obj="project" field="SHIPPING_METHOD" :items="C_.shippingMethods" :change="updateProject" itemKey="METHOD")
                        .fields.inline
                            .ui.right.labeled.input
                                TWInput(float :obj="project" field="SHIPPING_COST" placeholder="Shipping cost" :change="updateProject" style="width: 15px; text-align: right")
                                .ui.basic.label(style="width: 30px") {{ C_.currencySymbols[project.CURRENCY] || "" }}
                            .ui.button.basic.teal.small(style="margin-left: 30px" @click="editShippingAddress") Edit&nbsp;shipping&nbsp;address
        h4.ui.dividing.header Additional settings
            i.caret.down.grey.icon.clickable(style="padding-left: 10px" @click="toggleArea('AdditionalSettings')")
        .fields(v-show="!hiddenAreas.includes('AdditionalSettings')")
            .field.five.wide
                .grouped.fields
                    .field
                        TWCheckbox(label="High priority" :obj="project" :change="updateProject" field="priority")
                    .field
                        TWCheckbox(label="Big project" :obj="project" :change="updateProject" field="IS_BIG")
                    .field
                        TWCheckbox(label="Watch flow" :obj="project" :change="updateProject" field="IS_PROGRESS_WATCHED")
            .field.seven.wide
                .grouped.fields
                    .field
                        TWCheckbox(label="Has PDF files" :obj="project" :change="updateProject" field="HAS_PDF_FILES")
                    .field
                        TWCheckbox(label="Requires support assistance" :obj="project" :change="onClickRequiresSupportAssistance" field="REQUIRES_SUPPORT_ASSISTANCE")
                    .field
                        TWCheckbox(label="Has reference material" :obj="project" :change="updateProject" field="HAS_REFERENCE_MATERIAL_AVAILABLE")
            .field.four.wide
                .grouped.fields
                    .field
                        TWCheckbox(label="Twilio project" :obj="project" :change="updateProject" field="TWILIO_STATUS")
        br
        div(v-if="1 || files.length" style="text-align: right; margin-bottom: -40px")
            .ui.basic.teal.button.tiny(@click="deleteImageFiles") Delete image files
        h4.ui.dividing.header(v-show="!project.VIDEO_INTERPRETING_STATUS") Files
        FileManager(v-show="!project.VIDEO_INTERPRETING_STATUS" :files="files")
        .ui.yellow.message(v-if="Object.keys(warnings).length" style="padding-top: 10px")
            .header Warnings
            ul.list
                li(v-for="warning in warnings") {{ warning }}
        .ui.red.message(v-if="Object.keys(errors).length" style="padding-top: 10px")
            .header Please correct the following errors:
            ul.list
                li(v-for="error in errors") {{ error }}
        h4.ui.dividing.header
        .fields(style="align-items: center")
            .field.six.wide
                .ui.button(@click="cancelQuoteCreation") Cancel
                .ui.purple.button(@click="saveDraft" style="margin-left: 10px") Save draft
            .field.seven.wide(style="text-align: right")
                TWCheckbox.toggle(ref="checkboxShouldSaveDetails" label="Save details" )
            .field.three.wide(style="text-align: right")
                .ui.button.green(@click="createQuote") Create quote
    .actions
        .ui.button.positive.dummy-quote-button(style="display: none")

</template>

<script>
import { store, cmg, constants as C_, utils } from "../../CoreModules"
import CoreMixin from "../../../Shared/Mixins/CoreMixin"
import CoreMixinManagers from "../../Mixins/CoreMixinManagers"
import ClientSelector from "./ProjectsCreateClientSelector"
import FileManager from "./ProjectsCreateFileManager"
import EmailManager from "./ProjectsCreateImportEmail"
import Pricing from "../Components/ProjectPricing"
import CATTools from "../Components/ProjectCATTools"
import DeadlinesOverview from "../Components/ProjectDeadlinesOverview"
import isFreeEmail from "./freeEmailDomains"

export default {
    mixins: [CoreMixin, CoreMixinManagers],

    components: { FileManager, EmailManager, ClientSelector, Pricing, CATTools, DeadlinesOverview },

    data() {
        return {
            project: {},
            client: {},
            prequote: {},
            prequoteCode: "",
            isConvertingPrequote: false,
            emailBody: "",
            targetLanguages: [],
            certificateTemplates: [],
            files: [],
            hasMandatoryProblems: false,
            warnings: {},
            errors: {},
            hiddenAreas: []
        }
    },

    created() {
        this.C_ = C_
    },

    computed: {
        projectEmails() {
            if (!this.client || !this.client.EMAILS) return []
            let emails = []
            this.client.EMAILS.replace(/\r\n/g, "\n")
                .split("\n")
                .forEach(emailRaw => {
                    const email = utils.getEmailAddress(emailRaw)
                    if (email && utils.isValidEmail(email) && !emails.includes(email)) emails.push(email)
                })
            return emails.map(email => {
                return { PK: email, EMAIL: email }
            })
        },

        certificateTemplatesLinks() {
            let s = ""
            this.certificateTemplates.forEach(template => {
                if (template.SOURCE_LINK && template.TARGET_LINK) s += `Source template: ${template.SOURCE_LINK}\n\nTarget template: ${template.TARGET_LINK}\n\n`
            })
            return s
        },

        hasCertificateTemplate() {
            this.certificateTemplates.splice(0)
            if (!this.targetLanguages.length) return false
            const targetLanguageID = store.languageWithName(this.targetLanguages[0].LANGUAGE).PK

            store.certificateTemplates.forEach(c => {
                if (c.CERTIFICATE_TYPE != this.project.CERTIFICATE_TYPE) return
                if (c.COUNTRY_ID != this.project.CERTIFICATE_COUNTRY) return
                if (c.SOURCE_LANGUAGE_ID != this.project.SOURCE_LANGUAGE_ID) return
                if (c.TARGET_LANGUAGE_ID === targetLanguageID) this.certificateTemplates.push(c)
            })

            this.certificateTemplates.forEach(template => {
                if (template.SOURCE_LINK === undefined || template.TARGET_LINK === undefined) {
                    cmg.requestObject(template, "CERTIFICATE_TEMPLATES_DETAILS")
                }
            })

            return this.certificateTemplates.length
        }
    },

    methods: {
        deleteAllKeys(object) {
            Object.keys(object).forEach(key => {
                this.$delete(object, key)
            })
        },

        resetForm(draftToLoad) {
            this.$refs.ClientSelector.reset()

            this.deleteAllKeys(this.project)
            this.deleteAllKeys(this.errors)
            this.deleteAllKeys(this.warnings)

            // Set some default values on the project
            this.updateProject("isTranslation", true)
            this.updateProject("RESPONSIBLE_MANAGER", store.myself.FIRST_NAME)
            this.updateProject("AREA_OF_EXPERTISE", 0)
            this.updateProject("REQUIRED_PREPAYMENT_PERCENT", 100)

            this.$refs.checkboxShouldSaveDetails.setChecked(false)
            this.client = {}
            this.prequote = {}
            this.isConvertingPrequote = false
            this.prequoteCode = ""
            this.emailBody = ""
            this.textForSupportTeam = null
            this.targetLanguages.splice(0)
            this.files.splice(0)
            this.$refs.dropdownTargetLanguage.reset()
            this.didSendQuoteToServer = false

            this.hiddenAreas = []

            this.$nextTick(() => {
                this.$refs.dropdownAreaOfExpertise.setText("General")

                // Initialize the deadline calendars
                this.$children.forEach(child => child.$vnode.tag.includes("TWCalendar") && child.initialize())

                // Reset the mandatory fields' class, so they are not highlighted
                for (let child of this.$children) if (child.highlightMandatory) child.highlightMandatory(false)

                if (draftToLoad) this.loadDraft(draftToLoad)
            })
        },

        resetForPrequote(prequote) {
            this.resetForm()
            this.prequote = prequote
            this.isConvertingPrequote = true
            if (prequote.STATUS === C_.pqPending) {
                cmg.updateObject(prequote, "STATUS", C_.pqSetup)
                cmg.updateObject(prequote, "WORKING_MANAGER_NAME", store.myself.FIRST_NAME.slice(0, 40))
            }
            this.updateProjectDetailsFromPrequote(prequote)
        },

        initializeCalendars() {
            // Initialize the deadline calendars
            setTimeout(() => this.$children.forEach(child => child.$vnode.tag.includes("TWCalendar") && child.initialize()), 500)
        },

        toggleArea(areaName) {
            const index = this.hiddenAreas.indexOf(areaName)
            if (index >= 0) this.hiddenAreas.splice(index, 1)
            else this.hiddenAreas.push(areaName)
        },

        loadDraft(draft) {
            Object.keys(draft.project).forEach(key => {
                this.updateProject(key, draft.project[key])
            })

            draft.targetLanguages && draft.targetLanguages.forEach(tl => this.targetLanguages.push(tl))
            draft.files && draft.files.forEach(file => this.files.push(file))
            this.client = draft.client || {}
            if (this.project.CLIENT_ID) this.$refs.ClientSelector.selectClient(this.project.CLIENT_ID)
            else {
                this.$refs.ClientSelector.reset()
                this.project.PROJECT_EMAIL = ""
            }
            this.prequote = draft.prequote || {}
            this.prequoteCode = draft.prequoteCode
            this.emailBody = draft.emailBody
            this.textForSupportTeam = draft.textForSupportTeam

            if (this.project.IS_CERTIFIED || this.project.IS_NOTARIZED) {
                this.hiddenAreas = ["Comments", "CATInformation", "AdditionalSettings"]
                if (!this.project.WORK_DETAILS && !this.project.SPECIAL_INSTRUCTIONS) this.hiddenAreas.push("Instructions")
            }
        },

        cancelQuoteCreation() {
            if (this.prequote && this.prequote.STATUS === C_.pqSetup) cmg.updateObject(this.prequote, "STATUS", C_.pqPending)
            store.draftQuote = null
            this.$refs.EmailManager.cancelImport()

            // This triggers the closing of the form
            $(".dummy-quote-button").click()
        },

        saveDraft() {
            store.draftQuote = {
                project: { ...this.project },
                client: this.client,
                prequote: this.prequote,
                prequoteCode: this.prequoteCode,
                emailBody: this.emailBody,
                textForSupportTeam: this.textForSupportTeam,
                targetLanguages: [...this.targetLanguages],
                files: [...this.files],
                certificateTemplates: this.certificateTemplates
            }

            // This triggers the closing of the form
            $(".dummy-quote-button").click()
        },

        editShippingAddress() {
            // Not used anymore
        },

        createInitialService(serviceType, cost) {
            return {
                table: "PROJECTS_SERVICES",
                PROJECT_ID: 0,
                SERVICE_TYPE: serviceType,
                COST: cost,
                WAS_INITIAL: true
            }
        },

        createQuote() {
            const p = this.project
            // Check the mandatory fields
            for (let child of this.$children) {
                if (child.highlightMandatory && child.highlightMandatory()) {
                    if (!this.errors.mandatory) this.$set(this.errors, "mandatory", "Fill in all the mandatory fields")
                }
            }

            if (!p.CLIENT_ID) this.$set(this.errors, "clientMissing", "Select a client")
            else this.$delete(this.errors, "clientMissing")

            if (!this.targetLanguages.length) this.$set(this.errors, "targetLanguages", "Add at least one target language")
            else this.$delete(this.errors, "targetLanguages")

            // Set the PROJECT_TYPE
            if (p.isTranslation && p.isProofreading) p.PROJECT_TYPE = C_.ptTranslateProofread
            else if (p.isTranslation) p.PROJECT_TYPE = C_.ptTranslate
            else if (p.isProofreading) p.PROJECT_TYPE = C_.ptProofread
            else p.PROJECT_TYPE = 0

            if (!p.PROJECT_TYPE) this.$set(this.errors, "projectType", "Select either Translation or Proofreading or both")
            else this.$delete(this.errors, "projectType")

            if (!p.CURRENCY) this.$set(this.errors, "projectCurrency", "Select the currency")
            else this.$delete(this.errors, "projectCurrency")

            if (p.IS_CERTIFIED && !p.CERTIFIED_PAYMENT_METHOD) this.$set(this.errors, "certifiedPayment", "Select the pricing method")
            else this.$delete(this.errors, "certifiedPayment")

            if (!p.IS_CERTIFIED && !p.PAYMENT_CLIENT) this.$set(this.errors, "regularPayment", "Select the pricing method")
            else this.$delete(this.errors, "regularPayment")

            if (p.REQUIRED_PREPAYMENT_PERCENT < 0 || p.REQUIRED_PREPAYMENT_PERCENT > 100)
                this.$set(this.errors, "requiredPrepayment", "Select a value between 0 and 100 for Prepayment")
            else this.$delete(this.errors, "requiredPrepayment")

            // If there is at least one error, return
            for (let key of Object.entries(this.errors)) return

            // Prevent clicking the button twice
            if (this.didSendQuoteToServer) return
            this.didSendQuoteToServer = true

            if (p.REQUIRED_PREPAYMENT_PERCENT === undefined) this.updateProject("REQUIRED_PREPAYMENT_PERCENT", 0)

            // Set some deadlines to 0 if the project doesn't have that type (translation / proofreading)
            if (![C_.ptTranslate, C_.ptTranslateProofread].includes(p.PROJECT_TYPE)) p.DEADLINE_TRANSLATOR = 0
            if (![C_.ptProofread, C_.ptTranslateProofread].includes(p.PROJECT_TYPE)) p.DEADLINE_PROOFREADER = 0

            if (!p.PRICE) this.updateProject("PRICE", 0)

            if (!p.IS_CERTIFIED) {
                this.$delete(p, "CERTIFICATE_TYPE")
                this.$delete(p, "CERTIFICATE_TYPE_OTHER")
                this.$delete(p, "CERTIFICATE_COUNTRY")
            }

            if (p.IS_CERTIFIED) {
                this.updateProject("PRICE_PER_PRINT_COPY", 10)
                this.updateProject("PAYMENT_CLIENT", C_.ptFixedPrice)
            }

            if (isFreeEmail(p.PROJECT_EMAIL) || this.client.REQUIRES_PREPAYMENT || p.TWILIO_STATUS > 0) this.updateProject("REQUIRED_PREPAYMENT_PERCENT", 100)

            if (!p.REQUIRED_PREPAYMENT_PERCENT && p.SOURCE_WORDS * this.targetLanguages.length >= 10000 && p.PROJECT_TYPE != C_.ptProofread)
                this.updateProject("REQUIRED_PREPAYMENT_PERCENT", 50)
            if (this.client.NO_PREPAID_QUOTES) this.updateProject("REQUIRED_PREPAYMENT_PERCENT", 0)
            if (p.REQUIRED_PREPAYMENT_PERCENT) this.updateProject("PREPAYMENT_STATUS", C_.ppsPrepaymentPending)
            // once the project is created, the payment details will be inserted based on this flag.
            let addPayment = false
            if (p.WEBSITE_ORDER_ID) {
                if (this.prequote.PAYMENT_METHOD) {
                    this.updateProject("PREPAYMENT_STATUS", C_.ppsPrepaymentDone)
                    addPayment = true
                } else {
                    this.updateProject("PREPAYMENT_STATUS", C_.ppsPrepaymentPending)
                }
            }

            // Not used anymore
            // if (p.SHIPPING_METHOD) this.updateProject("SHOULD_BE_SENT_BY_POST", true)

            this.updateProject("SHOULD_BE_SENT_BY_POST", false)
            this.updateProject("CLIENT_ORDER_NUMBER", utils.returnsToSpaces(this.project.CLIENT_ORDER_NUMBER))
            if (p.VIDEO_INTERPRETING_STATUS || p.TELEPHONE_INTERPRETING_STATUS || p.AUDIO_TRANSLATION_STATUS || p.AI_TRANSLATION_STATUS) {
            //if (p.VIDEO_INTERPRETING_STATUS) {
                this.updateProject("SOURCE_WORDS", 0)
                this.updateProject("IS_CERTIFIED", false)
                this.updateProject("IS_NOTARIZED", false)
                this.updateProject("DIGITAL_CERTIFICATION_STATUS", 0)
                this.updateProject("PAYMENT_TRANSLATOR", C_.ptFixedPrice)
                this.updateProject("PAYMENT_PROOFREADER", C_.ptFixedPrice)
            }

            if (!p.PAYMENT_PROOFREADER) p.PAYMENT_PROOFREADER = p.PAYMENT_TRANSLATOR
            if (!p.PAYMENT_TRANSLATOR) p.PAYMENT_TRANSLATOR = p.PAYMENT_PROOFREADER

            let initialServicesCost = 0
            if (p.IS_NOTARIZED) initialServicesCost += 20
            if (p.DIGITAL_CERTIFICATION_STATUS) initialServicesCost += 10
            this.updateProject("INITIAL_SERVICES_COST", initialServicesCost)

            // If we have a prequote, copy all its SHIPPING_* fields to the project
            if (this.prequote.PK) for (let [key, value] of Object.entries(this.prequote)) if (key.startsWith("SHIPPING_")) this.updateProject(key, value)

            // Add the message for the support team
            if (this.textForSupportTeam) {
                const projectMessage = {
                    table: "PROJECTS_MESSAGES",
                    PROJECT_ID: 0,
                    SENDER: store.myself.PK,
                    RECIPIENT: "DM",
                    MESSAGE: this.textForSupportTeam,
                    IS_PROBLEM: true
                }
            }

            // Set the prequote as completed
            if (this.prequote.PK) cmg.updateObject(this.prequote, "STATUS", C_.pqCompleted)

            // Create the subprojects
            const subprojects = []
            this.targetLanguages.forEach(tl => subprojects.push({ table: "SUBPROJECTS", PROJECT_ID: 0, LANGUAGE_ID: tl.PK }))

            p.table = "PROJECTS"
            p.children = [...subprojects]

            // Add the message for the support team
            let projectMessageForSupportTeam
            if (this.textForSupportTeam) {
                projectMessageForSupportTeam = {
                    table: "PROJECTS_MESSAGES",
                    PROJECT_ID: 0,
                    SENDER: store.myself.PK,
                    RECIPIENT: "DM",
                    MESSAGE: this.textForSupportTeam,
                    IS_PROBLEM: true
                }
                p.children.push(projectMessageForSupportTeam)
            }

            // Add services
            if (p.DIGITAL_CERTIFICATION_STATUS) p.children.push(this.createInitialService(C_.psDigitalCertification, 10))
            if (p.IS_NOTARIZED) p.children.push(this.createInitialService(C_.psNotarization, 20))

            if (this.client.overdueInvoicesCount >= 2) {
                const text = `Client ${this.client.CLIENT_NAME} has ${this.client.overdueInvoicesCount} overdue invoices`
                cmg.sendEmail("SYSTEM_EMAIL", "GENERAL_MANAGER_EMAIL", `Tranwise: ${text}`, text + ".")
            }

            if (this.$refs.checkboxShouldSaveDetails.isChecked()) {
                store.draftQuote = {
                    project: { ...this.project },
                    client: this.client,
                    emailBody: this.emailBody,
                    textForSupportTeam: this.textForSupportTeam,
                    targetLanguages: [],
                    files: [...this.files],
                    certificateTemplates: this.certificateTemplates
                }
            } else store.draftQuote = null

            // Insert the project and wait for it to be inserted so we can upload the files
            cmg.insertObject(p).then(insertedProject => {
                this.$emit("receivedInsertedProject", insertedProject)
                if (addPayment) {
                    const payment = {
                        table: "PROJECTS_PAYMENTS",
                        PROJECT_ID: insertedProject.PK,
                        AMOUNT: this.prequote.PAYMENT_TOTAL_PRICE,
                        DATE: this.prequote.PAYMENT_DATE,
                        PAYMENT_ID: this.prequote.TRANSACTION_ID,
                        EMAIL: this.prequote.PROJECT_EMAIL,
                        METHOD: this.prequote.PAYMENT_METHOD
                    }
                    cmg.insertObject(payment)
                }
                if (p.shouldSendEmailAboutTemplate)
                    cmg.sendEmail("SYSTEM_EMAIL", "GENERAL_MANAGER_EMAIL", `Tranwise: Add project ${insertedProject.PROJECT_NUMBER} to template shop`, `Tranwise: Add project ${insertedProject.PROJECT_NUMBER} to template shop`)

                // Upload the files
                let count = 1
                this.files.forEach(file => {
                    setTimeout(() => {
                        // If the file is from the prequote
                        if (file.isFromPrequote) {
                            const projectFileToInsert = {
                                table: "PROJECTS_FILES",
                                FILE_TYPE: file.fileType,
                                FILE_NAME: file.name,
                                SIZE: parseInt(file.size, 10),
                                PROJECT_ID: insertedProject.PK,
                                isForPrequote: true,
                                fileID: file.fileID
                            }
                            cmg.insertObject(projectFileToInsert)
                            return
                        }

                        const fileInfo = {
                            table: "PROJECTS_FILES",
                            FILE_TYPE: file.fileType,
                            PROJECT_ID: insertedProject.PK
                        }
                        store.pendingFileUploads.push({ FILE_TYPE: file.fileType, FILE_NAME: file.name, SIZE: file.size, PROJECT_ID: insertedProject.PK })

                        // If the file has a selectedFile property, it was uploaded manually
                        let fileToUpload = file.selectedFile
                        // If the file has a data property, it was imported from an email, so create a new file with that data
                        if (file.data) fileToUpload = new File([new Blob([file.data])], file.name)
                        if (!fileToUpload) return
                        this.$uploadFile(fileToUpload, fileInfo, store.uploadTokens.PROJECTS)
                    }, count++ * 100)
                })
            })

            // This triggers the closing of the form
            $(".dummy-quote-button").click()
        },

        async importPrequote() {
            if (this.$checkWithMessage(!this.prequoteCode, "Please fill in a prequote code.")) return
            if (this.$checkWithMessage((this.prequoteCode - 12345) % 678 != 0, "This is not a valid prequote code.")) return
            const prequotePK = (this.prequoteCode - 12345) / 678
            let prequote = store.prequote(prequotePK)
            if (!prequote) {
                const prequotes = await cmg.requestObjects("PREQUOTE_DETAILS", { PK: prequotePK })
                if (prequotes[0] && prequotes[0].PK === prequotePK) prequote = prequotes[0]
            }

            if (this.$checkWithMessage(!prequote, "This prequote doesn't exist or was already converted by somebody else.")) return
            if (this.$checkWithMessage(prequote.STATUS === C_.pqCompleted, "This prequote was already converted by somebody else.")) return

            if (prequote.STATUS === C_.pqCancelled) if (!(await this.$dialogCheck("This prequote has been cancelled.\n\nAre you sure you want to import it?"))) return

            // prettier-ignore
            if (prequote.STATUS === C_.pqSetup)
                if (!(await this.$dialogCheck("W A R N I N G !\n\nIt looks like somebody else is working on importing this prequote.\n\nIf two project managers are importing the same prequote, this will result in duplicate projects.\n\nAre you sure that no other project manager in working already on importhing this prequote?")))
                    return

            if (prequote.STATUS === C_.pqPending) {
                cmg.updateObject(prequote, "STATUS", C_.pqSetup)
                cmg.updateObject(prequote, "WORKING_MANAGER_NAME", store.myself.FIRST_NAME.slice(0, 40))
            }

            this.prequote = prequote
            this.updateProjectDetailsFromPrequote(prequote)
        },

        updateProjectDetailsFromWebformEmail(emailText) {
            const code = atob(emailText.substring(emailText.indexOf("TranwiseImportStart") + 19, emailText.indexOf("TranwiseImportEnd")))
            const params = code.split("|")

            // Create a dummy prequote object, to use the same function as importing from a prequote
            const dummyPrequote = {}
            for (let [key, value] of Object.entries(params)) {
                const paramName = value.substring(0, value.indexOf("="))
                const paramValue = value.substring(value.indexOf("=") + 1)
                dummyPrequote[paramName] = paramValue.replace(/&#13;/g, "\n").replace(/&#124;/g, "|")
            }

            // Set the correct attributes of the dummyPrequote (some of them are different in the import code)
            dummyPrequote.PROJECT_EMAIL = dummyPrequote.EMAIL
            dummyPrequote.FILE_URLS = dummyPrequote.FILE
            dummyPrequote.SHOULD_BE_SENT_BY_POST = dummyPrequote.SENT_BY_REGULAR_MAIL
            dummyPrequote.TARGET_LANGUAGES = dummyPrequote.TARGET_LANGUAGE
            dummyPrequote.IS_NOTARIZED = dummyPrequote.IS_NOTARIZED > 0
            if (dummyPrequote.SIGNED) dummyPrequote.HAS_DIGITAL_CERTIFICATION = dummyPrequote.SIGNED

            this.updateProjectDetailsFromPrequote(dummyPrequote)
        },

        async updateProjectDetailsFromPrequote(prequote) {
            this.updateProject("PAYMENT_TRANSLATOR", C_.ptBySourceWords)
            this.updateProject("PAYMENT_PROOFREADER", C_.ptBySourceWords)

            // Set IS_CERTIFIED to true by default, unless IS_CERTIFIED is specifically set to 0 in the prequote details
            this.updateProject("IS_CERTIFIED", !(prequote.IS_CERTIFIED === 0))
            this.updateProject("IS_NOTARIZED", prequote.IS_NOTARIZED)
            this.updateProject("DIGITAL_CERTIFICATION_STATUS", prequote.HAS_DIGITAL_CERTIFICATION ? 1 : 0)
            this.updateProject("SHOULD_BE_SENT_BY_POST", prequote.SHOULD_BE_SENT_BY_POST)
            this.updateProject(
                "WORK_DETAILS",
                (prequote.COMMENTS ? prequote.COMMENTS + "\n\n" : "") + (prequote.FILE_URLS ? `Files: ${prequote.FILE_URLS.replace(/;/g, "\n\n")}` : "")
            )
            this.updateProject("PROJECT_EMAIL", prequote.PROJECT_EMAIL)

            if (prequote.IS_CERTIFIED || prequote.IS_NOTARIZED) {
                this.hiddenAreas = ["Comments", "CATInformation", "AdditionalSettings"]
                if (!prequote.COMMENTS) this.hiddenAreas.push("Instructions")
            }

            if (prequote.TARGET_LANGUAGES) this.updateProject("CLIENT_ORDER_NUMBER", `Translation ${prequote.SOURCE_LANGUAGE} to ${prequote.TARGET_LANGUAGES.replace(/;/g, ", ")}`)

            const sourceLanguage = store.languageWithName(prequote.SOURCE_LANGUAGE)
            this.updateProject("SOURCE_LANGUAGE_ID", sourceLanguage ? sourceLanguage.PK : 0)
            this.targetLanguages.splice(0)
            if (prequote.TARGET_LANGUAGES) {
                const targetLanguagesNames = prequote.TARGET_LANGUAGES.split(";")
                targetLanguagesNames.forEach(languageName => {
                    const language = store.languageWithName(languageName)
                    if (language) {
                        this.targetLanguages.push(language)
                        this.$refs.dropdownTargetLanguage.setText(languageName)
                    }
                })
            }

            if (prequote.FILES_DATA) {
                this.files.splice(0)
                const prequoteFiles = prequote.FILES_DATA.split(";")
                prequoteFiles.forEach(fileInfo => {
                    const fileParams = fileInfo.split("|")
                    this.files.push({ fileType: C_.pfMain, name: fileParams[0], fileID: fileParams[1], size: fileParams[2], isFromPrequote: true })
                })
            }

            if (prequote.CLIENT_ORDER_NUMBER) this.updateProject("CLIENT_ORDER_NUMBER", prequote.CLIENT_ORDER_NUMBER)
            if (prequote.WEBSITE_ORDER_ID) {
                this.updateProject("WEBSITE_ORDER_ID", prequote.WEBSITE_ORDER_ID)
                this.updateProject("TEMPLATE_EDITOR_LINK", prequote.TEMPLATE_EDITOR_LINK)
                this.updateProject("WORK_DETAILS", prequote.COMMENTS)
                this.updateProject("SPECIAL_INSTRUCTIONS", prequote.COMMENTS + "\n\nYou will receive the link for editing the file upon assignment.")
                this.updateProject("SOURCE_WORDS", 0)
            }
            if (prequote.PRICE) {
                if (prequote.IS_CERTIFIED) {
                    this.updateProject("CERTIFIED_PAYMENT_METHOD", C_.ptFixedPrice)
                    this.updateProject("CERTIFIED_BASE_PRICE", prequote.PRICE)
                }
                this.updateProject("PRICE", prequote.PRICE)
                this.updateProject("PAYMENT_CLIENT", C_.ptFixedPrice)

                this.updateProject("PAYMENT_TRANSLATOR", C_.ptFixedPrice)
            }

            // If the quote came with a client id, select it
            if (store.client(prequote.CLIENT_ID)) this.selectClient(prequote.CLIENT_ID)
            // Otherwise...
            else {
                // Load the clients that have this email address
                const clientsWithEmail = await cmg.requestObjects("CLIENTS_WITH_EMAIL_FOR_NEW_PROJECT", { EMAIL: prequote.PROJECT_EMAIL })

                // In the list that we got from the server, try to find a client that has a matching name and email
                const clients = clientsWithEmail.filter(
                    c => c.CLIENT_NAME.toLowerCase() === prequote.NAME.toLowerCase().trim() && c.EMAILS.toLowerCase() === prequote.PROJECT_EMAIL.toLowerCase().trim()
                )

                // If found at least one client, select it
                if (clients.length) this.selectClient(clients[0].PK)
                // Otherwise show the client creation form
                else {
                    const clientAddress = `${prequote.STREET}\n${prequote.CITY} ${prequote.STATE} ${prequote.ZIP}`
                    this.$refs.ClientSelector.showClientCreator(prequote.NAME, prequote.PROJECT_EMAIL, clientAddress)
                }
            }
        },

        setDataFromImportedEmail(emailData) {
            this.$refs.ClientSelector.reset()

            this.emailBody = emailData.body
            this.updateProject(
                "CLIENT_ORDER_NUMBER",
                emailData.subject
                    .replace(/Fwd: /g, "")
                    .replace(/Re: /g)
                    .substring(0, 190)
            )

            this.updateProject("PROJECT_EMAIL", emailData.from)
            this.$nextTick(() => this.$refs.dropdownProjectEmail.setText(emailData.from))

            emailData.attachments.forEach(attachment => this.files.push({ fileType: C_.pfMain, name: attachment.name, data: attachment.data }))

            // If the email includes an import code, use its details
            if (emailData.body && emailData.body.includes("TranwiseImportStart") && emailData.body.includes("TranwiseImportEnd")) {
                this.updateProjectDetailsFromWebformEmail(emailData.body)
            }

            // This line below triggers the request for clients with this email address, handled by the ClientSelector component
            this.$refs.ClientSelector.requestClientsWithEmailAddress(this.project.PROJECT_EMAIL)
        },

        showCertificateTemplate() {
            this.$showMessage(this.certificateTemplatesLinks)
        },

        addTargetLanguage(field, value) {
            let language = store.language(value)
            if (!this.targetLanguages.includes(language)) this.targetLanguages.push(language)
            if (this.targetLanguages.length) this.$delete(this.errors, "targetLanguages")
            this.updateRequiredPrepaymentPercent()
        },

        deleteTargetLanguage(pk) {
            this.targetLanguages = this.targetLanguages.filter(language => language.PK != pk)
        },

        updateRequiredPrepaymentPercent() {
            if (this.project.isTranslation && !this.project.REQUIRED_PREPAYMENT_PERCENT && !this.client.REQUIRES_PREPAYMENT && !this.client.NO_PREPAID_QUOTES) {
                if (this.project.SOURCE_WORDS * (this.targetLanguages.length || 1) >= 10000) this.updateProject("REQUIRED_PREPAYMENT_PERCENT", 50)
            }
        },

        updateProject(field, value) {
            if (value === undefined) return
            this.$set(this.project, field, value)

            this.$delete(this.errors, "mandatory")
            if (this.project.PROJECT_TYPE > 0) this.$delete(this.errors, "projectType")

            if (field === "priority") this.updateProject("PRIORITY", value ? 2 : 0)

            if (field === "SOURCE_WORDS" && value <= 200) this.$delete(this.warnings, "certifiedMaxWords")
            if (field === "IS_CERTIFIED" && value === false) this.$delete(this.warnings, "certifiedMaxWords")
            if (this.project.IS_CERTIFIED && this.project.SOURCE_WORDS > 200 && !this.warnings.certifiedMaxWords)
                this.$set(this.warnings, "certifiedMaxWords", "Certified projects should have at most 200 words and we charge $20 for them.")

            if (field === "PAYMENT_CLIENT" && value === C_.ptBySourceWords && !this.project.PRICE) this.updateProject("PRICE", this.client.PRICE)
            if (field === "PAYMENT_CLIENT" && value === C_.ptFixedPrice && this.project.PRICE > 0 && this.project.PRICE < 1) this.updateProject("PRICE", 0)

            if (field === "SOURCE_WORDS" && value >= 10000) this.updateProject("IS_BIG", true)

            if (field === "IS_BIG" && value) {
                this.updateProject("PAYMENT_TRANSLATOR", C_.ptFixedPrice)
                this.updateProject("PAYMENT_PROOFREADER", C_.ptFixedPrice)
                this.updateProject("IS_PROGRESS_WATCHED", true)
            }

            if (field === "PRICE" && value > 0.01 && value < 0.0751) {
                this.updateProject("PAYMENT_TRANSLATOR", C_.ptFixedPrice)
                this.updateProject("PAYMENT_PROOFREADER", C_.ptFixedPrice)
                this.updateProject(
                    "SPECIAL_INSTRUCTIONS",
                    `Payment will be 0.02 euro / word for translation and 0.004 euro / word for proofreading.${
                        this.project.SPECIAL_INSTRUCTIONS ? "\n\n" + this.project.SPECIAL_INSTRUCTIONS : ""
                    }`
                )
            }

            if (field === "PAYMENT_CLIENT" && value === C_.ptByCatAnalysis) {
                if (this.client.PRICE === 0.08) {
                    this.updateProject("RATE_NO_MATCH", 0.08)
                    this.updateProject("RATE_FUZZY_MATCH", 0.05)
                    this.updateProject("RATE_REPS", 0.02)
                }
                if (this.client.PRICE === 0.09) {
                    this.updateProject("RATE_NO_MATCH", 0.09)
                    this.updateProject("RATE_FUZZY_MATCH", 0.06)
                    this.updateProject("RATE_REPS", 0.03)
                }
                if (this.client.PRICE === 0.1) {
                    this.updateProject("RATE_NO_MATCH", 0.1)
                    this.updateProject("RATE_FUZZY_MATCH", 0.07)
                    this.updateProject("RATE_REPS", 0.04)
                }
            }

            if (field === "SOURCE_WORDS") this.updateRequiredPrepaymentPercent()

            if (field === "REQUIRED_PREPAYMENT_PERCENT" && this.project.REQUIRED_PREPAYMENT_PERCENT > 0 && this.client.NO_PREPAID_QUOTES)
                this.updateProject("REQUIRED_PREPAYMENT_PERCENT", 0)

            if (field === "REQUIRED_PREPAYMENT_PERCENT" && this.project.REQUIRED_PREPAYMENT_PERCENT > 0 && this.client.PAYS_BY_CHECK)
                this.updateProject("REQUIRED_PREPAYMENT_PERCENT", 0)

            if (
                field === "REQUIRED_PREPAYMENT_PERCENT" &&
                this.project.REQUIRED_PREPAYMENT_PERCENT < 100 &&
                this.client.REQUIRES_PREPAYMENT &&
                !this.client.NO_PREPAID_QUOTES &&
                !this.client.PAYS_BY_CHECK
            )
                this.updateProject("REQUIRED_PREPAYMENT_PERCENT", 100)
        },

        updateProjectEmail(field, value) {
            this.updateProject("PROJECT_EMAIL", this.projectEmails[value])
        },

        async selectClient(pk, preserveProjectEmail) {
            // The pk can be 0 when selecting a client that is locked for projects (IS_LOCKED_FOR_PROJECTS == true)
            if (pk === 0) {
                this.client = {}
                this.$delete(this.project, "CLIENT_ID")
                return
            }

            this.client = store.client(pk)
            this.updateProject("CLIENT_ID", pk)
            this.$refs.ClientSelector.setClientName(this.client.CLIENT_NAME)

            if (!preserveProjectEmail) this.$refs.dropdownProjectEmail.clear()

            // Request the client details from the server. Resolves immediately if the client was requested earlier.
            await cmg.requestObject(this.client, "CLIENT_DETAILS_FOR_NEW_PROJECT")

            // If the client has only one email, set it as the project's email by default
            if (this.projectEmails.length === 1 && !preserveProjectEmail) {
                this.$refs.dropdownProjectEmail.setText(this.projectEmails[0].EMAIL)
                this.updateProject("PROJECT_EMAIL", this.projectEmails[0].EMAIL)
            }

            if (this.client.PRICE > 0 && this.client.PRICE < 0.0899) {
                this.updateProject("PAYMENT_TRANSLATOR", C_.ptFixedPrice)
                this.updateProject("PAYMENT_PROOFREADER", C_.ptFixedPrice)
            }

            if (this.client.REQUIRES_PREPAYMENT && !this.client.NO_PREPAID_QUOTES && !this.client.PAYS_BY_CHECK) this.updateProject("REQUIRED_PREPAYMENT_PERCENT", 100)
            if (this.client.NO_PREPAID_QUOTES) this.updateProject("REQUIRED_PREPAYMENT_PERCENT", 0)
            if (this.client.PAYS_BY_CHECK) this.updateProject("REQUIRED_PREPAYMENT_PERCENT", 0)

            // Set back to 0 when selecting a Nordic client which doesn't require prepayment
            if (!this.client.REQUIRES_PREPAYMENT && this.client.DIVISION_ID === 2) this.updateProject("REQUIRED_PREPAYMENT_PERCENT", 0)
            this.updateProject("CURRENCY", this.client.CURRENCY)
        },

        onChangeCATTools(field, value) {
            this.updateProject(field, value)
            const hasCATTools = parseInt(this.project.CAT_TOOLS, 10) || (this.project.CAT_TOOLS_OTHER && this.project.CAT_TOOLS_OTHER.trim())

            if (hasCATTools) {
                if (this.project.PAYMENT_TRANSLATOR != C_.ptFixedPrice && !this.project.IS_BIG) this.updateProject("PAYMENT_TRANSLATOR", C_.ptByCatAnalysis)
                if (this.project.PAYMENT_PROOFREADER != C_.ptFixedPrice && !this.project.IS_BIG) this.updateProject("PAYMENT_PROOFREADER", C_.ptByCatAnalysis)
            } else {
                if (this.project.PAYMENT_TRANSLATOR === C_.ptByCatAnalysis) this.updateProject("PAYMENT_TRANSLATOR", 0)
                if (this.project.PAYMENT_PROOFREADER === C_.ptByCatAnalysis) this.updateProject("PAYMENT_PROOFREADER", 0)
            }
        },

        onChangePaymentTranslator(field, value) {
            if (this.project.SOURCE_WORDS_NOT_COUNTABLE && value != C_.ptFixedPrice) {
                this.$showMessage(`This quote has the source words marked as not countable, so the payment should be set to "Fixed price".`)
                return false
            }

            const hasCATTools = parseInt(this.project.CAT_TOOLS, 10) || (this.project.CAT_TOOLS_OTHER && this.project.CAT_TOOLS_OTHER.trim())

            if (hasCATTools && value != C_.ptFixedPrice && value != C_.ptByCatAnalysis) {
                this.$showMessage(`This quote uses CAT tools, so the payment should be set to "By CAT analysis" or "Fixed price".`)
                return false
            }

            if (!hasCATTools && value === C_.ptByCatAnalysis) {
                this.$showMessage(`This quote is not marked as using CAT tools, so the payment can't be set to "By CAT analysis".`)
                return false
            }

            this.updateProject(field, value)
        },

        async onClickRequiresSupportAssistance(field, value) {
            this.updateProject(field, value)

            if (!value) return

            const response = await this.$showDialog({
                header: `Send message to the deadline team`,
                message: "Describe below how the deadline team can help with the project:",
                textAreaText: "",
                buttons: ["Cancel", "Send message after the quote is created"],
                buttonClasses: ["", "positive"]
            })

            if (response.selection === "Send message after the quote is created") this.textForSupportTeam = response.text
        },

        onClickSourceWordsNotCountable(field, value) {
            this.updateProject(field, value)
            this.updateProject("PAYMENT_TRANSLATOR", C_.ptFixedPrice)
            this.updateProject("PAYMENT_PROOFREADER", C_.ptFixedPrice)
        },

        onClickVideoInterpreting(field, value) {
            // this.updateProject("VIDEO_INTERPRETING_STATUS", value ? 1 : 0)
            this.updateProject(field, value ? 1 : 0)

            this.updateProject("PREPAYMENT_STATUS", C_.ppsPrepaymentPending)
            this.updateProject("REQUIRED_PREPAYMENT_PERCENT", 100)
            this.updateProject("PAYMENT_CLIENT", C_.ptFixedPrice)
            this.updateProject("PAYMENT_TRANSLATOR", C_.ptFixedPrice)
            this.updateProject("PAYMENT_PROOFREADER", C_.ptFixedPrice)
            if (value) {
                this.updateProject(
                    "QUOTE_COMMENTS",
                    "Date of the online video interpreting meeting:\nHour of the meeting:\nTime zone:\nlanguage combination needed:\nDuration:\nDescription of the meeting/Subject:\nInstructions where the interpreter should enter the meeting:"
                )
                this.updateProject(
                    "SPECIAL_INSTRUCTIONS",
                    "Date of the online video interpreting meeting:\nHour of the meeting:\nTime zone:\nlanguage combination needed:\nDuration:\nDescription of the meeting/Subject:\nInstructions where the interpreter should enter the meeting:"
                )
            }
        },

        onClickCertifiedNotarized(field, value) {
            this.updateProject(field, value)
            if (field === "IS_NOTARIZED" && !this.project.IS_CERTIFIED) this.updateProject("IS_CERTIFIED", true)
            if (field === "IS_CERTIFIED" && this.project.IS_NOTARIZED && !value) this.updateProject("IS_NOTARIZED", false)
            this.hiddenAreas = value ? ["Comments", "Instructions", "CATInformation", "AdditionalSettings"] : []
        },

        deleteImageFiles() {
            const imageExtensions = ["gif", "png", "jpg", "jpeg", "bmp"]
            this.files = this.files.filter(file => {
                if (!file.name) return true
                return !imageExtensions.includes(file.name.split(".").pop())
            })
        },

        showSourceWordsSection() {
            const { VIDEO_INTERPRETING_STATUS, TELEPHONE_INTERPRETING_STATUS, AUDIO_TRANSLATION_STATUS, AI_TRANSLATION_STATUS } = this.project
            if (VIDEO_INTERPRETING_STATUS || TELEPHONE_INTERPRETING_STATUS || AUDIO_TRANSLATION_STATUS || AI_TRANSLATION_STATUS) {
                return false
            }
            return true
        }
    }
}
</script>

<style scoped>
.target-languages-wrapper {
    width: 100%;
    padding: 10px;
    background-color: white;
    border: 1px solid lightgrey;
    border-radius: 5px;
    margin-bottom: 10px;
}

.ui.dividing.header {
    padding-top: 8px;
}
</style>
