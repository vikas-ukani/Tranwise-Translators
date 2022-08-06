<template lang="pug">
PageBase(headerText="Projects Messages" headerWidth="780")
    //- Header buttons
    #header-buttons-wrapper(slot="header-buttons" v-if="message.PK")
        .ui.button.small.coolblue(v-if="shouldShowApproveButtons" @click="editApproveMessage" style="margin-right: 10px") Edit / approve
        .ui.button.small.coolblue(v-if="!shouldShowApproveButtons" @click="editMessage" style="margin-right: 10px") Edit message
        .ui.button.small.teal(@click="claimCertification" v-if="message.isAboutCertification() && message.CLAIMED_BY === 0") Claim certification
        .ui.button.small.violet(@click="claimIssue" v-if="!message.isAboutCertification() && message.MESSAGE && message.CLAIMED_BY === 0") Claim issue
    ListAndDetailsBase(ref="list" slot="page-contents" :items="messages" :selectedObject="message" :listWidth="450" :listItemHeight="60" )
        //- Filter
        #list-header(slot="list-header")
            .field.ui.form.small
                input#input-filter(type="text" v-model="messagesFilter" placeholder="Filter messages")
                TWDropdown(ref="dropdown" showall defaultText="All messages" :change="applyMessageTypeFilter" :items="messageTypesFilters" itemKey="NAME")
        //- Messages list
        .list-item(slot="list-item" slot-scope="{item}" @click="selectMessage(item.PK, $event)" @contextmenu.prevent="contextMenu($event, item)" :class="{ 'urgent-message' : item.COMPLETED_BY === 1000000}") 
            .problem-tag-wrapper
                img(:src="messageStatusIcon(item)" width="15" @click="toggleProblem(item)")
            div(style="width: 100%")
                .list-row1
                    .list-project {{ projectNumber(item) }}
                    .list-claimed-tag.claimed-certification(v-if="certificationClaimedName(item)") C
                    .list-claimed-name.claimed-certification(v-if="certificationClaimedName(item)") {{ certificationClaimedName(item) }}
                    .list-claimed-tag.claimed-issue(v-if="issueClaimedName(item)") I
                    .list-claimed-name.claimed-issue(v-if="issueClaimedName(item)") {{ issueClaimedName(item) }}
                    .list-separator
                    .list-message-date {{ utils.formatDate(item.MESSAGE_TIME) }}
                .list-row2 {{ item.sender() }} » {{ item.recipient() }}
        #list-footer(slot="list-footer")
            TWCheckbox(label="Hide messages that don't have a problem" :value="hideMessagesWithoutProblem" :change="toggleHideMessagesWithoutProblem")
        //- Details div
        #details-wrapper(slot="details" style="max-width: 750px; height: 100%" )
            #message-wrapper.ui.segment.raised
                #no-message-selected(v-if="!message.PK") Select a message from the list...
                .ui.form(style="height: 100%" v-if="message.PK")
                    .field(style="height: 100%")
                        textarea(readonly style="height: 100%; max-height: 2000px") {{ messageText }}
            #buttons-wrapper
    //- Extra components (modal dialogs, context menus etc.)
    .div-zero(slot="page-extras")
        //- MENU List context menu
        TWContextMenu(ref="listContextMenu")
            .menu(slot="menu-items")
                .item(@click="goToProject") Go to project
                .item(@click="markMessageAsUrgent") Mark message as urgent
</template>

<script>
import { store, utils, cmg, constants as C_ } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import ProjectMessagesCompose from "../Projects/Components/ProjectMessagesCompose"

export default {
    mixins: [CoreMixin, CoreMixinManagers],

    components: { ProjectMessagesCompose },

    data() {
        return {
            pageState: ["message", "messageFilter", "messageTypeFilter"],
            message: {},
            messagesFilter: "",
            messageTypeFilter: "",
            messageForContext: undefined,
            hideMessagesWithoutProblem: true
        }
    },

    computed: {
        messages() {
            let filter = this.messagesFilter.toLowerCase()
            return store.projectsMessages
                .filter(m => {
                    if (m.SENDER === "CCM" || ["CCM", "FC", "FCY", "FCN"].includes(m.RECIPIENT)) return false
                    if (this.hideMessagesWithoutProblem && !m.IS_PROBLEM) return false
                    if (this.messageTypeFilter && this.messageTypeFilter != "CL" && m.SENDER != this.messageTypeFilter && m.RECIPIENT != this.messageTypeFilter) return false
                    if (this.messageTypeFilter === "CL" && !["C2T", "T2C", "CL", "CLR"].includes(m.SENDER) && !["C2T", "T2C", "CL", "CLR"].includes(m.RECIPIENT)) return false

                    /* prettier-ignore */
                    if (filter) {
                        const project = m.project()
                        let matches = false
                        if (project && project.PROJECT_NUMBER.toLowerCase().match(filter)) matches = true
                        if (m.sender().toLowerCase().match(filter) || m.recipient().toLowerCase().match(filter)) matches = true
                        return matches
                    }
                    return true
                })
                .sort((a, b) => b.PK - a.PK)
        },

        messageText() {
            let text = ""

            if (this.message.RECIPIENT === "T2C") text = `This is a message that ${this.message.sender()} wants to send to the client:\n\n`
            if (this.message.SENDER === "C2T") text = `This is a message that the client wants to send to ${this.message.recipient()}:\n\n`

            if (this.message.COMPLETED_BY > 0 && this.message.COMPLETED_BY < 1000000)
                text = `// Completed by ${store.fullName(this.message.COMPLETED_BY)} on ${utils.formatDate(this.message.COMPLETED_TIME)}\n\n`

            if (this.message.MESSAGE) text += this.message.MESSAGE

            return text
        },

        shouldShowApproveButtons() {
            if (!this.message.PK) return false
            if (this.message.SENDER === store.myself.PK) return false
            return this.message.RECIPIENT === "T2C" || this.message.SENDER === "C2T"
        },

        messageTypesFilters() {
            return [
                { PK: "ALL", NAME: "All messages" },
                { PK: "MT", NAME: "Management team" },
                { PK: "GM", NAME: "General manager" },
                { PK: "CM", NAME: "Care manager" },
                { PK: "AM", NAME: "Assignment manager" },
                { PK: "DM", NAME: "Deadline manager" },
                { PK: "MM", NAME: "Multitask manager" },
                { PK: "CL", NAME: "Client" }
            ]
        }
    },

    methods: {
        contextMenu(event, item) {
            this.messageForContext = item
            this.$refs.listContextMenu.show(event)
            if (window.getSelection) window.getSelection().removeAllRanges()
        },

        selectMessage(pk, event) {
            const message = store.projectsMessage(pk)

            if ((event.ctrlKey || event.metaKey) && message.project()) {
                this.$emit("goToObject", message.project())
                return
            }

            this.message = message
            cmg.requestObject(this.message, "PROJECTS_MESSAGES_DETAILS")
        },

        applyMessageTypeFilter(_, value) {
            this.messageTypeFilter = value === "ALL" ? "" : value
        },

        projectNumber(message) {
            const project = message.project()
            if (!project) return message.PREVIEW
            let result = project.PROJECT_NUMBER
            const subproject = message.subproject()
            if (subproject) result += ` [ ${store.languageName(subproject.LANGUAGE_ID)} ]`
            return result
        },

        messageStatusIcon(message) {
            if (message.IS_PROBLEM) return "/static/icons/Projects/ProjectsMessages/ProjectMessageStatusProblem.svg"
            else return "/static/icons/Projects/ProjectsMessages/ProjectMessageStatusDone.svg"
        },

        async markMessageAsUrgent() {
            const message = this.messageForContext
            if (message.COMPLETED_BY === 1000000) return
            if (message.COMPLETED_BY > 0)
                if (!(await this.$dialogCheck("This message has already been completed by a project manager. Are you sure you want to mark it as urgent?"))) return
            cmg.updateObject(this.messageForContext, "COMPLETED_BY", 1000000)
        },

        certificationClaimedName(message) {
            const project = message.project()
            if (!project) return ""
            if (!project.CLAIMED_BY) return ""
            const employee = store.employee(project.CLAIMED_BY)
            return employee ? employee.FIRST_NAME : "Claimed"
        },

        issueClaimedName(message) {
            if (!message.CLAIMED_BY) return ""
            const employee = store.employee(message.CLAIMED_BY)
            return employee ? employee.FIRST_NAME : "Claimed"
        },

        async claimCertification() {
            const project = this.message.project()
            if (!project) return
            if (project.CLAIMED_BY > 0) {
                const employee = store.employee(project.CLAIMED_BY)
                const text = employee
                    ? `The certification for this project has already been claimed by ${employee.fullName()}.`
                    : "The certification for this project has already been claimed by someone else."
                this.$showMessage(text)
                return
            }

            if (await this.$dialogCheck(`Are you sure you want to claim the certification for project ${project.PROJECT_NUMBER}?`))
                cmg.updateObject(project, "CLAIMED_BY", store.myself.PK)
        },

        async claimIssue() {
            if (this.message.CLAIMED_BY > 0) {
                const employee = store.employee(this.message.CLAIMED_BY)
                const text = employee ? `The issue has already been claimed by ${employee.fullName()}.` : "The issue has already been claimed by someone else."
                this.$showMessage(text)
                return
            }

            if (await this.$dialogCheck("Are you sure you want to claim the issue discribed in this project message?"))
                cmg.updateObject(this.message, "CLAIMED_BY", store.myself.PK)
        },

        toggleProblem(message) {
            const newValue = !message.IS_PROBLEM
            cmg.updateObject(message, "IS_PROBLEM", newValue)
            if (!newValue) {
                cmg.updateObject(message, "COMPLETED_BY", store.myself.PK)
                cmg.updateObject(message, "COMPLETED_TIME", "SERVER_TIME_TAG")
            }
        },

        toggleHideMessagesWithoutProblem(field, value) {
            this.hideMessagesWithoutProblem = value
        },

        goToProject() {
            this.$emit("goToObject", this.messageForContext.project())
        },

        editApproveMessage(message) {
            store.editAndApproveProjectMessage(this.message)
        },

        editMessage(message) {
            store.editProjectMessage(this.message)
        }
    }
}
</script>

<style scoped>
#input-filter {
    border-radius: 0;
    border: 0;
    border-bottom: 1px solid #cad0d3;
    border-top: 1px solid #cad0d3;
    border-right: solid 1px #cad0d3;
    margin-bottom: 1px;
}

#header-buttons-wrapper {
    width: 100%;
    padding: 8px 23px;
}

#details-wrapper {
    display: flex;
    flex-direction: column;
}

#message-wrapper {
    flex: 1 1 auto;
}

#no-message-selected {
    color: lightgrey;
    height: 100%;
    display: grid;
    align-items: center;
    justify-content: center;
}

#list-footer {
    padding: 10px;
    border-top: 1px solid #cad0d3;
}

.list-item {
    border-bottom: 1px solid rgb(243, 243, 243);
    height: 60px;
    display: flex;
}

.list-row1 {
    padding-top: 12px;
    padding-bottom: 3px;
    display: flex;
    width: 100%;
}

.list-row2 {
    padding-left: 5px;
    font-size: 11px;
}

.list-project {
    font-weight: 600;
    font-size: 12px;
    max-width: 135px;
    min-width: 135px;
}

.list-separator {
    flex-grow: 1;
}

.list-message-date {
    color: rgb(158, 152, 152);
    padding-right: 15px;
    font-size: 11px;
}

.list-claimed-tag {
    color: rgb(255, 255, 255);
    font-weight: 700;
    font-size: 12px;
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
    padding: 0 5px;
    margin-right: 1px;
    margin-left: 2px;
}

.list-claimed-name {
    color: white;
    font-weight: 500;
    font-size: 11px;
    border-top-right-radius: 5px;
    border-bottom-right-radius: 5px;
    padding: 0 6px;
    margin-right: 2px;
}

.list-claimed-tag.claimed-certification {
    background-color: rgb(47, 121, 121);
}

.list-claimed-name.claimed-certification {
    background-color: rgb(61, 158, 158);
}

.list-claimed-tag.claimed-issue {
    background-color: rgb(141, 70, 135);
}

.list-claimed-name.claimed-issue {
    background-color: rgb(146, 101, 160);
}

.urgent-message {
    background-color: rgb(255, 224, 224);
}

.problem-tag-wrapper {
    padding: 23px 12px 0 6px;
}
</style>
