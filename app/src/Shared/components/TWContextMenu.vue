<template lang="pug">
.ui.dropdown(ref="contextMenu")
    slot(name="menu-items")
</template>

<script>
export default {
    methods: {
        show(event) {
            if (!event) throw "The event wasn't set when calling TWContextMenu.show()"

            // We have to hide the menu first, otherwise, when opening the menu (on another Employee, for example)
            // while it's still opened somewhere else, the menu won't close when clicking outside of it.
            $(this.$refs.contextMenu).dropdown("hide")

            const menu = $(this.$refs.contextMenu).children(".menu")[0]
            const zoom = document.body.style.zoom || 1

            menu.style.left = "-1000px"
            menu.style.top = "-1000px"
            menu.style.display = "block"
            menu.style.position = "fixed"
            menu.style["z-index"] = 1000000

            $(this.$refs.contextMenu)
                .dropdown({ duration: 1, direction: "downward" })
                .dropdown("clear")
                .dropdown("show")

            setTimeout(() => {
                const width = Math.ceil(menu.offsetWidth)
                const height = Math.ceil(menu.offsetHeight)

                // Show the menu a little to the right, so that no option is selected (under the cursor) when opening it
                const x = Math.ceil(event.pageX / zoom) + 2
                const y = Math.ceil(event.pageY / zoom) + 2

                const windowWidth = Math.ceil(window.innerWidth / zoom)
                const windowHeight = Math.ceil(window.innerHeight / zoom)

                if (width + x >= windowWidth) menu.style.left = windowWidth - width - 20 + "px"
                else menu.style.left = x + "px"

                if (height + y >= windowHeight) menu.style.top = windowHeight - height - 20 + "px"
                else menu.style.top = y + "px"
            }, 1)
        }
    }
}
</script>
