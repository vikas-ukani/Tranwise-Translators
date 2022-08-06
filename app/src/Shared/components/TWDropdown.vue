<template lang="pug">
    .ui.selection.fluid.dropdown.search(:class="{search: search, 'mandatory-error': shouldHighlightMandatory}" @keydown.enter="onKeyEnterDown")
        input(type="hidden" ref="input" @change="onInputChange")
        i.dropdown.icon(@click="clickDropdownArrow")
        .default.text {{ defaultText }}
        .menu(:class="showall && 'show-all-items'" :style="{'max-height' : showItemsCount * 40 + 'px !important'}")
            .item(v-for="item in items" :data-value="item.PK" :class="{active: obj && item.PK == obj[field], selected: obj && item.PK == obj[field]}" @click="onSelect" ) {{ item[itemKey] }}
</template>

<script>
export default {
    props: {
        defaultText: String,
        search: Boolean,
        showall: Boolean,
        upward: Boolean,
        showItemsCount: Number,
        obj: { type: Object, default: () => {} },
        field: String,
        items: Array,
        itemKey: String,
        change: { type: Function, default: () => {} },
        selectItem: { type: Function, default: () => {} }
    },

    data() {
        return {
            value: undefined,
            shouldHighlightMandatory: false
        }
    },

    computed: {
        valueToWatch() {
            if (!this.obj) return ""
            return this.obj[this.field]
        }
    },

    methods: {
        clear() {
            this.lastAllowedText = ""
            $(this.$el).dropdown("clear")
        },

        reset() {
            this.clear()
            const vm = this
            $(this.$el).dropdown({
                direction: vm.upward ? "upward" : "auto",
                selectOnKeydown: false,
                onHide: vm.onHide,
                onShow: vm.onShow
            })
        },

        revert() {
            if (this.lastAllowedText) this.setText(this.lastAllowedText)
            else $(this.$el).dropdown("clear")
        },

        revertToPreviousValue() {
            this.$nextTick(() => {
                this.setText(this.previousText || "")
                this.value = this.lastValue
                $(this.$el).dropdown("set selected", this.previousText || "")
            })
        },

        highlightMandatory(param) {
            if (!this.$attrs.mandatory) return false
            if (this.value) return false
            if (this.$attrs.zeroBased && this.value === 0) return false
            this.shouldHighlightMandatory = param === undefined || param === true
            return this.shouldHighlightMandatory
        },

        setValue(value) {
            this.value = value
            this.lastValue = value

            if (!value && !this.$attrs.zeroBased) {
                this.clear()
                return
            }

            this.setText(this.getTextFromValue(value))
        },

        getTextFromValue(value) {
            for (let item of this.items) if (item.PK == value) return item[this.itemKey]
            return ""
        },

        setText(textValue) {
            $(this.$el).dropdown("set text", textValue)
            this.lastAllowedText = textValue
            if (textValue.length > 0) this.shouldHighlightMandatory = false
        },

        clickDropdownArrow() {
            setTimeout(() => {
                $(this.$el)
                    .find("input.search")
                    .focus()
            }, 200)
        },

        onInputChange(event) {
            // shouldPerformNextChange is only set in onKeyEnterDown and onSelect. These are the only events
            // that should trigger a change. Clicking outside the dropdown or pressing Esc should not trigger a change.
            if (!this.shouldPerformNextChange) return
            this.shouldPerformNextChange = false

            let value = event.target.value
            if (value === "") return

            // If the value is a number, set the variable of type Number, so it's sent correctly to the server
            if (parseInt(value, 10).toString() === value) value = parseInt(value, 10)

            // Compute the selected text based on the value that we received
            const selectedText = this.getTextFromValue(value)

            // Some dropdowns specify the "selectItem" property, so call it if it's set
            if (this.selectItem) this.selectItem(selectedText)

            // If we selected the same value (and it doesn't have the "allowSelectionOfSameValue" attr), don't perform this.change()
            if (value === this.value && !this.$attrs.allowSelectionOfSameValue) return

            const allowChange = this.change(this.field, value, selectedText)
            // If the change method returned false, it means we are not allowed to make the change, so revert to the previous selection
            if (allowChange === false) this.revert()
            else {
                this.lastAllowedText = selectedText
                this.value = value
                this.shouldHighlightMandatory = false
            }
        },

        onSelect() {
            this.shouldPerformNextChange = true
        },

        onKeyEnterDown() {
            this.shouldPerformNextChange = true
        },

        onHide() {
            this.revert()

            setTimeout(() => {
                $(this.$el)
                    .find("input")
                    .blur()
                this.revert()
            }, 100)
        },

        onShow() {
            // Clear the current (internal) value when showing the dropdown, so that when selecting
            // the same value that was previously selected (by typing characters - but not changed because
            // the dropdown was exited by pressing Esc or clicking outside), we get a change triggered on the input
            $(this.$el).dropdown("set value", undefined)
            this.previousText = $(this.$el).dropdown("get text")
        }
    },

    mounted() {
        this.$nextTick(() => {
            this.reset()
            if (this.field && this.obj) this.setValue(this.obj[this.field])
        })
    },

    watch: {
        obj(newValue, oldValue) {
            if (!this.obj) this.clear()
            else if (this.field) this.setValue(this.obj[this.field])
        },

        valueToWatch(newValue, oldValue) {
            if (!this.obj) this.clear()
            else if (this.field) this.setValue(this.obj[this.field])
        }
    }
}
</script>

<style scoped>
.mandatory-error {
    background-color: rgb(253, 246, 244) !important;
    border-color: rgb(231, 122, 122) !important;
}

.ui.tiny.form .ui.dropdown .menu .item {
    padding: 10px 12px !important;
    font-size: 12px;
}

.ui.dropdown .menu .item {
    padding: 10px 12px !important;
    font-size: 12.5px !important;
}

.ui.dropdown .menu.show-all-items {
    max-height: 1000px;
}
</style>
