<template lang="pug">
#projects-details-main-wrapper.ui.raised.segment(style="max-width: 850px")
    #project-header-wrapper {{ project.PROJECT_NUMBER }} — {{ sourceLanguage }} to {{ targetLanguage }} — {{ projectStatus }}
    #project-details-wrapper.ui.form
        div(style="padding: 20px")
            .ui.grid
                .ui.eight.wide.column
                    .field Source words: {{ project.SOURCE_WORDS }}
                    .field Contact person: {{ project.RESPONSIBLE_MANAGER }}
                    .field Area of expertise: {{ areaOfExpertise }}
                    .field Translator payment: {{ paymentTranslator }}
                    .field Proofreader payment: {{ paymentProofreader}}
                    h5.ui.dividing.header Deadlines
                    .field(style="white-space: pre") Project: {{ "\t\t  " + calculatedDeadline('DEADLINE') }}
                    .field(v-if="project.DEADLINE_INTERMEDIATE" style="white-space: pre") Intermediate: {{ calculatedDeadline('DEADLINE_INTERMEDIATE') }}
                    .field(v-if="project.DEADLINE_TRANSLATOR" style="white-space: pre") Translator: {{ "\t  " + calculatedDeadline('DEADLINE_TRANSLATOR') }}
                    .field(v-else) &nbsp;
                    .field(v-if="project.DEADLINE_PROOFREADER" style="white-space: pre") Proofreader: {{ " " + calculatedDeadline('DEADLINE_PROOFREADER') }}
                    .field(v-else) &nbsp;
                .ui.eight.wide.column.form
                    textarea(readonly rows="5" placeholder="There are no special instructions about this project." v-model="instructions")
                    h5.ui.dividing.header CAT tools required
                    .field(v-if="project.CAT_TOOLS != undefined && !+project.CAT_TOOLS && !project.CAT_TOOLS_OTHER") No CAT tools are required for this project
                    div(v-else)
                        div(style="display: flex")
                            div(style="flex: 1 1 auto")
                                .labels-wrapper
                                    .ui.label(v-for="catTool in catTools" style="margin-right: 5px; margin-bottom: 5px" :class="{ 'tag-editor-help-label' : catTool === '?'}" @click="clickCatToolTag(catTool)") {{ catTool }}
                                .field(style="white-space: pre-wrap; padding-top: 5px; font-size: 12px") {{ catToolsDeliveryText }}
                            div(v-if="project.WORDS_NO_MATCH != undefined" style="flex: 1 1 auto")
                                .field(style="font-weight: 700") CAT analysis
                                .field(style="font-size: 12px") No match: {{ project.WORDS_NO_MATCH }} wds.
                                .field(style="font-size: 12px") Fuzzy match: {{ project.WORDS_FUZZY_MATCH }} wds.
                                .field(style="font-size: 12px") 100% & reps: {{ project.WORDS_REPS }} wds.
        ProjectReply(v-if="!translation || !translation.STATUS && project.STATUS != 10" :project="project" :subproject="subproject" :translation="translation")
        ProjectsAssigned(v-if="translation.STATUS" :project="project" :subproject="subproject" :translation="translation" @composeProjectMessage="composeProjectMessage")
        ProjectsFiles(:project="project" :subproject="subproject" :translation="translation")
        ProjectsMessages(ref="ProjectsMessages" v-if="translation && translation.STATUS" :project="project" :subproject="subproject" :translation="translation")
</template>

<script>
import ProjectCATTools from "./ProjectCATToolsTR"
import ProjectReply from "./ProjectReplyTR"
import ProjectsFiles from "./ProjectsFilesTR"
import ProjectsMessages from "./ProjectsMessagesTR"
import ProjectsAssigned from "./ProjectsAssignedTR"
import C_ from "../ConstantsTR"
import utils from "../UtilsTR"
import cmg from "../ConnectionManagerTR"
import store from "../Store/StoreTR"

export default {
    props: {
        project: Object,
        subproject: Object,
        translation: Object
    },

    components: { ProjectCATTools, ProjectReply, ProjectsFiles, ProjectsMessages, ProjectsAssigned },

    computed: {
        areaOfExpertise() {
            for (let area of C_.areasOfExpertise) if (area.PK === this.project.AREA_OF_EXPERTISE) return area.AREA
            return "General"
        },

        paymentTranslator() {
            const paymentTypes = ["", "Fixed price", "By source words", "By target words", "By CAT analysis"]
            return paymentTypes[this.project.PAYMENT_TRANSLATOR]
        },

        paymentProofreader() {
            const paymentTypes = ["", "Fixed price", "By source words", "By target words", "By CAT analysis"]
            return paymentTypes[this.project.PAYMENT_PROOFREADER]
        },

        instructions() {
            let result = this.project.SPECIAL_INSTRUCTIONS || ""
            if (this.project.REOPEN_COMMENTS) result = ` === COMMENTS AFTER REOPEN === \n\n${this.project.REOPEN_COMMENTS}\n\n ========================== \n\n${result}`
            return result
        },

        catTools() {
            if (!+this.project.CAT_TOOLS) return []
            const result = []
            this.project.CAT_TOOLS.split("").forEach((item, index) => {
                if (+item && C_.catToolsList[index]) {
                    result.push(C_.catToolsList[index])
                    // Add the help icon for TagEditor projects
                    if (index === 1) result.push("?")
                }
            })
            if (this.project.CAT_TOOLS_OTHER.trim()) result.push(this.project.CAT_TOOLS_OTHER.trim())
            return result
        },

        catToolsDeliveryText() {
            const cat = this.project.CAT_TOOLS || ""
            let result = ""

            if (+cat[9] && +cat[10]) result += "Deliver cleaned and uncleaned files\n"
            else if (+cat[9]) result += "Deliver cleaned files\n"
            else if (+cat[10]) result += "Deliver uncleaned files\n"

            if (+cat[11] && +cat[12]) result += "Deliver TagEditor TTX and target files"
            else if (+cat[11]) result += "Deliver TagEditor TTX files"
            else if (+cat[12]) result += "Deliver TagEditor target files"

            return result
        },

        sourceLanguage() {
            return this.subproject.sourceOrIntermediate ? this.subproject.sourceOrIntermediate() : ""
        },

        targetLanguage() {
            return this.subproject.targetOrIntermediate ? this.subproject.targetOrIntermediate() : ""
        },

        projectStatus() {
            if (this.project.STATUS === C_.psReopened) return this.subproject.IS_REOPENED ? `Reopened for ${this.targetLanguage}` : "Reopened (not for your pair)"
            return C_.projectStatusNames[this.project.STATUS]
        }
    },

    methods: {
        calculatedDeadline(field) {
            const deadline = this.project[field]
            return utils.formatDateToLocalTime(deadline)
        },

        clickCatToolTag(tag) {
            // Clicked the help button for TagEditor
            if (tag === "?") this.$showMessage(C_.tagEditorHelp)
        },

        composeProjectMessage() {
            this.$refs.ProjectsMessages.composeMessage()
        }
    }
}
</script>

<style scoped>
#projects-details-main-wrapper {
    display: flex;
    flex-direction: column;
    padding: 0;
    margin: 0 20px 20px 20px;
    border-radius: 6px;
    height: 100%;
}

.field {
    margin-bottom: 4px !important;
}

#project-header-wrapper {
    padding: 14px 22px;
    background-color: #7ac859;
    border-radius: 5px 5px 0 0;
    font-size: 20px;
    font-weight: 400;
    color: white;
}

#project-details-wrapper {
    flex: 1 1 auto;
    overflow-y: scroll;
    height: 0;
}

.tag-editor-help-label {
    box-shadow: inset 0px 0px 0px 2px rgb(91, 155, 66);
    color: rgb(91, 155, 66);
    font-weight: 700;
    background-color: #ddf8d1;
    border-radius: 15px;
    cursor: pointer;
}
</style>
