// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from "vue"
import AppClients from "./AppClients"

require("semantic-ui-transition/transition.js")
require("semantic-ui-modal/modal.js")
require("semantic-ui-modal/modal.css")
require("semantic-ui-dimmer/dimmer.js")
require("semantic-ui-dimmer/dimmer.css")

/* eslint-disable no-new */
new Vue({
    el: "#app",
    components: { AppClients },
    template: "<AppClients/>"
})
