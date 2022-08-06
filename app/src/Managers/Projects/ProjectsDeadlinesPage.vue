<template lang="pug">
#projects-deadlines-page-wrapper
    #deadlines-wrapper
        ProjectDeadlines(:project="project")
    #second-row.ui.form
        .field(style="flex: 1 1 auto")
            label Instructions for project managers
            TWTextArea(:rows="4" :obj="project" field="WORK_DETAILS" :change="updateProject")
        .field(style="white-space: pre; padding-left: 30px; line-height: 22px") {{ deadlinesText }}
    #messages-wrapper
        ProjectMessages(:project="project")
</template>

<script>
import { store, cmg, utils } from "../CoreModules"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import ProjectDeadlines from "./Components/ProjectDeadlines"
import ProjectMessages from "./Components/ProjectMessages"

export default {
    props: {
        project: Object
    },

    components: {
        ProjectDeadlines,
        ProjectMessages
    },

    computed: {
        deadlinesText() {
            let result = `Deadlines\n` + `Project:\t\t\t${utils.formatDate(this.project.deadline(), "D MMM YYYY  HH:mm")}\n`
            if (this.project.DEADLINE_INTERMEDIATE) result += `Intermediate:\t${utils.formatDate(this.project.DEADLINE_INTERMEDIATE, "D MMM YYYY  HH:mm")}\n`
            if (this.project.DEADLINE_TRANSLATOR) result += `Translators:\t\t${utils.formatDate(this.project.DEADLINE_TRANSLATOR, "D MMM YYYY  HH:mm")}\n`
            if (this.project.DEADLINE_PROOFREADER) result += `Proofreaders:\t${utils.formatDate(this.project.DEADLINE_PROOFREADER, "D MMM YYYY  HH:mm")}`
            return result
        }
    },

    methods: {
        updateProject(field, value) {
            cmg.updateObject(this.project, field, value)
        }
    }
}
</script>

<style scoped>
#projects-deadlines-page-wrapper {
    width: 100%;
    height: 100%;
    padding: 0 20px;
    display: grid;
    grid-template-rows: minmax(0, 38%) minmax(0, 22%) minmax(0, 40%);
}

#second-row {
    padding-top: 15px;
    display: flex;
}
</style>
