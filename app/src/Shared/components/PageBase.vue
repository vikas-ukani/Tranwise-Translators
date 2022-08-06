<template lang="pug">
#page-base-wrapper
    .header-buttons-wrapper(v-if="headerText")
        #header(:style="{width: headerWidth + 'px'}") {{ headerText }}
        slot(name="header-buttons")
    slot.page-contents(name="page-contents")
    slot.page-extras(name="page-extras")
</template>

<script>
export default {
    props: {
        headerText: String,
        headerWidth: 0
    }
}
</script>


<style scoped>
#page-base-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: linear-gradient(to bottom, #f2f3f8 0%, #e4eef1 100%);
}

.header-buttons-wrapper {
    display: flex;
}

#header {
    padding: 18px 15px;
    letter-spacing: 0.05rem;
    font-size: 22px;
    font-weight: 200 !important;
    white-space: nowrap;
}

#header-buttons {
    max-width: 750px;
}

.page-contents {
    flex: 1 1 auto;
    height: 100%;
}
</style>
