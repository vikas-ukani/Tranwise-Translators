<template lang="pug">
PageBase(headerText="Personal Details")
    #personal-details-wrapper(slot="page-contents")
        .ui.grid
            .ui.form.eight.wide.column.tw-size(style="padding-right: 20px")
                .three.fields
                    .field
                        TWInput(:obj="employee" field="FIRST_NAME" placeholder="First name" :change="updateEmployee") 
                    .field
                        TWInput(:obj="employee" field="LAST_NAME" placeholder="Last name" :change="updateEmployee")
                    .field
                        TWDropdown(defaultText="Gender" :obj="employee" field="GENDER" :change="updateEmployee" :items="[{ PK: 1, text:'Male'}, { PK: 2, text:'Female'}]" itemKey="text" style="width: 100px")
                .field
                    TWTextArea(:rows="3" :obj="employee" field="ADDRESS" placeholder="Your address" :change="updateEmployee")
                .two.fields
                    .field
                        label Country
                        TWDropdown(ref="dropdownCountry" defaultText="Country" search mandatory :obj="employee" field="COUNTRY_ID" :change="updateEmployee" :items="store.countries" itemKey="COUNTRY")
                    .field
                        label Email
                        TWInput(:obj="employee" field="EMAIL" placeholder="Your email address" :change="updateEmployee") 
                .two.fields
                    .field
                        .label Phone
                        TWInput(:obj="employee" field="PHONE_NUMBER" :change="updatePhoneNumber")
                    .field    
                        .label Mobile
                        TWInput(:obj="employee" field="MOBILE_NUMBER" :change="updatePhoneNumber")
                .two.fields
                    .field
                        .label Telegram
                        TWInput(:obj="employee" field="TELEGRAM_ID" :change="updatePhoneNumber")
                    .field    
                        .label Skype
                        TWInput(:obj="employee" field="SKYPE_ID" :change="updateEmployee")
                .field
                    TWCheckbox(label="Telegram me even when I'm online in Tranwise" :obj="employee" :change="updateEmployee" field="TELEGRAM_WHEN_ONLINE")
                .field
                    label Your comments
                    TWTextArea(:rows="3" :obj="employee" field="COMMENTS" placeholder="Your comments" :change="updateEmployee")
                .two.fields
                    .field
                        TWInput(readonly :obj="employee" field="RESUME_FILE_NAME" placeholder="No resumé uploaded")
                    .field    
                        .ui.tiny.coolblue.button(@click="uploadResume") Upload your resumé
                .two.fields
                    .field
                        TWInput(readonly :obj="employee" field="DIPLOMA_FILE_NAME" placeholder="No diploma uploaded")
                    .field    
                        .ui.tiny.coolgreen.button(@click="uploadDiploma") Upload your diploma
                .field(style="font-size: 10.5px; color: #330000") If you have multiple diplomas, please upload a single zip file with all of them.
            .ui.form.eight.wide.column.tw-size(style="padding-right: 25px")
                .field
                    .ui.blue.basic.mini.button(@click="resetPassword") Change your password
                .field(style="padding-bottom: 10px; padding-top: 10px") You have received from the managers
                    br
                    | {{ pointsLabel }}
                .field
                    TWCheckbox(label="I also want to receive telephone interpreting jobs" :obj="employee" :change="updateEmployee" field="IS_PHONE_INTERPRETER")
                .field
                    TWCheckbox(label="I also want to receive video interpreting jobs" :obj="employee" :change="updateEmployee" field="IS_VIDEO_INTERPRETER")
                .field(style="margin-bottom: 0; padding-top: 10px")
                    label Payment rates
                .two.fields
                    .field
                        .ui.right.labeled.input.fluid
                            TWInput(:obj="employee" field="RATE_TRANSLATION" readonly)
                            .ui.basic.label &euro; / translation
                    .field
                        .ui.right.labeled.input.fluid
                            TWInput(:obj="employee" field="RATE_PROOFREADING" readonly)
                            .ui.basic.label &euro; / proofreading
                #preferred-translator-option(v-if="employee.RATE_TRANSLATION > 0.02" style="margin: 5px 0 25px 0" @click="becomePreferredTranslator")
                    .field Are you willing to get more jobs by lowering your translation rate to 0.02 &euro; / word? Click below to become our preferred translator.
                    .field
                        .ui.tiny.purple.button Become a preferred translator
                div(v-else style="margin-bottom: 15px; color: purple") You are a preferred translator due to your lower rate.
                .two.fields
                    .field
                        label Payment method
                            div(@click="showPaymentMethodHelp" style="cursor: pointer; display: inline-block; margin-left: 20px; border-radius: 20px; width: 18px; background-color: #98CF74; font-weight: 700; text-align: center; color: white") ?
                        TWDropdown(defaultText="Payment method" :obj="employee" field="PAYMENT_METHOD" :change="updateEmployee" :items="C_.employeePaymentMethods" itemKey="text")
                    .field
                        label PayPal email
                        TWInput(:obj="employee" field="PAYPAL_EMAIL" placeholder="Your PayPal email" :change="updateEmployee")    
                //- The option to hold payments is not used anymore
                //- .two.fields
                    .field
                        TWCheckbox(label="Hold payments" :obj="employee" :change="updateHoldPayments" :value="(employee.PAYONEER_STATUS || '').includes('H')")
                    .field
                        a(style="cursor: pointer" href="#" onclick="document.getElementById('dummy-hold-payments-button').click()") What is this?
                        #dummy-hold-payments-button(style="display: none" @click="showHoldPaymentsInformation")
                .field(v-if="[1, 2].includes(employee.PAYMENT_METHOD)" style="font-size: 10px; color: #330000") Payoneer has a minimum amount of 20 € / $ per transaction. If your payment sheet is lower than that, it will stay on pending until that amount is reached.
                .field(style="padding: 10px 0") {{ nativeLanguagesLabel }}
                .field
                    #language-pairs-wrapper
                        #language-pairs-header
                            #language-pairs-header-text Language pairs
                        #language-pairs-list    
                            .language-pair-item(v-for="obj in employeesLanguages" :key="obj.PK")
                                div {{ store.languageName(obj.SOURCE_LANGUAGE_ID) + " > " + store.languageName(obj.TARGET_LANGUAGE_ID) }}
        .ui.grid
            .ui.form.eight.wide.column(style="padding-right: 20px")
                .ui.dividing.header CAT Tools
                div(style="display: flex")
                    .field.five.wide
                        .grouped.fields
                            .field
                                TWCheckbox(label="Trados Word" :obj="employee" :change="updateCATTools" :value="catToolsValue(1)" field="1")
                            .field
                                TWCheckbox(label="TagEditor" :obj="employee" :change="updateCATTools" :value="catToolsValue(2)" field="2")
                            .field
                                TWCheckbox(label="Wordfast" :obj="employee" :change="updateCATTools" :value="catToolsValue(3)" field="3")
                            .field
                                TWCheckbox(label="Trados Studio" :obj="employee" :change="updateCATTools" :value="catToolsValue(4)" field="4")
                    .field.five.wide
                        .grouped.fields 
                            .field
                                TWCheckbox(label="Transit" :obj="employee" :change="updateCATTools" :value="catToolsValue(5)" field="5")
                            .field
                                TWCheckbox(label="Across" :obj="employee" :change="updateCATTools" :value="catToolsValue(6)" field="6")
                            .field
                                TWCheckbox(label="SDLX" :obj="employee" :change="updateCATTools" :value="catToolsValue(7)" field="7")
                            .field
                                TWCheckbox(label="DejaVu" :obj="employee" :change="updateCATTools" :value="catToolsValue(8)" field="8")
                    .field.five.wide
                        .grouped.fields
                            .field
                                TWCheckbox(label="Matecat" :obj="employee" :change="updateCATTools" :value="catToolsValue(14)" field="14")
                            .field
                                TWCheckbox(label="MemoQ" :obj="employee" :change="updateCATTools" :value="catToolsValue(9)" field="9")
                            .field
                                div &nbsp;
            .ui.form.eight.wide.column(style="padding-right: 20px")
                .ui.dividing.header Specific translation areas
                div(style="display: flex")
                    .field.four.wide
                        .grouped.fields
                            .field
                                TWCheckbox(label="Science" :obj="employee" :change="updateTranslationAreas" :value="translationAreasValue(8)" field="8")
                            .field
                                TWCheckbox(label="Medical" :obj="employee" :change="updateTranslationAreas" :value="translationAreasValue(6)" field="6")
                            .field
                                TWCheckbox(label="Pensions" :obj="employee" :change="updateTranslationAreas" :value="translationAreasValue(7)" field="7")
                    .field.five.wide
                        .grouped.fields 
                            .field
                                TWCheckbox(label="Insurance" :obj="employee" :change="updateTranslationAreas" :value="translationAreasValue(3)" field="3")
                            .field
                                TWCheckbox(label="Marketing" :obj="employee" :change="updateTranslationAreas" :value="translationAreasValue(5)" field="5")
                            .field
                                TWCheckbox(label="Law / Patent" :obj="employee" :change="updateTranslationAreas" :value="translationAreasValue(4)" field="4")
                    .field.six.wide
                        .grouped.fields 
                            .field
                                TWCheckbox(label="Business / Financial" :obj="employee" :change="updateTranslationAreas" :value="translationAreasValue(2)" field="2")
                            .field
                                TWCheckbox(label="Art / Literary" :obj="employee" :change="updateTranslationAreas" :value="translationAreasValue(1)" field="1")
                .field
                    TWTextArea(:rows="1" :obj="employee" field="TRANSLATION_AREAS_OTHER" placeholder="Other translation areas" :change="updateEmployee")
        .ui.grid
            .ui.form.eight.wide.column.tw-size(style="padding-right: 20px")
                .ui.dividing.header Availability
                .field If you are not available for a longer time, please fill in a reason below and use the button to inform us about it. This will prevent you from receiving reminder messages while you are away. When you are back, don't forget to mark yourself as available again.
                .field
                    TWTextArea(:rows="2" :obj="employee" field="AVAILABILITY" placeholder="Reason" :change="updateEmployee")
                .fields
                    .field
                        .ui.button.teal.tiny(@click="updateAvailability") Mark me as {{ employee.IS_NOT_AVAILABLE ? "available" : "NOT AVAILABLE" }}
                    .field.vertical-center(v-show="employee.IS_NOT_AVAILABLE" style="color: red") You are marked as not available
        input#upload-input(type="file" style="display: none" @change="processBrowseFile")            
</template>

<script>
import store from "./Store/StoreTR"
import C_ from "./ConstantsTR"
import cmg from "./ConnectionManagerTR"
import utils from "./UtilsTR"

export default {
    created() {
        this.C_ = C_
        this.store = store
    },

    mounted() {
        this.$refs.dropdownCountry.highlightMandatory()
    },

    computed: {
        employee() {
            return store.myself
        },

        employeesLanguages() {
            return store.employeesLanguages.filter(empLang => empLang.EMPLOYEE_ID === store.myself.PK)
        },

        nativeLanguagesLabel() {
            const language1 = store.languageName(store.myself.NATIVE_LANGUAGE_1_ID)
            const language2 = store.languageName(store.myself.NATIVE_LANGUAGE_2_ID)
            if (language1 && language2) return `Native languages: ${language1}, ${language2}`
            if (language1) return `Native language: ${language1}`
            if (language2) return `Native language: ${language2}`
            return ""
        },

        pointsLabel() {
            return `${this.employee.PLUS_POINTS} plus point${utils.pluralS(this.employee.PLUS_POINTS)} and ${this.employee.MINUS_POINTS} minus point${utils.pluralS(
                this.employee.MINUS_POINTS
            )}`
        }
    },

    methods: {
        updateEmployee(field, value) {
            cmg.updateObject(this.employee, field, value)
        },

        updatePhoneNumber(field, value) {
            value = value.replace("+", "00").replace(/[^0-9]/g, "")
            if (value && value[0] != "0") value = "0" + value
            if (value && value[1] != "0") value = "0" + value
            cmg.updateObject(this.employee, field, value)
        },

        updateHoldPayments(field, value) {
            // If true, add an H to PAYONEER_STATUS, otherwise remove any existing H
            cmg.updateObject(this.employee, "PAYONEER_STATUS", (this.employee.PAYONEER_STATUS || "").replace(/H/g, "") + (value ? "H" : ""))
        },

        catToolsValue(tag) {
            if (!store.myself.CAT_TOOLS) return false
            let result = store.myself.CAT_TOOLS.substring(tag - 1, tag)
            return result == "1" ? true : false
        },

        translationAreasValue(tag) {
            if (!store.myself.TRANSLATION_AREAS) return false
            let result = store.myself.TRANSLATION_AREAS.substring(tag - 1, tag)
            return result == "1" ? true : false
        },

        updateCATTools(field, value) {
            const index = parseInt(field, 10)
            let cat = store.myself.CAT_TOOLS || ""

            // Add as many 0's as needed in order to have the length required by the index
            while (cat.length < index) cat += "0"

            cat = cat.substring(0, index - 1) + value + cat.substring(index)
            this.updateEmployee("CAT_TOOLS", cat)
        },

        updateTranslationAreas(field, value) {
            const index = parseInt(field, 10)
            let areas = store.myself.TRANSLATION_AREAS || ""

            // Add as many 0's as needed in order to have the length required by the index
            while (areas.length < index) areas += "0"

            areas = areas.substring(0, index - 1) + value + areas.substring(index)
            this.updateEmployee("TRANSLATION_AREAS", areas)
        },

        updateAvailability() {
            this.updateEmployee("IS_NOT_AVAILABLE", !this.employee.IS_NOT_AVAILABLE)
        },

        showHoldPaymentsInformation() {
            this.$showHTMLMessage(C_.holdPaymentsInformation)
        },

        showPaymentMethodHelp() {
            this.$showHTMLMessage(C_.paymentMethodHelp)
        },

        async becomePreferredTranslator() {
            const text =
                "By lowering your translation rate to 0.02 € / word, you will become our preferred translator, with a potential to get more jobs.\n\nPlease note that this choice is final and you can not revert it unless you contact\nanita@universal-translation-services.com.\n\nAre you sure you want to lower your rate to 0.02 € / word for translation?"
            if (await this.$dialogCheck(text)) cmg.sendMessage("BECOME_PREFERRED_TRANSLATOR")
        },

        uploadResume() {
            this.uploadFileType = "EMPLOYEE_RESUME_TR"
            $("#upload-input").click()
        },

        async resetPassword() {
            const response = await this.$showDialog({
                message: `Type your new password (max. 48 characters):`,
                inputText: "",
                blankTextWarning: "Please type a valid password",
                noSpellCheck: true
            })

            if (response.selection === "OK" && response.text) cmg.sendMessage("RESET_PASSWORD", store.myself.PK, response.text.slice(0, 48))
        },

        uploadDiploma() {
            this.uploadFileType = "EMPLOYEE_DIPLOMA_TR"
            $("#upload-input").click()
        },

        processBrowseFile(event) {
            if (!this.uploadFileType) return

            const files = [...event.srcElement.files]
            const file = files[0]

            const fileInfo = {
                FILE_NAME: file.name
            }

            if (this.uploadFileType === "EMPLOYEE_RESUME_TR") store.myself.RESUME_FILE_NAME = "Uploading. Please wait..."
            if (this.uploadFileType === "EMPLOYEE_DIPLOMA_TR") store.myself.DIPLOMA_FILE_NAME = "Uploading. Please wait..."

            this.$uploadFile(file, fileInfo, store.uploadTokens[this.uploadFileType])

            this.uploadFileType = null

            // Clear the input, so it's ready for the next upload
            $("#upload-input").val("")
        }
    }
}
</script>

<style scoped>
#personal-details-wrapper {
    padding: 10px 30px 0 15px;
    max-width: 920px;
    height: 0;
    flex: 1 1 auto;
    overflow-y: auto;
    overflow-x: hidden;
}

#language-pairs-wrapper {
    width: 100%;
    height: 162px;
    border: 1px solid #ddd;
    border-radius: 5px;
    display: grid;
    grid-template-rows: auto 1fr;
}

#language-pairs-header {
    border-bottom: 1px solid #ddd;
    background-color: #f0f0f0;
    border-radius: 5px 5px 0 0;
    display: grid;
    grid-template-columns: 1fr auto;
}

#language-pairs-header-text {
    display: inline-block;
    margin: 7px 10px;
    font-weight: bold;
}

#language-pairs-list {
    background-color: white;
    overflow-y: auto;
    border-radius: 0 0 5px 5px;
}

.language-pair-item {
    border-bottom: 1px solid #ddd;
    padding: 7px 10px;
}
</style>
