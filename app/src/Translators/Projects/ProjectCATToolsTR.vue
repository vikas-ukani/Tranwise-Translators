<template lang="pug">
.ui.form(style="width: 100%")
    div(style="display: flex")
        .field.three.wide
            .grouped.fields
                .field
                    TWCheckbox(label="Trados Word" readonly :obj="project" :value="catToolsValue(1)" field="1")
                .field
                    TWCheckbox(label="TagEditor" readonly :obj="project" :value="catToolsValue(2)" field="2")
                .field
                    TWCheckbox(label="Wordfast" readonly :obj="project" :value="catToolsValue(3)" field="3")
                .field
                    TWCheckbox(label="Trados Studio" readonly :obj="project" :value="catToolsValue(4)" field="4")
        .field.two.wide
            .grouped.fields 
                .field
                    TWCheckbox(label="Transit" readonly :obj="project" :value="catToolsValue(5)" field="5")
                .field
                    TWCheckbox(label="Across" readonly :obj="project" :value="catToolsValue(6)" field="6")
                .field
                    TWCheckbox(label="SDLX" readonly :obj="project" :value="catToolsValue(7)" field="7")
                .field
                    TWCheckbox(label="DejaVu" readonly :obj="project" :value="catToolsValue(8)" field="8")
        .field.three.wide
            .grouped.fields
                .field
                    TWCheckbox(label="Matecat" readonly :obj="project" :value="catToolsValue(14)" field="14")
                .field
                    TWCheckbox(label="MemoQ" readonly :obj="project" :value="catToolsValue(9)" field="9")
                .field
                    div &nbsp;
                .field
                    div &nbsp;
        .field.three.wide
            .grouped.fields
                .field
                    TWCheckbox(label="Cleaned files" readonly :obj="project" :value="catToolsValue(10)" field="10")
                .field
                    TWCheckbox(label="Uncleaned files" readonly :obj="project" :value="catToolsValue(11)" field="11")
                .field
                    TWCheckbox(label="TagEditor TTX files" readonly :obj="project" :value="catToolsValue(12)" field="12")
                .field
                    TWCheckbox(label="TagEditor target files" readonly :obj="project" :value="catToolsValue(13)" field="13")
        .field.five.wide
            .grouped.fields(style="text-align: right")
                .field.inline(style="margin-top: 0px !important")
                    label No match
                    .ui.right.labeled.input(style="height: 30px")
                        TWInput(readonly :obj="project" field="WORDS_NO_MATCH" placeholder="0" style="width: 70px")
                        .ui.basic.label(style="padding-top: 7px") words
                .field.inline
                    label Fuzzy match
                    .ui.right.labeled.input(style="height: 30px")
                        TWInput(readonly :obj="project" field="WORDS_FUZZY_MATCH" placeholder="0" style="width: 70px")
                        .ui.basic.label(style="padding-top: 7px") words
                .field.inline
                    label 100% & reps
                    .ui.right.labeled.input(style="height: 30px")
                        TWInput(readonly :obj="project" field="WORDS_REPS" placeholder="0" style="width: 70px")
                        .ui.basic.label(style="padding-top: 7px") words
    .inline.field(v-if="project.CAT_TOOLS_OTHER" style="width: 100% !important")
        label Other CAT tools
        TWInput(:obj="project" readonly field="CAT_TOOLS_OTHER" placeholder="Other CAT tools" style="width: 80%")
</template>

<script>
export default {
    props: {
        project: Object
    },

    methods: {
        catToolsValue(tag) {
            if (!this.project.CAT_TOOLS) return false
            let result = this.project.CAT_TOOLS.substring(tag - 1, tag)
            return result == "1" ? true : false
        }
    }
}
</script>



