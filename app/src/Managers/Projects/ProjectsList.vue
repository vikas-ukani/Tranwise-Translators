<template lang="pug">
#list-wrapper
    RecycleScroller.scroller(ref="scroller" :items="projects" :item-size="40" key-field="PK")
        .list-item-container(slot-scope="{item}" @click="selectItem(item, $event)" :class="{'list-item-selected': project.PK == item.PK}" :style="{ height: '40px' }")
            ProjectsListRow(:project="item")   
</template>

<script>
import { store, cmg, utils, constants as C_ } from "../CoreModules"
import { RecycleScroller } from "vue-virtual-scroller"
import "vue-virtual-scroller/dist/vue-virtual-scroller.css"
import ProjectsListRow from "./ProjectsListRow"

export default {
    components: {
        RecycleScroller,
        ProjectsListRow
    },

    props: {
        project: Object,
        filter: String,
        activeDetailsComponent: String,
        clientForFilter: Object,
        filterFunctions: Object,
        statusFilters: Array
    },

    data() {
        return {
            prequotesStatusChanges: 0
        }
    },

    mounted() {
        store.eventBus.$on("prequoteStatusChange", () => {
            this.prequotesStatusChanges++
        })
    },

    computed: {
        projects() {
            if (this.prequotesStatusChanges) {
                // Forces a recomputing of the list
            }

            const sortByProjectNumber = function(a, b) {
                return parseInt(a.PROJECT_NUMBER.substring(2), 10) - parseInt(b.PROJECT_NUMBER.substring(2), 10)
            }

            const sortByDeadline = function(a, b) {
                return a.deadlineForSorting() - b.deadlineForSorting()
            }

            // If not showing projects for client, filter out the completed projects.
            // First filter out all the projects that don't have the STATUS set
            // (they were loaded for other purposes - eg. projects_messages)
            // If the filter is "Not shipped", include the completed projects as well
            let projects = store.projects.filter(p => {
                if (this.clientForFilter && p.CLIENT_ID != this.clientForFilter.PK) return false
                if (!p.STATUS) return false
                if (p.isFromFind) return true
                if (this.filter === "NotShipped") return true
                if (p.STATUS === C_.psQuote && !this.statusFilters.includes(C_.psQuote)) return false
                if (p.STATUS === C_.psSetup && !this.statusFilters.includes(C_.psSetup)) return false
                if (p.STATUS === C_.psPending && !this.statusFilters.includes(C_.psPending)) return false
                if (p.STATUS === C_.psTranslation && !this.statusFilters.includes(C_.psTranslation)) return false
                if (p.STATUS === C_.psProofreading && !this.statusFilters.includes(C_.psTranslation)) return false
                if (p.STATUS === C_.psCheckPhase && !this.statusFilters.includes(C_.psTranslation)) return false
                if (p.STATUS === C_.psReopened && !this.statusFilters.includes(C_.psTranslation)) return false
                if (p.STATUS === C_.psCompleted && !this.statusFilters.includes(C_.psCompleted)) return false
                if (p.STATUS === C_.psCompletedAfterReopen && !this.statusFilters.includes(C_.psCompleted)) return false
                if (p.STATUS === C_.psCancelled && !this.statusFilters.includes(C_.psCancelled)) return false
                return true
            })

            if (this.clientForFilter) return projects.sort(sortByProjectNumber)

            // For certain pages (on the details side), show only some project types
            if (this.activeDetailsComponent === "ProjectsAssignmentPage") projects = projects.filter(p => p.STATUS === C_.psPending || p.STATUS === C_.psReopened)
            if (this.activeDetailsComponent === "ProjectsDeadlinesPage") projects = projects.filter(p => p.isInProgress())
            if (this.activeDetailsComponent === "ProjectsReopenedPage") projects = projects.filter(p => p.STATUS === C_.psReopened)
            if (this.activeDetailsComponent === "ProjectsShippingPage") projects = projects.filter(p => p.SHOULD_BE_SENT_BY_POST)

            const prequotes = store.prequotes.filter(prequote => [C_.pqPending, C_.pqSetup].includes(prequote.STATUS))

            if (!this.filter || this.filter === "All") {
                // If the projects weren't filtered above (ie. projects points to the store array), make a copy of the array,
                // as projects.sort() would sort the store array, messing up the store.
                if (projects === store.projects) projects = [...store.projects]
                return [...projects.sort(sortByProjectNumber), ...prequotes]
            }

            // If the filter is deadline-related, sort the projects by deadline
            let sortFunction = ["DeadlineToday", "DeadlineOnDate", "DeadlineOnMonth", "DeadlinePassed"].includes(this.filter) ? sortByDeadline : sortByProjectNumber

            return [...projects.filter(this.filterFunctions[this.filter]).sort(sortFunction), ...prequotes]
        }
    },

    methods: {
        selectItem(item, event) {
            const action = item.table === "PREQUOTES" ? "selectPrequote" : "selectProject"
            this.$emit(action, item.PK, event.metaKey || event.ctrlKey)
        },

        async scrollToProject(project) {
            await utils.delay(500)
            let count = 0
            for (let item of this.projects) {
                if (item.PK === project.PK) break
                count++
            }
            this.$refs.scroller.scrollToItem(count - 5)
        }
    }
}
</script>

<style scoped>
#list-wrapper {
    flex: 1 1 auto;
    background-color: white;
    overflow: auto;
    border-right: solid 1px #bfc2c4;
    height: 0;
}

.list-item-container {
    white-space: nowrap;
    cursor: default;
}

.list-item-selected {
    background-color: rgb(247, 247, 247);
    border-top: 1px solid #e2e2e2;
    border-bottom: 1px solid #e2e2e2;
    box-sizing: border-box;
    color: rgb(0, 0, 0);
}

.vue-recycle-scroller__item-view.hover {
    background-color: rgb(240, 246, 248);
}
</style>
