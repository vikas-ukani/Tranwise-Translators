<template lang="pug">
div(style="height: 40px; display: flex; flex-direction: row")
    div.vertical-center(v-if="!itemInfo.loadOlderProjects" style="padding: 3px 0px 3px 5px")
        img(:src="'/static/icons/Projects/ProjectsMain/ProjectStatus' + itemInfo.status + '.svg'" width="14")
    .inline.projects-list.load-older-projects(v-if="itemInfo.loadOlderProjects") {{ isLoadingOlderProjects ? "Loading older projects..." : "Load older projects" }}
    .inline.projects-list(v-else style="display: flex" v-html="text")
</template>

<script>
import store from "../Store/StoreTR"
import C_ from "../ConstantsTR"

export default {
    props: {
        // This component gets an object that contains information about the project, subproject, translation (if any)
        itemInfo: Object
    },

    computed: {
        text() {
            const subproject = this.itemInfo.subproject
            const project = this.itemInfo.project

            let TP = this.itemInfo.translationAssignedInitial || ""
            // Project number
            let p = `<div style="width: 65px">${project.PROJECT_NUMBER}</div>`

            if (TP) p += `<div style="width: 18px; text-align: center; font-weight: 700; border-radius: 4px; background-color: ${TP === "T" ? "#D6EAF8" : "#D4EFDF "}">${TP}</div>`
            else p += `<div style="width: 18px"></div>`

            p += `<div style="padding-left: 11px">${this.itemInfo.languagePair}</div>`

            return p
        },

        isLoadingOlderProjects() {
            return store.loadOlderProjectsStatus === 1
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

.load-older-projects {
    padding-left: 25px;
    cursor: pointer;
}
</style>
