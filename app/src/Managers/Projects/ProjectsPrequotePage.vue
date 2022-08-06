<template lang="pug">
#projects-prequote-page-wrapper.ui.form
    h5.ui.dividing.header Prequote PQ-{{ prequote.PK }} (code: {{ prequote.PK * 678 + 12345 }})
    .field(v-if="client") Client: {{ client.CLIENT_NAME }}
    .field(v-if="prequote.PROJECT_EMAIL") Email: {{ prequote.PROJECT_EMAIL }}
    .field Languages: {{ prequote.SOURCE_LANGUAGE }} ➜ {{ prequote.TARGET_LANGUAGES }}
    h5.ui.dividing.header(v-if="prequote.COMMENTS") Comments
    .field(v-if="prequote.COMMENTS" style="white-space: pre-wrap; word-break: break-word") {{  prequote.COMMENTS }}
    h5.ui.dividing.header Files
    .field(v-for="file in prequoteFiles")
        a(:href="file" target="_blank") {{ file }}
    .field(v-if="prequote.TEMPLATE_EDITOR_LINK")
        .ui.basic.small.purple.button(@click="openFileInTemplateEditor") Open file in template editor
    div(style="height: 30px")
    .field(v-if="[0, 1].includes(prequote.STATUS)")
        .ui.coolblue.button(@click="convertPrequote") Convert to project
    .field.red(v-if="prequote.STATUS === 1 && convertingPrequote != prequote") {{ prequote.WORKING_MANAGER_NAME || "Somebody" }} is already converting this prequote
    .field.red(v-if="prequote.STATUS === 2") This prequote has already been converted to a project
    .field.red(v-if="prequote.STATUS === 3") This prequote has been cancelled
    .field(style="padding-top: 20px" v-if="[0, 1].includes(prequote.STATUS)")
        .ui.orange.button(@click="cancelPrequote") Cancel prequote
</template>

<script>
import { store, cmg, utils, constants as C_ } from "../CoreModules"

export default {
    props: {
        prequote: Object
    },

    data() {
        return {
            convertingPrequote: undefined
        }
    },

    computed: {
        client() {
            return store.client(this.prequote.CLIENT_ID)
        },

        prequoteFiles() {
            if (!this.prequote || !this.prequote.PK || !this.prequote.FILE_URLS) return
            return this.prequote.FILE_URLS.split(";").filter(file => file)
        }
    },

    methods: {
        async convertPrequote() {
            if (this.$checkWithMessage(this.prequote.STATUS === C_.pqCompleted, "This quote has already been converted to a project.")) return

            if (this.prequote.STATUS === C_.pqSetup) {
                if (!(await this.$dialogCheck(`It looks like somebody else is already working to convert this prequote.\n\nAre you sure you want to convert it?`))) return
            }

            this.convertingPrequote = this.prequote
            this.$emit("convertPrequote", this.prequote)
        },

        async cancelPrequote() {
            if (this.$checkWithMessage(this.prequote.STATUS === C_.pqCompleted, "This quote has already been converted to a project.")) return
            if (this.$checkWithMessage(this.prequote.STATUS === C_.pqCancelled, "This quote has already been cancelled.")) return

            let message = `Are you sure you want to cancel the prequote?\n\nThis will make the prequote inaccessible.`
            if (this.prequote.STATUS === C_.pqSetup) message = "It looks like somebody is working to convert this prequote to a project.\n\n" + message

            if (!(await this.$dialogCheck(message))) return

            cmg.updateObject(this.prequote, "STATUS", C_.pqCancelled)

            // Send an email to the general manager informing that the prequote has been cancelled

            let text =
                `${store.myself.FIRST_NAME} ${store.myself.LAST_NAME} cancelled prequote PQ-${this.prequote.PK}.\n\n` +
                `Client: ${this.client ? this.client.CLIENT_NAME : ""}\n` +
                `Email: ${this.prequote.PROJECT_EMAIL}\n` +
                `Languages: ${this.prequote.SOURCE_LANGUAGE} -> ${this.prequote.TARGET_LANGUAGES}\n`

            if (this.prequote.COMMENTS) text += `Comments:\n${this.prequote.COMMENTS}\n`

            text += `Files:\n${this.prequoteFiles.join("\n")}\n`

            if (this.prequote.TEMPLATE_EDITOR_LINK) text += `\nTemplate editor link: ${this.prequote.TEMPLATE_EDITOR_LINK}\n`

            text += `\n\nYou can still import this prequote on the quote creation form by using this code: ${this.prequote.PK * 678 + 12345}`

            cmg.sendEmail(
                "SYSTEM_EMAIL",
                "GENERAL_MANAGER_EMAIL",
                `Tranwise: Prequote PQ-${this.prequote.PK} was cancelled by ${store.myself.FIRST_NAME} ${store.myself.LAST_NAME}`,
                text
            )
        },

        openFileInTemplateEditor() {
            utils.openURL(this.prequote.TEMPLATE_EDITOR_LINK)
        }
    }
}
</script>

<style scoped>
#projects-prequote-page-wrapper {
    width: 100%;
    height: 0;
    flex: 1 1 auto;
    padding: 30px 25px;
    overflow-y: auto;
}

.field.red {
    color: rgb(173, 36, 36);
    font-weight: 600;
}
</style>
