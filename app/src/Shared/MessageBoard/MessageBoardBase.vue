<template lang="pug">
PageBase(:headerText="headerText" headerWidth="366")
    //- Header buttons
    #header-buttons-wrapper(slot="header-buttons")
        .ui.button.primary(@click="startThread") Start a new thread
        .ui.button.teal(v-show="mbThread.PK" @click="postReply" :class="{ disabled: !mbThread.PK}") Post reply to this thread
    ListAndDetailsBase(ref="list" slot="page-contents" :items="mbThreadsList" :selectedObject="mbThread" :listWidth="350" :listItemHeight="60" )
        //- Thread filter
        #list-header(slot="list-header")
            .field.ui.form.small
                input#input-filter-threads(type="text" v-model="mbThreadFilter" placeholder="Filter threads")
        //- Threads list
        .list-item(slot="list-item" slot-scope="{item}" @click="selectThread(item.PK)" @contextmenu.prevent="contextMenu($event, item)" :class="{'list-sticky-item' : item.IS_STICKY}") 
            .list-row1 {{ item.LANGUAGE_ID ? `[${store.languageName(item.LANGUAGE_ID)}]` : "" }} {{ item.SUBJECT }}
            .list-row2
                .list-row2-sticky
                .list-row2-author {{ item.author }}
                .list-row2-separator
                .list-row2-date {{ utils.formatDate(item.DATE, "ll") }}               
        //- Details div
        #details-wrapper(slot="details" style="max-width: 750px")
            #loading-wrapper(v-if="loadingStatus === 1") Loading threads...
            #posts-wrapper.ui.segment.raised(v-if="mbThread.PK")
                #thread-title {{ mbThread.SUBJECT }}
                #posts-list-wrapper
                    .post-wrapper(v-for="mbPost in mbPosts")
                        .post-header
                            .post-header-author {{ postAuthor(mbPost) }}
                            div
                            .post-header-date {{ utils.formatDate(mbPost.DATE, "ll, h:mm A") }}
                        .post-text(v-html="utils.linkify(mbPost.TEXT.replace(/<img.+>/gi, ''))")
    //- Extra components (modal dialogs, context menus etc.)
    .div-zero(slot="page-extras")
        //- MENU List context menu
        TWContextMenu(ref="listContextMenu" v-if="store.myself.EMPLOYEE_TYPE === 2")
            .menu(slot="menu-items")
                .item(@click="deleteThread") Delete thread
                .item(@click="toggleSticky") {{ menuMarkAsStickyText }}     
        //- MODAL Start a new thread
        #modal-start-thread.ui.small.modal
            .header Start a new thread
            i.close.icon
            .content
                .ui.form
                    .field
                        input(type="text" v-model="newMBThread.subject" placeholder="Subject")
                    .field(v-if="settings.isForTranslations")
                        TWDropdown(ref="dropdownLanguage" defaultText="Language" :obj="newMBThread" field="LANGUAGE_ID" :items="store.languages" :change="updateThreadLanguage" itemKey="LANGUAGE")
                    .field
                        textarea(rows="6" v-model="newMBThread.text" placeholder="Message")
                p(v-if="store.myself.EMPLOYEE_TYPE === 1" style="font-size: 12px; padding-top: 10px") #[strong Note:] You are not allowed to post messages related to job opportunities. Translators that break this rule will have their account terminated.
            .actions
                .ui.cancel.button(@click="cancelStartNewThread") Cancel
                .ui.cancel.violet.button(@click="saveDraft" :class="{disabled: !isCreateButtonActive }") Save as draft
                #modal-create-thread-button.ui.positive.button.transition(@click="doStartThread" :class="{disabled: !isCreateButtonActive}") Create thread
        //- MODAL Post a reply to the active thread
        #modal-post-reply.ui.small.modal
            .header Post reply
            i.close.icon
            .content
                .ui.form
                    .field
                        textarea(rows="6" v-model="newMBPost.text" placeholder="Message")
                p(v-if="store.myself.EMPLOYEE_TYPE === 1" style="font-size: 12px; padding-top: 10px") #[strong Note:] You are not allowed to post messages related to job opportunities. Translators that break this rule will have their account terminated.
            .actions
                .ui.cancel.button Cancel
                .ui.positive.button(@click="doPostReply") Post reply

</template>


<script>
import store from "../StoreBase.js"
import cmg from "../ConnectionManagerBase.js"
import utils from "../UtilsBase.js"
import C_ from "../ConstantsBase.js"
import CoreMixin from "../Mixins/CoreMixin"

// Sets the .author for each mbThread
function setAuthors() {
    for (let mbThread of store.mbThreads) {
        if (mbThread && mbThread.PK && !mbThread.author) {
            let author = "Unknown author"
            let employee = store.employee(mbThread.EMPLOYEE_ID)
            if (employee) author = employee.fullName()
            else if (mbThread.metadata && mbThread.metadata.FULL_NAME) author = mbThread.metadata.FULL_NAME
            else if (mbThread.AUTHOR) author = mbThread.AUTHOR
            mbThread.author = author
        }
    }
}

export default {
    mixins: [CoreMixin],

    props: {
        settings: Object
    },

    data() {
        return {
            pageState: ["mbThread", "mbThreadFilter", "draftMBThread", "loadingStatus"],
            mbThread: {},
            mbThreadFilter: "",
            newMBThread: { subject: "", text: "", LANGUAGE_ID: 0 },
            draftMBThread: { subject: "", text: "" },
            loadingStatus: 0,
            newMBPost: { text: "" },
            mbThreads: store.mbThreads,
            mbThreadForContext: undefined
        }
    },

    methods: {
        selectThread(pk) {
            this.mbThread = store.mbThread(pk)
            cmg.requestObjectsForObject(this.mbThread, "MB_POSTS")
        },

        clearThread() {
            this.mbThread = {}
        },

        contextMenu(event, item) {
            if (store.myself.EMPLOYEE_TYPE != 2) return
            this.mbThreadForContext = item
            this.$refs.listContextMenu.show(event)
            if (window.getSelection) window.getSelection().removeAllRanges()
        },

        deleteThread(event) {
            // If the deleted thread was selected, make the selected thread blank, so the thread contents goes away
            if (this.mbThreadForContext === this.mbThread) this.mbThread = {}

            cmg.deleteObject(this.mbThreadForContext)
        },

        toggleSticky() {
            const newValue = !this.mbThreadForContext.IS_STICKY

            // Allow the menu to close, otherwise the label on the menu changes while closing, looking like a glitch
            setTimeout(() => {
                cmg.updateObject(this.mbThreadForContext, "IS_STICKY", newValue)
            }, 100)
        },

        postAuthor(mbPost) {
            const employee = store.employee(mbPost.EMPLOYEE_ID)
            if (employee) return employee.fullName()
            if (mbPost.AUTHOR) return mbPost.AUTHOR
            if (mbPost.metadata && mbPost.metadata.FULL_NAME) return mbPost.metadata.FULL_NAME
            return "???"
        },

        updateThreadLanguage(field, value) {
            this.newMBThread.LANGUAGE_ID = value
        },

        startThread() {
            this.newMBThread.subject = this.draftMBThread.subject
            this.newMBThread.text = this.draftMBThread.text
            this.showModal("#modal-start-thread")
        },

        doStartThread(event) {
            if (!this.newMBThread.subject || !this.newMBThread.text) return
            if (this.settings.isForTranslations && !this.newMBThread.LANGUAGE_ID) return

            this.newMBThread.insertID = utils.getUniqueID()
            const thread = {
                table: "MB_THREADS",
                SUBJECT: this.newMBThread.subject,
                children: [
                    {
                        table: "MB_POSTS",
                        MB_THREAD_ID: 0,
                        TEXT: this.newMBThread.text,
                        metadata: { FULL_NAME: store.myself.fullName() }
                    }
                ],
                metadata: { FULL_NAME: store.myself.fullName() }
            }
            if (this.newMBThread.LANGUAGE_ID && this.settings.isForTranslations) thread.LANGUAGE_ID = this.newMBThread.LANGUAGE_ID

            cmg.insertObject(thread).then(insertedThread => {
                this.mbThread = store.mbThread(insertedThread.PK)
            })

            this.$refs.dropdownLanguage && this.$refs.dropdownLanguage.clear()
            this.newMBThread.LANGUAGE_ID = 0
            this.newMBThread.subject = this.newMBThread.text = ""
            this.draftMBThread.subject = this.draftMBThread.text = ""
        },

        cancelStartNewThread() {
            setTimeout(() => {
                this.newMBThread.subject = this.newMBThread.text = ""
                this.draftMBThread.subject = this.draftMBThread.text = ""
                this.$refs.dropdownLanguage && this.$refs.dropdownLanguage.clear()
                this.newMBThread.LANGUAGE_ID = 0
            }, 200)
        },

        saveDraft() {
            this.draftMBThread = {
                subject: this.newMBThread.subject,
                text: this.newMBThread.text
            }
        },

        postReply() {
            this.newMBPost.text = ""
            this.showModal("#modal-post-reply")
        },

        doPostReply() {
            this.newMBPost.insertID = utils.getUniqueID()
            const post = {
                table: "MB_POSTS",
                insertID: this.newMBPost.insertID,
                MB_THREAD_ID: this.mbThread.PK,
                TEXT: this.newMBPost.text
            }
            cmg.insertObject(post)
        }
    },

    created() {
        setAuthors()
        this.utils = utils
        this.store = store
    },

    mounted() {
        // For translators, the MB_THREADS are not loaded at login, so load them here
        if (store.myself.EMPLOYEE_TYPE === C_.etTranslator) {
            // If we have requested them already, return
            if (store.isLoadingMBThreads) return

            // Request the threads from the server
            cmg.requestObjects("MB_THREADS_TR").then(() => (this.loadingStatus = 2))
            store.isLoadingMBThreads = true

            // If after 0.5 seconds the threads are not loaded, show a loading message
            setTimeout(() => {
                if (this.loadingStatus != 2) this.loadingStatus = 1
            }, 500)
        }
    },

    computed: {
        isCreateButtonActive() {
            if (!this.newMBThread.subject || !this.newMBThread.text) return false
            if (this.settings.isForTranslations && !this.newMBThread.LANGUAGE_ID) return false
            return true
        },

        headerText() {
            return "Message Board" + (this.settings.isForTranslations ? " for Translations" : "")
        },

        mbThreadsList() {
            let mbThreads = []
            let filter = utils.escapeString(this.mbThreadFilter.toLowerCase())

            mbThreads = store.mbThreads
                .filter(obj => obj && !!obj.LANGUAGE_ID == !!this.settings.isForTranslations && obj.SUBJECT.toLowerCase().match(filter))
                .sort((a, b) => {
                    if (a.IS_STICKY && b.IS_STICKY) return b.DATE - a.DATE
                    if (a.IS_STICKY || b.IS_STICKY) return b.IS_STICKY - a.IS_STICKY
                    return b.DATE - a.DATE
                })

            return mbThreads
        },

        mbPosts() {
            return store.mbPosts
                .filter(obj => obj.MB_THREAD_ID == this.mbThread.PK)
                .sort((a, b) => {
                    return a.DATE - b.DATE
                })
        },

        menuMarkAsStickyText() {
            if (!this.mbThreadForContext) return ""
            return `Mark as ${this.mbThreadForContext.IS_STICKY ? "not " : ""}sticky`
        }
    },

    watch: {
        mbThreads() {
            setAuthors()
        }
    }
}
</script>

<style scoped>
#input-filter-threads {
    border-radius: 0;
    border: 0;
    border-bottom: 1px solid #cad0d3;
    border-top: 1px solid #cad0d3;
    border-right: solid 1px #cad0d3;
    margin-bottom: 1px;
}

.list-item {
    border-bottom: 1px solid rgb(243, 243, 243);
    height: 60px;
}

.list-row1 {
    font-weight: 600;
    padding-left: 13px;
    padding-top: 10px;
    padding-bottom: 3px;
    font-size: 12px;
}

.list-row2 {
    display: grid;
    grid-template-columns: 20px auto 1fr auto;
}

.list-sticky-item {
    border-left: 5px solid #ffa834;
}

.list-row2-sticky {
    padding: 4px 0 0 6px;
    color: rgba(19, 82, 33, 0.555);
}

.list-row2-author {
    color: rgb(139, 141, 143);
    padding: 3px 0 3px 3px;
    font-size: 12px;
    font-weight: 300;
}

.list-row2-date {
    color: rgb(132, 162, 179);
    padding: 3px 10px 3px 4px;
    font-size: 11px;
}

#details-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
}

#header-buttons-wrapper {
    padding: 10px;
    padding-right: 22px;
}

#loading-wrapper {
    padding-top: 10px;
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
    line-height: 1.4em;
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
    color: rgb(173, 180, 189);
}

.post-header-date {
    color: rgb(184, 186, 192);
}

.post-text {
    padding-top: 15px;
    white-space: pre-line;
    color: rgb(51, 52, 53);
    line-height: 1.6em;
}
</style>




