<template lang="pug">
#main-menu-wrapper
    #main-menu-button.ui.dropdown.icon.top.left.pointing.button.floating
        i.bars.icon(style="color: white")
        .menu#main-menu
            .item(@click="changeActivePage('ProjectsMain')") Projects
            .item(@click="changeActivePage('CompletedProjects')") Completed Projects
            .divider
            .item(@click="changeActivePage('PersonalDetails')") Personal Details
            .item(@click="changeActivePage('PaymentSheets')") Payment Sheets
            .divider
            .item(@click="changeActivePage('EmployeesMessagesBase')") Personal Messages & Files
            .item(@click="changeActivePage('MessageBoardBase')") Message Board
            .item(@click="changeActivePage('MessageBoardBaseForTranslations')") Message Board for Translations
            .divider
            .item(@click="changeActivePage('ContactProjectManagers')") Contact Project Managers
            .divider
            .item(@click="changeActivePage('Tips')") Tips & Tricks
            .divider
            .item(@click="changeActivePage('GetExtension')") Get the Chrome extension
            .item(@click="changeActivePage('Resources')") Resources
            .divider
            .item(v-if="isAway" @click="removeAwayMessage") Set me as available
            .item(v-if="!isAway" @click="setAwayMessage") Set me as away
            .item(@click="signOut") Sign out
</template> 

<script>
export default {
    props: {
        isAway: Boolean
    },

    methods: {
        changeActivePage(pageName) {
            this.$emit("mainMenuChangeActivePage", pageName)
        },

        historyGoBack() {
            this.$emit("mainMenuHistoryGoBack")
        },

        historyGoForward() {
            this.$emit("mainMenuHistoryGoForward")
        },

        signOut() {
            this.$emit("mainMenuSignOut")
        },

        async setAwayMessage() {
            this.$emit("mainMenuAwayStatus", true)
        },

        async removeAwayMessage() {
            this.$emit("mainMenuAwayStatus", false)
        }
    },

    mounted() {
        this.shortcuts = {
            P: "ProjectsMain",
            D: "PersonalDetails",
            S: "PaymentSheets",
            L: "EmployeesMessagesBase",
            M: "MessageBoardBase",
            H: "MessageBoardBaseForTranslations",
            K: "ContactProjectManagers"
        }

        const vm = this

        $(document).bind("keydown", event => {
            // If a modal is opened, don't allow shortcuts
            if ($(".ui.dimmer.modals.page").hasClass("active")) return

            if ((event.metaKey || event.ctrlKey) && !event.altKey) {
                const letter = String.fromCharCode(event.keyCode)
                if (this.shortcuts[letter]) {
                    event.preventDefault()
                    this.changeActivePage(this.shortcuts[letter])
                }
            }
        })

        $("#main-menu-button").dropdown()
    }
}
</script>

<style scoped>
#main-menu-wrapper {
    height: 37px;
    width: 37px;
    display: inline-block;

    background-color: white;
    border-bottom: 1px solid #d6d6d6;
}

.ui.dropdown .menu > .item {
    padding-top: 0.6rem !important;
    padding-bottom: 0.6rem !important;
}

#main-menu > .selected.item {
    background-color: white !important;
}

#main-menu > .selected.item:hover {
    background-color: #f4f4f4 !important;
}

#main-menu-button {
    border-radius: 0;
    background-color: #00a4d3;
}

.history-button {
    border-radius: 0 !important;
    background-color: #f7f6f6;
}
</style>

