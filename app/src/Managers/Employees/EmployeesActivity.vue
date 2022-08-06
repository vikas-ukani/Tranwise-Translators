<template lang="pug">
#employee-activity-wrapper.ui.raised.segment.padded(style="max-width: 750px")
    #employee-activity-header {{ store.fullName(employee.PK) }}
    div(v-if="store.permissions.viewManagersActivity && employee.EMPLOYEE_TYPE != C_.etManager" style="padding: 20px") Activity is only available for project managers
    #employee-activity-content(v-else-if="store.permissions.viewManagersActivity")
        #activity-actions
            h5.ui.dividing.header(style="display:flex; margin-bottom: 0") Activity
                div(v-show="loadingEmployees.includes(employee.PK)" style="margin-left: auto; margin-bottom: 5px; font-weight: 400") Loading...
                i.teal.sync.icon.clickable(style="margin-left: auto; margin-bottom: 5px" @click="refreshActivity")
            #activity-actions-list-wrapper
                RecycleScroller.scroller(ref="scroller" :items="activityActions" :item-size="30" key-field="id")
                    .activity-action-container(slot-scope="{item}" :style="{ height: '30px' }")
                        div(style="color: grey; padding-right: 20px; white-space: nowrap") {{ item.time }}
                        div(style="overflow: hidden; white-space: nowrap; flex-grow: 1; color: #aaa" v-html="item.text")
                        i.ellipsis.horizontal.icon.clickable(v-if="item.details" style="color: #aaa; margin-left: 20px; margin-right: 10px" @click="showDetails(item.details)")
        #pending-chats
            h5.ui.dividing.header Pending chats
            #pending-chats-list-wrapper
                div(v-for="chat in pendingChats")
                    .pending-chat-row.clickable(@click="showChatMessages(chat)")
                        div(style="width: 130px") {{ utils.formatDate(chat.TIME) }}
                        div {{ employeeNameForChat(chat) }}
</template>

<script>
import { store, cmg, constants as C_, utils } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import { RecycleScroller } from "vue-virtual-scroller"
import "vue-virtual-scroller/dist/vue-virtual-scroller.css"

export default {
    mixins: [CoreMixin, CoreMixinManagers],

    components: { RecycleScroller },

    props: {
        employee: Object
    },

    data() {
        return {
            reactivityCounter: 0,
            loadingEmployees: []
        }
    },

    created() {
        store.eventBus.$on("receivedActivityLog", employeeID => {
            this.loadingEmployees.splice(this.loadingEmployees.indexOf(employeeID), 1)
            this.reactivityCounter++
        })
    },

    computed: {
        pendingChats() {
            return store.pendingChats.filter(chat => chat.TO_ID === this.employee.PK && !chat.ANSWERED_TIME).sort((a, b) => b.PK - a.PK)
        },

        activityActions() {
            if (this.reactivityCounter) {
            }

            if (!this.employee || !this.employee.activityLog) return []

            const result = []

            let index = 0
            const activity = this.employee.activityLog.split("\n[")

            for (let line of activity) {
                if (!line) continue
                const time = line.slice(0, line.indexOf("]"))
                const data = line.slice(line.indexOf("]") + 2)
                const action = { id: index++, time }

                let text = ""

                if (data.startsWith("Update: ")) {
                    const items = data.slice(8, data.indexOf(" ", 8)).split(".")
                    const table = items[0]
                    const field = items[1]
                    const pk = items[2]
                    const value = data.slice(data.indexOf(" = ") + 3)
                    text =
                        `<span style="color: #8159a6">${table}</span> . <span style="color: #ad661f">${field}</span> ` +
                        `[ <span style="color: #008060">${pk}</span> ] = <span style="color: #0a66c2">${value}</span>`

                    action.text = text

                    if (field === "ONLINE_STATUS") {
                        if (value == "0") action.text = "Disconnected"
                        else if (value == "1") action.text = "Connected"
                        else continue
                    }

                    if (data.length > 70) action.details = value
                }

                if (data.startsWith("Delete: ")) {
                    const items = data.slice(8).split(".")
                    const table = items[0]
                    const pk = items[1]
                    text = `Deleted <span style="color: #8159a6">${table}</span> with PK = <span style="color: #008060">${pk}</span>`
                    action.text = text
                }

                if (data.startsWith("Insert: ")) {
                    let object
                    try {
                        object = JSON.parse(data.slice(8))
                    } catch (error) {}
                    if (!object) continue

                    action.text = `Inserted into <span style="color: #8159a6">${object.table}</span> object with PK = <span style="color: #008060">${object.PK}</span>`

                    action.details = "Inserted into " + object.table + " object with PK = " + object.PK + "\n\n"

                    for (const [key, value] of Object.entries(object)) {
                        if (["table", "token", "insertID", "metadata", "isBySystem", "parentKey", "children", "PK"].includes(key)) continue
                        action.details += `${key} = ${value}\n`
                    }
                }

                if (!action.text) continue
                result.push(action)
            }

            return result.reverse()
        }
    },

    methods: {
        employeeNameForChat(chat) {
            if (chat.metadata && chat.metadata.SENDER_NAME) return chat.metadata.SENDER_NAME
            if (chat.FIRST_NAME || chat.LAST_NAME) return `${chat.FIRST_NAME} ${chat.LAST_NAME}`
            return "???"
        },

        refreshActivity() {
            if (!store.permissions.viewManagersActivity || this.employee.EMPLOYEE_TYPE != C_.etManager) return

            cmg.sendMessage(cmg.messageHeaders.REQUEST_ACTIVITY_LOG, this.employee.PK)
            this.loadingEmployees.push(this.employee.PK)
        },

        showDetails(details) {
            this.$showMessage(details)
        },

        showChatMessages(chat) {
            this.$showMessage(chat.TEXT || "There are no records for this chat.")
        }
    }
}
</script>

<style scoped>
#employee-activity-wrapper {
    display: flex;
    flex-direction: column;
    padding: 0;
    border-radius: 6px;
    height: 100%;
}

#employee-activity-header {
    padding: 18px 22px;
    background-color: #7ac859;
    border-radius: 5px 5px 0 0;
    font-size: 20px;
    font-weight: 300;
    color: white;
}

#employee-activity-content {
    padding: 20px 20px 40px 20px;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

#activity-actions {
    flex: 1 1 auto;
    padding-bottom: 30px;
    height: 0;
}

#activity-actions-list-wrapper {
    flex: 1 1 auto;
    overflow: hidden;
    height: 100%;
}

#pending-chats-list-wrapper {
    overflow: auto;
    height: 100%;
}

.activity-action-container {
    display: flex;
    padding-top: 10px;
    font-size: 11.5px;
}

#pending-chats {
    height: 200px;
    flex-basis: 200px;
    padding-top: 20px;
}

.pending-chat-row {
    display: flex;
    padding: 6px 0;
}
</style>
