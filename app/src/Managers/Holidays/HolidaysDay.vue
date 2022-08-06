<template lang="pug">
.day-wrapper.no-select(:class="{'day-hidden': day <= 0, 'public-holiday': names.includes('Public'), weekend: weekend }" @click="onClick")
    .day-number {{ day }}
    .names
        .name(v-for="name in names") {{ name }}

</template>

<script>
export default {
    props: {
        day: Number,
        weekend: Boolean,
        names: Array
    },

    methods: {
        onClick(event) {
            this.$emit("clickHolidayDay", this.day, event)
        }
    }
}
</script>

<style scoped>
.day-wrapper {
    height: 90px;
    width: 90px;
    margin: 4px;
    border: 1px solid rgb(221, 228, 241);
    border-radius: 2px;
    background-color: rgb(246, 251, 255);
    display: flex;
    flex-direction: column;
}

.day-number {
    text-align: right;
    padding: 5px 7px;
    font-size: 14px;
    font-weight: 500;
    color: rgb(131, 141, 151);
}

.weekend .day-number {
    color: rgb(161, 151, 117);
}

.day-hidden {
    opacity: 0;
}

.public-holiday {
    background-color: rgb(233, 216, 216) !important;
}

.weekend {
    background-color: rgb(255, 247, 228);
    border: 1px solid rgb(240, 232, 191);
}

.names {
    font-size: 10.5px;
    padding: 0px 8px;
    overflow-y: auto;
    height: 100%;
}
</style>