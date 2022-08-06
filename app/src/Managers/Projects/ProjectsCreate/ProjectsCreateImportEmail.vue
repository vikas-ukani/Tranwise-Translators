<template lang="pug">
.ui.grid
    .ui.sixteen.wide.column.right.aligned(v-show="isProcessingEmail")
        div(style="padding-top: 5px; opacity: 100% !important") Processing email...
        .ui.active.inverted.dimmer
            .ui.active.inline.small.loader
    .ui.eight.wide.column.center.aligned(v-show="!isProcessingEmail")
        .email-drop-area(:class=" { hover: isHoveringZimbraEmail }" 
        @dragover.stop.prevent="isHoveringZimbraEmail = true"
        @dragleave.prevent="isHoveringZimbraEmail = false"
        @drop.prevent="processDroppedEmailFile") Drop Zimbra email here
    .ui.eight.wide.column.right.aligned(v-show="!isProcessingEmail")
        label(style="margin-right: 40px") or
        input.import-email-input(type="file" style="display: none" @change="importEmail")
        .ui.small.button.primary(@click="selectEmailToImport") Import email    
</template>

<script>
import JSZip from "jszip"
import emlParser from "./emlParser.js"

export default {
    data() {
        return {
            isHoveringZimbraEmail: false,
            isProcessingEmail: false
        }
    },

    methods: {
        processEmailFile(file) {
            this.isCancelled = false
            this.processingTimeout = setTimeout(() => {
                this.isProcessingEmail = true
            }, 1000)
            const vm = this

            JSZip.loadAsync(file).then(
                function(zip) {
                    Object.values(zip.files)[0]
                        .async("text")
                        .then(contents => {
                            emlParser(
                                contents,
                                eml => {
                                    clearTimeout(vm.processingTimeout)
                                    vm.processEmailData(eml)
                                },
                                error => {
                                    clearTimeout(vm.processingTimeout)
                                    vm.isProcessingEmail = false
                                    vm.$showMessage("The selected file doesn't contain a valid Zimbra email.")
                                }
                            )
                        })
                },
                function(e) {
                    clearTimeout(vm.processingTimeout)
                    vm.isProcessingEmail = false
                    vm.$showMessage("The selected file isn't a valid Zimbra email.")
                }
            )
        },

        processEmailData(eml) {
            if (!eml) return
            if (this.isCancelled) return
            const attachments = eml.attachments || []

            const emailData = {
                body: eml.text,
                from: eml.from.email,
                attachments: attachments.filter(att => att.name),
                subject: eml.subject
                    .replace("Re: ", "")
                    .replace("Fwd: ", "")
                    .trim()
                    .substring(0, 190)
            }
            if (this.isCancelled) return
            this.$emit("emailDataAvailable", emailData)
            this.isProcessingEmail = false
        },

        processDroppedEmailFile(event) {
            let file = event.dataTransfer.files[0]
            this.isHoveringZimbraEmail = false
            this.processEmailFile(file)
        },

        importEmail(event) {
            this.processEmailFile(event.target.files[0])
            // Clear the input, so it's available for the next import
            $(".import-email-input").val("")
        },

        selectEmailToImport() {
            $(".import-email-input").click()
        },

        cancelImport() {
            clearTimeout(this.processingTimeout)
            this.isProcessingEmail = false
            this.isCancelled = true
        }
    }
}
</script>

<style scoped>
#import-email-input {
    width: 0.1px;
    height: 0.1px;
    opacity: 0;
    overflow: hidden;
    position: absolute;
    z-index: -1;
}

.email-drop-area {
    margin: 0px;
    border: 1px dashed grey;
    padding: 6px 8px 0 8px;
    width: 100%;
    height: 100%;
}

.email-drop-area.hover {
    background-color: bisque;
}
</style>
