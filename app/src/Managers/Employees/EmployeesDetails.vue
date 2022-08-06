<template lang="pug">
#employee-details-wrapper.ui.raised.segment.padded(style="max-width: 750px")
    #employee-details-header {{ store.fullName(employee.PK) }}
    #employee-details-content
        .ui.grid
            .ui.form.eight.wide.column(style="padding-right: 20px")
                .field
                    TWTextArea(:rows="3" :obj="employee" field="ADDRESS" placeholder="No address specified" :change="updateEmployee")
                .field
                    TWDropdown(defaultText="Country" search :obj="employee" field="COUNTRY_ID" :change="updateEmployee" :items="store.countries" itemKey="COUNTRY")
                .field
                    .ui.action.input
                        TWInput(:obj="employee" field="EMAIL" placeholder="No email specified" :change="updateEmployee") 
                        .ui.icon.button(@click="sendEmailExternal")
                            i.at.icon
                .field
                    .ui.labeled.action.input
                        .ui.label Phone
                        TWInput(:obj="employee" field="PHONE_NUMBER" :change="updateEmployee")
                        .ui.icon.button(@click="callPhoneWithBria")
                            i.phone.icon
                .field
                    .ui.labeled.action.input
                        .ui.label Mobile
                        TWInput(:obj="employee" field="MOBILE_NUMBER" :change="updateEmployee")
                        .ui.icon.button(@click="callMobileWithBria")
                            i.phone.icon
                        .ui.icon.button(@click="sendSMS")
                            i.telegram.plane.icon
                .field
                    .ui.labeled.action.input
                        .ui.label Skype
                        TWInput(:obj="employee" field="SKYPE_ID" :change="updateEmployee")
                        .ui.icon.button(@click="callWithSkype")
                            i.skype.icon
                .field
                    .ui.labeled.action.input
                        .ui.label Telegram
                        TWInput(:obj="employee", field="TELEGRAM_ID", :change="updateEmployee")
                        .ui.icon.button(@click="sendTelegram")
                            i.telegram.plane.icon
                .field
                    TWTextArea(:rows="3" :obj="employee" field="COMMENTS" placeholder="Comments" :change="updateEmployee")
                .labels-wrapper
                    p(v-if="!+employee.CAT_TOOLS") No CAT tools
                    .ui.label.catToolLabel(v-for="catTool in catTools") {{ catTool }}
                .labels-wrapper
                    p(v-if="!+employee.TRANSLATION_AREAS") No translation areas
                    .ui.label.catToolLabel(v-for="translationArea in translationAreas") {{ translationArea }}
                .inline.fields
                    .field
                        .ui.mini.teal.button(v-if="employee.RESUME_FILE_NAME" @click="downloadResume") Download résumé
                    .field
                        .ui.mini.coolblue.button(v-if="employee.DIPLOMA_FILE_NAME" @click="downloadDiploma") Download diplomas
            .ui.form.eight.wide.column(style="padding-right: 25px")
                .fields
                    .field
                        TWDropdown(ref="DropdownEmployeeType" defaultText="Employee type" zeroBased :obj="employee" field="EMPLOYEE_TYPE" :change="updateEmployeeType" :items="employeeTypes" itemKey="TYPE" style="width: 140px")
                    .field
                        TWDropdown(defaultText="Gender" :obj="employee" field="GENDER" :change="updateEmployee" :items="[{ PK: 1, text:'Male'}, { PK: 2, text:'Female'}]" itemKey="text" style="width: 100px")
                    .field(style="padding-top: 8px")
                        TWCheckbox(label="New" :obj="employee" :change="updateEmployee" field="IS_NEW_TRANSLATOR")
                .field(v-if="employee && employee.EMPLOYEE_TYPE === C_.etPending && disabledAccountsCount" style="color: orange") Translator has {{ disabledAccountsCount }} disabled account{{ utils.pluralS(disabledAccountsCount)}}
                .two.fields
                    .field
                        TWCheckbox(label="Phone interpreting" :obj="employee" :change="updateEmployee" field="IS_PHONE_INTERPRETER")
                    .field
                        TWCheckbox(label="Video interpreting" :obj="employee" :change="updateEmployee" field="IS_VIDEO_INTERPRETER")
                .fields
                    .field.vertical-center {{ lastLoginTime }}
                    div(style="flex: 1 1 auto;")
                    .field
                        .ui.button.basic.blue.mini(v-if="[0, 1].includes(this.employee.EMPLOYEE_TYPE) || this.employee.PK === store.myself.PK" @click="resetPassword") Reset password
                div(style="height: 13px")
                .field(style="margin-bottom: 0")
                    label Payment
                .two.fields
                    .field
                        .ui.right.labeled.input.fluid
                            TWInput(:obj="employee" float field="RATE_TRANSLATION" :change="updateEmployee")
                            .ui.basic.label &euro; / trans
                    .field
                        .ui.right.labeled.input.fluid
                            TWInput(:obj="employee" float field="RATE_PROOFREADING" :change="updateEmployee" )
                            .ui.basic.label &euro; / proof
                .field
                    .field
                        TWDropdown(defaultText="Payment method" :obj="employee" field="PAYMENT_METHOD" :change="updateEmployee" :items="C_.employeePaymentMethods" itemKey="text")
                    .field(v-if="employee.PAYMENT_METHOD === 3")
                        TWInput(:obj="employee" field="PAYPAL_EMAIL" placeholder="No PayPal email specified" :change="updateEmployee") 
                    .field(v-if="[1, 2].includes(employee.PAYMENT_METHOD)") Payoneer ID: {{ employee.PK }}
                div(style="height: 30px")
                .field
                    label Native languages
                    .field
                        TWDropdown(defaultText="Native language" search :obj="employee" field="NATIVE_LANGUAGE_1_ID" :items="store.languages" :change="updateEmployee" itemKey="LANGUAGE")
                    .field
                        TWDropdown(defaultText="Native language" search :obj="employee" field="NATIVE_LANGUAGE_2_ID" :items="store.languages" :change="updateEmployee" itemKey="LANGUAGE")
                .field
                    #language-pairs-wrapper
                        #language-pairs-header
                            #language-pairs-header-text Language pairs
                            #language-pairs-header-add-button(@click.stop="addLanguagePair")
                                i.add.icon.inverted
                                TWPopup(popupID="popup-add-language-pair" parentID="language-pairs-header-add-button" position="left center")
                                    .field.ui.form.small(slot="popup-contents" style="width: 450px; margin: 10px")
                                        .two.fields
                                            .field
                                                TWDropdown(defaultText="Source language" search :obj="newEmployeeLanguage" field="SOURCE_LANGUAGE_ID" :items="store.languages" :change="updateNewEmployeeLanguage" itemKey="LANGUAGE")
                                            .field
                                                TWDropdown(defaultText="Target language" search :obj="newEmployeeLanguage" field="TARGET_LANGUAGE_ID" :items="store.languages" :change="updateNewEmployeeLanguage" itemKey="LANGUAGE")
                                            button.ui.positive.button.transition#button-popup-add-language-pair(@click="doAddLanguagePair" style="margin-left: 10px") Add
                        #language-pairs-list    
                            .language-pair-item(v-for="obj in employeesLanguages", :key="obj.PK")
                                div {{ store.languageName(obj.SOURCE_LANGUAGE_ID) + " > " + store.languageName(obj.TARGET_LANGUAGE_ID) }}
                                div(style="flex: 1 1 auto;")
                                div
                                    i.ui.red.x.icon.clickable(@click="deleteLanguagePair(obj)")
                    #employees-points
                        .field(style="display: flex")
                            div(style="display: flex") 
                                div(style="padding: 2px 0") {{ employee.PLUS_POINTS }} plus points
                                .ui.compact.tiny.icon.button(style="margin-left: 5px" @click="addPoint('PLUS')")
                                    i.plus.icon
                                .ui.compact.tiny.icon.button(@click="removePoint('PLUS')")
                                    i.minus.icon
                            div(style="flex-grow: 1")
                            div(style="display: flex")
                                div(style="padding: 2px 0") {{ employee.MINUS_POINTS }} minus points
                                .ui.compact.tiny.icon.button(style="margin-left: 5px" @click="addPoint('MINUS')")
                                    i.plus.icon
                                .ui.compact.tiny.icon.button(@click="removePoint('MINUS')")
                                    i.minus.icon
                        .field
                            TWTextArea(:rows="3" :obj="employee" field="POINTS_COMMENTS" placeholder="Points comments" :change="updateEmployee")
</template>

<script>
import { store, cmg, constants as C_, utils } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"

export default {
    mixins: [CoreMixin, CoreMixinManagers],

    props: {
        employee: Object
    },

    data() {
        return {
            newEmployeeLanguage: {
                table: "EMPLOYEES_LANGUAGES",
                SOURCE_LANGUAGE_ID: 0,
                TARGET_LANGUAGE_ID: 0
            }
        }
    },

    computed: {
        employeesLanguages() {
            return store.employeesLanguages.filter(empLang => empLang.PK && empLang.EMPLOYEE_ID === this.employee.PK)
        },

        catTools() {
            if (!+this.employee.CAT_TOOLS) return []
            const result = []
            this.employee.CAT_TOOLS.split("").forEach((item, index) => {
                if (+item) result.push(C_.catToolsList[index])
            })
            return result
        },

        translationAreas() {
            if (!+this.employee.TRANSLATION_AREAS) return []
            const result = []
            this.employee.TRANSLATION_AREAS.split("").forEach((item, index) => {
                if (+item) result.push(C_.translationAreasList[index])
            })
            return result
        },

        lastLoginTime() {
            if (!this.employee.PK) return ""
            if (!this.employee.LAST_LOGIN_TIME) return "Last login: none"
            return "Last login: " + utils.formatDate(this.employee.LAST_LOGIN_TIME)
        },

        disabledAccountsCount() {
            if (!this.employee.PK) return ""
            const emp = this.employee
            let count = 0

            for (let e of store.employees) {
                if (e.PK != emp.PK && e.fullName().toLowerCase() === emp.fullName().toLowerCase() && e.EMPLOYEE_TYPE === C_.etDisabled && e.ACCEPTED_CONFIDENTIALITY_AGREEMENT > 0)
                    count++
            }
            return count
        },

        employeeTypes() {
            return [{ PK: 0, TYPE: "Pending" }, { PK: 1, TYPE: "Translator" }, { PK: 2, TYPE: "Manager" }, { PK: 3, TYPE: "Disabled" }]
        }
    },

    methods: {
        deleteLanguagePair(empLang) {
            cmg.deleteObject(empLang)
        },

        addLanguagePair() {
            this.newEmployeeLanguage.SOURCE_LANGUAGE_ID = 0
            this.newEmployeeLanguage.TARGET_LANGUAGE_ID = 0
            $("#language-pairs-header-add-button").popup("show")
        },

        doAddLanguagePair() {
            let error = false

            if (
                this.newEmployeeLanguage.SOURCE_LANGUAGE_ID == 0 ||
                this.newEmployeeLanguage.TARGET_LANGUAGE_ID == 0 ||
                this.newEmployeeLanguage.SOURCE_LANGUAGE_ID === this.newEmployeeLanguage.TARGET_LANGUAGE_ID
            )
                error = true

            this.employeesLanguages.forEach(empLang => {
                if (empLang.SOURCE_LANGUAGE_ID == this.newEmployeeLanguage.SOURCE_LANGUAGE_ID && empLang.TARGET_LANGUAGE_ID == this.newEmployeeLanguage.TARGET_LANGUAGE_ID)
                    error = true
            })

            if (error) {
                $("#button-popup-add-language-pair").transition("shake")
                return
            }

            $("#language-pairs-header-add-button").popup("hide")
            this.newEmployeeLanguage.EMPLOYEE_ID = this.employee.PK
            const employeeLanguage = {
                table: "EMPLOYEES_LANGUAGES",
                EMPLOYEE_ID: this.employee.PK,
                SOURCE_LANGUAGE_ID: this.newEmployeeLanguage.SOURCE_LANGUAGE_ID,
                TARGET_LANGUAGE_ID: this.newEmployeeLanguage.TARGET_LANGUAGE_ID
            }
            cmg.insertObject(employeeLanguage)
        },

        updateNewEmployeeLanguage(field, value) {
            this.newEmployeeLanguage[field] = value
        },

        async addPoint(pointType) {
            const field = pointType + "_POINTS"

            const response = await this.$showDialog({
                header: `Add a ${pointType.toLowerCase()} point for ${this.employee.fullName()}`,
                message: `Type the reason for giving the ${pointType.toLowerCase()} point (the translator will get a message about it):`,
                textAreaText: "",
                buttons: ["Cancel", "Add point"],
                buttonClasses: ["", "positive"]
            })

            if (response.selection === "Add point") {
                const newValue = this.employee[field] + 1
                this.updateEmployee(field, newValue)
                this.$set(this.employee, field, newValue)

                const message =
                    "Dear Translator,\n\n" +
                    `You have just received a ${pointType.toLowerCase()} point in Tranwise, for the following reason:\n\n` +
                    response.text +
                    `\n\n${
                        pointType === "MINUS" ? "We are sorry about this. " : ""
                    }If you have any questions about this, please chat in Tranwise with one of the project managers.\n\n` +
                    "Regards,\nUniversal Translation Services"

                store.sendEmployeeMessage(this.employee, message)
            }
        },

        removePoint(pointType) {
            const field = pointType + "_POINTS"
            if (this.employee[field] > 0) {
                const newValue = this.employee[field] - 1
                this.updateEmployee(field, newValue)
                this.$set(this.employee, field, newValue)
            }
        },

        async resetPassword() {
            const response = await this.$showDialog({
                message: `Type a new password for ${this.employee.fullName()} (max. 48 characters):`,
                inputText: utils.getUniqueID(),
                blankTextWarning: "Please type a valid password",
                noSpellCheck: true
            })

            if (response.selection === "OK" && response.text) cmg.sendMessage("RESET_PASSWORD", this.employee.PK, response.text.slice(0, 48))
        },

        updateEmployee(field, value) {
            cmg.updateObject(this.employee, field, value)
        },

        async updateEmployeeType(field, value) {
            if (value === C_.etManager && !store.permissions.createManagers) {
                this.$refs.DropdownEmployeeType.revertToPreviousValue()
                this.$showMessage("You are not allowed to create project managers.")
                return false
            }

            if (value === C_.etDisabled && this.employee.EMPLOYEE_TYPE === C_.etTranslator) {
                const response = await this.$showDialog({
                    header: "Reason for disabling the account",
                    message: `Type the reason for disabling ${this.employee.fullName()}'s account:`,
                    textAreaText: "",
                    blankTextWarning: "Please provide a reason for disabling the account.",
                    buttons: ["Cancel", "Disable account"],
                    buttonClasses: ["", "positive"]
                })

                if (response.selection === "Disable account") {
                    this.updateEmployee("EMPLOYEE_TYPE", C_.etDisabled)
                    this.updateEmployee("DISABLE_REASON", response.text)
                    return
                }

                this.$refs.DropdownEmployeeType.revertToPreviousValue()
                return false
            }

            if (value === C_.etTranslator) {
                const emp = this.employee

                if (this.disabledAccountsCount) {
                    await utils.delay(100)
                    const message = `We already have in our system at least one account with the same name that was previously disabled.\n\nAre you sure you are not accepting a translator that has given us problems in the past?`
                    if (!(await this.$dialogCheck(message))) {
                        this.$refs.DropdownEmployeeType.revertToPreviousValue()
                        return false
                    }
                }

                await utils.delay(100)
                if (emp.NATIVE_LANGUAGE_1_ID && emp.NATIVE_LANGUAGE_2_ID && emp.NATIVE_LANGUAGE_1_ID != emp.NATIVE_LANGUAGE_2_ID) {
                    const message = `${emp.fullName()} has 2 native languages:\n\n${store.languageName(emp.NATIVE_LANGUAGE_1_ID)}\n${store.languageName(
                        emp.NATIVE_LANGUAGE_2_ID
                    )}\n\nHave you checked this and are you sure this is correct?`
                    if (!(await this.$dialogCheck(message))) {
                        this.$refs.DropdownEmployeeType.revertToPreviousValue()
                        return false
                    }
                }

                let text = `Are the language settings for ${emp.fullName()} correct?\n\n`
                if (emp.NATIVE_LANGUAGE_1_ID) text += `Native language: ${store.languageName(emp.NATIVE_LANGUAGE_1_ID)}\n`
                if (emp.NATIVE_LANGUAGE_2_ID) text += `Native language: ${store.languageName(emp.NATIVE_LANGUAGE_2_ID)}\n`
                text += "\n"

                store.employeesLanguages.forEach(empLang => {
                    if (empLang.EMPLOYEE_ID === emp.PK) text += `${store.languageName(empLang.SOURCE_LANGUAGE_ID)} -> ${store.languageName(empLang.TARGET_LANGUAGE_ID)}\n`
                })

                await utils.delay(100)
                if (!(await this.$dialogCheck(text))) {
                    this.$refs.DropdownEmployeeType.revertToPreviousValue()
                    return false
                }

                this.updateEmployee("EMPLOYEE_TYPE", C_.etTranslator)
                this.updateEmployee("IS_NEW_TRANSLATOR", true)
                return
            }

            this.updateEmployee(field, value)
        },

        callWithSkype() {
            if (this.employee.SKYPE_ID) utils.openURL(`skype:${this.employee.SKYPE_ID}?call`)
        },

        callPhoneWithBria() {
            if (this.employee.PHONE_NUMBER) utils.openURL(`sip:${this.employee.PHONE_NUMBER}`)
        },

        callMobileWithBria() {
            if (this.employee.MOBILE_NUMBER) utils.openURL(`sip:${this.employee.MOBILE_NUMBER}`)
        },

        async sendSMS() {
            if (!this.employee.MOBILE_NUMBER) return
            const response = await store.vue.$showDialog({
                header: `Send SMS to ${this.employee.fullName()}`,
                message: `Type the message for ${this.employee.fullName()} (max. 150 characters):`,
                textAreaText: "",
                buttons: ["Cancel", "Send SMS"],
                buttonClasses: ["", "positive"]
            })
            if (response.selection === "Send SMS") cmg.sendMessage(cmg.messageHeaders.SEND_SMS, this.employee.PK, response.text.substring(0, 150))
        },

        async sendTelegram() {
            if (!this.employee.TELEGRAM_ID) return
            const response = await store.vue.$showDialog({
                header: `Send Telegram to ${this.employee.fullName()}`,
                message: `Type the message for ${this.employee.fullName()}:`,
                textAreaText: "",
                buttons: ["Cancel", "Send Telegram"],
                buttonClasses: ["", "positive"]
            })
            if (response.selection === "Send Telegram") cmg.sendMessage(cmg.messageHeaders.SEND_TELEGRAM_TO_EMPLOYEE, this.employee.PK, response.text)
        },

        sendEmailExternal() {
            if (this.employee.EMAIL) utils.openURL(`mailto:${this.employee.EMAIL}`)
        },

        downloadResume() {
            if (!this.employee.RESUME_FILE_NAME) return
            // Create a dummy file record that is sent with the download request
            const file = {
                table: "EMPLOYEES_RESUMES",
                PK: this.employee.PK,
                RESUME_FILE_NAME: this.employee.RESUME_FILE_NAME,
                FILE_NAME: this.employee.RESUME_FILE_NAME
            }
            this.$downloadFile(file, "Requested files")
        },

        downloadDiploma() {
            if (!this.employee.DIPLOMA_FILE_NAME) return
            // Create a dummy file record that is sent with the download request
            const file = {
                table: "EMPLOYEES_DIPLOMAS",
                PK: this.employee.PK,
                DIPLOMA_FILE_NAME: this.employee.DIPLOMA_FILE_NAME,
                FILE_NAME: this.employee.DIPLOMA_FILE_NAME
            }
            this.$downloadFile(file, "Requested files")
        }
    },

    mounted() {
        $(document).click(event => {
            $(".popup").each(function(index) {
                $(this)
                    .parent()
                    .popup("hide")
            })
        })
    }
}
</script>

<style scoped>
#employee-details-wrapper {
    display: flex;
    flex-direction: column;
    padding: 0;
    border-radius: 6px;
    height: 100%;
}

#employee-details-header {
    padding: 18px 22px;
    background-color: #7ac859;
    border-radius: 5px 5px 0 0;
    font-size: 20px;
    font-weight: 300;
    color: white;
}

#employee-details-content {
    padding: 20px;
    flex: 1 1 auto;
    height: 0;
    overflow-y: auto;
}

#employees-languages {
    border: 1px solid rgb(245, 245, 245);
}

.labels-wrapper {
    width: 100%;
    padding: 10px;
    background-color: white;
    border: 1px solid lightgrey;
    border-radius: 5px;
    margin-bottom: 10px;
}

.catToolLabel {
    margin: 5px;
}

.ui.labeled.input .ui.label {
    width: 80px;
    background-color: rgb(245, 245, 245);
    border: 1px solid rgb(226, 226, 226);
    padding-left: 8px;
    font-weight: normal;
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
    margin: 10px;
    font-weight: bold;
}

#language-pairs-header-add-button {
    display: inline-block;
    padding: 10px 10px 10px 13px;
    border-radius: 0 4px 0 0;
    font-weight: bold;
    background-color: #2185d0;
}

#language-pairs-list {
    background-color: white;
    overflow-y: auto;
    border-radius: 0 0 5px 5px;
}

.language-pair-item {
    border-bottom: 1px solid #ddd;
    padding: 10px;
    display: flex;
}

#employees-points {
    padding-top: 30px;
}

.popup {
    white-space: nowrap;
}
</style>
