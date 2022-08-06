<template lang="pug">
PageBase(headerText="Overdue Projects")
    #table-wrapper(slot="page-contents" v-if="overdueProjects.length")
        ScrollableTable()
            thead(slot="thead")
                th.two.wide Project
                th.two.wide Status
                th.three.wide Deadline
                th.two.wide Overdue
                th.seven.wide Reason
            tbody(slot="tbody")
                tr(v-for="project in overdueProjects")
                    td.two.wide
                        .status-icon-wrapper
                            img(:src="utils.projectStatusIconName(project.STATUS)") 
                        .project-number-wrapper(:class="{ 'project-on-hold' : project.IS_ON_HOLD }") {{ project.PROJECT_NUMBER }}
                            i.icon.external.alternate.small.icon-go-to-project(@click="goToProject(project)")
                    td.two.wide {{ constants.projectStatusNames[project.STATUS] }}
                    td.three.wide {{ utils.formatDate(project.deadline(), "ll&nbsp;&nbsp;&nbsp;HH:mm") }}
                    td.two.wide {{ overdueTimeString(project) }}
                    td.seven.wide(@click="editOverdueReason(project)" :class="{ 'overdue-reason-red' : project.IS_CERTIFIED }" style="overflow: hidden") {{ overdueReasonString(project) }}
            tfoot(slot="tfoot")
                tr
                    th(colspan="5") {{ overdueProjects.length }} overdue projects
    div(v-else)
        p There are no overdue projects
</template>

<script>
import { store, cmg, constants as C_, utils } from "../CoreModules"
import moment from "moment"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import ScrollableTable from "../../Shared/components/ScrollableTable"

export default {
    mixins: [CoreMixin, CoreMixinManagers],

    components: { ScrollableTable },

    data() {
        return {
            projects: undefined
        }
    },

    computed: {
        overdueProjects() {
            const statuses = [C_.psSetup, C_.psPending, C_.psTranslation, C_.psProofreading, C_.psCheckPhase, C_.psReopened]
            this.projects = store.projects.filter(project => {
                if (!statuses.includes(project.STATUS)) return false

                let deadlineTime = project.deadline()

                // Add two days to the deadline if the project is certified
                if (project.IS_CERTIFIED) deadlineTime += 2 * 24 * 3600
                return store.serverTime() > deadlineTime
            })
            return this.projects
        }
    },

    methods: {
        goToProject(project) {
            this.$emit("goToObject", project)
        },

        async editOverdueReason(project) {
            const response = await this.$showDialog({
                header: "Overdue reason",
                message: `Update the overdue reason for project ${project.PROJECT_NUMBER}:`,
                textAreaText: project.OVERDUE_REASON,
                buttons: ["Cancel", "Save"],
                buttonClasses: ["", "positive"]
            })

            if (response.selection === "Save") {
                cmg.updateObject(project, "OVERDUE_REASON", response.text)
            }
        },

        overdueTimeString(project) {
            const deadlineTime = project.deadline()
            const minutesOverdue = Math.abs(Math.floor((deadlineTime - store.serverTime()) / 60))
            if (minutesOverdue < 180) return `${minutesOverdue} minutes`
            if (minutesOverdue < 60 * 24) return `${Math.floor(minutesOverdue / 60)} hours`
            return `${Math.floor(minutesOverdue / 60 / 24)} day${utils.pluralS(Math.floor(minutesOverdue / 60 / 24))}`
        },

        overdueReasonString(project) {
            let reason = project.OVERDUE_REASON.replace(/\n/g, " ")
            if (project.IS_CERTIFIED) reason = `The approval due date has passed. Close the project. ${reason}`
            return reason
        }
    }
}
</script>

<style scoped>
#table-wrapper {
    padding: 15px;
    flex-grow: 1;
}

.icon-go-to-project {
    padding-left: 10px;
    cursor: pointer;
    color: rgb(200, 207, 214);
}

.status-icon-wrapper {
    display: inline-block;
    padding: 3px 7px 0 0;
    vertical-align: middle;
}

.project-number-wrapper {
    display: inline-block;
    vertical-align: middle;
}

.project-on-hold {
    color: rgb(196, 123, 230);
}

.overdue-reason-red {
    color: rgb(158, 43, 43);
}
</style>