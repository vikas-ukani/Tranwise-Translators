<template lang="pug">
PageBase(headerText="Project Managers")
    ListAndDetailsBase(ref="list" slot="page-contents" :items="managersList" :selectedObject="employee" :listWidth="280" :listItemHeight="33" )
        #list-header(slot="list-header")
        .list-item(slot="list-item" slot-scope="{item}")
            div(style="height: 33px; display: flex" @contextmenu.prevent="contextMenu($event, item)")
                div(style="padding: 10px 0 0 10px")
                    i.inline.icon.user.clickable(style="color: #eeeeee" v-if="item.ONLINE_STATUS === 0 && !item.IS_NOT_AVAILABLE")
                    i.inline.icon.user.clickable(style="color: #ffcc00" v-if="item.ONLINE_STATUS === 1 && !item.IS_NOT_AVAILABLE")
                    i.inline.icon.user.clickable(style="color: #ff9999" v-if="item.ONLINE_STATUS === 2 && !item.IS_NOT_AVAILABLE")
                    i.inline.icon.clock.clickable(style="color: #b3b3ff" v-if="item.ONLINE_STATUS === 3 && !item.IS_NOT_AVAILABLE")
                    i.inline.icon.user.clickable(style="color: #ff9999" v-if="item.IS_NOT_AVAILABLE")
                .employee-name-list {{ item.fullName() }}
        //- Details div
        #details-wrapper(slot="details" style="max-width: 650px")
            p Right-click on a name to chat, send a message if the manager is offline or send a file.
            p If you need to send a message regarding a project, please use the "Compose message" button at the bottom of the project's page.
            h5 Project managers' schedule
            p(style="white-space: pre") {{ managersSchedule }}
    .div-zero(slot="page-extras")
        TWContextMenu(ref="listContextMenu")
            .menu(slot="menu-items")
                .item(v-if="[1, 2, 3].includes(employeeForContext.ONLINE_STATUS)" @click="chatWithEmployee") Chat with {{ employeeForContext.FIRST_NAME + " " + employeeForContext.LAST_NAME }}
                .item(v-else @click="sendMessageToEmployee") Send a message to {{ employeeForContext.FIRST_NAME + " " + employeeForContext.LAST_NAME }}
                .item(@click="sendFileToEmployee") Send a file to {{ employeeForContext.FIRST_NAME + " " + employeeForContext.LAST_NAME }}
                .item(style="display: none")
                    input(type="file" id="selectEmployeeFileInput"  @change="processBrowseFiles")   
</template>

<script>
import store from "./Store/StoreTR.js"

export default {
    data() {
        return {
            employee: {},
            employeeForContext: {}
        }
    },

    methods: {
        contextMenu(event, item) {
            this.employeeForContext = item
            this.$refs.listContextMenu.show(event)
            if (window.getSelection) window.getSelection().removeAllRanges()
        },

        chatWithEmployee() {
            store.chatWithEmployee(this.employeeForContext)
        },

        sendMessageToEmployee() {
            store.composeAndSendEmployeeMessage(this.employeeForContext)
        },

        sendFileToEmployee() {
            $("#selectEmployeeFileInput").click()
        },

        processBrowseFiles(event) {
            const files = [...event.srcElement.files]
            const file = files[0]

            const fileInfo = {
                table: "EMPLOYEES_FILES",
                token: this.employeeForContext.chatToken,
                TO_ID: this.employeeForContext.PK,
                FILE_NAME: file.name
            }

            this.$uploadFile(file, fileInfo, store.uploadTokens.EMPLOYEES_FILES)

            // Clear the input, so it's ready for the next upload
            $("#selectEmployeeFileInput").val("")
        }
    },

    computed: {
        managersList() {
            return store.employees
                .filter(employee => employee.EMPLOYEE_TYPE === 2 && employee.PK != 237)
                .sort((a, b) => (a.FIRST_NAME === b.FIRST_NAME ? a.LAST_NAME.localeCompare(b.LAST_NAME) : a.FIRST_NAME.localeCompare(b.FIRST_NAME)))
        },

        managersSchedule() {
            return store.Settings("MANAGERS_SCHEDULE")
        }
    }
}
</script>

<style scoped>
.employee-icon-wrapper {
    padding: 6px 0 0 10px;
}

.employee-name-list {
    padding: 10px 15px 10px 10px;
    font-weight: 300;
    flex-grow: 1;
    text-overflow: ellipsis;
    overflow: hidden;
}

.list-item {
    display: flex;
}

#list-header {
    border-bottom: 1px solid #bfc2c4;
}

#details-wrapper {
    height: 100%;
}
</style>
