<template lang="pug">
.project-list-item-wrapper
    .ui.grid
        .ui.eight.wide.column <strong> {{ project.NUMBER }} </strong> — {{ project.LANGUAGE }} to {{ project.TARGET.replace(/,/g, ", ")}} 
        .ui.five.wide.column(style="font-size: 14px") {{ lastUpdatedText }} 
        .ui.three.wide.column
            .clickable(v-if="project.messages && project.messages.length" style="color: orangered; text-align: right; font-size: 14px; padding-right: 5px" @click="shouldShowDetails = true") View messages
    div(style="text-align: center; padding-bottom: 15px")
        img(:src="projectStatusImage" style="max-width: 650px")
    .ui.grid(style="padding: 10px")
        .ui.twelve.wide.column(style="padding-left: 4px") Estimated delivery: {{ project.DEADLINE }}
        .ui.four.wide.column.bottom.aligned(v-if="shouldShowDetails" style="text-align: right; cursor: pointer" @click="shouldShowDetails = false") Close details &#x25B2;
        .ui.four.wide.column.bottom.aligned(v-else style="text-align: right; cursor: pointer" @click="shouldShowDetails = true") Details &#x25BC;
    ProjectDetails(v-if="shouldShowDetails" :project="project" :store="store")
</template>

<script>
import utils from "../UtilsCL"
import ProjectDetails from "./ProjectDetailsCL"

export default {
    props: {
        project: Object,
        store: Object
    },

    data() {
        return {
            shouldShowDetails: false
        }
    },

    components: {
        ProjectDetails
    },

    created() {
        this.utils = utils
    },

    computed: {
        projectStatusImage() {
            const prefix = window.location.href.includes("localhost") ? "" : "/Clients"
            return prefix + `/static/icons/ProjectStatus/ProjectStatus-${this.project.STATUS}.png`
        },

        lastUpdatedText() {
            const minutes = this.project.LAST_UPDATED
            if (!minutes) return ""
            if (minutes === 1) return "Updated 1 minute ago"
            if (minutes < 60) return `Updated ${minutes} minutes ago`

            const hours = Math.floor(minutes / 60)
            return `Updated ${hours} hour${utils.pluralS(hours)} ago`
        }
    },

    methods: {
        selectProject() {
            this.$emit("selectProject", this.project)
        }
    }
}
</script>

<style scoped>
.project-status-awaiting-approval {
    color: rgb(194, 34, 34);
}

.project-list-item-wrapper {
    border: thin solid rgb(124, 153, 172);
    margin: 10px 0;
    padding: 15px;
    border-radius: 5px;
    background-color: rgb(245, 248, 252);
}
</style>
