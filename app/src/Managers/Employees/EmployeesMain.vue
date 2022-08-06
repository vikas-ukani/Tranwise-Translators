<template lang="pug">
PageBase(headerText="Employees", :headerWidth="140")
    #header-buttons-wrapper(slot="header-buttons")
        #employee-type-buttons
            .employee-type.manager.filter(:class="{ active: visibleEmployeeTypes.includes(2) }" @click="updateVisibleEmployeeTypes(2)") M
            .employee-type.translator.filter(:class="{ active: visibleEmployeeTypes.includes(1) }" @click="updateVisibleEmployeeTypes(1)") T
            .employee-type.pending.filter(:class="{ active: visibleEmployeeTypes.includes(0) }" @click="updateVisibleEmployeeTypes(0)") P
            .employee-type.disabled.filter(:class="{ active: visibleEmployeeTypes.includes(3) }" @click="updateVisibleEmployeeTypes(3)") D
        img.button-image(src="/static/icons/Employees/EmployeesButtonDetails.svg" width="28" @click="changeActiveDetailsComponent('EmployeesDetails')")
        img.button-image(src="/static/icons/Employees/EmployeesButtonPayments.svg" width="28" @click="changeActiveDetailsComponent('EmployeesPayments')")
        img.button-image(v-if="employee.EMPLOYEE_TYPE === C_.etManager && store.permissions.viewManagersActivity" src="/static/icons/Employees/EmployeesButtonActivity.svg" width="28" @click="changeActiveDetailsComponent('EmployeesActivity')")
    ListAndDetailsBase(ref="list", slot="page-contents", :items="employees", :selectedObject="employee", :listWidth="280", :listItemHeight="40")
        #list-header(slot="list-header")
            .field.ui.form
                input#input-filter-employees(type="text" v-model="employeesNameFilter" placeholder="Filter employees...")
                div(style="height: 1px; border-bottom: 1px solid #aeb3b6")
        .list-item(slot="list-item" slot-scope="{item}" @click="selectEmployee(item.PK)")
            .employee-type(:class="employeeType(item).class") {{ employeeType(item).text }}
            div(style="height: 39px; display: flex" @contextmenu.prevent="contextMenu($event, item)")
                .inline.employee-name-list {{ item.fullName() }} {{ employeeNewTag(item) }}
                div(style="padding: 10px 10px 0 0")
                    i.inline.icon.user.yellow.clickable(v-if="item.ONLINE_STATUS" @click.stop="chatWithEmployee(item)")
        EmployeesFilter(ref="EmployeesFilter" slot="list-footer" @updateFilter="updateFilter" :filter="filter" :isLoading="filterIsLoading" :result="filterResult")
        #employees-details-container.ui.form(slot="details")
            component(v-show="employee.PK && employee.isLoaded" :is="activeDetailsComponent" :ref="activeDetailsComponent" :employee="employee")
    .div-zero(slot="page-extras")
        EmployeeContextMenu(ref="employeeContextMenu" @sortListByRegistrationDate="sortListByRegistrationDate" :isSortingByRegistrationDate="isSortingByRegistrationDate")
</template>

<script>
import { store, cmg, constants as C_, utils } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import EmployeesFilter from "./EmployeesFilter"
import EmployeesDetails from "./EmployeesDetails"
import EmployeesPayments from "./EmployeesPayments"
import EmployeesActivity from "./EmployeesActivity"
import EmployeeContextMenu from "../EmployeeContextMenu"

export default {
    mixins: [CoreMixin, CoreMixinManagers],

    components: {
        EmployeesFilter,
        EmployeesDetails,
        EmployeesPayments,
        EmployeesActivity,
        EmployeeContextMenu
    },

    props: {
        settings: Object,
        // When selecting an object from the search bar (or any other find method), the object is stored in this prop
        objectFromFind: Object
    },

    data() {
        return {
            pageState: ["employee", "employeesNameFilter", "activeDetailsComponent", "visibleEmployeeTypes", "filter", "isSortingByRegistrationDate"],
            employee: {},
            employeesNameFilter: "",
            activeDetailsComponent: "EmployeesDetails",
            filter: {},
            filterIsLoading: false,
            filterRefresher: 0,
            visibleEmployeeTypes: [1, 2],
            isSortingByRegistrationDate: false
        }
    },

    mounted() {
        // If objectFromFind is set, then we came here from a find request, so set the employee to objectFromFind
        if (this.objectFromFind && this.objectFromFind.table === "EMPLOYEES") {
            this.selectEmployee(this.objectFromFind.PK)
            setTimeout(() => {
                this.$refs.list.scrollToItemWithPK(this.objectFromFind.PK)
            }, 100)
        }
    },

    created() {
        this.C_ = C_
    },

    computed: {
        employees() {
            if (this.filterRefresher) {
            }

            const nameFilter = utils
                .escapeString(
                    this.employeesNameFilter
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                )
                .trim()
            const emailFilter = utils.isValidEmail(this.employeesNameFilter.trim()) ? this.employeesNameFilter.toLowerCase().trim() : null

            return store.employees
                .filter(e => {
                    if (emailFilter) return (e.EMAIL || "").toLowerCase().includes(emailFilter) || (e.PAYPAL_EMAIL || "").toLowerCase().includes(emailFilter)

                    if (e.EMPLOYEE_TYPE > 3) return false

                    // If the nameFilter is a number, show the employee with that ID (which is the same as the Payoneer ID)
                    if (nameFilter && !isNaN(nameFilter)) return e.PK === +nameFilter

                    if (!this.visibleEmployeeTypes.includes(e.EMPLOYEE_TYPE) && !e.isFromFind) return false

                    if (this.filter.nativeLanguageID && e.NATIVE_LANGUAGE_1_ID != this.filter.nativeLanguageID && e.NATIVE_LANGUAGE_2_ID != this.filter.nativeLanguageID)
                        return false

                    if (this.filter.sourceLanguageID && this.filter.targetLanguageID) {
                        if (e.languagePairFilter != this.filter.sourceLanguageID + "-" + this.filter.targetLanguageID) return false
                    }

                    if (this.filter.translationArea && (e.TRANSLATION_AREAS || "").substring(this.filter.translationArea - 1, this.filter.translationArea) !== "1") return false

                    if (this.filter.catTool && (e.CAT_TOOLS || "").substring(this.filter.catTool - 1, this.filter.catTool) !== "1") return false

                    if (nameFilter)
                        return (
                            e
                                .fullName()
                                .toLowerCase()
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "")
                                .match(nameFilter) ||
                            this.employeeNewTag(e)
                                .toLowerCase()
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "")
                                .match(nameFilter)
                        )

                    return true
                })
                .sort((a, b) => {
                    // The registration date sorting is similar to PK sorting, so use that instead
                    if (this.isSortingByRegistrationDate) return a.PK - b.PK
                    else return a.fullName().localeCompare(b.fullName())
                })
        },

        filterResult() {
            if (this.filterIsLoading) return "Filtering employees..."
            if (this.filter.nativeLanguageID || this.filter.sourceLanguageID || this.filter.translationArea || this.filter.catTool)
                return "Found " + this.employees.length + " employee" + utils.pluralS(this.employees.length)
            return " "
        }
    },
    methods: {
        selectEmployee(pk) {
            this.employee = store.employee(pk)
            cmg.requestObject(this.employee, "EMPLOYEES_DETAILS_FULL")
            cmg.requestObjectsForObject(this.employee, "EMPLOYEES_LANGUAGES")
            cmg.requestObjectsForObject(this.employee, "EMPLOYEES_PAYMENT_SHEETS")
            cmg.requestObjectsForObject(this.employee, "EMPLOYEES_PAYMENT_CORRECTIONS_FOR_EMPLOYEE")

            // If the employee is pending, request all the employees with this name, so we can show a warning about
            // previously disabled accounts when approving the account, if needed
            if (this.employee.EMPLOYEE_TYPE === C_.etPending) cmg.requestObjects("DISABLED_EMPLOYEES_WITH_NAME", { FULL_NAME: this.employee.fullName() })

            // If the user has viewManagersActivity permission, request the pending chats if the employee is a manager
            if (store.permissions.viewManagersActivity && this.employee.EMPLOYEE_TYPE === C_.etManager) cmg.requestObjectsForObject(this.employee, "EMPLOYEES_PENDING_CHATS")

            this.$emit("addToHistory", { employee: this.employee })
        },

        updateVisibleEmployeeTypes(employeeType) {
            const index = this.visibleEmployeeTypes.indexOf(employeeType)
            if (index >= 0) this.visibleEmployeeTypes.splice(index, 1)
            else this.visibleEmployeeTypes.push(employeeType)
        },

        changeActiveDetailsComponent(componentName) {
            this.activeDetailsComponent = componentName
        },

        chatWithEmployee(employee) {
            store.chatWithEmployee(employee)
        },

        contextMenu(event, employee) {
            this.$refs.employeeContextMenu.show(event, employee)
        },

        sortListByRegistrationDate(value) {
            this.isSortingByRegistrationDate = value
        },

        employeeType(employee) {
            /* prettier-ignore */
            switch (employee.EMPLOYEE_TYPE) {
                case C_.etPending: return { class: { pending: true }, text: "P" }
                case C_.etTranslator: return { class: { translator: true }, text: "T" }
                case C_.etManager: return { class: { manager: true }, text: "M" }
                case C_.etDisabled: return { class: { disabled: true }, text: "D" }
                default: return { class: {}, text: "" }
            }
        },

        employeeNewTag(employee) {
            if (employee.EMPLOYEE_TYPE != C_.etPending) return ""
            // Employees who logged in in the past 7 days
            if (employee.LAST_LOGIN_TIME && store.serverTime() - employee.LAST_LOGIN_TIME < 7 * 24 * 60 * 60) return "[ NEW ]"
            return ""
        },

        updateFilter(filter) {
            this.filterIsLoading = false

            // Native language
            if (filter.nativeLanguageID !== undefined) {
                if (filter.nativeLanguageID) {
                    this.filterIsLoading = true
                    cmg.requestObjects("EMPLOYEES_WITH_NATIVE_LANGUAGE", { NATIVE_LANGUAGE: filter.nativeLanguageID }).then(employees => {
                        this.filter.nativeLanguageID = filter.nativeLanguageID
                        this.filterRefresher++
                        this.filterIsLoading = false
                    })
                } else {
                    this.filter.nativeLanguageID = null
                    this.filterRefresher++
                }
            }

            // Language pair
            if (filter.sourceLanguageID !== undefined) {
                if (filter.sourceLanguageID) {
                    this.filterIsLoading = true
                    cmg.requestObjects("EMPLOYEES_WITH_LANGUAGE_PAIR", { SOURCE_LANGUAGE: filter.sourceLanguageID, TARGET_LANGUAGE: filter.targetLanguageID }).then(employees => {
                        employees.forEach(e => {
                            const emp = store.employee(e.PK)
                            emp.languagePairFilter = filter.sourceLanguageID + "-" + filter.targetLanguageID
                        })

                        this.filter.sourceLanguageID = filter.sourceLanguageID
                        this.filter.targetLanguageID = filter.targetLanguageID
                        this.filterRefresher++
                        this.filterIsLoading = false
                    })
                } else {
                    this.filter.sourceLanguageID = null
                    this.filter.targetLanguageID = null
                    this.filterRefresher++
                }
            }

            // Translation area
            if (filter.translationArea !== undefined) {
                if (filter.translationArea) {
                    this.filterIsLoading = true
                    cmg.requestObjects("EMPLOYEES_WITH_TRANSLATION_AREA", { TRANSLATION_AREA: filter.translationArea }).then(employees => {
                        this.filter.translationArea = filter.translationArea
                        this.filterRefresher++
                        this.filterIsLoading = false
                    })
                } else {
                    this.filter.translationArea = null
                    this.filterRefresher++
                }
            }

            // CAT tool
            if (filter.catTool !== undefined) {
                if (filter.catTool) {
                    this.filterIsLoading = true
                    cmg.requestObjects("EMPLOYEES_WITH_CAT_TOOL", { CAT_TOOL: filter.catTool }).then(employees => {
                        this.filter.catTool = filter.catTool
                        this.filterRefresher++
                        this.filterIsLoading = false
                    })
                } else {
                    this.filter.catTool = null
                    this.filterRefresher++
                }
            }
        }
    },

    watch: {
        objectFromFind(object, oldObject) {
            if (object && object !== oldObject && object.table === "EMPLOYEES") {
                this.selectEmployee(object.PK)
                this.$refs.list.scrollToItemWithPK(object.PK)
            }
        },

        employeesNameFilter(newValue) {
            // Search for employee with PK (which is the same as the Payoneer ID)
            // So searching for a number shows the employee with that Payoneer ID
            if (newValue && !isNaN(newValue)) {
                cmg.requestObjectWithPK(+newValue, "EMPLOYEES_DETAILS")
                return
            }

            if (newValue.length < 4) return

            if (utils.isValidEmail(newValue.trim())) {
                cmg.requestObjects("EMPLOYEES_WITH_EMAIL", { EMAIL: newValue })
                return
            }

            cmg.requestObjects("ALL_EMPLOYEES_WITH_NAME", { FULL_NAME: newValue })
        }
    }
}
</script>

<style scoped>
#header-buttons-wrapper {
    display: flex;
}

.button-image {
    margin: 0 6px;
    cursor: pointer;
}

#list-search {
    margin: 10px 0 0 10px;
}

.employee-icon-wrapper {
    padding: 6px 0 0 10px;
}

.employee-name-list {
    padding: 10px 15px 10px 5px;
    font-weight: 300;
    width: 215px;
    text-overflow: ellipsis;
    overflow: hidden;
}

.list-item {
    display: flex;
}

.employee-type {
    flex: 0 0 18px;
    margin: 13px 6px;
    text-align: center;
    color: white;
    font-weight: 700;
    font-size: 9px;
    padding: 0 4px;
    border-radius: 3px;
    line-height: 14px;
}

.employee-type.translator {
    background-color: rgb(127, 183, 185);
}

.employee-type.pending {
    background-color: rgb(147, 132, 214);
}

.employee-type.disabled {
    background-color: rgb(223, 155, 155);
}

.employee-type.manager {
    background-color: rgb(145, 158, 96);
}

.employee-type.filter {
    height: 18px;
    flex: 0 0 24px;
    padding-top: 2px;
    font-size: 10px;
    opacity: 0.3;
    cursor: pointer;
}

.employee-type.filter.active {
    opacity: 1 !important;
}

#input-filter-employees {
    border-radius: 0;
    border: 0;
    border-bottom: 1px solid #cad0d3;
    border-top: 1px solid #cad0d3;
    border-right: 1px solid #cad0d3;
    margin-bottom: 1px;
}

#employees-details-container {
    height: 100%;
}

#employee-type-buttons {
    padding-top: 7px;
    display: flex;
    margin-right: 50px;
}

.vue-recycle-scroller__item-view.hover {
    background-color: rgb(240, 246, 248);
}
</style>
