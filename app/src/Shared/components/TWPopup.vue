<template lang="pug">
.ui.popup.flowing(:id="popupID")
    slot(name="popup-contents")   
</template>

<script>
export default {
    props: {
        popupID: String,
        parentID: String,
        targetID: String,
        position: String,
        onHide: Function
    },
    mounted() {
        const options = {
            popup: $("#" + this.popupID),
            on: "manual"
        }
        if (this.position) options.position = this.position
        if (this.position) options.lastResort = this.position
        if (this.onHide)
            options.onHidden = () => {
                this.onHide()
            }

        $("#" + this.parentID).popup(options)
        $("#" + this.popupID).click(event => {
            event.stopPropagation()
        })
    }
}
</script>
