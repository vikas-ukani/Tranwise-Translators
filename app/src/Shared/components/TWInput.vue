<template lang="pug">
    input(ref="input" :readonly="readonly" :class="shouldHighlightMandatory && 'mandatory-error'" :placeholder="placeholder" type="text" :value="$props.value ? $props.value : (obj ? obj[field] : '')" @change="doChange($props.field, $event.target.value)" @keydown.enter="doBlur" @keydown="keydown" @keyup="keyup" @paste="paste" @blur="onBlur")
</template>

<script>
export default {
    props: {
        readonly: Boolean,
        integer: Boolean,
        negative: Boolean, // allow negative numbers (by default it only allows positive numbers)
        float: Boolean,
        placeholder: { type: String, default: "" },
        obj: { type: Object, default: () => {} },
        field: { type: String, default: "" },
        value: String,
        change: { type: Function, default: () => {} }
    },

    data() {
        return {
            shouldHighlightMandatory: false
        }
    },

    methods: {
        doChange(field, value) {
            const isNegative = value.startsWith("-")
            // Remove the minus sign and add it back after processing below
            if (isNegative) value = value.slice(1)

            // Remove all leading zeros
            if (this.integer) value = value.replace(/^0+/, "")
            if (this.float) {
                // add 0 to floats in the format .55
                if (value.startsWith(".")) value = "0" + value
                else value = value.replace(/^0+/, "")
                // add back the 0
                if (value.startsWith(".")) value = "0" + value

                if (value.endsWith(".")) value = value.slice(0, -1)
            }

            if (isNegative) value = "-" + value

            // If the input type is a float or an integer, convert the value to the respective type,
            // so it's added as a valid number to the server
            if (this.float) {
                value = value.trim()
                if (!isNaN(parseFloat(value)) && isFinite(value)) this.change(field, parseFloat(value))
                if (value === "") this.change(field, 0)
            } else if (this.integer) {
                if (parseInt(value, 10).toString() === value) this.change(field, parseInt(value, 10))
                if (value === "") this.change(field, 0)
            } else {
                this.change(field, value)
            }
        },

        onBlur(event) {
            if (this.pastedValue != undefined) {
                this.doChange(this.field, this.pastedValue)
                this.pastedValue = undefined
            }
        },

        doBlur(event) {
            event.target.blur()
        },

        keydown(event) {
            // If the input has been set to only allow integers or floats, prevent any key that is not a number (or . if it's a float and - if it allows negatives)
            if (this.integer || this.float) {
                let key = event.key
                const selectedText = event.target.value.substring(event.target.selectionStart, event.target.selectionEnd)

                const isSelectedAll = event.target.selectionStart === 0 && event.target.selectionEnd === event.target.value.length

                let allowedCharacters = "1234567890"

                if (this.float && key === ",") {
                    key = "."
                    event.target.value = event.target.value.replace(/,/g, ".")
                }

                if (this.float && (!event.target.value.includes(".") || selectedText.includes("."))) allowedCharacters += "."

                if (this.negative) {
                    if ((!event.target.value.includes("-") && event.target.selectionStart == 0) || isSelectedAll) allowedCharacters += "-"
                }

                if (isSelectedAll && allowedCharacters.includes(key)) event.target.value = ""

                if (!allowedCharacters.includes(key) && !event.metaKey && key != "Backspace" && key != "Tab" && !key.includes("Arrow")) event.preventDefault()
            }
            this.shouldHighlightMandatory = false
        },

        keyup(event) {
            this.keydown(event)
        },

        paste(event) {
            this.shouldHighlightMandatory = false
            if (!this.integer && !this.float) return

            // If the field is labeled as "integer" or "float", prevent the default paste action
            // and calculate the final value below
            event.preventDefault()

            let pastedText = event.clipboardData.getData("text/plain").replace(/,/g, ".")
            const finalValue = event.target.value.substring(0, event.target.selectionStart) + pastedText + event.target.value.substring(event.target.selectionEnd)

            if (finalValue != parseFloat(finalValue)) return
            if (this.integer && finalValue !== parseInt(finalValue, 10).toString()) return
            if (this.integer && !this.negative && parseInt(finalValue, 10) < 0) return
            if (this.float && !this.negative && parseFloat(finalValue) < 0) return

            this.pastedValue = finalValue
            event.target.value = finalValue
            event.target.selectionStart = event.target.selectionEnd
        },

        highlightMandatory(param) {
            if (!this.$attrs.mandatory) return false

            const inputValue = this.$refs.input.value
            if ((this.integer || this.float) && inputValue > 0) return false

            if (inputValue.length > 0) return false

            this.shouldHighlightMandatory = param === undefined || param === true
            return this.shouldHighlightMandatory
        }
    }
}
</script>

<style scoped>
.mandatory-error {
    background-color: rgb(253, 246, 244) !important;
    border-color: rgb(231, 122, 122) !important;
}
</style>

