<template lang="pug">
    table.ui.celled.striped.table.tw-scrollable-table(:class="{small: $attrs.small}")
        slot(name="thead")
        slot(name="tbody")
        slot(name="tfoot")
</template>

<script>
export default {}
</script>

<style>
.tw-scrollable-table {
    height: 100%;
    min-height: 100px;
    border-width: thin !important;
}

.tw-scrollable-table > thead > th {
    border-radius: 5px 5px 0 0;
}

.tw-scrollable-table > thead {
    display: table;
    width: 100%;
    height: 45px;
    table-layout: fixed;
}

.tw-scrollable-table.small > thead {
    height: 30px !important;
    font-size: 12px !important;
}

.tw-scrollable-table.small > thead > th {
    padding-top: 0.4rem;
    padding-bottom: 0.4rem;
}

.tw-scrollable-table > tbody.tw-scrollable-table-body-no-head {
    height: 100%;
}

.tw-scrollable-table > tbody > tr:last-of-type {
    border-bottom: 1px solid rgb(230, 230, 230);
}

.tw-scrollable-table > tbody {
    display: block;
    height: calc(100% - 45px);
    overflow-y: scroll;
    overflow-x: hidden;
}

.tw-scrollable-table.small > tbody {
    height: calc(100% - 30px);
    font-size: 11.5px;
}

.tw-scrollable-table > tbody tr {
    display: table;
    width: calc(100% + 12px);
}

.tw-scrollable-table.small td {
    padding: 0.3rem 0.6rem;
}

.tw-scrollable-table > tbody > tr > td:last-of-type {
    padding-right: 20px;
}

.tw-scrollable-table > thead > th:last-of-type {
    padding-right: 20px;
}
</style>
