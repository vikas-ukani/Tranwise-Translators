<template lang="pug">
#main-menu-wrapper
    #main-menu-button.ui.dropdown.icon.top.left.pointing.button.floating
        i.bars.icon(style="color: white")
        #main-menu.menu
            .item(@click="changeActivePage('ProjectsMain')") Projects
            .item(@click="changeActivePage('ProjectsMessagesMain')") Projects' Messages
            .item(@click="changeActivePage('WatchedProjects')") Projects under watch
            .item(@click="changeActivePage('OverdueProjects')") Overdue projects
            .item(@click="changeActivePage('TwilioChat')") Twilio Chat
            .divider
            .item(@click="changeActivePage('ClientsMain')") Clients
            .divider
            .item(@click="changeActivePage('EmployeesMain')") Employees
            .divider
            .item(@click="changeActivePage('InvoicesMain')") Invoices
            .item(v-if="$attrs.overdueInvoices" @click="changeActivePage('OverdueInvoices')") Overdue Invoices
            .divider
            .item(@click="changeActivePage('EmployeesMessagesBase')") Personal Messages & Files
            .item(@click="changeActivePage('MessageBoardBase')") Message Board
            .item(@click="changeActivePage('MessageBoardBaseForTranslations')") Message Board for Translations
            .divider
            .item(@click="changeActivePage('Holidays')") Holidays calendar
            .item(@click="changeActivePage('Tips')") Tips
            .divider(v-if="$attrs.monthlyActions")
            .item(v-if="$attrs.monthlyActions" @click="changeActivePage('MonthlyActions')") Monthly actions
</template>

<script>
export default {
    methods: {
        changeActivePage(pageName) {
            this.$emit("mainMenuChangeActivePage", pageName)
        },

        historyGoBack() {
            this.$emit("mainMenuHistoryGoBack")
        },

        historyGoForward() {
            this.$emit("mainMenuHistoryGoForward")
        }
    },

    mounted() {
        this.shortcuts = {
            P: "ProjectsMain",
            D: "ProjectsMessagesMain",
            O: "OverdueProjects",
            K: "ClientsMain",
            E: "EmployeesMain",
            I: "InvoicesMain",
            M: "EmployeesMessagesBase"
        }

        const vm = this

        $(document).bind("keydown", event => {
            // If a modal is opened, don't allow shortcuts
            if ($(".ui.dimmer.modals.page").hasClass("active")) return

            // Ctrl-F activates the search bar
            if (event.keyCode == 70 && (event.metaKey || event.ctrlKey) && !event.altKey) {
                event.preventDefault()
                $("#search-bar").focus()
            }

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

#main-menu-button {
    border-radius: 0;
    background-color: #00a4d3;
}

.history-button {
    border-radius: 0 !important;
    background-color: #f7f6f6;
}

#main-menu > .selected.item {
    background-color: white !important;
}

#main-menu > .selected.item:hover {
    background-color: #f4f4f4 !important;
}
</style>
