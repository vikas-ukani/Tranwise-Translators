<template lang="pug">
PageBase(headerText="Twilio Chat" headerWidth="150")
    #header-buttons-wrapper(slot="header-buttons")
        .ui.button.small.basic.green(@click="sendSMS" style="margin-right: 14px") Send SMS
        .ui.button.small.basic.green(@click="sendWhatsapp" style="margin-right: 14px") Send Whatsapp
        .ui.button.small.coolblue(v-if="selectedThread.PK && !selectedThread.client" @click="showClientCreator") Create client
        .ui.button.small.teal(v-if="selectedThread.PK && selectedThread.lastProject" @click="goToProject") Go to {{ selectedThread.lastProject.PROJECT_NUMBER[0] === "Q" ? "quote" : "project" }}
        .ui.button.small.purple(v-if="selectedThread.PK && selectedThread.client" @click="goToProjectCreate") Create {{ selectedThread.lastProject ? "another " : "" }} quote
        .ui.button.small.yellow(style="margin-right: 14px" @click="makereadAll") Unanswered threads {{unreadMsgsCount}}
    ListAndDetailsBase(slot="page-contents" :items="threads" :selectedObject="selectedThread" :listWidth="400" :listItemHeight="60" )
        //- Filter box
        #list-header(slot="list-header")
            .field.ui.form.small
                input#input-filter-tips(type="text" v-model="twilioFilter" placeholder="Filter messages")
        //- List
        .list-item(slot="list-item" slot-scope="{item}" @click="selectThread(item.PK)" :class="{'unanswered-twilio-thread': item && item.lastMessage && !item.lastMessage.IS_ANSWERED}" @contextmenu.prevent="contextMenu($event, item)")
            .list-row1 {{ item.partnerString }}
            .list-row2
                .list-row2-sticky
                .list-row2-description {{ item.lastMessage.MESSAGE || (item.lastMessage.ATTACHMENT_LINKS ? "Attachment" : "") }}
                .list-row2-separator
                .list-row2-date {{ utils.formatDate( item.lastMessage.MESSAGE_TIME, "D MMM YYYY") }}
        //- Details div
        #details-wrapper(slot="details" style="max-width: 750px")
            #thread-wrapper.ui.segment.raised(v-if="selectedThread.PK")
                #thread-title {{ selectedThread.partnerString }}
                    .ui.button.small.coolblue(style="float: right") {{divisionData[selectedThread.lastMessage.DIVISION_ID]}}
                #twilio-messages-wrapper(v-if="selectedThread.receivedAllMessages")
                    .message-row(:class="{'is-whatsapp': message.IS_WHATSAPP > 0 }" v-for="message in messagesForSelectedThread" )
                        .spacer-before(v-if="message.SENDER_ID !== 0")
                        .time-before(v-if="message.SENDER_ID !== 0") {{ utils.formatDate(message.MESSAGE_TIME, "D MMM YYYY, HH:mm") }}
                        img(v-if="message.SENDER_ID === 0 && message.IS_WHATSAPP > 0" src="static/icons/icon-whatsapp.svg" width="15")
                        .message(:class="{ own: message.SENDER_ID !== 0, other: message.SENDER_ID === 0 }") <b>{{ message.senderName() === 'Client' ? '' : message.senderName() + ':' }}</b> {{ textForMessage(message) }}
                        .time-after(v-if="message.SENDER_ID === 0") {{ utils.formatDate(message.MESSAGE_TIME, "D MMM YYYY, HH:mm") }}
                        .spacer-after(v-if="message.SENDER_ID === 0")
                        img(v-if="message.SENDER_ID !== 0 && message.IS_WHATSAPP > 0" src="static/icons/icon-whatsapp.svg" width="15")
                div(v-else style="text-align: center; padding: 100px") Loading messages...
            #reply-wrapper(v-if="selectedThread.PK")
                div(style="flex: 1 1; padding-right: 20px")
                    .ui.form
                        textarea(rows="2" v-model="replyText")
                div
                    div(style="padding: 2px; font-size: 11px; text-align: right" :style="{ 'color' : replyText.length > characterLimit ? 'red' : 'grey'}") {{ replyText.length }} / {{ characterLimit }} characters
                    .ui.button.coolgreen(@click="reply") Send {{ selectedThread.lastMessage.IS_WHATSAPP > 0 ? '(Whatsapp)' : '(SMS)' }}
    //- Extra components (modal dialogs, context menus etc.)
    .div-zero(slot="page-extras")
        ClientsCreate(:client="newClient" forTwilio ref="clientsCreate" @createClient="doCreateClient")
        ProjectsCreateDialog(ref="ProjectsCreateDialog")
        #modal-send-twilio-sms.ui.small.modal
            .header Send {{ !smsThroughWhatsapp ? 'SMS' : 'Whatsapp' }} to number
            i.close.icon
            .content
                .ui.form
                    .fields
                        .field
                            input(type="text" v-model="smsToNumberNumber" placeholder="Phone number")
                        .field(style="padding-top: 8px") * in the format +1800800800
                        .field(style="padding-top: 8px; flex-grow: 1; text-align: right" :style="{ color: smsToNumberText.length > characterLimit ? 'orange' : 'black' }") {{ smsToNumberText.length }} / {{ characterLimit }} characters
                    .field
                        textarea(rows="10" v-model="smsToNumberText" :placeholder="'Message (max. ' + characterLimit + ' characters)'")
                p(v-if="smsToNumberWarning" style="color: red; padding-top: 10px") {{ smsToNumberWarning }}
                .ui.small.dividing.header Templates
                #twilio-templates-wrapper
                    .twilio-template(v-for="template in smsTemplates" @click="selectSMSTemplate(template)") {{ template.TITLE }}
            .actions
                .ui.cancel.button Cancel
                .ui.button.green(@click="doSendSMSToNumber") {{ !smsThroughWhatsapp ? 'Send SMS' : 'Send Whatsapp' }}
                //- This hidden button is used to close the modal. The one above should not close it, as there might be errors in the form.
                .ui.button.positive#dummy-send-twilio-sms-button(style="display: none")
        TWContextMenu(ref="twilioMessagesContextMenu")
            .menu(slot="menu-items")
                .item(v-if="!threadForContext || !threadForContext.client") This message doesn't have a client
                .item(v-if="threadForContext && threadForContext.client" @click="goToClientDetails") Go to client's details
                .item(v-if="threadForContext && threadForContext.client" @click="showClientProjects") Show client's projects
                .item(v-if="threadForContext && threadForContext.lastMessage && !threadForContext.lastMessage.IS_ANSWERED && store.permissions.markTwilioMessagesAsAnswered"  @click="markAsAnswered") Mark as answered
</template>

<script>
import { store, cmg, constants as C_, utils } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import ClientsCreate from "../Clients/ClientsCreate"
import ProjectsCreateDialog from "../Projects/ProjectsCreate/ProjectsCreateDialog"

export default {
    mixins: [CoreMixin],

    components: {
        ClientsCreate,
        ProjectsCreateDialog
    },

    data() {
        return {
            pageState: ["selectedThread", "twilioFilter", "replyText"],
            selectedThread: {},
            twilioFilter: "",
            replyText: "",
            newClient: {},
            threadForContext: undefined,
            threadsReactivityCounter: 1,
            smsToNumberNumber: "",
            smsToNumberText: "",
            smsToNumberWarning: "",
            smsThroughWhatsapp: false,
            divisionData: {
                7: 'UTS',
                5: 'USATranslate',
                2: 'NordicTrans',
                3: 'DutchTrans',
                9: 'CT'
            }
        }
    },

    props: {
        // This prop stores the message selected from the notification area (from "Go to Twilio message")
        objectFromFind: Object
    },

    created() {
        this.utils = utils
        this.store = store
        this.characterLimit = 1600
    },

    mounted() {
        this.scrollToBottom()
        this.$set(store, "showNewTwilioIcon", false)

        // If objectFromFind is set, then we came here from a find request, so select the thread
        if (this.objectFromFind && this.objectFromFind.table === "TWILIO_MESSAGES") this.selectThreadForTwilioMessage(this.objectFromFind)
    },

    methods: {
        contextMenu(event, item) {
            this.threadForContext = item
            this.$refs.twilioMessagesContextMenu.show(event)
            if (window.getSelection) window.getSelection().removeAllRanges()
        },

        selectThread(threadID) {
            for (let thread of this.threads) {
                if (thread.PK === threadID) {
                    this.selectedThread = thread
                    if (!this.selectedThread.receivedAllMessages) {
                        cmg.requestObjects("TWILIO_MESSAGES_WITH_PHONE_NUMBER", { PHONE_NUMBER: this.selectedThread.messages[0].PHONE_NUMBER, DIVISION_ID: this.selectedThread.messages[0].DIVISION_ID }).then(twilioMessages => {
                            this.$set(thread, "receivedAllMessages", true)
                            this.scrollToBottom()
                        })
                    }
                    break
                }
            }
            this.scrollToBottom()
        },

        selectThreadForTwilioMessage(twilioMessage) {
            for (let thread of this.threads) {
                if (thread.messages[0].PHONE_NUMBER === twilioMessage.PHONE_NUMBER) {
                    this.selectedThread = thread
                    if (!this.selectedThread.receivedAllMessages)
                        cmg.requestObjects("TWILIO_MESSAGES_WITH_PHONE_NUMBER", { PHONE_NUMBER: this.selectedThread.messages[0].PHONE_NUMBER, DIVISION_ID: this.selectedThread.messages[0].DIVISION_ID }).then(twilioMessages => {
                            this.$set(thread, "receivedAllMessages", true)
                            this.scrollToBottom()
                        })
                    break
                }
            }
        },

        scrollToBottom() {
            this.$nextTick(() => {
                const el = document.getElementById("twilio-messages-wrapper")
                if (!el) return
                el.scrollTop = el.scrollHeight
            })
        },

        textForMessage(message) {
            let result = message.MESSAGE
            if (message.ATTACHMENT_LINKS) {
                if (result) result += "\n\n"
                result += `Attachments:\n\n${message.ATTACHMENT_LINKS}`
            }
            return result
        },

        showClientCreator() {
            if (!this.selectedThread.PK) return

            this.newClient = {
                table: "CLIENTS",
                CLIENT_NAME: "Twilio " + this.selectedThread.lastMessage.PHONE_NUMBER.replace("+", ""),
                EMAILS: store.Settings("EMAIL_FOR_TWILIO_PROJECTS"),
                ADDRESS: "",
                SOURCE: 6, // Twilio
                COUNTRY_ID: 241, // United states
                DIVISION_ID: this.selectedThread.lastMessage.DIVISION_ID || 7, // UTS
                CURRENCY: "USD",
                PRICE: 0.12,
                REQUIRES_PREPAYMENT: true,
                PHONE_NUMBERS: this.selectedThread.lastMessage.PHONE_NUMBER
            }

            this.$refs.clientsCreate.showForTwilio()
        },

        async doCreateClient() {
            const currentThread = this.selectedThread
            const insertedClient = await cmg.insertObject(this.newClient)
            insertedClient.isLoaded = true
            cmg.updateObject(currentThread.lastMessage, "CLIENT_ID", insertedClient.PK)
        },

        async reply() {
            if (!this.selectedThread.PK) return
            if (!this.replyText) return
            if (this.$checkWithMessage(this.replyText.length > this.characterLimit, `Please type a message of ${this.characterLimit} characters or less.`)) return

            const phoneNumber = this.selectedThread.lastMessage.PHONE_NUMBER
            const twilioMessage = {
                table: "TWILIO_MESSAGES",
                PHONE_NUMBER: phoneNumber,
                MESSAGE: this.replyText.substring(0, this.characterLimit).trim(),
                IS_ANSWERED: true,
                IS_WHATSAPP: this.selectedThread.lastMessage.IS_WHATSAPP,
                DIVISION_ID: this.selectedThread.lastMessage.DIVISION_ID || 7
            }
            cmg.insertObject(twilioMessage)

            this.replyText = ""
        },

        goToProject() {
            if (!this.selectedThread.lastProject) return
            store.goToObject(this.selectedThread.lastProject)
        },

        makereadAll() {
            cmg.sendMessage(cmg.messageHeaders.READ_ALL_TWILIO_MSG)
            store.twilioThreads =   store.twilioThreads.map(item => {
                if (item && item.lastMessage && !item.lastMessage.IS_ANSWERED) {
                    item.lastMessage.IS_ANSWERED = true
                }
                return item;
            })
        },
        goToProjectCreate() {
            cmg.requestObjects("TWILIO_MESSAGES_WITH_PHONE_NUMBER", { PHONE_NUMBER: this.selectedThread.messages[0].PHONE_NUMBER, DIVISION_ID: this.selectedThread.messages[0].DIVISION_ID }).then(twilioMessages => {
                let lastMessageFromClient
                const messages = twilioMessages.sort((a, b) => a.PK - b.PK)
                if (!messages.length) return;
                let isWatssApp = messages[messages.length -1].IS_WHATSAPP || 0;
                for (let message of messages) if (message.SENDER_ID === 0) lastMessageFromClient = message
                if (!lastMessageFromClient) {
                    lastMessageFromClient = {
                        ATTACHMENT_LINKS: '',
                        MESSAGE: '',
                        IS_WHATSAPP: isWatssApp
                    };
                }
                lastMessageFromClient.client = this.selectedThread.client
                this.$refs.ProjectsCreateDialog.showForTwilioMessage(lastMessageFromClient)
            })
        },

        goToClientDetails() {
            if (!this.threadForContext.client) return
            store.goToObject(this.threadForContext.client)
        },

        showClientProjects() {
            if (!this.threadForContext.client) return
            cmg.requestObjects("COMPLETED_PROJECTS_FOR_CLIENT", { CLIENT_PK: this.threadForContext.client.PK })
            setTimeout(() => {
                this.$emit("showProjectsForClient", this.threadForContext.client)
            }, 100)
        },

        markAsAnswered() {
            if (!this.threadForContext || !this.threadForContext.lastMessage) return
            cmg.updateObject(this.threadForContext.lastMessage, "IS_ANSWERED", true)
        },

        sendSMS() {
            this.smsToNumberNumber = ""
            this.smsToNumberText = ""
            this.smsToNumberWarning = ""
            this.smsThroughWhatsapp = false;
            this.showModal("#modal-send-twilio-sms")
        },

        sendWhatsapp() {
            this.smsToNumberNumber = ""
            this.smsToNumberText = ""
            this.smsToNumberWarning = ""
            this.smsThroughWhatsapp = true;
            this.showModal("#modal-send-twilio-sms")
        },

        doSendSMSToNumber() {
            this.smsToNumberWarning = ""
            this.smsToNumberNumber = this.smsToNumberNumber.replace(/[ \-()]/g, "")
            if (this.smsToNumberNumber[0] != "+") this.smsToNumberWarning = "Please enter a valid phone number in the format +1800444444."
            else if (this.smsToNumberNumber.length < 8) this.smsToNumberWarning = "Please enter a valid phone number in the format +1800444444."
            else if (!this.smsToNumberText.length) this.smsToNumberWarning = "Please enter a message."
            else if (this.smsToNumberText.length > this.characterLimit) this.smsToNumberWarning = `Please enter a message no longer than ${this.characterLimit} characters.`

            if (this.smsToNumberWarning) return

            const twilioMessage = {
                table: "TWILIO_MESSAGES",
                PHONE_NUMBER: this.smsToNumberNumber,
                MESSAGE: this.smsToNumberText.substring(0, this.characterLimit).trim(),
                IS_ANSWERED: true,
                DIVISION_ID: 7
            }
            if (this.smsThroughWhatsapp) {
                twilioMessage.IS_WHATSAPP = 1;
            }
            cmg.insertObject(twilioMessage)

            $("#dummy-send-twilio-sms-button").click()
        },

        selectSMSTemplate(template) {
            if (!template) return
            this.smsToNumberText = template.TEXT
        }
    },

    computed: {
        threads() {
            if (!this.threadsReactivityCounter) return // Ensures reactivity

            // Sort the threads
            store.twilioThreads.sort((a, b) => b.lastMessage.PK - a.lastMessage.PK)

            let filter = this.twilioFilter.toLowerCase()
            if (filter)
                return store.twilioThreads.filter(thread => {
                    // Include the selected thread in the results, so it's always displayed, regardless of the filter
                    if (this.selectedThread.messages && this.selectedThread.messages[0].PHONE_NUMBER === thread.lastMessage.PHONE_NUMBER && this.selectedThread.messages[0].DIVISION_ID === thread.lastMessage.DIVISION_ID) return true
                    return thread.lastMessage.MESSAGE.toLowerCase().includes(filter) || thread.lastMessage.PHONE_NUMBER.includes(filter)
                })
            else {
                return [...store.twilioThreads]
            }
        },

        messagesForSelectedThread() {
            if (!this.selectedThread.PK) return
            const phoneNumber = this.selectedThread.lastMessage.PHONE_NUMBER
            const divisionId = this.selectedThread.lastMessage.DIVISION_ID
            return store.twilioMessages.filter(message => message.PHONE_NUMBER === phoneNumber && message.DIVISION_ID === divisionId).sort((a, b) => a.PK - b.PK)
        },

        // This is used in the watch below to be able to scroll down when a message comes in
        storeMessagesList() {
            return store.twilioMessages
        },

        smsTemplates() {
            return store.smsTemplates
        },
        unreadMsgsCount() {
            let unansweredMsgCount = 0;
            store.twilioThreads.map(item => {
                if (item && item.lastMessage && !item.lastMessage.IS_ANSWERED) {
                    unansweredMsgCount++;
                }
            })
            return unansweredMsgCount;
        }
    },

    watch: {
        storeMessagesList(newValue, oldValue) {
            const lastMessage = newValue[newValue.length - 1]
            this.threadsReactivityCounter++

            if (lastMessage && this.selectedThread.PK && lastMessage.PHONE_NUMBER === this.selectedThread.messages[0].PHONE_NUMBER && lastMessage.DIVISION_ID === this.selectedThread.messages[0].DIVISION_ID) {
                this.scrollToBottom()
            }
        },
        unreadMsgsCount() {
            let unansweredMsgCount = 0;
            store.twilioThreads.map(item => {
                console.log('item', item)
                if (item && item.lastMessage && !item.lastMessage.IS_ANSWERED) {
                    unansweredMsgCount++;
                }
            })
            return unansweredMsgCount;
        },

        objectFromFind(object, oldObject) {
            if (object && object !== oldObject && object.table === "TWILIO_MESSAGES") this.selectThreadForTwilioMessage(this.objectFromFind)
        }
    }
}
</script>

<style scoped>
#header-buttons-wrapper {
    padding: 10px;
    padding-right: 22px;
}

.list-item {
    border-bottom: 1px solid rgb(224, 224, 224);
    height: 60px;
}

#input-filter-tips {
    border-radius: 0;
    border: 0;
    border-bottom: 1px solid #cad0d3;
    border-top: 1px solid #cad0d3;
    border-right: solid 1px #cad0d3;
    margin-bottom: 1px;
}

.unanswered-twilio-thread {
    background-color: rgb(248, 240, 240) !important;
}

.list-row1 {
    font-weight: 400;
    padding-left: 13px;
    padding-top: 10px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.list-row2 {
    display: grid;
    grid-template-columns: 20px auto 1fr auto;
    font-weight: 200;
}

.list-row2-sticky {
    padding: 4px 0 0 6px;
    color: rgba(19, 82, 33, 0.555);
}

.list-row2-description {
    color: rgb(153, 157, 163);
    padding: 3px 0 3px 3px;
    font-size: 12px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    width: 250px;
}

.list-row2-date {
    color: rgb(132, 162, 179);
    padding: 3px 20px 3px 4px;
    font-size: 12px;
}

.list-row2-author {
    color: rgb(139, 141, 143);
    padding: 3px 0 3px 3px;
    font-size: 12px;
}

#details-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
}

#thread-wrapper {
    padding: 0;
    border-radius: 5px;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    height: 0;
}

#reply-wrapper {
    display: flex;
}

#thread-title {
    font-size: 20px;
    font-weight: 300;
    color: white;
    padding: 20px;
    background-color: #7ac859;
    border-radius: 5px 5px 0 0;
}

#twilio-messages-wrapper {
    height: 100%;
    overflow: auto;
}

#twilio-templates-wrapper {
    height: 120px;
    overflow-y: auto;
    border: thin solid rgb(220, 226, 230);
}

.twilio-template {
    border-bottom: thin solid rgb(226, 230, 235);
    padding: 7px 15px;
    cursor: pointer;
}

.twilio-template:hover {
    background-color: #f2f7f8;
}
.message-row {
    display: flex;
    padding: 0 10px;
}

.partner-typing {
    padding: 0px 10px 15px 20px;
    font-size: 12px;
    color: rgb(129, 145, 160);
}

.partner-offline {
    text-align: center;
    padding-top: 10px;
    font-size: 12px;
    color: rgb(185, 58, 58);
}

.partner-offline-send-message {
    text-align: center;
    padding: 10px 0;
    font-size: 12px;
    text-decoration: underline;
    color: rgb(97, 53, 53);
    cursor: pointer;
}

.message {
    margin: 10px;
    padding: 12px 15px;
    border-radius: 5px;
    min-width: 100px;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
    font-size: 12px;
    white-space: pre-line;
}

.spacer-before {
    flex: 1 1 auto;
}

.spacer-after {
    flex: 1 1 auto;
}

.message.own {
    background-color: #e4f3f7;
}

.message.other {
    background-color: #f0edf4;
}

.time-before,
.time-after {
    padding: 10px 0px;
    font-size: 12px;
    color: rgb(129, 147, 155);
    flex: 0 0 auto;
}

.time-before {
    margin: 10px 3px 10px 10px;
}

.time-after {
    margin: 10px 10px 10px 3px;
}
</style>
