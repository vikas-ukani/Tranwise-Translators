<template lang="pug">
#modal-projects-help.ui.modal
    .header Help
    i.close.icon
    .content
        .ui.grid
            .ui.nine.wide.column
                .ui.form
                    h5.ui.dividing.header Projects list
                    .fields.inline
                        .field(style="color: #cc0066") S-123456
                            i.eye.icon(style="padding-left: 5px")
                        .field a project in pink means it has Watch flow on
                    .fields.inline
                        .field(style="color: green; font-weight: 700") &#x01A4;
                        .field prepaid project (paid)
                    .fields.inline
                        .field(style="color: red; font-weight: 700") &#x01A4;
                        .field prepaid project (not paid yet)
                    .fields.inline
                        .field(style="color: red; font-weight: 700") &#x01A4;!
                        .field prepaid project (partly paid)
                    .fields.inline
                        .field(style="color: red; font-weight: 700") &#x01A4;%
                        .field prepaid project with a different percentage (eg. 50%)
                    .fields.inline
                        .field.projects-list-hold(style="padding-left: 4px") HOLD
                        .field(style="margin-left: 10px") project is on hold
                    .fields.inline
                        .field.projects-list-deadline(style="padding-left: 7px") 50'
                        .field(style="margin-left: 10px") minutes until the deadline
                    .fields.inline
                        .field.projects-list-overdue(style="padding-left: 5px") OVD
                        .field(style="margin-left: 10px") project is overdue
                    .fields.inline
                        .field.projects-list-reopened(style="padding-left: 5px") 2h+
                        .field(style="margin-left: 10px") more than 2 hours passed since reopen
                    .fields.inline
                        .field.projects-list-completion-tag(style="height: 14px; padding: 2px 3px; background-color: rgb(36, 174, 238)") &#x2713;
                        .field(style="margin-left: 10px") translation is completed
                    .fields.inline
                        .field.projects-list-completion-tag(style="height: 14px; padding: 2px 3px; background-color: rgb(117, 209, 81)") &#x2713;
                        .field(style="margin-left: 10px") proofreading is completed
                    .fields.inline
                        .field(style="padding-top: 2px")
                            img(src="/static/icons/Projects/ProjectsMain/ProjectDelivered.png" width="14")
                        .field(style="margin-top: -5px") project is delivered
                    .fields.inline
                        .field.projects-list-working-manager(style="padding-left: 7px") A
                        .field(style="margin-left: 10px") name code of the manager working on the project
            .ui.seven.wide.column#overview-help
                .ui.form
                    h5.ui.dividing.header Project's overview
                    .fields.inline
                        .field
                            .project-help-tag(style="background-color: #ff99cc;") W
                        .field watch flow is on
                    .fields.inline
                        .field
                            .project-help-tag(style="background-color: rgb(218, 100, 100); padding: 0 8px !important") P
                        .field has messages with problem
                    .fields.inline
                        .field
                            .project-help-tag NC
                        .field notarized or certified
                    .fields.inline
                        .field
                            .project-help-tag QA
                        .field needs QA report
                    .fields.inline
                        .field
                            .project-help-tag &nbsp;C!&nbsp;
                        .field client has special instructions
                    .fields.inline
                        .field
                            .project-help-tag WD
                        .field has work details for managers 
                    .fields.inline
                        .field
                            .project-help-tag(style="padding-left: 2px") CAT
                        .field has CAT tools
                    .fields.inline
                        .field
                            .project-help-tag(style="padding-left: 4px") BIG
                        .field is big project
                    .fields.inline
                        .field
                            .project-help-tag TP
                        .field project type (translation / proofreading)
</template>

<style scoped>
.project-help-tag {
    background-color: #00a4d3;
    border-radius: 3px;
    color: white;
    font-weight: 700;
    font-size: 11px;
    line-height: 15px;
    padding: 0 5px;
    height: 16px;
    text-align: center !important;
}

#overview-help .fields.inline :first-child {
    width: 28px !important;
    margin-right: 10px !important;
}
</style>