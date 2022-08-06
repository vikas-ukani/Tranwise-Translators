<template lang="pug">
div(style="display: flex; flex-direction: column; height: 100%")
    div(style="display: flex")
        div(style="width: 150px") {{ intermediateLanguage + "&nbsp;" }}
        .ui.form
            .fields.inline
                .field(style="padding-right: 20px")
                    TWCheckbox(ref="filterNoReply" label="Show translators who didn't reply" :change="filterTranslators" :obj="filter" field="noReply")
                .field(style="padding-right: 20px")
                    TWCheckbox(ref="filterInactive" label="Show inactive translators" :change="filterTranslators" :obj="filter" field="inactive")
    #assigned-translators-list
        #subprojects-list
            .subproject-row(v-for="subproject in subprojects" :class="subproject === selectedSubproject && 'selected-subproject'" @contextmenu.prevent="subprojectsContextMenu($event, subproject)" @click="selectSubproject(subproject)")
                div {{ store.languageName(subproject.LANGUAGE_ID) + (subproject.ALLOW_PROOFREADERS_SPECIAL ? " *" : "") }}  
                div(v-if="subproject.INTERMEDIATE_LANGUAGE_ID" style="margin-left: 10px")
                    img(src="/static/icons/Projects/Subprojects/ProjectsIntermediateLanguage.svg" width="13")
        #translations-list-empty(v-if="!selectedSubproject") Select a target language  
        #translations-list-empty(v-else-if="!translations.length") Nobody replied positively yet 
        #translations-list(v-else)
            ProjectAssignmentRow(v-for="(obj, index) in translations" :key="obj.PK" :index="index" :translation="obj" :project="project" :subproject="selectedSubproject" @showEmployeeContextMenu="employeeContextMenu")
        EmployeeContextMenu(ref="employeeContextMenu" showGoToDetails @remindEmployeeToConfirmAssignment="remindEmployeeToConfirmAssignment")
        TWContextMenu(ref="subprojectsContextMenu")
            .menu(slot="menu-items")
                .item(v-if="project.hasProofreading()" @click="allowProofreadersSpecial") {{  subprojectForContext && subprojectForContext.ALLOW_PROOFREADERS_SPECIAL ? "The proofreaders have been informed" : "Inform proofreaders that don't know this pair" }}
                .item(@click="informAllTranslatorsAgain") Inform all translators again
                .divider
                .item(v-if="subprojectForContext && !subprojectForContext.INTERMEDIATE_LANGUAGE_ID" @click="addIntermediateLanguage") Add intermediate language
                .item(v-if="subprojectForContext && subprojectForContext.INTERMEDIATE_LANGUAGE_ID" @click="replaceIntermediateLanguage") Replace intermediate language
                .item(v-if="subprojectForContext && subprojectForContext.INTERMEDIATE_LANGUAGE_ID" @click="removeIntermediateLanguage") Remove intermediate language
</template>

<script>
import { store, cmg, utils, constants as C_ } from "../../CoreModules"
import ProjectComponentsMixin from "./ProjectComponentsMixin"
import ProjectAssignmentRow from "./ProjectAssignmentRow"
import EmployeeContextMenu from "../../EmployeeContextMenu"

export default {
    props: {
        project: Object
    },

    data() {
        return {
            selectedSubproject: undefined,
            subprojectForContext: undefined,
            filter: { noReply: false, inactive: false }
        }
    },

    mixins: [ProjectComponentsMixin],

    components: {
        ProjectAssignmentRow,
        EmployeeContextMenu
    },

    computed: {
        subprojects() {
            if (!this.project) return []
            return this.project.subprojects()
        },

        subprojectsPKs() {
            return this.subprojects.map(subproject => subproject.PK)
        },

        translations() {
            if (!this.selectedSubproject) return []

            const translations = store.translations
                .filter(translation => {
                    if (this.selectedSubproject.PK != translation.SUBPROJECT_ID) return false

                    const emp = store.employee(translation.EMPLOYEE_ID)
                    if (!emp) return false

                    if (!this.filter.inactive && emp.monthsSinceLastLogin() >= 6 && translation.STATUS === 0) return false

                    return true
                })
                .sort((a, b) => {
                    // If the translator is assigned, show at the top of the list
                    if (a.STATUS) return 100 + a.STATUS
                    if (b.STATUS) return 100 + b.STATUS

                    // If none of the translators are assigned, sort by their reply
                    // Positive before negative and high rated translator before low rated translator

                    // The value for the reply
                    let result = (b.REPLY - a.REPLY) * 10

                    // If the replies are identical, add a value for rating
                    // Sort high rated translator before low rated translator
                    if (a.REPLY === b.REPLY) {
                        const empA = store.employee(a.EMPLOYEE_ID)
                        const empB = store.employee(b.EMPLOYEE_ID)
                        const empARating = empA ? utils.unity(empA.PLUS_POINTS - empA.MINUS_POINTS) : 0
                        const empBRating = empB ? utils.unity(empB.PLUS_POINTS - empB.MINUS_POINTS) : 0
                        result += empBRating - empARating
                    }

                    return result
                })

            if (!this.filter.noReply) return translations

            // Get a list of employee IDs for all the translators. Used below to exclude the employees that could translate
            // if they are already in the list of translations
            const employeeIDsForTranslations = translations.map(translation => translation.EMPLOYEE_ID)

            // Get the employees that could translate the project but did not reply

            // First get all the employeesLanguages that match the language pair (which include the employees' IDs)
            const employeesLanguages = store.employeesLanguages.filter(
                el => el.SOURCE_LANGUAGE_ID === this.project.SOURCE_LANGUAGE_ID && el.TARGET_LANGUAGE_ID === this.selectedSubproject.LANGUAGE_ID
            )

            // Get a list of all the PKs of employees that could translate
            const employeesIDs = []
            employeesLanguages.forEach(el => employeesIDs.push(el.EMPLOYEE_ID))

            // Get the list of all the employees that could translate
            const employees = store.employees.filter(employee => {
                if (!employeesIDs.includes(employee.PK)) return false
                if (!this.filter.inactive && employee.monthsSinceLastLogin() >= 6) return false
                // Exclude the employees that already have a TRANSLATIONS record
                if (employeeIDsForTranslations.includes(employee.PK)) return false
                return true
            })

            return [...translations, ...employees]
        },

        intermediateLanguage() {
            return this.selectedSubproject && this.selectedSubproject.INTERMEDIATE_LANGUAGE_ID ? "Int: " + store.languageName(this.selectedSubproject.INTERMEDIATE_LANGUAGE_ID) : ""
        }
    },

    methods: {
        selectSubproject(subproject) {
            this.selectedSubproject = subproject
            this.project.lastSelectedSubproject = subproject
        },

        employeeContextMenu(event, employee, translation) {
            this.$refs.employeeContextMenu.show(event, employee, translation)
        },

        subprojectsContextMenu(event, item) {
            this.subprojectForContext = item
            if (!this.subprojectForContext) return
            this.$refs.subprojectsContextMenu.show(event)
            if (window.getSelection) window.getSelection().removeAllRanges()
        },

        async allowProofreadersSpecial() {
            if (!this.subprojectForContext) return
            if (this.subprojectForContext && this.subprojectForContext.ALLOW_PROOFREADERS_SPECIAL) return
            if (await this.$dialogCheck("Are you sure you want to inform the translators that don't know this language pair, but have the native language?"))
                cmg.updateObject(this.subprojectForContext, "ALLOW_PROOFREADERS_SPECIAL", true)
        },

        /* prettier-ignore */
        async informAllTranslatorsAgain() {
            if (!this.subprojectForContext) return
            if (this.$checkWithMessage(this.project.STATUS != C_.psPending && !this.project.isInProgress(), "You can only inform translators about projects that are either pending or in progress.")) return
            if (await this.$dialogCheck(`Are you sure you want to send another email to the translators that haven't replied, to inform them about target language ${this.subprojectForContext.languageName()}?`))
                cmg.sendMessage(cmg.messageHeaders.RESEND_SUBPROJECT_TO_TRANSLATORS, this.project.PK, this.subprojectForContext.PK)

        },

        // Return true if there is no subprojectForContext or the subproject has assigned translations.
        // Used in the 3 functions about intermediate language below.
        warnAboutAssignedTranslations() {
            if (!this.subprojectForContext) return true
            if (this.subprojectForContext.assignedTranslations().length) {
                this.$showMessage(
                    "This target language already has some translators assigned to it.\n\nPlease unassign the translators if you want to add an intermediate language."
                )
                return true
            }
            return false
        },

        async addIntermediateLanguage() {
            if (this.warnAboutAssignedTranslations()) return

            const response = await this.$showDialog({
                message: `Select the intermediate language to add to ${store.languageName(this.subprojectForContext.LANGUAGE_ID)}:`,
                dropdownDefaultText: "Select a intermediate language",
                dropdownItems: store.languages,
                dropdownKey: "LANGUAGE",
                dropdownField: "PK"
            })

            if (response.selection != "OK") return
            cmg.updateObject(this.subprojectForContext, "INTERMEDIATE_LANGUAGE_ID", response.value)
        },

        async replaceIntermediateLanguage() {
            if (this.warnAboutAssignedTranslations()) return

            const response = await this.$showDialog({
                message: `Select the new intermediate language for ${store.languageName(this.subprojectForContext.LANGUAGE_ID)}:`,
                dropdownDefaultText: "Select a intermediate language",
                dropdownItems: store.languages,
                dropdownKey: "LANGUAGE",
                dropdownField: "PK"
            })

            if (response.selection != "OK") return
            cmg.updateObject(this.subprojectForContext, "INTERMEDIATE_LANGUAGE_ID", response.value)
        },

        removeIntermediateLanguage() {
            if (this.warnAboutAssignedTranslations()) return
            cmg.updateObject(this.subprojectForContext, "INTERMEDIATE_LANGUAGE_ID", 0)
        },

        remindEmployeeToConfirmAssignment(employee) {
            const subprojectName = this.selectedSubproject ? "-" + this.selectedSubproject.languageName() : ""
            store.sendEmployeeMessage(employee, `Please confirm your assignment to ${this.project.PROJECT_NUMBER}${subprojectName} in Tranwise as soon as possible. Thank you!`)
        },

        filterTranslators(field, value) {
            this.$set(this.filter, field, value)
            if (value && !this.project.didRequestEmployeesThatCouldTranslate) {
                this.project.didRequestEmployeesThatCouldTranslate = true
                cmg.requestObjectsForObject(this.project, ["EMPLOYEES_THAT_COULD_TRANSLATE_PROJECT", "EMPLOYEES_LANGUAGES_FOR_EMPLOYEES_THAT_COULD_TRANSLATE_PROJECT"])
            }
        }
    },

    mounted() {
        if (this.project && this.project.lastSelectedSubproject) this.selectSubproject(this.project.lastSelectedSubproject)
        else if (this.subprojects.length === 1) this.selectSubproject(this.subprojects[0])
    },

    watch: {
        project(newValue, oldValue) {
            if (newValue !== oldValue) {
                this.selectedSubproject = null
                if ((this.filter.noReply || this.filter.inactive) && !this.project.didRequestEmployeesThatCouldTranslate) {
                    this.project.didRequestEmployeesThatCouldTranslate = true
                    cmg.requestObjectsForObject(this.project, ["EMPLOYEES_THAT_COULD_TRANSLATE_PROJECT", "EMPLOYEES_LANGUAGES_FOR_EMPLOYEES_THAT_COULD_TRANSLATE_PROJECT"])
                }
            }
        },

        subprojects(newValue, oldValue) {
            if (newValue.length === 1) this.selectedSubproject = newValue[0]
        }
    }
}
</script>

<style scoped>
#assigned-translators-list {
    display: flex;
    height: 100%;
    overflow: hidden;
}

#subprojects-list {
    border: 1px solid lightgray;
    border-radius: 5px;
    background-color: white;
    min-width: 100px;
    margin-right: 10px;
    overflow-y: auto;
}

.subproject-row {
    padding: 7px 10px;
    cursor: pointer;
    display: flex;
    width: 100%;
}

.subproject-row:first-of-type {
    border-top: none;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
    padding-bottom: 6px;
}

.selected-subproject {
    background-color: rgb(247, 247, 247);
    border-top: 1px solid #e2e2e2;
    border-bottom: 1px solid #e2e2e2;
    box-sizing: border-box;
    color: rgb(0, 0, 0);
    padding-bottom: 6px;
}

#translations-list {
    background-color: white;
    border: 1px solid lightgray;
    overflow-y: auto;
    border-radius: 5px;
    flex: 1 1 auto;
    max-height: 100%;
}

#translations-list-empty {
    background-color: white;
    border: 1px solid lightgray;
    border-radius: 0 0 5px 5px;
    flex: 1 1 auto;
    text-align: center;
    padding-top: 30px;
    color: grey;
}
</style>
