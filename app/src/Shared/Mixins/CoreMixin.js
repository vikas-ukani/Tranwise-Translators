import pageStateManager from "../PageStateManager"

export default {
    beforeDestroy() {
        // Save the page state
        if (!this.pageState) return
        const state = {}
        for (let stateItem of this.pageState) state[stateItem] = this[stateItem]
        pageStateManager.setState(this.$options._componentTag, state)
    },

    mounted() {
        // Restore the page state
        const state = pageStateManager.getState(this.$options._componentTag)
        if (!state) return
        for (let stateItem of this.pageState) this[stateItem] = state[stateItem]
    },

    methods: {
        checkConditions(conditions) {
            for (let item of conditions)
                if (item.test) {
                    this.$showMessage(item.message)
                    return true
                }
            return false
        },

        showModal(modalID, extraOptions) {
            // Show the modal after 100ms, to allow any previous moday to hide
            setTimeout(() => {
                // eslint-disable-next-line no-undef
                $(modalID)
                    .modal({
                        transition: "fade up",
                        closable: false,
                        allowMultiple: true,
                        ...extraOptions
                    })
                    .modal("show")
            }, 100)
        },

        addToHistory(object) {
            this.$emit("addToHistory", object)
        }
    }
}
