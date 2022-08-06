<template lang="pug">
div(style="height: 100%") 
    #assigned-translators-list-deadlines
        #subprojects-list
            .subproject-row(v-for="subproject in subprojects" :class="subproject === selectedSubproject && 'selected-subproject'" @click="selectSubproject(subproject)")
                div {{ store.languageName(subproject.LANGUAGE_ID) + (subproject.ALLOW_PROOFREADERS_SPECIAL ? " *" : "") + (subproject.INTERMEDIATE_LANGUAGE_ID ? ` [${store.languageName(subproject.INTERMEDIATE_LANGUAGE_ID).slice(0, 3)}]` : "") }}  
                div(v-if="subproject.INTERMEDIATE_LANGUAGE_ID" style="margin-left: 10px")
                    img(src="/static/icons/Projects/Subprojects/ProjectsIntermediateLanguage.svg" width="13")
        #translations-list-empty(v-if="!selectedSubproject") Select a target language  
        #translations-list-empty(v-else-if="!translations.length") No translators were assigned yet 
        #translations-list(v-else)
            ProjectDeadlinesRow(v-for="obj in translations" :key="obj.PK" :translation="obj" :project="project" :subproject="selectedSubproject" @showEmployeeContextMenu="employeeContextMenu")
        EmployeeContextMenu(ref="employeeContextMenu" showGoToDetails)
</template>

<script>
import { store, cmg } from "../../CoreModules"
import ProjectComponentsMixin from "./ProjectComponentsMixin"
import ProjectDeadlinesRow from "./ProjectDeadlinesRow"
import EmployeeContextMenu from "../../EmployeeContextMenu"

export default {
    props: {
        project: Object
    },

    data() {
        return {
            selectedSubproject: undefined,
            filter: { noReply: false, inactive: false }
        }
    },

    mixins: [ProjectComponentsMixin],

    components: {
        ProjectDeadlinesRow,
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

            const translations = store.translations.filter(translation => {
                if (this.selectedSubproject.PK != translation.SUBPROJECT_ID) return false
                if (!translation.isAssigned()) return false
                const emp = store.employee(translation.EMPLOYEE_ID)
                if (!emp) return false
                return true
            })

            return translations.sort((a, b) => a.STATUS - b.STATUS)
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

        employeeContextMenu(event, employee) {
            this.$refs.employeeContextMenu.show(event, employee)
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
            }
        },

        subprojects(newValue, oldValue) {
            if (newValue.length === 1) this.selectedSubproject = newValue[0]
        }
    }
}
</script>

<style scoped>
#assigned-translators-list-deadlines {
    display: flex;
    height: 100%;
}

#subprojects-list {
    border: 1px solid lightgray;
    border-radius: 5px;
    background-color: white;
    min-width: 120px;
    margin-right: 10px;
    overflow: auto;
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
    width: 0;
}

#translations-list-empty {
    background-color: white;
    border: 1px solid lightgray;
    border-radius: 5px;
    flex: 1 1 auto;
    text-align: center;
    padding-top: 30px;
    color: grey;
}
</style>
