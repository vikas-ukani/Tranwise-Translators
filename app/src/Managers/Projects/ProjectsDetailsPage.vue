<template lang="pug">
#projects-details-wrapper
    .ui.grid.tw-size.form(v-if="project" style="margin: 0")
        .ui.eight.wide.column
            h5.ui.dividing.header Details
            .inline.fields(style="margin: 10px 0; margin-bottom: 7px !important")
                .field
                    TWCheckbox(ref="CheckboxTranslate" label="Translate" :obj="project" field="TRANSLATE" :disabled="project.PROJECT_TYPE == 2" :value="project.PROJECT_TYPE == 1 || project.PROJECT_TYPE == 2" :change="updateProjectType")
                .field
                    TWCheckbox(ref="CheckboxProofread" label="Proofread" :obj="project" field="PROOFREAD" :disabled="project.PROJECT_TYPE == 3" :value="project.PROJECT_TYPE == 1 || project.PROJECT_TYPE == 3" :change="updateProjectType" style="margin-left: 36px")
            .field
                TWInput(:obj="project" field="PROJECT_EMAIL" placeholder="Project email" :change="updateProject" ) 
            .field
                TWInput(:obj="project" field="CLIENT_ORDER_NUMBER" placeholder="Client order number" :change="updateProject" )
            .fields.inline(v-show="!project.VIDEO_INTERPRETING_STATUS")
                .field
                    .ui.right.labeled.input
                        TWInput(:obj="project" integer field="SOURCE_WORDS" placeholder="Source" :change="updateProject" style="width: 75px")
                        .ui.basic.label source words
                .field
                    TWCheckbox(label="Not countable" :obj="project" field="SOURCE_WORDS_NOT_COUNTABLE" :change="updateProject")
            .fields.inline(v-show="!project.VIDEO_INTERPRETING_STATUS")
                .field
                    .ui.right.labeled.input
                        TWInput(:obj="project" integer field="TARGET_WORDS" placeholder="0" :change="updateProject" style="width: 75px")
                        .ui.basic.label target words&nbsp;
                .field
                    TWCheckbox(label="On hold" :obj="project" field="IS_ON_HOLD" :change="updateProject")
            .fields.inline
                .field
                    TWInput(:obj="project" field="RESPONSIBLE_MANAGER" placeholder="Responsible manager" :change="updateProject" style="width: 183px")
            .fields
                .field.inline
                    TWInput(:obj="project" field="STUDENT_EMAIL" placeholder="Student Email" :change="updateProject" ) 
            .fields
                .field.inline
                    TWCheckbox(label="10% Student discount" :obj="project" :change="updateProject" field="STUDENT_DISCOUNT" :value="studentHasDiscount")
            .fields
                .field.ten.wide
                    .grouped.fields
                        .field
                            TWCheckbox(label="High priority" :obj="project" :change="updateProjectPriority" :value="projectPriority")
                        .field
                            TWCheckbox(label="Big project" :obj="project" :change="updateProject" field="IS_BIG")
                        .field
                            TWCheckbox(label="Has PDF files" :obj="project" :change="updateProject" field="HAS_PDF_FILES")
                        .field
                            TWCheckbox(label="Requires support assistance" :obj="project" :change="updateProject" field="REQUIRES_SUPPORT_ASSISTANCE")
                        .field
                            TWCheckbox(label="Has reference material" :obj="project" :change="updateProject" field="HAS_REFERENCE_MATERIAL_AVAILABLE")
                .field.six.wide
                    .grouped.fields
                        .field
                            TWCheckbox(label="Watch flow" :obj="project" :change="updateProject" field="IS_PROGRESS_WATCHED")
                        .field
                            TWCheckbox(label="Twilio project" :obj="project" :change="updateProject" field="TWILIO_STATUS")
                        .field
                            TWCheckbox(label="Notarized" :obj="project" :change="updateProject" field="IS_NOTARIZED")
                        .field
                            TWCheckbox(label="Certified" :obj="project" :change="updateProject" field="IS_CERTIFIED")
                        .field
                            TWCheckbox(ref="CheckboxImportantInformation" label="Important info" :obj="project" :value="hasImportantInformation" :change="updateImportantInformation")
            h5.ui.dividing.header(style="margin-top: 5px !important") Language pairs            
            .inline.fields(v-if="!showLanguagePairsEditor")
                .field.twelve.wide {{ languagePairs }}
                .field
                    .ui.mini.basic.teal.button(style="padding: 8px 12px !important" @click="showLanguagePairsEditor = true") {{ subprojects.length ? 'Edit' : 'Add' }} pair
            div(v-if="showLanguagePairsEditor")
                .field
                    .fields
                        .field.ten.wide
                            TWDropdown(defaultText="Source language" search :obj="project" field="SOURCE_LANGUAGE_ID" :items="store.languages" :change="updateProject" itemKey="LANGUAGE")
                        .field.one.wide(style="padding-top: 8px") &nbsp;&nbsp;into
                .field
                    .target-languages-wrapper
                        .ui.violet.label(v-for="subproject in subprojects" style="margin-bottom: 10px; margin-right: 6px") {{ store.languageName(subproject.LANGUAGE_ID) }}
                            i.delete.icon(@click="deleteTargetLanguage(subproject)")
                        .ui.teal.basic.label.clickable(@click="addTargetLanguage" style="height: 26px") Add target
        .ui.eight.wide.column
            h5.ui.dividing.header Deadlines
            .field.inline.vertical-center(style="display: flex")
                label(style="display: inline-block; width: 80px; text-align: right; font-size: 13px !important") Project
                TWCalendar(:obj="project" placeholder="Project deadline" :field="project.deadlineField()" :change="updateProject" forceToBottom)
                DeadlinesOverview(ref="DeadlinesOverview" :date="project.deadline()")
            .field.inline.vertical-center(style="display: flex")
                label(style="display: inline-block; width: 80px; text-align: right; font-size: 13px !important") Intermediate
                TWCalendar(:obj="project" placeholder="" field="DEADLINE_INTERMEDIATE" :change="updateProject" forceToBottom)
            .field.inline.vertical-center(style="display: flex")
                label(style="display: inline-block; width: 80px; text-align: right; font-size: 13px !important") Translators
                TWCalendar(:obj="project" placeholder="" field="DEADLINE_TRANSLATOR" :change="updateProject" :disabled="project.PROJECT_TYPE === C_.ptProofread" forceToBottom)
            .field.inline.vertical-center(style="display: flex")
                label(style="display: inline-block; width: 80px; text-align: right; font-size: 13px !important") Proofreaders
                TWCalendar(:obj="project" placeholder="" field="DEADLINE_PROOFREADER" :change="updateProject" :disabled="project.PROJECT_TYPE === C_.ptTranslate" forceToBottom)
            h5.ui.dividing.header(style="margin-top: 2px !important")
            .field
                label Instructions for project managers
                TWTextArea(:rows="4" :obj="project" field="WORK_DETAILS" :change="updateProject")
            .field
                label Instructions for translators
                TWTextArea(:rows="4" :obj="project" field="SPECIAL_INSTRUCTIONS" :change="updateProject")
            .field
                label Quote comments
                TWTextArea(:rows="4" :obj="project" field="QUOTE_COMMENTS" :change="updateProject")
</template>

<script>
import { store, cmg, utils, constants as C_ } from "../CoreModules"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import DeadlinesOverview from "./Components/ProjectDeadlinesOverview"

export default {
    mixins: [CoreMixinManagers],

    components: {
        DeadlinesOverview
    },

    props: {
        project: Object
    },

    data() {
        return {
            showLanguagePairsEditor: false
        }
    },

    created() {
        this.C_ = C_
    },

    methods: {
        async addTargetLanguage() {
            const response = await this.$showDialog({
                message: `Add a target language to project ${this.project.PROJECT_NUMBER}:`,
                dropdownDefaultText: "Select a target language",
                dropdownItems: store.languages,
                dropdownKey: "LANGUAGE",
                dropdownField: "PK",
                dropdownIsSearchable: true
            })

            if (response.selection === "OK" && response.value) {
                let hasThisTargetLanguage = false
                this.project.subprojects().forEach(subproject => {
                    if (subproject.LANGUAGE_ID === response.value) hasThisTargetLanguage = true
                })

                if (!hasThisTargetLanguage) {
                    const subproject = {
                        table: "SUBPROJECTS",
                        PROJECT_ID: this.project.PK,
                        LANGUAGE_ID: response.value
                    }
                    cmg.insertObject(subproject)
                }
            }
        },

        async deleteTargetLanguage(subproject) {
            // Check if the subproject has assigned translations and show a warning
            const hasAssignedTranslations = store.translations.filter(
                translation => translation.SUBPROJECT_ID === subproject.PK && [C_.tsTranslating, C_.tsProofreading].includes(translation.STATUS)
            ).length

            if (hasAssignedTranslations)
                if (!(await this.$dialogCheck("This target language has translators assigned to it. Are you sure you want to delete it? This will also delete the assignments.")))
                    return

            // Delete all the translations of this supbroject
            store.translations.filter(translation => translation.SUBPROJECT_ID === subproject.PK).forEach(translation => cmg.deleteObject(translation))

            // Delete the subproject
            cmg.deleteObject(subproject)
        },

        updateProject(field, value) {
            if (field === "CLIENT_ORDER_NUMBER") value = utils.returnsToSpaces(value)

            if (field === "SOURCE_WORDS") store.addToProjectsHistory(this.project, C_.phActionWithDetails, `changed the source words from ${this.project.SOURCE_WORDS} to ${value}`)

            if (field === "DEADLINE" && [C_.psCompleted, C_.psCompletedAfterReopen].includes(this.project.STATUS)) {
                if (!store.permissions.changeDeadlineOfCompletedProject) {
                    this.$showMessage("You are not allowed to change the deadline of a completed project.")
                    return
                }
            }

            cmg.updateObject(this.project, field, value)

            if (field === "IS_CERTIFIED") this.$showMessage("Please go to the pricing page and make sure that the payment method is set correctly.")
            if (field === "IS_NOTARIZED" && value === 1 && !this.project.IS_CERTIFIED) this.updateProject("IS_CERTIFIED", 1)
        },

        updateProjectPriority(field, value) {
            cmg.updateObject(this.project, "PRIORITY", value ? 2 : 0)
        },

        async updateProjectType(field, value) {
            if (this.shouldIgnoreNextCheckboxEvent) return

            // Check if there are any assigned translators / proofreaders and don't allow the change if any
            let hasAssignedTranslations = false
            if (field === "TRANSLATE" && !value) {
                for (let translation of this.project.assignedTranslations()) if (translation.STATUS === C_.tsTranslating) hasAssignedTranslations = true
                this.shouldIgnoreNextCheckboxEvent = true
                this.$refs.CheckboxTranslate.setChecked(true)
                setTimeout(() => (this.shouldIgnoreNextCheckboxEvent = false), 500)
                if (this.$checkWithMessage(hasAssignedTranslations, "Please unassign all translators before removing the Translate option.")) return
            }
            if (field === "PROOFREAD" && !value) {
                for (let translation of this.project.assignedTranslations()) if (translation.STATUS === C_.tsProofreading) hasAssignedTranslations = true
                this.shouldIgnoreNextCheckboxEvent = true
                this.$refs.CheckboxProofread.setChecked(true)
                setTimeout(() => (this.shouldIgnoreNextCheckboxEvent = false), 500)
                if (this.$checkWithMessage(hasAssignedTranslations, "Please unassign all proofreaders before removing the Proofread option.")) return
            }

            // The current values
            let projectType = this.project.PROJECT_TYPE
            let hasTranslation = [C_.ptTranslate, C_.ptTranslateProofread].includes(projectType)
            let hasProofreading = [C_.ptProofread, C_.ptTranslateProofread].includes(projectType)

            // Updating the values based on the selection
            if (field === "TRANSLATE") hasTranslation = value
            if (field === "PROOFREAD") hasProofreading = value

            // Update the projectType
            if (hasTranslation && hasProofreading) projectType = C_.ptTranslateProofread
            else if (hasTranslation) projectType = C_.ptTranslate
            else projectType = C_.ptProofread

            this.project.PROJECT_TYPE = projectType
            cmg.updateObject(this.project, "PROJECT_TYPE", projectType)
        },

        async updateImportantInformation() {
            if (this.shouldSkipImportantInformationChecking) return
            this.shouldSkipImportantInformationChecking = true
            const information = await store.updateProjectImportantInformation(this.project)
            this.$refs.CheckboxImportantInformation.setChecked(information.trim() ? true : false)
            this.shouldSkipImportantInformationChecking = false
        }
    },

    computed: {
        subprojects() {
            if (!this.project) return []
            return this.project.subprojects()
        },

        languagePairs() {
            const sourceLanguage = store.languageName(this.project.SOURCE_LANGUAGE_ID)
            if (!this.subprojects.length) return `Source: ${sourceLanguage}`

            let result = sourceLanguage + " ➜ "
            this.subprojects.forEach(subproject => {
                result += store.languageName(subproject.LANGUAGE_ID)
                if (subproject.INTERMEDIATE_LANGUAGE_ID) result += ` (via ${store.languageName(subproject.INTERMEDIATE_LANGUAGE_ID)})`
                result += ", "
            })

            return result.slice(0, -2)
        },

        studentHasDiscount() {
            if (!this.project || !this.project.PK) return false
            return this.project.STUDENT_DISCOUNT === 1
        },

        projectPriority() {
            if (!this.project || !this.project.PK) return false
            return this.project.PRIORITY === 2
        },

        hasImportantInformation() {
            if (!this.project || !this.project.PK) return false
            return utils.isNotBlank(this.project.IMPORTANT_INFORMATION)
        }
    },

    watch: {
        project() {
            this.showLanguagePairsEditor = false
        }
    }
}
</script>

<style scoped>
#projects-details-wrapper {
    margin-top: -15px;
    padding: 0 10px;
    background: none;
}

.target-languages-wrapper {
    width: 100%;
    padding: 10px;
    background-color: white;
    border: 1px solid lightgrey;
    border-radius: 5px;
    margin-bottom: 10px;
}
</style>
