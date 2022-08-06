<template lang="pug">
    TWContextMenu(ref="employeeContextMenu")
        .menu#employees-context-menu(slot="menu-items" )
            .item(v-if="shouldShowRemindToConfirmAssignment" @click="remindToConfirmAssignment") Remind employee to confirm assignment
            .divider(v-if="shouldShowRemindToConfirmAssignment")
            .item(v-if="employee" @click="chatWithEmployee") Chat with {{ employee.fullName()}}
            .item(v-if="employee" @click="sendMessageToEmployee") Send a message to {{ employee.fullName() }}
            .item(v-if="employee" @click="sendFileToEmployee") Send a file to {{ employee.fullName() }}
            .divider
            .item(v-if="employee" @click="showAssignedProjects") Show assigned projects
            .divider(v-if="$attrs.showGoToDetails")
            .item(v-if="$attrs.showGoToDetails" @click="goToEmployeeDetails") Go to employee's details
            .item(v-if="$attrs.showGoToDetails && employee && (employee.ONLINE_STATUS === 2 || employee.IS_NOT_AVAILABLE)" @click="viewAwayMessage") View away message
            .item(style="display: none")
                input(type="file" id="selectEmployeeFileInput" @change="processBrowseFiles")   
            .divider
            .item(v-if="!isSortingByRegistrationDate" @click="sortListByRegistrationDate") Sort list by registration date
            .item(v-else @click="sortListByName") Sort list by name
</template>

<script>
import { store, constants as C_ } from "./CoreModules"

export default {
    props: {
        showRemindToConfirmAssignment: Boolean,
        isSortingByRegistrationDate: Boolean
    },

    data() {
        return {
            employee: undefined,
            translation: undefined
        }
    },

    computed: {
        shouldShowRemindToConfirmAssignment() {
            return this.translation && [C_.tsTranslating, C_.tsProofreading].includes(this.translation.STATUS) && !this.translation.CONFIRMED
        }
    },

    methods: {
        show(event, employee, translation) {
            this.employee = employee
            this.translation = translation
            this.$refs.employeeContextMenu.show(event)
            if (window.getSelection) window.getSelection().removeAllRanges()
        },

        processBrowseFiles(event) {
            const files = [...event.srcElement.files]
            const file = files[0]

            const fileInfo = {
                table: "EMPLOYEES_FILES",
                TO_ID: this.employee.PK,
                token: this.employee.chatToken,
                FILE_NAME: file.name
            }

            this.$uploadFile(file, fileInfo, store.uploadTokens.EMPLOYEES_FILES)

            // Clear the input, so it's ready for the next upload
            $("#selectEmployeeFileInput").val("")
        },

        chatWithEmployee() {
            store.chatWithEmployee(this.employee)
        },

        sendMessageToEmployee() {
            store.composeAndSendEmployeeMessage(this.employee)
        },

        sendFileToEmployee() {
            $("#selectEmployeeFileInput").click()
        },

        showAssignedProjects() {
            if (!this.employee) return
            let result = ""
            for (let translation of store.translations) {
                if (translation.EMPLOYEE_ID != this.employee.PK) continue
                if (![C_.tsTranslating, C_.tsProofreading].includes(translation.STATUS)) continue

                const subproject = translation.subproject()
                if (!subproject) continue
                const project = subproject.project()
                if (!project) continue

                if (![C_.psPending, C_.psTranslation, C_.psProofreading, C_.psCheckPhase, C_.psReopened].includes(project.STATUS)) continue
                if (translation.STATUS === C_.tsTranslating) result += `Translate ${project.PROJECT_NUMBER} - ${subproject.languageName()}\n`
                if (translation.STATUS === C_.tsProofreading) result += `Proofread ${project.PROJECT_NUMBER} - ${subproject.languageName()}\n`
            }
            if (result) result = `${this.employee.fullName()} is currently working on:\n\n` + result
            else result = `${this.employee.fullName()} is not assigned to any opened projects.`
            this.$showMessage(result)
        },

        goToEmployeeDetails() {
            store.goToObject(this.employee)
        },

        viewAwayMessage() {
            if (this.employee.IS_NOT_AVAILABLE) {
                if (this.employee.AVAILABILITY) this.$showMessage(`${this.employee.fullName()} is not available for the following reason:\n\n${this.employee.AVAILABILITY}`)
                else this.$showMessage(`${this.employee.fullName()} has not specified any reason for being unavailable.`)
            } else if (this.employee.ONLINE_STATUS === C_.eoAway) {
                if (this.employee.AWAY_MESSAGE) this.$showMessage(`${this.employee.fullName()} is away with the following message:\n\n${this.employee.AWAY_MESSAGE}`)
                else this.$showMessage(`${this.employee.fullName()} has not specified any reason for being away.`)
            }
        },

        remindToConfirmAssignment() {
            this.$emit("remindEmployeeToConfirmAssignment", this.employee)
        },

        sortListByRegistrationDate() {
            this.$emit("sortListByRegistrationDate", true)
        },

        sortListByName() {
            this.$emit("sortListByRegistrationDate", false)
        }
    }
}
</script>

<style scoped>
#employees-context-menu > .divider {
    margin: 0 !important;
}

#employees-context-menu > .item {
    font-size: 12px;
    padding: 8px 20px !important;
}
</style>
