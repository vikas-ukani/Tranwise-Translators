import tippy from "tippy.js"

export default {
    mounted() {
        this.initializeTooltip()
    },

    methods: {
        initializeTooltip(tooltipClass) {
            const vm = this
            this.$nextTick(() => {
                tippy(tooltipClass || ".tooltip", {
                    animation: "shift-away",
                    animateFill: false,
                    allowHTML: true,
                    delay: [500, 0],
                    distance: 0,
                    maxWidth: 700,
                    a11y: false, // to hide the focus border on the elements
                    placement: "bottom",
                    onShow(instance) {
                        if (!vm.updateTooltip) return
                        return vm.updateTooltip(instance)
                    }
                })
            })
        }
    }
}
