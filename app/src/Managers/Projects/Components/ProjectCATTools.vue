<template lang="pug">
.ui.form(style="width: 100%")
    div(style="display: flex")
        .field.three.wide
            .grouped.fields
                .field
                    TWCheckbox(label="Trados Word" :obj="project" :change="updateCATTools" :value="catToolsValue(1)" field="1")
                .field
                    TWCheckbox(label="TagEditor" :obj="project" :change="updateCATTools" :value="catToolsValue(2)" field="2")
                .field
                    TWCheckbox(label="Wordfast" :obj="project" :change="updateCATTools" :value="catToolsValue(3)" field="3")
                .field
                    TWCheckbox(label="Trados Studio" :obj="project" :change="updateCATTools" :value="catToolsValue(4)" field="4")
        .field.two.wide
            .grouped.fields 
                .field
                    TWCheckbox(label="Transit" :obj="project" :change="updateCATTools" :value="catToolsValue(5)" field="5")
                .field
                    TWCheckbox(label="Across" :obj="project" :change="updateCATTools" :value="catToolsValue(6)" field="6")
                .field
                    TWCheckbox(label="SDLX" :obj="project" :change="updateCATTools" :value="catToolsValue(7)" field="7")
                .field
                    TWCheckbox(label="DejaVu" :obj="project" :change="updateCATTools" :value="catToolsValue(8)" field="8")
        .field.three.wide
            .grouped.fields
                .field
                    TWCheckbox(label="Matecat" :obj="project" :change="updateCATTools" :value="catToolsValue(14)" field="14")
                .field
                    TWCheckbox(label="MemoQ" :obj="project" :change="updateCATTools" :value="catToolsValue(9)" field="9")
                .field
                    div &nbsp;
                .field
                    TWCheckbox(label="Glossaries" :obj="project" :change="updateProject" field="USES_GLOSSARIES")
        .field.three.wide
            .grouped.fields
                .field
                    TWCheckbox(label="Cleaned files" :obj="project" :change="updateCATTools" :value="catToolsValue(10)" field="10")
                .field
                    TWCheckbox(label="Uncleaned files" :obj="project" :change="updateCATTools" :value="catToolsValue(11)" field="11")
                .field
                    TWCheckbox(label="TagEditor TTX files" :obj="project" :change="updateCATTools" :value="catToolsValue(12)" field="12")
                .field
                    TWCheckbox(label="TagEditor target files" :obj="project" :change="updateCATTools" :value="catToolsValue(13)" field="13")
        .field.five.wide
            .grouped.fields(style="text-align: right")
                .field.inline(style="margin-top: 0px !important")
                    label No match
                    .ui.right.labeled.input(style="height: 30px")
                        TWInput(integer :obj="project" field="WORDS_NO_MATCH" placeholder="0" :change="updateProject" style="width: 70px")
                        .ui.basic.label(style="padding-top: 7px") words
                .field.inline
                    label Fuzzy match
                    .ui.right.labeled.input(style="height: 30px")
                        TWInput(integer :obj="project" field="WORDS_FUZZY_MATCH" placeholder="0" :change="updateProject" style="width: 70px")
                        .ui.basic.label(style="padding-top: 7px") words
                .field.inline
                    label 100% & reps
                    .ui.right.labeled.input(style="height: 30px")
                        TWInput(integer :obj="project" field="WORDS_REPS" placeholder="0" :change="updateProject" style="width: 70px")
                        .ui.basic.label(style="padding-top: 7px") words
    .field
        TWInput(:obj="project" field="CAT_TOOLS_OTHER" placeholder="Other CAT tools" :change="updateProject")
</template>

<script>
import ProjectComponentsMixin from "./ProjectComponentsMixin"
import { cmg, constants as C_, utils } from "../../CoreModules"

export default {
    mixins: [ProjectComponentsMixin],

    methods: {
        updateProject(field, value) {
            // If updateProjectAction is defined, it means that the module was instantiated by ProjectsCreate
            if (this.updateProjectAction) this.updateProjectAction(field, value)
            else cmg.updateObject(this.project, field, value)
        },

        updateCATTools(field, value) {
            const index = parseInt(field, 10)
            let cat = this.project.CAT_TOOLS || ""

            // Add as many 0's as needed in order to have the length required by the index
            while (cat.length < index) cat += "0"

            cat = cat.substring(0, index - 1) + value + cat.substring(index)
            this.updateProject("CAT_TOOLS", cat)
        },

        catToolsValue(tag) {
            if (!this.project.CAT_TOOLS) return false
            let result = this.project.CAT_TOOLS.substring(tag - 1, tag)
            return result == "1" ? true : false
        }
    }
}
</script>



