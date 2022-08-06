// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from "vue"
import AppManagers from "./AppManagers"

import TWInput from "../Shared/components/TWInput"
Vue.component("TWInput", TWInput)
import TWTextArea from "../Shared/components/TWTextArea"
Vue.component("TWTextArea", TWTextArea)
import TWDropdown from "../Shared/components/TWDropdown"
Vue.component("TWDropdown", TWDropdown)
import TWCheckbox from "../Shared/components/TWCheckbox"
Vue.component("TWCheckbox", TWCheckbox)
import TWPopup from "../Shared/components/TWPopup"
Vue.component("TWPopup", TWPopup)
import TWContextMenu from "../Shared/components/TWContextMenu"
Vue.component("TWContextMenu", TWContextMenu)
import TWCalendar from "../Shared/components/TWCalendar"
Vue.component("TWCalendar", TWCalendar)
import PageBase from "../Shared/components/PageBase"
Vue.component("PageBase", PageBase)
import ListAndDetailsBase from "../Shared/components/ListAndDetailsBase"
Vue.component("ListAndDetailsBase", ListAndDetailsBase)

require("semantic-ui-transition/transition.js")
require("semantic-ui-dropdown/dropdown.js")
require("semantic-ui-dropdown/dropdown.css")
require("semantic-ui-checkbox/checkbox.js")
require("semantic-ui-checkbox/checkbox.css")
require("semantic-ui-popup/popup.js")
require("semantic-ui-popup/popup.css")
require("semantic-ui-modal/modal.js")
require("semantic-ui-modal/modal.css")
require("semantic-ui-dimmer/dimmer.js")
require("semantic-ui-dimmer/dimmer.css")
require("semantic-ui-search/search.js")
require("semantic-ui-search/search.css")
require("semantic-ui-calendar/dist/calendar.js")
require("semantic-ui-calendar/dist/calendar.css")

/* eslint-disable no-new */
new Vue({
    el: "#app",
    components: { AppManagers },
    template: "<AppManagers/>"
})
