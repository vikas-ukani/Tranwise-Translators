<template lang="pug">
.project-deadlines-row-wrapper(v-if="project.isDataLoaded")
    .column
        img(:src="iconPath + assignmentIcon")
    .column(@click="showReplyComments")
        img.clickable(v-if="translation.REPLY_COMMENTS && translation.REPLY_COMMENTS.trim()" :src="iconPath + 'TranslationReplyComments.svg'")
    .column(@click="clickStatusText")
        img.clickable(v-if="statusTextIcon" :src="iconPath + statusTextIcon")
    .column.clickable(@click="clickResponsiveness") 
        img(v-if="responsivenessIcon" :src="iconPath + responsivenessIcon" :style="{opacity: responsivenessIcon.includes('2') ? 0.5 : 1.0}") 
    .column.clickable(@click="clickEmployeeStatus")
        img(:src="employeeStatusIcon")
    .column-employee-name(@contextmenu.prevent="contextMenuEmployee($event)") {{ employeeNameString }}
    .column-cat-tools {{ catToolsString }}
    .column-correction(style="text-align: center") {{ translation.amountCorrectionAsString("€") }}
    .column-files-count.clickable(@click="clickFilesCount") Files: {{ fileCountString }}
</template>

<script>
import { store, cmg, utils, constants as C_ } from "../../CoreModules"
import ProjectComponentsMixin from "./ProjectComponentsMixin"
import ProjectAssignmentDeadlinesRowMixin from "./ProjectAssignmentDeadlinesRowMixin"

export default {
    props: {
        translation: Object,
        subproject: Object,
        project: Object
    },

    data() {
        return {
            reactivityCounter: 0
        }
    },

    mixins: [ProjectComponentsMixin, ProjectAssignmentDeadlinesRowMixin],

    created() {
        this.iconPath = "/static/icons/Projects/Assignment/"
    },

    computed: {
        employee() {
            return this.translation.employee()
        },

        assignmentIcon() {
            if (this.reactivityCounter) {
            }

            if (this.translation.STATUS === C_.tsTranslating) return "TranslationReplyTAssigned.svg"
            if (this.translation.STATUS === C_.tsProofreading) return "TranslationReplyPAssigned.svg"
        },

        employeeNameString() {
            if (!this.employee) return "Unknown name"
            return this.employee.fullNameFit() + (this.employee.IS_BELGIAN ? " [B]" : "") + (this.employee.IS_NEW_TRANSLATOR ? " [NEW]" : "")
        },

        catToolsString() {
            if (!this.employee) return ""
            return this.employee.catToolsString()
        },

        fileCountString() {
            let count = 0
            store.projectsFiles.forEach(file => {
                if (file.SUBPROJECT_ID === this.subproject.PK && file.EMPLOYEE_ID === this.employee.PK && [C_.pfTranslated, C_.pfProofread].includes(file.FILE_TYPE)) count++
            })
            return `${count} ${this.translation.UPLOADED_ALL_FILES ? "√" : ""}`
        }
    },

    methods: {
        contextMenuEmployee(event) {
            this.$emit("showEmployeeContextMenu", event, this.employee)
        },

        showReplyComments() {
            if (this.translation.REPLY_COMMENTS && this.translation.REPLY_COMMENTS.trim()) this.$showMessage("Employee's reply comments", this.translation.REPLY_COMMENTS)
        },

        clickEmployeeStatus(translation) {
            const emp = store.employee(this.translation.EMPLOYEE_ID)
            if (emp) store.chatWithEmployee(emp)
        },

        async clickFilesCount() {
            if (!this.translation) return
            const r = await this.$dialogCheck(`Are you sure you want to mark the files as ${this.translation.UPLOADED_ALL_FILES ? "NOT " : ""}uploaded by the translator?`)
            if (!r) return
            cmg.updateObject(this.translation, "UPLOADED_ALL_FILES", !this.translation.UPLOADED_ALL_FILES)
        }
    }
}
</script>

<style scoped>
.project-deadlines-row-wrapper {
    padding: 3px 10px;
    display: flex;
}

.column {
    padding-top: 5px;
    width: 20px;
    text-align: center;
}

.column-employee-name {
    padding: 5px 10px;
    width: 260px;
    font-size: 11.5px;
    white-space: nowrap;
    overflow: hidden;
}

.column-cat-tools {
    padding: 5px 5px;
    width: 95px;
    font-size: 11px;
    color: rgb(77, 91, 114);
    white-space: nowrap;
}

.column-correction {
    width: 150px;
}

.column-files-count {
    padding: 5px 5px;
    width: 70px;
    text-align: right;
    font-size: 11.5px;
    white-space: nowrap;
}
</style>
