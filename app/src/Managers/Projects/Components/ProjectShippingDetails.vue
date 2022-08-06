<template lang="pug">
div
    .field
        TWInput(:obj="project" field="SHIPPING_NAME" placeholder="Name" :change="updateProject") 
    .field
        TWInput(:obj="project" field="SHIPPING_DETAILS" placeholder="Extra details" :change="updateProject") 
    .field
        TWInput(:obj="project" field="SHIPPING_STREET" placeholder="Street" :change="updateProject") 
    .field
        TWInput(:obj="project" field="SHIPPING_CITY" placeholder="City" :change="updateProject") 
    .fields
        .field.four.wide
            TWInput(:obj="project" field="SHIPPING_ZIP" placeholder="Zip code" :change="updateProject") 
        .field.four.wide
            TWInput(:obj="project" field="SHIPPING_STATE" placeholder="State" :change="updateProject") 
        .field.eight.wide
            TWInput(:obj="project" :readonly="project.SHIPPING_METHOD === 1 || project.SHIPPING_METHOD === 2" field="SHIPPING_COUNTRY" :value="shippingCountry" placeholder="Country" :change="updateProject") 
    .field
        TWInput(:obj="project" field="SHIPPING_PHONE" placeholder="Phone" :change="updateProject") 
</template>

<script>
import { store, cmg, utils, constants as C_ } from "../../CoreModules"
import ProjectComponentsMixin from "./ProjectComponentsMixin"

export default {
    mixins: [ProjectComponentsMixin],

    computed: {
        shippingCountry() {
            if ([1, 2].includes(this.project.SHIPPING_METHOD) && utils.isBlank(this.project.SHIPPING_COUNTRY)) return "United States"
            else return this.project.SHIPPING_COUNTRY
        }
    },

    methods: {
        updateProject(field, value) {
            // If updateProjectAction is defined, it means that the module was instantiated by ProjectsCreate
            if (this.updateProjectAction) this.updateProjectAction(field, value)
            else cmg.updateObject(this.project, field, value)
        }
    }
}
</script>