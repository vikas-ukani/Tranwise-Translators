<template lang="pug">
#project-reply-wrapper.ui.form
    .fields.inline
        .field
            .ui.coolblue.button.small(@click="showReplyForm" style="white-space: nowrap" :class="{disabled: sendingReplyStatus > 0}") {{ translation.REPLY ? "Update your reply" : "Reply now" }}
        .field(v-if="translation.REPLY" style="font-size: 12px") {{ replyText }}
        .field(v-else-if="sendingReplyStatus === 2" style="font-size: 12px") Submitting your reply...
        .field(v-else style="font-size: 12px") Reply if you would like to work on this project. Please take the time to reply even if you can't work on it. We really appreciate it and if we know that in advance, we won't have to bother you about it.
    #modal-reply-to-project.ui.small.modal(style="width: 450px")
        .header Reply to project {{ project.PROJECT_NUMBER }}
        i.close.icon
        .content
            .ui.form
                .field Please select your availability for this project:
                #project-reply-options
                    .project-reply-option.no-select(v-if="canTranslate" :class="{ selected: replyOption === 2}" @click="selectReply(2)") I'm available to translate this project
                    .project-reply-option.no-select(v-if="canProofread" :class="{ selected: replyOption === 3}" @click="selectReply(3)") I'm available to proofread this project
                    .project-reply-option.no-select(v-if="canTranslate && canProofread" :class="{ selected: replyOption === 4}" @click="selectReply(4)") I'm available to translate or proofread this project
                    .project-reply-option.no-select(:class="{ selected: replyOption === 1}" @click="selectReply(1)") I can't work on this project
                .field
                    textarea(rows="3" v-model="replyComments" placeholder="If you have any comments, please type them here")
        .actions
            .ui.cancel.button Cancel
            .ui.positive.button.transition(@click="sendReply" :class="{disabled: replyOption === null}") Send reply
</template>

<script>
import utils from "../UtilsTR"
import C_ from "../ConstantsTR"
import cmg from "../ConnectionManagerTR"
import store from "../Store/StoreTR"

export default {
    props: {
        project: Object,
        subproject: Object,
        translation: Object
    },

    data() {
        return {
            replyOption: null,
            replyComments: "",
            replyStatusReactivity: 0
        }
    },

    destroyed() {
        $("#modal-reply-to-project").remove()
    },

    computed: {
        canTranslate() {
            // If the project is not for translation, return false
            if (![C_.ptTranslate, C_.ptTranslateProofread].includes(this.project.PROJECT_TYPE)) return false

            // If the employee has the language pair, return true. This happens even if the project has an intermediate language,
            // because the employee might have the original pair (without intermediate).
            if (store.myself.hasLanguagePair(this.project.SOURCE_LANGUAGE_ID, this.subproject.LANGUAGE_ID)) return true

            // If the project has intermediate language
            if (this.subproject.INTERMEDIATE_LANGUAGE_ID) {
                if (store.myself.hasLanguagePair(this.project.SOURCE_LANGUAGE_ID, this.subproject.INTERMEDIATE_LANGUAGE_ID)) return true
                if (store.myself.hasLanguagePair(this.subproject.INTERMEDIATE_LANGUAGE_ID, this.subproject.LANGUAGE_ID)) return true
            }
        },

        canProofread() {
            // If the project is not for proofreading, return false
            if (![C_.ptProofread, C_.ptTranslateProofread].includes(this.project.PROJECT_TYPE)) return false

            // If the employee doesn't have the native language, return false
            if (!store.myself.hasNativeLanguage(this.subproject.LANGUAGE_ID)) return false

            // If the employee has the language pair, return true. This happens even if the project has an intermediate language,
            // because the employee might have the original pair (without intermediate).
            if (store.myself.hasLanguagePair(this.project.SOURCE_LANGUAGE_ID, this.subproject.LANGUAGE_ID)) return true

            // If the project has intermediate language, return true if the employee has the pair: intermediate -> target
            if (this.subproject.INTERMEDIATE_LANGUAGE_ID) {
                if (store.myself.hasLanguagePair(this.subproject.INTERMEDIATE_LANGUAGE_ID, this.subproject.LANGUAGE_ID)) return true
            }

            // If the suproject allows proofreading by employees that don't have the language pair, return true
            if (this.subproject.ALLOW_PROOFREADERS_SPECIAL) return true

            // Otherwise return false
            return false
        },

        replyText() {
            let text = "Reply to this project to let us know if you can work on it or not."
            switch (this.translation.REPLY) {
                case C_.trTranslation:
                    text = "Thanks for your reply — I'm available to translate this project."
                    break
                case C_.trProofreading:
                    text = "Thanks for your reply — I'm available to proofread this project."
                    break
                case C_.trBoth:
                    text = "Thanks for your reply — I'm available to translate or proofread this project."
                    break
                case C_.trNone:
                    text = "Thanks for your reply — I can't work on this project."
                    break
            }
            return text
        },

        sendingReplyStatus() {
            this.replyStatusReactivity // This is updated when changing the sendingReplyStatus on the subproject, so it's recomputed
            return this.subproject.sendingReplyStatus
        }
    },

    methods: {
        showReplyForm() {
            this.subproject.sendingReplyStatus = 0
            this.replyOption = this.translation.REPLY || null
            this.replyComments = this.translation.REPLY_COMMENTS || ""
            utils.showModal("#modal-reply-to-project")
        },

        selectReply(value) {
            this.replyOption = value
        },

        sendReply() {
            if (this.replyOption === null) return

            // If a TRANSLATIONS object already exists, update it
            if (this.translation.PK) {
                cmg.updateObject(this.translation, "REPLY", this.replyOption)
                cmg.updateObject(this.translation, "REPLY_COMMENTS", this.replyComments)
            }
            // otherwise create it
            else {
                // Prevent duplicate replies to the same subproject
                if (this.subproject.didReply) return
                this.subproject.didReply = true

                const translation = {
                    table: "TRANSLATIONS",
                    EMPLOYEE_ID: store.myself.PK,
                    SUBPROJECT_ID: this.subproject.PK,
                    REPLY: this.replyOption,
                    REPLY_COMMENTS: this.replyComments || ""
                }

                // 1 means pending... We sent the reply to the server but haven't received the Translation back
                this.replyStatusReactivity++
                this.subproject.sendingReplyStatus = 1

                // If the status is still pending after 1 second, set the status to 2, so we display a "Submitting your reply..." message above
                setTimeout(() => {
                    if (this.subproject.sendingReplyStatus === 1) {
                        this.replyStatusReactivity++
                        this.subproject.sendingReplyStatus = 2
                    }
                }, 1000)

                cmg.insertObject(translation).then(insertedTranslation => {
                    // Reset the sending status to 0 when we get the inserted translation
                    this.replyStatusReactivity++
                    this.subproject.sendingReplyStatus = 0
                })
            }
        }
    }
}
</script>


<style scoped>
#project-reply-wrapper {
    padding: 20px 20px 10px 20px;
    background-color: #f3fafd;
    border-top: thin solid rgb(149, 159, 165);
}

#project-reply-options {
    border: thin solid lightgray;
    margin-bottom: 20px;
}

.project-reply-option {
    padding: 7px 10px;
    cursor: pointer;
}

.project-reply-option.selected {
    background-color: rgb(199, 235, 250);
}
</style>