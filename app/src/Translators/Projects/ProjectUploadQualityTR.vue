<template lang="pug">
#modal-upload-quality.ui.modal
    .header Quality of your upload
    .content(style="font-size: 12px")
        .ui.form
            .field(style="white-space: pre-wrap;") Dear translator and proofreader,
            .field(style="white-space: pre-wrap; padding-bottom: 10px") The work you are going to upload is very important for you, us and our clients. Sometimes your translation is critical and shown to thousands or millions of people. Therefore, we have to be absolutely sure that you have double checked your document on the following points:
        .ui.grid
            .ui.six.wide.column(style="white-space: pre-wrap;")
                .field(style="height: 45px; padding-top: 10px") Did you run a spell checker?
                .field(style="height: 45px; padding-top: 10px") Did you check the terminology?
                .field(style="height: 45px; padding-top: 10px") Did you check all the project's instructions?
                .field(style="height: 45px") Did you use the right software if requested? (cleaned / uncleaned Trados documents)
                .field(style="height: 45px") Are you confident with the translation or proofreading you are going to upload?
            .ui.ten.wide.column(style="white-space: pre-wrap")
                .field(style="height: 45px")
                    TWDropdown(:obj="uploadQuality" field="A" :change="updateUploadQuality" :items="dropdownItems" itemKey="ANSWER" style="width: 80px")
                .field(style="height: 45px")
                    TWDropdown(:obj="uploadQuality" field="B" :change="updateUploadQuality" :items="dropdownItems" itemKey="ANSWER" style="width: 80px")
                .field(style="height: 45px")
                    TWDropdown(:obj="uploadQuality" field="C" :change="updateUploadQuality" :items="dropdownItems" itemKey="ANSWER" style="width: 80px")
                .field(style="height: 45px")
                    TWDropdown(:obj="uploadQuality" field="D" :change="updateUploadQuality" :items="dropdownItems" itemKey="ANSWER" style="width: 80px")
                .field(style="height: 45px")
                    TWDropdown(:obj="uploadQuality" field="E" :change="updateUploadQuality" :items="dropdownItems" itemKey="ANSWER" style="width: 80px")
        .ui.grid.form(style="margin-top: 0")
            .ui.ten.wide.column.form
                .field
                    TWTextArea(:rows="3" :obj="uploadQuality" field="COMMENTS" placeholder="Type here any comments which the project manager should know about" :change="updateUploadQuality")
            .ui.six.wide.column
            TWCheckbox(label="I hereby declare that I am absolutely sure that this is a good translation that doesnt contain any errors" :obj="uploadQuality" :change="updateUploadQuality" field="DECLARATION")
            .field(style="padding-top: 10px; padding-bottom: 10px") PLEASE NOTE THAT IF WE GET COMPLAINTS, THAT COULD RESULT IN NON PAYMENT
    .actions
        .ui.cancel.button(@click="cancelForm") Cancel
        .ui.positive.button(@click="submitForm" :class="{disabled: !isSubmitButtonActive}") Accept
</template>

<script>
import utils from "../UtilsTR"

export default {
    data() {
        return {
            uploadQuality: {}
        }
    },

    computed: {
        dropdownItems() {
            return [
                { PK: 1, ANSWER: "Yes" },
                { PK: 2, ANSWER: "No" }
            ]
        },

        isSubmitButtonActive() {
            const u = this.uploadQuality
            return u.A > 0 && u.B > 0 && u.C > 0 && u.D > 0 && u.E > 0
        }
    },

    methods: {
        updateUploadQuality(field, value) {
            this.$set(this.uploadQuality, field, value)
        },

        show() {
            this.$delete(this.uploadQuality, "A")
            this.$delete(this.uploadQuality, "B")
            this.$delete(this.uploadQuality, "C")
            this.$delete(this.uploadQuality, "D")
            this.$delete(this.uploadQuality, "E")
            this.$delete(this.uploadQuality, "DECLARATION")
            this.$delete(this.uploadQuality, "COMMENTS")
            this.resolveFunction = null
            utils.showModal("#modal-upload-quality", { autofocus: false, duration: 0 })
            return new Promise(resolve => {
                this.resolveFunction = resolve
            })
        },

        cancelForm() {
            this.resolveFunction && this.resolveFunction()
        },

        submitForm() {
            const u = this.uploadQuality
            let result = ""
            result += u.A === 1 ? "1" : "0"
            result += u.B === 1 ? "1" : "0"
            result += u.C === 1 ? "1" : "0"
            result += u.D === 1 ? "1" : "0"
            result += u.E === 1 ? "1" : "0"
            result += u.DECLARATION === 1 ? "1" : "0"
            result += u.COMMENTS || ""

            this.resolveFunction && this.resolveFunction(result)
        }
    }
}
</script>