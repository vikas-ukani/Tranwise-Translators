<template lang="pug">
PageBase(headerText="Projects" :headerWidth="228")
    #replies-status(slot="header-buttons") {{ repliesStatusText }}
    #contents(slot="page-contents")
        #list-container(:style="{ 'flex-basis': '180px' }")
            #projects-list-status-buttons
                img.projects-list-status-button.tooltip(src="/static/icons/Projects/ProjectsMain/ProjectStatusNewFilter.svg"  @click="updateStatusFilters('New', $event)" data-tippy-content="New projects" :style="{opacity: statusFilters.includes('New') ? 1 : 0.3}")
                img.projects-list-status-button.tooltip(src="/static/icons/Projects/ProjectsMain/ProjectStatusReplied.svg" @click="updateStatusFilters('Replied', $event)" data-tippy-content="Projects you have replied to (not assigned)" :style="{opacity: statusFilters.includes('Replied') ? 1 : 0.3}")
                img.projects-list-status-button.tooltip(src="/static/icons/Projects/ProjectsMain/ProjectStatusInProgress.svg" @click="updateStatusFilters('InProgress', $event)" data-tippy-content="Projects you have been assigned to work on (in progress)" :style="{opacity: statusFilters.includes('InProgress') ? 1 : 0.3}")
                img.projects-list-status-button.tooltip(src="/static/icons/Projects/ProjectsMain/ProjectStatusCompleted.svg" @click="updateStatusFilters('Completed', $event)" data-tippy-content="Projects you have completed (you have uploaded all the files)" :style="{opacity: statusFilters.includes('Completed') ? 1 : 0.3}")
                img.projects-list-status-button.tooltip(src="/static/icons/Projects/ProjectsMain/ProjectStatusCompletedByAll.svg" @click="updateStatusFilters('CompletedByAll', $event)" data-tippy-content="Projects completed by the entire team" :style="{opacity: statusFilters.includes('CompletedByAll') ? 1 : 0.3}")
                img.projects-list-status-button.tooltip(src="/static/icons/Projects/ProjectsMain/ProjectStatusCancelled.svg" @click="updateStatusFilters('Cancelled', $event)" data-tippy-content="Canceled projects or projects you have been unassigned from" :style="{opacity: statusFilters.includes('Cancelled') ? 1 : 0.3}")
            .ui.icon.input
                input#input-filter-projects(type="text" v-model="projectNumberFilter" placeholder="Filter projects by number")
                i.close.link.icon(v-show="projectNumberFilter" @click="projectNumberFilter = ''")
            div(style="border-bottom: thin solid #aeb3b6")
            ProjectsList(ref="list" :project="project" :subproject="subproject" @selectProject="selectProject" :statusFilters="statusFilters" :projectNumberFilter="projectNumberFilter.toUpperCase()" :shouldSortByDeadline="sortByDeadline.CHECKED")
            #projects-list-footer
                TWCheckbox(label="Sort by deadline" :obj="sortByDeadline" :change="changeSortByDeadline" field="CHECKED")
        #projects-main-container(v-show="project.PK")
            ProjectsDetails(:project="project" :subproject="subproject" :translation="translation")
</template>

<script>
import store from "../Store/StoreTR"
import cmg from "../ConnectionManagerTR"
import C_ from "../ConstantsTR"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import TooltipMixin from "../../Shared/Mixins/TooltipMixin"
import ProjectsList from "./ProjectsListTR"
import ProjectsDetails from "./ProjectsDetailsTR"
import tippy from "tippy.js"

export default {
    mixins: [CoreMixin, TooltipMixin],

    components: {
        ProjectsList,
        ProjectsDetails
    },

    data() {
        return {
            pageState: ["project", "subproject", "translation", "statusFilters", "sortByDeadline", "projectNumberFilter"],
            project: {},
            subproject: {},
            translation: {},
            statusFilters: ["New", "Replied", "InProgress"],
            projectNumberFilter: "",
            sortByDeadline: {
                CHECKED: false
            }
        }
    },

    props: {
        // When selecting an object from the search bar (or any other find method), the object is stored in this prop
        objectFromFind: Object
    },

    created() {
        this.C_ = C_
    },

    mounted() {
        // If objectFromFind is set, then we came here from a find request, so set the project to objectFromFind
        if (this.objectFromFind && this.objectFromFind.table === "SUBPROJECTS") this.selectSubproject(this.objectFromFind)

        // Scroll to the project with a little delay, as $refs.list is not defined yet
        setTimeout(() => {
            if (this.project.PK) this.$refs.list.scrollToProject(this.project)
        }, 100)
    },

    computed: {
        computedTranslation() {
            // When a translation comes in, if it's for the selected subproject, set it to this.translation, so it's propagated to all the children
            for (let translation of store.translations) {
                if (translation.SUBPROJECT_ID === this.subproject.PK && translation.EMPLOYEE_ID === store.myself.PK && !this.translation.PK) {
                    this.translation = translation
                    break
                }
            }
        },

        repliesStatusText() {
            // If we are loading the older projects, return the previously computed text
            if (store.loadOlderProjectsStatus === 1) return this.lastRepliesStatusText

            // Make a list with all the subprojects that have a translation (their PKs)
            const subprojectIDsWithTranslation = []
            for (let translation of store.translations) subprojectIDsWithTranslation.push(translation.SUBPROJECT_ID)

            const languagePairs = []
            for (let empLang of store.employeesLanguages)
                if ((empLang.EMPLOYEE_ID = store.myself.PK)) languagePairs.push(empLang.SOURCE_LANGUAGE_ID + "-" + empLang.TARGET_LANGUAGE_ID)

            let count = 0
            let projectNumber = ""

            // Go through each subproject
            for (let subproject of store.subprojects) {
                const project = subproject.project()

                // Skip the projects that don't have the right status
                if (!project || [C_.psProofreading, C_.psCheckPhase, C_.psCompleted, C_.psCompletedAfterReopen].includes(project.STATUS)) continue

                // Skip the subprojects that are included in the list above (they have a translation)
                if (subprojectIDsWithTranslation.includes(subproject.PK)) continue

                if (store.myself.canWorkOnProject(project, subproject, languagePairs)) {
                    projectNumber = project.PROJECT_NUMBER
                    count++
                }
            }

            // Save the text so we can reuse it when loading the old projects
            if (count === 0) this.lastRepliesStatusText = ""
            else if (count === 1) this.lastRepliesStatusText = "Please reply to project " + projectNumber
            else this.lastRepliesStatusText = `You have not replied to ${count} projects`

            return this.lastRepliesStatusText
        }
    },

    methods: {
        requestProjectDetails(project, forceReload) {
            // Request the project's details
            cmg.requestObject(project, "PROJECTS_DETAILS_TR", forceReload)

            // Request the main files
            cmg.requestObjectsForObject(project, "MAIN_PROJECTS_FILES_FOR_PROJECT_TR", forceReload)

            // Request the CLIENTS_FILES for this project's client
            cmg.requestObjectsForObject(project, "CLIENTS_FILES_FOR_PROJECT_TR", forceReload)

            // If the translator is assigned (STATUS > 0) request the other translations (to see who else is working on the project),
            // the employees of the other translations, the translated files and the project messages
            if (this.translation && this.translation.STATUS > 0) {
                cmg.requestObjectsForObject(this.subproject, "TRANSLATIONS_FOR_SUBPROJECT_TR")
                cmg.requestObjectsForObject(this.subproject, "EMPLOYEES_FOR_SUBPROJECT_TR")
                cmg.requestDataWithMessage("REQUEST_TRANSLATED_FILES", this.subproject.PK)
                cmg.requestDataWithMessage("REQUEST_PROJECTS_MESSAGES_FOR_TRANSLATOR", this.subproject.PK)
            }

            // Request the translation details
            if (this.translation.PK) cmg.requestObject(this.translation, "TRANSLATION_DETAILS_TR", forceReload)
        },

        selectProject(item, forceReload) {
            // If clicked on the "Load older projects" text at the bottom of the list
            if (item.loadOlderProjects) {
                this.loadOlderProjects()
                return
            }

            this.project = item.project
            this.subproject = item.subproject
            this.translation = item.translation || {}
            this.requestProjectDetails(this.project, forceReload)
            this.$emit("addToHistory", { subproject: this.subproject })
        },

        async loadOlderProjects() {
            if (store.loadOlderProjectsStatus > 0) return

            store.loadOlderProjectsStatus = 1

            await cmg.requestObjectsForMyself("ALL_PROJECTS_FOR_TRANSLATIONS_TR")
            await cmg.requestObjectsForMyself("ALL_SUBPROJECTS_FOR_TRANSLATIONS_TR")
            await cmg.requestObjectsForMyself("ALL_TRANSLATIONS_FOR_EMPLOYEE_TR")

            store.subprojects.forEach(subproject => (subproject.projectObject = store.project(subproject.PROJECT_ID)))
            store.translations.forEach(translation => (translation.subprojectObject = store.subproject(translation.SUBPROJECT_ID)))

            store.loadOlderProjectsStatus = 2
        },

        selectSubproject(subproject, forceReload) {
            const item = { subproject, project: subproject.project() }
            this.selectProject(item)
        },

        updateStatusFilters(status, event) {
            if (event.ctrlKey) {
                this.statusFilters.splice(0)
                this.statusFilters.push(status)
                return
            }

            if (this.statusFilters.includes(status)) this.statusFilters.splice(this.statusFilters.indexOf(status), 1)
            else this.statusFilters.push(status)
        },

        changeSortByDeadline(field, value) {
            this.sortByDeadline.CHECKED = value == true
        }
    },

    watch: {
        objectFromFind(object, oldObject) {
            if (object && object !== oldObject && object.table === "SUBPROJECTS") {
                this.selectSubproject(object)
                this.$refs.list.scrollToSubproject(object)
            }
        },

        computedTranslation() {
            // Required so that computedTranslation() above is executed when a new translation comes in,
            // so that the translation gets selected
        }
    }
}
</script>

<style scoped>
#contents {
    height: 100%;
    width: 100%;
    display: flex;
    background: linear-gradient(to bottom, #f2f3f8 0%, #f4f4f5 10%, #f6fbfc 100%);
}

#projects-list-status-buttons {
    display: flex;
}

.projects-list-status-button {
    width: 24px;
    margin: 0 5px 7px 5px;
    cursor: pointer;
    filter: saturate(0);
    background-color: rgb(212, 212, 212);
    border-radius: 8px;
    padding-left: 5px;
    padding-right: 5px;
}

#list-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    flex-grow: 0;
    flex-shrink: 0;
}

#input-filter-projects {
    border-radius: 0;
    border: 0;
    border-bottom: 1px solid #cad0d3;
    border-top: 1px solid #cad0d3;
    border-right: 1px solid #cad0d3;
    margin-bottom: 1px;
}

#replies-status {
    margin-top: 20px;
    font-size: 14px;
    color: rgb(83, 145, 41);
}

#projects-main-container {
    padding: 0;
    height: 100%;
    width: 100%;
    max-width: 850px;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
}

#projects-main-wrapper {
    padding: 0;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
}

#active-details-component-container {
    height: 0;
    flex: 1 1 auto;
    overflow-y: auto;
    padding-bottom: 20px;
}

#active-details-component-container::-webkit-scrollbar {
    width: 3px;
}

#projects-list-footer {
    padding: 10px 7px;
    border-top: thin solid rgb(185, 185, 185);
    border-right: thin solid rgb(185, 185, 185);
    background-color: rgb(246, 249, 253);
}

#input-filter-projects {
    border-radius: 0;
    border: 0;
    border-bottom: 1px solid #cad0d3;
    border-top: 1px solid #cad0d3;
    border-right: solid 1px #cad0d3;
    margin-bottom: 1px;
}
</style>
