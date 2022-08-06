<template lang="pug">
PageBase(headerText="Projects" :headerWidth="90")
    #header-buttons-wrapper(slot="header-buttons")
        i.question.circle.outline.icon.large.clickable(style="margin: 20px 120px 0 20px; color: #ccccdd" @click="showProjectsHelp")
        img.button-image(src="/static/icons/Projects/ProjectsMain/ProjectsButtonCreate.svg" width="28" @click="createProject" style="margin: 0 15px 0 0")
        img.button-image(src="/static/icons/Projects/ProjectsMain/ProjectsButtonDetails.svg" width="28" @click="changeActiveDetailsComponent('ProjectsDetailsPage')")
        img.button-image(src="/static/icons/Projects/ProjectsMain/ProjectsButtonFiles.svg" width="28" @click="changeActiveDetailsComponent('ProjectsFilesPage')")
        img.button-image(src="/static/icons/Projects/ProjectsMain/ProjectsButtonPricing.svg" width="28" v-if="shouldShowPricingButton" @click="changeActiveDetailsComponent('ProjectsPricingPage')")
        img.button-image(src="/static/icons/Projects/ProjectsMain/ProjectsButtonMessages.svg" width="28" @click="changeActiveDetailsComponent('ProjectsCertifiedPage')")
        img.button-image(src="/static/icons/Projects/ProjectsMain/ProjectsButtonAssignment.svg" width="28" @click="changeActiveDetailsComponent('ProjectsAssignmentPage')")
        img.button-image(src="/static/icons/Projects/ProjectsMain/ProjectsButtonDeadlines.svg" width="28" @click="changeActiveDetailsComponent('ProjectsDeadlinesPage')")
        img.button-image(src="/static/icons/Projects/ProjectsMain/ProjectsButtonDeliveries.svg" width="28" @click="changeActiveDetailsComponent('ProjectsDeliveriesPage')")
        img.button-image(src="/static/icons/Projects/ProjectsMain/ProjectsButtonShipping.svg" width="28" @click="changeActiveDetailsComponent('ProjectsShippingPage')")
        img.button-image(src="/static/icons/Projects/ProjectsMain/ProjectsButtonServices.svg" width="28" @click="changeActiveDetailsComponent('ProjectsServicesPage')")
        img.button-image(src="/static/icons/Projects/ProjectsMain/ProjectsButtonReopened.svg" width="28" @click="changeActiveDetailsComponent('ProjectsReopenedPage')")
        img.button-image(v-show="project.IMPORTANT_INFORMATION" src="/static/icons/Projects/ProjectsMain/ProjectsImportantInformation.svg" width="28" @click="updateImportantInformation")
        #projects-summary-details
            p.clickable(@click="showPaidQuotes") {{ paidQuotesLabel }}
            p.clickable(@click="goToOverdueProjects") {{ certifiedTranslationsToCloseLabel }}
            p.clickable() {{ digitalCertificateToCloseLabel }}
    #contents(slot="page-contents")
        #list-container(:style="{ 'flex-basis': '230px' }")
            #projects-list-status-buttons
                img.projects-list-status-button(src="/static/icons/Projects/ProjectsMain/ProjectStatusSetupFilter.svg"  @click="updateStatusFilters(C_.psSetup, $event)" :style="{opacity: statusFilters.includes(C_.psSetup) ? 1 : 0.3}")
                img.projects-list-status-button(src="/static/icons/Projects/ProjectsMain/ProjectStatusPending.svg" @click="updateStatusFilters(C_.psPending, $event)" :style="{opacity: statusFilters.includes(C_.psPending) ? 1 : 0.3}")
                img.projects-list-status-button(src="/static/icons/Projects/ProjectsMain/ProjectStatusInProgressTranslation.svg" @click="updateStatusFilters(C_.psTranslation, $event)" :style="{opacity: statusFilters.includes(C_.psTranslation) ? 1 : 0.3}")
                img.projects-list-status-button(src="/static/icons/Projects/ProjectsMain/ProjectStatusCompleted.svg" @click="updateStatusFilters(C_.psCompleted, $event)" :style="{opacity: statusFilters.includes(C_.psCompleted) ? 1 : 0.3}")
                img.projects-list-status-button(src="/static/icons/Projects/ProjectsMain/ProjectStatusCancelled.svg" @click="updateStatusFilters(C_.psCancelled, $event)" :style="{opacity: statusFilters.includes(C_.psCancelled) ? 1 : 0.3}")
                img.projects-list-status-button(src="/static/icons/Projects/ProjectsMain/ProjectStatusQuote.svg" @click="updateStatusFilters(C_.psQuote, $event)" :style="{opacity: statusFilters.includes(C_.psQuote) ? 1 : 0.3}")
            div(style="border-bottom: thin solid #aeb3b6")
            ProjectsList(ref="list" v-if="filterFunctions !== undefined" :project="project" @selectProject="selectProject" @selectPrequote="selectPrequote" :filter="filter" :statusFilters="statusFilters"
                :filterFunctions="filterFunctions" :clientForFilter="clientForProjectsFilter" :activeDetailsComponent="activeDetailsComponent")
            ProjectsFilter(ref="filter" @applyFilter="applyFilter" :filterTitle="filterTitle" :statusFilters="statusFilters" @updateStatusFilters="updateStatusFilters")
        #projects-main-container(v-show="project.PK")
            ProjectsOverview(v-if="project && project.PK && project.table === 'PROJECTS'" :project="project" @addToHistory="addToHistory")
            ProjectsPrequotePage(v-if="project && project.PK && project.table === 'PREQUOTES'" :prequote="project" @addToHistory="addToHistory" @convertPrequote="convertPrequote")
            #active-details-component-container(v-else)
                component(v-if="project.PK" :is="activeDetailsComponent" :ref="activeDetailsComponent" :project="project" @addToHistory="addToHistory")
    .div-zero(slot="page-extras")
        ProjectsCreateDialog(ref="ProjectsCreateDialog" @receivedInsertedProject="receivedInsertedProject")
        ProjectsHelp()
</template>

<script>
import { store, cmg, constants as C_, utils } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import ProjectsOverview from "./ProjectsOverview"
import ProjectsCreateDialog from "./ProjectsCreate/ProjectsCreateDialog"
import ProjectsDetailsPage from "./ProjectsDetailsPage"
import ProjectsFilesPage from "./ProjectsFilesPage"
import ProjectsAssignmentPage from "./ProjectsAssignmentPage"
import ProjectsDeliveriesPage from "./ProjectsDeliveriesPage"
import ProjectsReopenedPage from "./ProjectsReopenedPage"
import ProjectsPricingPage from "./ProjectsPricingPage"
import ProjectsCertifiedPage from "./ProjectsCertifiedPage"
import ProjectsDeadlinesPage from "./ProjectsDeadlinesPage"
import ProjectsShippingPage from "./ProjectsShippingPage"
import ProjectsServicesPage from "./ProjectsServicesPage"
import ProjectsPrequotePage from "./ProjectsPrequotePage"
import ProjectsList from "./ProjectsList"
import ProjectsFilter from "./ProjectsFilter"
import ProjectsHelp from "./ProjectsHelp"

export default {
    mixins: [CoreMixin, CoreMixinManagers],

    components: {
        ProjectsList,
        ProjectsFilter,
        ProjectsOverview,
        ProjectsCreateDialog,
        ProjectsDetailsPage,
        ProjectsFilesPage,
        ProjectsAssignmentPage,
        ProjectsDeliveriesPage,
        ProjectsReopenedPage,
        ProjectsPricingPage,
        ProjectsDeadlinesPage,
        ProjectsShippingPage,
        ProjectsServicesPage,
        ProjectsCertifiedPage,
        ProjectsPrequotePage,
        ProjectsHelp
    },

    data() {
        return {
            pageState: ["project", "filter", "activeDetailsComponent", "statusFilters"],
            project: {},
            filter: "All",
            filterFunctions: undefined,
            activeDetailsComponent: "ProjectsDetailsPage",
            statusFilters: [C_.psQuote, C_.psSetup, C_.psPending, C_.psTranslation]
        }
    },

    props: {
        clientForProjectsFilter: Object,
        // When selecting an object from the search bar (or any other find method), the object is stored in this prop
        objectFromFind: Object
    },

    created() {
        this.C_ = C_
    },

    mounted() {
        // The filter functions are defined in ProjectsFilter and passed down to ProjectsList
        this.filterFunctions = this.$refs.filter.filterFunctions()

        // If objectFromFind is set, then we came here from a find request, so set the project to objectFromFind
        if (this.objectFromFind && this.objectFromFind.table === "PROJECTS") this.selectProject(this.objectFromFind.PK)

        // Scroll to the project with a little delay, as $refs.list is not defined yet
        setTimeout(() => {
            if (this.project.PK) this.$refs.list.scrollToProject(this.project)
        }, 100)

        // Set the reactiveCounter for all projects, so every item on the projects list gets updated
        // when reactiveCounter is increased every 1 minute from the timer set below
        for (let project of store.projects) if (project.reactiveCounter === undefined) this.$set(project, "reactiveCounter", 1)

        // Force refreshing the projects list rows every 1 minute (for the deadline / overdue)
        this.projectsListRefreshInterval = setInterval(() => {
            for (let project of store.projects) project.reactiveCounter && project.reactiveCounter++
        }, 1000 * 60)

        this.$nextTick(() => this.$refs.filter.setFilterNameForFilter(this.filter))
    },

    beforeDestroy() {
        clearTimeout(this.projectsListRefreshInterval)
    },

    computed: {
        // Used to show the filter name on the filter dropdown if the filter was selected from outside
        filterTitle() {
            return this.clientForProjectsFilter ? "Projects for client" : ""
        },

        certifiedTranslationsToCloseLabel() {
            const statuses = [C_.psPending, C_.psTranslation, C_.psProofreading, C_.psCheckPhase, C_.psReopened]
            let count = store.projects.filter(
                project => project.isOverdue() && !project.IS_DELIVERED && (project.IS_CERTIFIED || project.IS_NOTARIZED) && statuses.includes(project.STATUS)
            ).length
            return count ? `${count} CTs to be closed` : ""
        },

        digitalCertificateToCloseLabel() {
            const statuses = this.statusFilters.filter(status => status === C_.psCompleted);
            let count = store.projects.filter(
                // this.filter === "DigitalCertification" &&
                project =>  project.IS_DELIVERED && (project.IS_CERTIFIED || project.IS_NOTARIZED) && statuses.includes(project.STATUS)
            ).length
            return count ? `${count} DC to be send` : ""
        },

        paidQuotesLabel() {
            let count = store.projects.filter(project => [C_.psQuote, C_.psSetup].includes(project.STATUS) && project.PREPAYMENT_STATUS === C_.ppsPrepaymentDone).length
            return count ? `${count} paid quote${utils.pluralS(count)}` : ""
        },

        shouldShowPricingButton() {
            return store.myself.MANAGER_TYPE != C_.emtDeadline
        }
    },

    methods: {
        requestProjectDetails(project, forceReload) {
            cmg.requestObject(project, "PROJECTS_DETAILS", forceReload)
            cmg.requestObjectsForObject(
                project,
                [
                    "EMPLOYEES_FOR_PROJECT_FILES",
                    "EMPLOYEES_FOR_PROJECT_MESSAGES",
                    "EMPLOYEES_FOR_PROJECT_HISTORY",
                    "EMPLOYEES_FOR_PROJECT_TRANSLATIONS",
                    "SUBPROJECTS_FOR_PROJECT",
                    "PROJECTS_MESSAGES_FOR_PROJECT",
                    "PROJECTS_SERVICES_FOR_PROJECT",
                    "PROJECTS_PAYMENTS_FOR_PROJECT",
                    "PROJECTS_REFUNDS_FOR_PROJECT",
                    "PROJECTS_FILES_FOR_PROJECT",
                    "PROJECTS_HISTORY_FOR_PROJECT",
                    "TRANSLATIONS_FOR_PROJECT",
                    "INVOICE_FOR_PROJECT",
                    "CLIENT_DETAILS_FOR_PROJECT",
                    "EMPLOYEES_LANGUAGES_FOR_PROJECT_WITH_INTERMEDIATE_LANGUAGE_1",
                    "EMPLOYEES_LANGUAGES_FOR_PROJECT_WITH_INTERMEDIATE_LANGUAGE_2"
                ],
                forceReload
            ).then(this.$set(project, "isDataLoaded", true))
        },

        selectProject(pk, forceReload) {
            this.project = store.project(pk)
            this.requestProjectDetails(this.project, forceReload)
            this.$emit("addToHistory", { project: this.project })
        },

        selectPrequote(pk, forceReload) {
            this.project = store.prequote(pk)
        },

        changeActiveDetailsComponent(componentName) {
            this.activeDetailsComponent = componentName
        },

        createProject() {
            this.$refs.ProjectsCreateDialog.show()
        },

        convertPrequote(prequote) {
            this.$refs.ProjectsCreateDialog.showForPrequote(prequote)
        },

        showProjectsHelp() {
            this.showModal("#modal-projects-help")
        },

        goToOverdueProjects() {
            this.$emit("goToPage", "OverdueProjects")
        },

        showPaidQuotes() {
            this.applyFilter("PaidQuotes")
            this.$refs.filter.setFilterNameForFilter("PaidQuotes")
        },

        applyFilter(filter) {
            // This calls showProjectsForClient(null) in AppManagers, which resets the clientForFilter
            this.$emit("showProjectsForClient", null)
            this.filter = filter
            if (filter === "DigitalCertification" && this.activeDetailsComponent != "ProjectsDetailsPage") this.changeActiveDetailsComponent("ProjectsDetailsPage")
        },

        receivedInsertedProject(project) {
            this.selectProject(project.PK)
        },

        async updateImportantInformation() {
            store.updateProjectImportantInformation(this.project)
        },

        updateStatusFilters(status, event) {
            store.projects.forEach(project => {
                if (project.isFromFind) project.isFromFind = false
            })

            if (event && event.ctrlKey) {
                this.statusFilters.splice(0)
                this.statusFilters.push(status)
                return
            }

            if (this.statusFilters.includes(status)) this.statusFilters.splice(this.statusFilters.indexOf(status), 1)
            else this.statusFilters.push(status)
        }
    },

    watch: {
        objectFromFind(object, oldObject) {
            if (object && object !== oldObject && object.table === "PROJECTS") {
                this.selectProject(object.PK)
                this.$refs.list.scrollToProject(object)
            }
        },

        clientForProjectsFilter: {
            immediate: true,
            handler(object, oldObject) {
                // Clear the selected project when showing the projects for a client
                if (object && !oldObject) this.$nextTick(() => (this.project = {}))
            }
        }
    }
}
</script>

<style scoped>
#header-buttons-wrapper {
    display: flex;
}

#projects-summary-details {
    padding: 8px 0 5px 200px;
    line-height: 8px;
    text-align: right;
    font-size: 12px;
}

#projects-summary-details p {
    margin: 2px 0;
}

.button-image {
    margin: 0 6px;
    cursor: pointer;
}

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
    width: 28px;
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
    width: 10px;
    min-height: 100px;
}

#modal-create-project > .header {
    background-color: rgb(199, 226, 228);
}
</style>
