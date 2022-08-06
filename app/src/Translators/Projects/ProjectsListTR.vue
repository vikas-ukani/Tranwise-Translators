<template lang="pug">
#list-wrapper
    RecycleScroller.scroller(ref="scroller" :items="projects" :item-size="40" key-field="PK")
        .list-item-container(slot-scope="{item}" @click="selectProject(item, $event)" :class="{'list-item-selected': subproject.PK && subproject.PK == item.PK}" :style="{ height: '40px' }")
            ProjectsListRow(:itemInfo="item")
</template>

<script>
import store from "../Store/StoreTR"
import C_ from "../ConstantsTR"
import utils from "../UtilsTR"
import { RecycleScroller } from "vue-virtual-scroller"
import "vue-virtual-scroller/dist/vue-virtual-scroller.css"
import ProjectsListRow from "./ProjectsListRowTR"

export default {
    components: {
        RecycleScroller,
        ProjectsListRow
    },

    props: {
        project: Object,
        subproject: Object,
        translation: Object,
        statusFilters: Array,
        shouldSortByDeadline: Boolean,
        projectNumberFilter: String
    },

    computed: {
        projects() {
            const itemsList = {}

            store.subprojects.forEach(subproject => {
                if (!subproject || !subproject.PK) return

                if (store.loadOlderProjectsStatus === 1 && !subproject.initial) return

                const project = subproject.project()
                if (!project) return

                if (store.myself.canWorkOnProject(project, subproject)) itemsList[subproject.PK] = { PK: subproject.PK, project, subproject }
            })

            // In the itemsList generated above, add any existing translations
            store.translations.forEach(translation => {
                if (!translation || !translation.PK) return

                if (store.loadOlderProjectsStatus === 1 && !translation.initial) return

                if (translation.EMPLOYEE_ID != store.myself.PK) return
                const subproject = translation.subproject()
                if (!subproject) return
                const project = subproject.project()
                if (!project) return

                if (!project.SOURCE_LANGUAGE_ID || !subproject.LANGUAGE_ID) return

                let item = itemsList[translation.SUBPROJECT_ID]
                // If the item was not found in the list, add it now
                if (!item) {
                    item = { PK: subproject.PK, project, subproject, translation }
                    itemsList[translation.SUBPROJECT_ID] = item
                }

                item.translation = translation
                if (translation.STATUS === C_.tsTranslating) item.translationAssignedInitial = "T"
                if (translation.STATUS === C_.tsProofreading) item.translationAssignedInitial = "P"
            })

            // Filter out all the subprojects of projects that don't have a translation and are not Pending, InTranslation, Reopened
            // (eg. remove the projects that are still a quote, in case we got any - we shouldn't)
            const openedStatuses = [C_.psPending, C_.psTranslation, C_.psReopened]

            let result = Object.values(itemsList).filter(item => {
                if (item.translation && item.translation.STATUS) return true
                if (!openedStatuses.includes(item.project.STATUS)) return false
                return true
            })

            result.forEach(item => {
                // Set the status of the item, to be used on the icon and for filtering
                item.status = this.itemStatus(item)

                // Set the language pair to be displayed
                const sourceLanguage = item.subproject.sourceOrIntermediate()
                const targetLanguage = item.subproject.targetOrIntermediate()
                item.languagePair = sourceLanguage.substring(0, 3) + " > " + targetLanguage.substring(0, 3)
            })

            // If we have a text in the filter, used it to filter the projects (and don't take into account the
            // status icons selected at the top)
            if (this.projectNumberFilter) {
                result = result.filter(
                    item =>
                        item.project.PROJECT_NUMBER.includes(this.projectNumberFilter) ||
                        (this.projectNumberFilter.length > 2 && item.languagePair.toUpperCase().includes(this.projectNumberFilter))
                )
            }
            // Filter out the items that don't match the filters selected at the top
            else result = result.filter(item => this.statusFilters.includes(item.status))

            const sortByProjectNumber = function(a, b) {
                return parseInt(b.project.PROJECT_NUMBER.substring(2), 10) - parseInt(a.project.PROJECT_NUMBER.substring(2), 10)
            }

            const sortByDeadline = function(a, b) {
                // By default, use the project number (only the digits) for sorting
                let deadlineA = parseInt(a.project.PROJECT_NUMBER.substring(2), 10)
                let deadlineB = parseInt(b.project.PROJECT_NUMBER.substring(2), 10)

                // But if the item has a translation and it is assigned, use the project's deadline for translator or proofreader
                if (a.translation) {
                    if (a.translation.STATUS === C_.tsTranslating) deadlineA = a.project.DEADLINE_TRANSLATOR
                    if (a.translation.STATUS === C_.tsProofreading) deadlineA = a.project.DEADLINE_PROOFREADER
                }
                if (b.translation) {
                    if (b.translation.STATUS === C_.tsTranslating) deadlineB = b.project.DEADLINE_TRANSLATOR
                    if (b.translation.STATUS === C_.tsProofreading) deadlineB = b.project.DEADLINE_PROOFREADER
                }

                return deadlineB - deadlineA
            }

            result.sort(this.shouldSortByDeadline ? sortByDeadline : sortByProjectNumber)

            if (this.statusFilters.includes("CompletedByAll") || this.statusFilters.includes("Cancelled"))
                if (store.loadOlderProjectsStatus === 0) result.push({ loadOlderProjects: true })
            if (store.loadOlderProjectsStatus === 1) result.push({ loadOlderProjects: true, isLoading: true })

            return result
        }
    },

    methods: {
        selectProject(item, event) {
            this.$emit("selectProject", item, event.metaKey || event.ctrlKey)
        },

        itemStatus(item) {
            // If there is no translation reply
            if (!item.translation) return "New"

            const trStatus = item.translation.STATUS

            // If the project is cancelled or the translator was unassigned
            if (item.project.STATUS === C_.psCancelled || trStatus === C_.tsUnassignedTranslation || trStatus === C_.tsUnassignedProofreading) return "Cancelled"

            // If the translator is assigned
            if ([C_.tsTranslating, C_.tsProofreading].includes(trStatus)) {
                if ([C_.psCompleted, C_.psCompletedAfterReopen].includes(item.project.STATUS)) return "CompletedByAll"
                if (item.project.STATUS === C_.psReopened) return item.subproject.IS_REOPENED ? "InProgress" : "Completed"
                return item.translation.UPLOADED_ALL_FILES ? "Completed" : "InProgress"
            }

            return item.translation.REPLY ? "Replied" : "New"
        },

        async scrollToProject(project) {
            await utils.delay(300)

            let count = 0
            for (let item of this.projects)
                if (item.project && item.project.PK === project.PK) break
                else count++

            this.$refs.scroller.scrollToItem(count - 5)
        },

        async scrollToSubproject(subproject) {
            await utils.delay(300)

            let count = 0
            for (let item of this.projects)
                if (item.subproject && item.subproject.PK === subproject.PK) break
                else count++

            this.$refs.scroller.scrollToItem(count - 5)
        }
    },

    watch: {
        translation() {}
    }
}
</script>

<style scoped>
#list-wrapper {
    height: 0;
    flex: 1 1 auto;
    background-color: white;
    overflow: auto;
    border-right: solid 1px #bfc2c4;
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
