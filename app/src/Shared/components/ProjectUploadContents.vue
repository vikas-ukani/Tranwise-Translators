<template lang="pug">
#modal-upload-contents.ui.modal
    .header Upload contents
    i.close.icon(v-if="$attrs.isForViewing")
    .content
        .ui.form
            .field(v-if="$attrs.isForViewing" style="font-size: 14px; padding-bottom: 20px") This upload contains the following files:
            .field(v-else style="font-size: 14px; padding-bottom: 20px") Please select below what files are included in this upload:
        .ui.grid
            .ui.eight.wide.column.form
                h5.ui.dividing.header NON-CAT FILES
                .field
                    TWCheckbox(label="Translated files" :obj="uploadContents" :change="updateUploadContents" field="1" :readonly="isReadonly")
                .field
                    TWCheckbox(label="Proofread files" :obj="uploadContents" :change="updateUploadContents" field="2" :readonly="isReadonly")
                .field(style="height: 20px") 
                .field
                    TWCheckbox(label="QA Report" :obj="uploadContents" :change="updateUploadContents" field="3" :readonly="isReadonly")
            .ui.eight.wide.column.form
                h5.ui.dividing.header TRADOS WORD
                .field
                    TWCheckbox(label="Translated uncleaned Word doc" :obj="uploadContents" :change="updateUploadContents" field="8" :readonly="isReadonly")
                .field
                    TWCheckbox(label="Translated Trados TM export" :obj="uploadContents" :change="updateUploadContents" field="9" :readonly="isReadonly")
                .field
                    TWCheckbox(label="Proofread uncleaned Word doc" :obj="uploadContents" :change="updateUploadContents" field="10" :readonly="isReadonly")
                .field
                    TWCheckbox(label="Proofread cleaned Word doc" :obj="uploadContents" :change="updateUploadContents" field="11" :readonly="isReadonly")
                .field
                    TWCheckbox(label="Proofread Trados TM export" :obj="uploadContents" :change="updateUploadContents" field="12" :readonly="isReadonly")
        .ui.grid
            .ui.eight.wide.column.form
                h5.ui.dividing.header TAG EDITOR
                .field
                    TWCheckbox(label="Translated TTX file" :obj="uploadContents" :change="updateUploadContents" field="4" :readonly="isReadonly")
                .field
                    TWCheckbox(label="Proofread TTX file" :obj="uploadContents" :change="updateUploadContents" field="5" :readonly="isReadonly")
                .field
                    TWCheckbox(label="Proofread target file" :obj="uploadContents" :change="updateUploadContents" field="6" :readonly="isReadonly")
                .field
                    TWCheckbox(label="Proofread TM export" :obj="uploadContents" :change="updateUploadContents" field="7" :readonly="isReadonly")
            .ui.eight.wide.column.form
                h5.ui.dividing.header OTHER FILES (specify here)
                .field
                    TWTextArea(:rows="4" :obj="uploadContents" field="OTHER" placeholder="Specify any other file types here" :change="updateUploadContents" :readonly="isReadonly")
    .actions(v-if="!$attrs.isForViewing")
        .ui.cancel.button(@click="cancelForm") Cancel
        .ui.positive.button(@click="submitForm") Continue
</template>

<script>
import utils from "../UtilsBase"

export default {
    data() {
        return {
            uploadContents: {}
        }
    },

    computed: {
        isReadonly() {
            return this.$attrs.isForViewing != undefined
        }
    },

    methods: {
        updateUploadContents(field, value) {
            this.$set(this.uploadContents, field, value)
        },

        show(contents, contentsOther) {
            this.uploadContents = {}

            if (contents) for (let i = 1; i <= 12; i++) this.uploadContents[i] = contents[i - 1] === "1"
            if (contentsOther) this.uploadContents.OTHER = contentsOther

            this.resolveFunction = null
            utils.showModal("#modal-upload-contents", { autofocus: false, duration: 0 })
            return new Promise(resolve => {
                this.resolveFunction = resolve
            })
        },

        cancelForm() {
            this.resolveFunction && this.resolveFunction()
        },

        submitForm() {
            let contents = ""
            for (let i = 1; i <= 12; i++) contents += this.uploadContents[i] ? "1" : "0"

            const result = { contents, other: this.uploadContents.OTHER || "" }
            this.resolveFunction && this.resolveFunction(result)
        }
    }
}
</script>