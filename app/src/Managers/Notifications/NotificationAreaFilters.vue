<template lang="pug">
    #notification-filters-wrapper
        .ui.checkbox#checkbox-hide-assignments
                input#checkbox-hide-assignments(type="checkbox" @change="checkboxHideAssignments($event.target.checked)")
                label.no-select(for="checkbox-hide-assignments" style="cursor: pointer;") Hide assignment notifications
        .ui.checkbox#checkbox-hide-deadlines
            input#checkbox-hide-deadlines(type="checkbox" @change="checkboxHideDeadlines($event.target.checked)")
            label.no-select(for="checkbox-hide-deadlines" style="cursor: pointer;") Hide deadline notifications
        .ui.checkbox#checkbox-hide-project-messages
            input#checkbox-hide-project-messages(type="checkbox" @change="checkboxHideProjectMessages($event.target.checked)")
            label.no-select(for="checkbox-hide-project-messages" style="cursor: pointer;") Hide project messages
</template>

<script>
export default {
    data() {
        return {
            popupIsVisible: false,
            notificationOptions: undefined,
            notificationComponent: undefined
        }
    },

    mounted() {
        $(".ui.checkbox").checkbox()
    },

    methods: {
        checkboxHideAssignments(checked) {
            this.$emit("updateNotificationsFilter", "hideAssignments", checked)
        },

        checkboxHideDeadlines(checked) {
            this.$emit("updateNotificationsFilter", "hideDeadlines", checked)
        },

        checkboxHideProjectMessages(checked) {
            this.$emit("updateNotificationsFilter", "hideProjectMessages", checked)
        }
    }
}
</script>

<style scoped>
#notification-filters-wrapper {
    padding: 5px 10px 38px 10px;
    background-color: #5296a7;
    border-top: thin solid rgb(30, 43, 51);
}

#notification-filters-wrapper > .ui.checkbox {
    padding-bottom: 7px;
    font-size: 12px !important;
}
</style>
