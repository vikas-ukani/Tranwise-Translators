<template lang="pug">
PageBase(headerText="Personal Messages & Files")
    ListAndDetailsBase(slot="page-contents" :items="messagesList" :selectedObject="message" :listWidth="400" :listItemHeight="60" )
        //- Filter box
        #list-header(slot="list-header")
            .field.ui.form.small
                input#input-filter-tips(type="text" v-model="messagesFilter" placeholder="Filter messages")
        //- List
        .list-item(slot="list-item" slot-scope="{item}" @click="item.MESSAGE === undefined ? selectFile(item.PK, $event) : selectMessage(item.PK, $event)" @contextmenu.prevent="contextMenu($event, item)") 
            .list-row1
                .list-row1-from(:class="{ unread: item.IS_READ === undefined ? !item.IS_DOWNLOADED : !item.IS_READ }") {{ sender(item) }}
                .list-row1-date(style="font-weight: 500" v-if="item.SIZE") {{ utils.formatByteSize(item.SIZE) }}               
                .list-row1-date {{ utils.formatDate(item.MESSAGE_TIME || item.UPLOAD_TIME) }}               
            .list-row2(v-if="item.MESSAGE != undefined")
                .list-row2-message(:class="{ unread: !item.IS_READ }") {{ item.MESSAGE }}
            .list-row2(v-else)
                div(style="width: 15px; padding-left: 3px")
                    RadialProgress(v-if="item.downloadProgress" :progress="item.downloadProgress")
                .list-row2-file(:class="{ unread: !item.IS_DOWNLOADED }") &#x1f4ce; {{ item.FILE_NAME }}
        #employees-messages-list-footer(slot="list-footer") Tip: Hold down Ctrl and click on a message or file to delete it
        //- Details div
        #details-wrapper(slot="details" style="max-width: 750px")
            #posts-wrapper.ui.segment.raised(v-if="message.PK")
                #thread-title {{ sender(message) }}
                #posts-list-wrapper
                    .post-text(v-html="utils.linkify(message.MESSAGE.replace(/<img.+>/gi, ''))")
    //- Extra components (modal dialogs, context menus etc.)
    .div-zero(slot="page-extras")
        //- MENU List context menu
        TWContextMenu(ref="listContextMenu")
            .menu(slot="menu-items")
                .item(@click="markAsUnread" v-if="messageForContext") Mark as {{ messageForContext.IS_READ ? "unread" : "read" }}
                .item(@click="messageForContext ? deleteMessage() : deleteFile()") Delete {{ messageForContext ? "message" : "file" }}
</template>


<script>
import store from "../StoreBase.js"
import cmg from "../ConnectionManagerBase.js"
import utils from "../UtilsBase.js"
import CoreMixin from "../Mixins/CoreMixin"
import RadialProgress from "../components/RadialProgress"

export default {
    mixins: [CoreMixin],

    components: { RadialProgress },

    data() {
        return {
            pageState: ["message", "messagesFilter"],
            message: {},
            messagesFilter: "",
            messageForContext: undefined,
            fileForContext: undefined,
            listReactivity: 0
        }
    },

    created() {
        this.utils = utils
        this.store = store
    },

    methods: {
        selectMessage(pk, event) {
            if (event.metaKey || event.ctrlKey) {
                const message = store.employeesMessage(pk)
                if (message === this.message) this.message = {}
                message.isDeleted = true
                this.listReactivity++
                cmg.deleteObject(message)
                return
            }

            this.message = store.employeesMessage(pk)
            if (this.message && !this.message.IS_READ) cmg.updateObject(this.message, "IS_READ", true)
            this.message.IS_READ = true
        },

        selectFile(pk) {
            if (event.metaKey || event.ctrlKey) {
                const file = store.employeesFile(pk)
                file.isDeleted = true
                this.listReactivity++
                cmg.deleteObject(file)
                return
            }

            let file = store.employeesFile(pk)
            if (file && !file.IS_DOWNLOADED) cmg.updateObject(file, "IS_DOWNLOADED", true)
            file.IS_DOWNLOADED = true
            this.$downloadFile(file, "Received files")
        },

        sender(message) {
            if (!message.FROM_ID) return "System"

            // If we have the employee in store, use their fullName
            const employee = store.employee(message.FROM_ID)
            if (employee) return employee.fullName()

            // Otherwise use the SENDER_NAME that we got with the message
            return message.SENDER_NAME || "???"
        },

        contextMenu(event, item) {
            this.messageForContext = undefined
            this.fileForContext = undefined

            if (item.MESSAGE === undefined) this.fileForContext = item
            else this.messageForContext = item

            this.$refs.listContextMenu.show(event)
            if (window.getSelection) window.getSelection().removeAllRanges()
        },

        deleteMessage(message) {
            // If the deleted message was selected, make the selected message blank, so the details go away
            if (this.messageForContext === this.message) this.message = {}
            this.messageForContext.isDeleted = true
            this.listReactivity++
            cmg.deleteObject(this.messageForContext)
        },

        deleteFile(file) {
            this.fileForContext.isDeleted = true
            this.listReactivity++
            cmg.deleteObject(this.fileForContext)
        },

        markAsUnread() {
            if (!this.messageForContext) return
            const newValue = !this.messageForContext.IS_READ
            cmg.updateObject(this.messageForContext, "IS_READ", newValue)

            // Allow the menu to close, otherwise the label on the menu changes while closing, looking like a glitch
            setTimeout(() => {
                this.messageForContext.IS_READ = newValue
            }, 100)
        }
    },

    computed: {
        messagesList() {
            this.listReactivity++ // Recomputes the list when a message or file is deleted

            let filter = utils.escapeString(
                this.messagesFilter
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
            )
            const messages = store.employeesMessages.filter(
                obj =>
                    obj &&
                    obj.MESSAGE &&
                    (obj.MESSAGE.toLowerCase().match(filter) ||
                        this.sender(obj)
                            .toLowerCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .match(filter))
            )
            const files = store.employeesFiles.filter(
                obj =>
                    obj &&
                    obj.FILE_NAME &&
                    (obj.FILE_NAME.toLowerCase().match(filter) ||
                        this.sender(obj)
                            .toLowerCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .match(filter))
            )
            const list = messages
                .concat(files)
                .filter(obj => obj && !obj.isDeleted)
                .sort((a, b) => (b.MESSAGE_TIME || b.UPLOAD_TIME) - (a.MESSAGE_TIME || a.UPLOAD_TIME))
            return list
        }
    }
}
</script>

<style scoped>
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

.list-row1 {
    display: flex;
    font-weight: 300;
    padding-top: 7px;
}

.list-row2 {
    display: flex;
}

.list-row1-from {
    padding: 3px 0 3px 13px;
    font-size: 12px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    width: 250px;
}

.list-row1-date {
    color: rgb(132, 162, 179);
    padding: 3px 10px 3px 4px;
    font-size: 12px;
    text-align: right;
    flex: 1 1 auto;
}

.list-row2-message {
    font-size: 12px;
    font-weight: 300;
    padding: 1px 20px 0 23px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: rgb(153, 157, 163);
}

.list-row2-file {
    font-size: 12px;
    font-weight: 300;
    padding: 1px 20px 0 10px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: rgb(153, 157, 163);
}

.unread {
    font-weight: 600 !important;
}

#employees-messages-list-footer {
    border-top: thin solid lightgrey;
    padding: 8px 14px;
    font-size: 11px;
}

#details-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
}

#posts-wrapper {
    padding: 0;
    border-radius: 5px;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    height: 100%;
}

#thread-title {
    font-size: 20px;
    font-weight: 300;
    color: white;
    padding: 20px;
    background-color: #7ac859;
    border-radius: 5px 5px 0 0;
}
#posts-list-wrapper {
    flex: 1 1 auto;
    overflow-y: auto;
    background-color: white;
    border-radius: 0 0 5px 5px;
    height: 0;
}

#thread-posts {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    overflow-y: auto;
}

#posts-contents {
    overflow: auto;
}

.post-wrapper {
    border-bottom: 1px solid rgb(224, 224, 224);
    padding: 15px;
}

.post-wrapper:nth-of-type(2n) {
    background-color: rgb(248, 252, 255);
}

.post-header {
    display: grid;
    grid-template-columns: auto 1fr auto;
}

.post-header-author {
    font-weight: 700;
    color: rgb(78, 77, 77);
}

.post-header-date {
    color: rgb(77, 78, 80);
}

.post-text {
    padding: 20px;
    white-space: pre-line;
    color: rgb(112, 114, 117);
    line-height: 1.6em;
}
</style>



