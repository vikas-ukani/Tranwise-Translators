<template lang="pug">
div(style="height: 40px; display: flex; flex-direction: row")
    div.vertical-center(style="padding: 3px 3px 3px 10px")
        img(v-if="project.table === 'PROJECTS'" :src="icon" width="15")
        div(v-else-if="project.table === 'PREQUOTES' && project.STATUS === 1" style="width: 15px")
            i.edit.icon( style="color: rgb(28, 111, 179)" )
        div(v-else style="width: 15px")
    .inline.projects-list(v-if="project.table === 'PROJECTS'" style="display: flex" v-html="text")
    .inline.prequotes-list(v-if="project.table === 'PREQUOTES'" style="display: flex") PQ-{{ this.project.PK }} [ {{ this.project.PK * 678 + 12345 }} ]
</template>

<script>
import { store, cmg, utils, constants as C_ } from "../CoreModules"

export default {
    props: {
        project: Object
    },

    computed: {
        text() {
            const project = this.project

            if (project.reactiveCounter === undefined) this.$set(project, "reactiveCounter", 1)
            if (project.reactiveCounter) {
                // This dummy test forces the text to be updated when reactiveCounter updates (from a setInterval in ProjectsMain)
            }

            if (project.isCompleted()) return `<div>${project.PROJECT_NUMBER}</div>`

            function statusIn(...statuses) {
                return statuses.includes(project.STATUS)
            }

            // Compute the difference in minutes between now and the deadline to be used below
            let deadlineField = project.deadlineField()
            if (project.DEADLINE_INTERMEDIATE && utils.isSameDay(project.DEADLINE_INTERMEDIATE, store.serverTime())) deadlineField = "DEADLINE_INTERMEDIATE"
            const deadline = project[deadlineField]
            const now = store.serverTime()
            const minutesDiff = Math.abs(deadline - now) / 60

            // Compute the prepayment tag to be used below
            let prepaymentTag = ""
            if (project.PREPAYMENT_STATUS === C_.ppsPrepaymentPending) prepaymentTag = ` &#x01A4;`
            if (project.PREPAYMENT_STATUS === C_.ppsPrepaymentDone) prepaymentTag = ` &#x01A4;`
            if (project.PREPAYMENT_STATUS === C_.ppsPrepaymentPartlyDone) prepaymentTag = ` &#x01A4;!`
            if ((project.REQUIRED_PREPAYMENT_PERCENT > 0) & (project.REQUIRED_PREPAYMENT_PERCENT < 100)) prepaymentTag += "%"
            const prepaymentTagColor = project.PREPAYMENT_STATUS === C_.ppsPrepaymentDone ? "#29BC27" : "red"

            // Project number
            let p = `<div style="min-width: 60px; ${project.IS_PROGRESS_WATCHED && !project.isCompleted() ? "color: #cc0066" : ""}">${project.PROJECT_NUMBER}</div>`
            p += `<div class="projects-list-prepayment" style="color: ${prepaymentTagColor};" >${prepaymentTag}</div>`

            // If the project is on hold
            if (project.IS_ON_HOLD) {
                p += `<div class="projects-list-hold">HOLD</div>`
            }
            // If the project is for video interpreting
            if (project.VIDEO_INTERPRETING_STATUS) {
                p += `<div class="projects-list-category">VI</div>`
            }
            // If the project is for telephone interpreting
            if (project.TELEPHONE_INTERPRETING_STATUS) {
                p += `<div class="projects-list-category">TI</div>`
            }
            // If the project is for audio translation
            if (project.AUDIO_TRANSLATION_STATUS) {
                p += `<div class="projects-list-category">AT</div>`
            }
            // If the project is for AO translation
            if (project.AI_TRANSLATION_STATUS) {
                p += `<div class="projects-list-category">AI</div>`
            }
            // If it's a quote and has prepayment
            else if (project.STATUS === C_.psQuote) {
            }
            // Deadline / overdue
            else {
                let deadlineText = ""
                // minutesDiff is computed above, because it's used earlier
                if (minutesDiff <= 180 && now < deadline) deadlineText = (Math.round(minutesDiff / 5) + 1) * 5 + "'"
                if (now >= deadline) deadlineText = "OVD"

                if (deadlineText && !project.IS_DELIVERED && statusIn(C_.psPending, C_.psTranslation, C_.psProofreading, C_.psCheckPhase, C_.psReopened))
                    p += `<div class="${deadlineText === "OVD" ? "projects-list-overdue" : "projects-list-deadline"}">${deadlineText}</div>`
                // If passed more than 2 hours since reopen
                else if (statusIn(C_.psReopened) && project.REOPENED_TIME) {
                    const minutesDiffReopened = (now - project.REOPENED_TIME) / 60
                    if (minutesDiffReopened > 120) p += `<div class="projects-list-reopened">2h+</div>`
                } else p += `<div style="width:34px"></div>`
            }

            // If the quote was not sent to the client
            if (project.STATUS === C_.psQuote && !project.IS_QUOTE_SENT && !project.WEBSITE_ORDER_ID) p += `<div class="projects-list-not-sent">NOT SENT</div>`

            // Is delivered
            if (project.IS_DELIVERED && statusIn(C_.psPending, C_.psTranslation, C_.psProofreading, C_.psCheckPhase, C_.psReopened))
                p += `<div style="margin: 3px 3px 0 5px"><img src="/static/icons/Projects/ProjectsMain/ProjectDelivered.png" width="14" /></div>`
            else {
                // Completion status (translation, proofreading)
                let color

                if (statusIn(C_.psTranslation, C_.psProofreading, C_.psCheckPhase)) {
                    const cs = project.completionStatus
                    if (cs) {
                        if (cs[2] === cs[3] && cs[2] > 0) color = "rgb(117, 209, 81)"
                        else if (cs[0] === cs[1] && cs[0] > 0) color = "rgb(36, 174, 238)"
                    }
                }

                if (color) p += `<div class="projects-list-completion-tag" style="background-color: ${color}">&#x2713;</div>`
                else p += `<div style="width: 24px"></div>`
            }

            // If project is watched, add the eye icon
            if (project.IS_PROGRESS_WATCHED && !project.isCompleted()) p += '<i class="eye icon" style="color: #cc0066"></i>'

            // Working manager
            const emp = store.employee(project.WORKING_MANAGER_ID)
            if (emp && project.isInProgress()) p += `<div class='projects-list-working-manager'>${emp.NAME_CODE}</div>`
            return p
        },

        icon() {
            if (this.project.table === "PREQUOTES") return ""

            const iconsPath = "/static/icons/Projects/ProjectsMain/ProjectStatus"

            if (this.project.CLIENT_APPROVAL_STATUS > 0 && this.project.isInProgress()) return iconsPath + "ClientApproved.svg"

            const iconNames = [
                "",
                "Quote",
                "Setup",
                "Pending",
                "InProgressTranslation",
                "InProgressProofreading",
                "InProgressCheckPhase",
                "Reopened",
                "Completed",
                "CompletedAfterReopen",
                "Cancelled"
            ]
            return iconsPath + iconNames[this.project.STATUS] + ".svg"
        }
    }
}
</script>

<style scoped>
.projects-list {
    padding: 11px 7px;
    font-weight: 400;
    width: 215px;
    text-overflow: ellipsis;
    overflow: hidden;
    font-size: 8.3pt;
}

.prequotes-list {
    padding: 11px 7px;
    font-weight: 600;
    width: 215px;
    text-overflow: ellipsis;
    overflow: hidden;
    font-size: 8.3pt;
    color: rgb(28, 111, 179);
}
</style>

<style>
.projects-list-working-manager {
    width: 20px;
    margin: 1px 4px;
    text-align: center;
    font-size: 11px;
    font-weight: 500;
    color: rgb(119, 119, 119);
    border-left: 2px solid rgb(216, 216, 216);
    border-right: 2px solid rgb(216, 216, 216);
    border-top: thin solid rgb(238, 238, 238);
    border-bottom: thin solid rgb(238, 238, 238);
    border-radius: 5px;
    line-height: 13px;
}

.projects-list-deadline {
    width: 26px;
    display: inline-block;
    font-size: 9.5px;
    text-align: center;
    font-weight: 600;
    color: white;
    background-color: rgb(69, 178, 182);
    padding: 1px 4px;
    margin: 2px 4px;
    line-height: 13px;
    border-radius: 3px;
}

.projects-list-overdue {
    width: 26px;
    display: inline-block;
    font-size: 8px;
    text-align: center;
    font-weight: 600;
    color: white;
    background-color: orange;
    padding: 1px 4px;
    margin: 2px 4px;
    line-height: 12px;
    border-radius: 3px;
}

.projects-list-reopened {
    width: 26px;
    display: inline-block;
    font-size: 8.5px;
    text-align: center;
    font-weight: 700;
    color: white;
    background-color: rgb(241, 92, 92);
    padding: 1px 4px;
    margin: 2px 4px;
    line-height: 12px;
    border-radius: 3px;
}

.projects-list-hold {
    width: 28px;
    margin: 2px;
    line-height: 12px;
    font-size: 7px;
    text-align: center;
    font-weight: 600;
    color: white;
    background-color: rgb(133, 79, 183);
    padding: 2px 2px;
    border-radius: 3px;
}

.projects-list-category {
    width: 28px;
    margin: 2px;
    line-height: 12px;
    font-size: 7px;
    text-align: center;
    font-weight: 600;
    color: white;
    background-color: rgb(230, 126, 34);
    padding: 2px 2px;
    border-radius: 3px;
}


.projects-list-not-sent {
    margin: 2px;
    margin-left: 5px;
    line-height: 12px;
    font-size: 7px;
    text-align: center;
    font-weight: 700;
    color: white;
    background-color: rgb(52, 173, 189);
    padding: 2px 4px;
    border-radius: 3px;
}

.projects-list-prepayment {
    font-weight: 700;
    padding: 0 4px;
    width: 34px;
    min-width: 34px;
}

.projects-list-completion-tag {
    width: 15px;
    margin: 2px 5px;
    padding: 2px 3px 1px;
    border-radius: 3px;
    color: white;
    font-size: 10px;
    font-weight: 700;
    line-height: 10px;
}
</style>
