<template lang="pug">
#projects-assigned-translators-wrapper
    .translation-row(v-if="assignedTranslations.length" v-for="translation in assignedTranslations")
        .column.column-employee-status.clickable
            img(@click="clickEmployeeStatus(translation)" :src="employeeStatusIcon(translation)")
        .column.column-language(:class="{ 'language-t' : translation.isTranslating(), 'language-p' : translation.isProofreading() }" :style="{'min-width': $attrs.showConfirmedStatus ? '43px' : '35px'}") {{ translation.shortLanguageName() + ($attrs.showConfirmedStatus && !translation.CONFIRMED ? " ✓" : "") }}
        .column(@contextmenu.prevent="contextMenuEmployee($event, translation.employee())") {{ employeeName(translation) }}
    div(v-if="!assignedTranslations.length" style="padding: 7px") No translators were assigned
    EmployeeContextMenu(ref="employeeContextMenu" showGoToDetails)
</template>


<script>
import { store, cmg, constants as C_ } from "../../CoreModules"
import CoreMixinManagers from "../../Mixins/CoreMixinManagers"
import EmployeeContextMenu from "../../EmployeeContextMenu"

export default {
    mixins: [CoreMixinManagers],

    props: {
        project: Object
    },

    components: {
        EmployeeContextMenu
    },

    computed: {
        assignedTranslations() {
            return this.project.assignedTranslations()
        }
    },

    methods: {
        contextMenuEmployee(event, employee) {
            this.employeeForContextMenu = employee
            this.$refs.employeeContextMenu.show(event, employee)
        },

        clickEmployeeStatus(translation) {
            const emp = store.employee(translation.EMPLOYEE_ID)
            if (emp) store.chatWithEmployee(emp)
        },

        employeeStatusIcon(translation) {
            const emp = store.employee(translation.EMPLOYEE_ID)
            if (!emp) return ""
            const path = "/static/icons/Employees/OnlineStatus"
            if (emp.IS_NOT_AVAILABLE) return path + "NotAvailable.svg"
            const status = emp.ONLINE_STATUS
            if (status == C_.eoOffline) return path + "Offline.svg"
            if (status == C_.eoOnline) return path + "Online.svg"
            if (status == C_.eoAway) return path + "Away.svg"
            if (status == C_.eoIdle) return path + "Idle.svg"
        },

        employeeName(translation) {
            const employee = store.employee(translation.EMPLOYEE_ID)
            if (!employee) return ""

            const newTag = employee.IS_NEW_TRANSLATOR ? " [NEW]" : ""
            return employee.fullName() + newTag
        }
    }
}
</script>

<style scoped>
#projects-assigned-translators-wrapper {
    height: 100%;
    width: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    border: thin solid rgb(187, 187, 187);
    border-radius: 5px;
    background-color: white;
    padding: 5px 8px;
    font-size: 12px;
}

.translation-row {
    display: flex;
}

.column-employee-status {
    margin-right: 10px;
}

.language-t {
    color: rgb(67, 187, 243);
}

.language-p {
    color: rgb(87, 201, 11);
}

.column-language {
    font-weight: 700 !important;
}

.column {
    white-space: nowrap;
    padding: 3px 0;
}
</style>
