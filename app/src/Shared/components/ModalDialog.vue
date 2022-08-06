<template lang="pug">
#show-dialog-modal.ui.small.modal.persistent
    .header {{ header || "Tranwise" }}
    i.close.icon(v-if="isSimpleMessage")
    .content(v-if="isSimpleMessage || isForCheck")
        div(style="max-height: 400px; overflow-y: auto")
            p(v-if="isHTMLMessage" style="white-space: pre-wrap; word-wrap: break-word" v-html="message") x
            p(v-else style="white-space: pre-wrap; word-wrap: break-word") {{ message }}
    .content(v-else)
        p(style="white-space: pre-wrap; word-wrap: break-word;") {{ message }}
        .ui.form(v-show="shouldShowInput || shouldShowTextArea || shouldShowDropdown" style="padding-top: 20px; padding-bottom: 20px")
            input(v-show="shouldShowInput" v-model="inputObject.value" :spellcheck="!noSpellCheck")
            textarea#textarea(v-show="shouldShowTextArea" v-model="inputObject.value" rows="7" :spellcheck="!noSpellCheck")
            TWDropdown(v-show="shouldShowDropdown" :search="dropdownIsSearchable" ref="modalDropdown" allowSelectionOfSameValue :defaultText="dropdownOptions.dropdownDefaultText" :obj="dropdownObject" :field="dropdownOptions.dropdownField" :items="dropdownOptions.dropdownItems" :change="changeDropdown" :itemKey="dropdownOptions.dropdownKey")
        p(style="color: red" v-if="warning") {{ warning }}
    .actions(v-if="isSimpleMessage")
        .ui.positive.button OK
    .actions(v-if="!isSimpleMessage")
        .ui.button.ok( v-for="(buttonTitle, index) in buttonTitles" @click="clickButton(buttonTitle, $event)" :class="buttonClasses[index]") {{ buttonTitle }}
</template>

<script>
import Vue from "vue"

// Create a new Vue instance that is going to be used as an event bus
Vue.prototype.$showDialogManager = new Vue()

// Add global methods to the Vue instance, so we can use them anywhere in the app
Vue.prototype.$showDialog = function(options) {
    return new Promise(resolve => {
        this.$showDialogManager.$emit("tranwise-show-dialog", options, resolve)
    })
}

Vue.prototype.$showMessage = function(header, message) {
    this.$showDialogManager.$emit("tranwise-show-message", header, message)
}

Vue.prototype.$showHTMLMessage = function(header, message) {
    this.$showDialogManager.$emit("tranwise-show-message", header, message, true)
}

Vue.prototype.$checkWithMessage = function(condition, message) {
    if (condition) {
        this.$showDialogManager.$emit("tranwise-show-message", "", message)
        return true
    }
}

Vue.prototype.$dialogCheck = function(message) {
    return new Promise(resolve => {
        const options = {
            message: message,
            header: "Confirmation",
            isForCheck: true
        }
        this.$showDialogManager.$emit("tranwise-show-dialog", options, resolve)
    })
}

Vue.prototype.$dialogCheckWithCallback = function(message, callback) {
    const options = {
        message: message,
        header: "Confirmation",
        isForCheck: true
    }
    this.$showDialogManager.$emit("tranwise-show-dialog", options, callback)
}

function delay(milliseconds) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, milliseconds)
    })
}

export default {
    data() {
        return {
            header: "Tranwise",
            message: "",
            warning: "",
            callback: null,
            isSimpleMessage: false,
            isHTMLMessage: false,
            isForCheck: false,
            noSpellCheck: false,
            buttonTitles: [],
            buttonClasses: [],

            shouldShowInput: false,
            shouldShowTextArea: false,
            shouldShowDropdown: false,
            dropdownIsSearchable: false,
            inputObject: { value: "", float: false, integer: false, negative: false },

            dropdownObject: { NAME: 1 }
        }
    },

    computed: {
        dropdownOptions() {
            return this.inputObject.dropdownOptions || {}
        }
    },

    mounted() {
        // Listen for any tranwise-show-dialog" message
        this.$showDialogManager.$on("tranwise-show-dialog", (options, resolveCallback) => {
            this.isSimpleMessage = false
            // Show the input field if options.inputText is defined
            this.shouldShowInput = options.hasOwnProperty("inputText")
            // Show the textarea if options.textAreaText is defined
            this.shouldShowTextArea = options.hasOwnProperty("textAreaText")
            // Show the dropdown if options.dropdownItems is defined
            this.shouldShowDropdown = options.dropdownItems !== undefined

            this.dropdownIsSearchable = options.dropdownIsSearchable || false

            if (this.shouldShowDropdown) {
                this.$nextTick(() => {
                    this.$refs.modalDropdown.reset()
                    this.dropdownIsSearchable = false
                })
                this.$set(this.inputObject, "dropdownOptions", options)
            }

            this.inputObject.value = options.inputText || options.textAreaText

            this.noSpellCheck = options.noSpellCheck

            // Used in this.$dialogCheck() to call the callback with true / false instead of the response object
            this.isForCheck = options.isForCheck
            this.blankTextWarning = options.blankTextWarning

            this.buttonTitles = options.buttons
            this.buttonClasses = options.buttonClasses
            // If the caller didn't specify any buttons, then set them to Cancel / OK if the input or
            // textarea is shown, otherwise set them to No / Yes
            if (!this.buttonTitles) {
                this.buttonTitles = this.shouldShowInput || this.shouldShowTextArea ? ["Cancel", "OK"] : ["No", "Yes"]
                this.buttonClasses = this.shouldShowInput || this.shouldShowTextArea ? ["", "positive"] : ["negative", "positive"]
                if (this.shouldShowDropdown) {
                    this.buttonTitles = ["Cancel"]
                    this.buttonClasses = [""]
                }
            }

            this.showModalDialog(options, resolveCallback)
        })

        // Listen for any tranwise-show-message message
        this.$showDialogManager.$on("tranwise-show-message", (header, message, isHTML) => {
            let m = message
            let h = header
            // If the second parameter is undefined it means we got no header, so the header is actually the message
            if (message === undefined) {
                m = header
                h = "Tranwise"
            }
            this.isSimpleMessage = true
            this.isHTMLMessage = isHTML
            this.isForCheck = false
            this.shouldShowInput = this.shouldShowTextArea = this.shouldShowDropdown = false

            // Create an options object to pass to the function
            this.showModalDialog({ header: h, message: m })
        })
    },

    methods: {
        async showModalDialog(options, callback) {
            this.header = options.header
            this.message = options.message
            this.callback = callback
            this.warning = ""
            const vm = this

            await delay(100)

            $("#show-dialog-modal")
                .modal({
                    duration: 0,
                    allowMultiple: true,
                    closable: this.isSimpleMessage,
                    autofocus: !this.shouldShowDropdown,
                    transition: "fade up",
                    dimmerSettings: { opacity: this.isSimpleMessage ? 0.2 : 0.6 },
                    onShow() {
                        if (vm.shouldShowTextArea) {
                            vm.$nextTick(() => {
                                const caretPosition = options.caretPosition || 0
                                document.getElementById("textarea").setSelectionRange(caretPosition, caretPosition)
                                document.getElementById("textarea").scrollTop = 0
                            })
                        }
                    },
                    // onApprove returns whether we can close the dialog or not
                    onApprove(el) {
                        // If clicking a non-"positive" button, we can close the dialog
                        if (!el.hasClass("positive")) return true
                        // If clicking the "positive" button, close the dialog only if the warning is blank
                        return !vm.warning
                    }
                })
                .modal("show")
        },

        clickButton(buttonTitle, event) {
            if (!this.callback) return
            if (this.blankTextWarning && !(this.inputObject.value || "").trim() && $(event.target).hasClass("positive")) {
                this.warning = this.blankTextWarning
                return
            } else this.warning = ""
            if (this.isForCheck) this.callback(buttonTitle === "Yes")
            else this.callback({ selection: buttonTitle, text: this.inputObject.value })
        },

        changeDropdown(_field, value, text) {
            $("#show-dialog-modal").modal("hide")
            if (this.callback) this.callback({ selection: "OK", value: value, text: text })
        }
    }
}
</script>

