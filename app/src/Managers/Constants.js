import constantsBase from "../Shared/ConstantsBase"

const constants = {
    employeeTypes: ["Pending", "Translator", "Manager", "Disabled", "Out"],

    projectFilesStringTypes: [
        "",
        "MAIN",
        "TRANSLATED",
        "PROOFREAD",
        "FINAL",
        "FINAL (SENT)",
        "REOPENED",
        "TRANSLATED (R)",
        "PROOFREAD (R)",
        "FINAL (R)",
        "FINAL (R) (SENT)",
        "REFERENCE",
        "CAT ANALYSIS",
        "CAT MEMORY",
        "CLIENT'S PO",
        "ARCHIVE",
        "DIGI CERT",
        "DIGI NOTR",
        "NOTRZ",
        "EDITED"
    ],

    projectFilesStringTypesShort: [
        "",
        "MAIN",
        "TRANS",
        "PROOF",
        "FINAL",
        "FINAL (SENT)",
        "REOPENED",
        "TRANS (R)",
        "PROOF (R)",
        "FINAL (R)",
        "FINAL (R) (SENT)",
        "REFERENCE",
        "CAT ANALYSIS",
        "CAT MEMORY",
        "CLIENT'S PO",
        "ARCHIVE",
        "DIGI CERT",
        "DIGI NOTR",
        "NOTRZ",
        "EDITED"
    ],

    projectStatusNames: {
        0: "",
        1: "Quote",
        2: "Setup",
        3: "Pending",
        4: "Translation",
        5: "Proofreading",
        6: "Check phase",
        7: "Reopened",
        8: "Completed",
        9: "Completed (after reopen)",
        10: "Cancelled"
    },

    invoiceStatuses: [{ PK: 0, STATUS: "Not paid" }, { PK: 1, STATUS: "Paid" }, { PK: 2, STATUS: "Won't be paid" }],

    invoicePaymentMethods: [{ PK: 2, METHOD: "PayPal" }, { PK: 6, METHOD: "Barclays UK" }, { PK: 5, METHOD: "Cheque" }, { PK: 15, METHOD: "Stripe" }, { PK: 99, METHOD: "Wise" }, { PK: 100, METHOD: "Other" }],

    shippingMethods: [
        { PK: 0, METHOD: "None" },
        { PK: 1, METHOD: "USPS Normal - $12" },
        { PK: 2, METHOD: "USPS Next Day - $29" },
        { PK: 3, METHOD: "FedEx Priority Overnight" },
        { PK: 4, METHOD: "FedEx Standard Overnight" },
        { PK: 5, METHOD: "FedEx 2nd Day AM" },
        { PK: 6, METHOD: "FedEx 2nd Day End Of The Day" },
        { PK: 7, METHOD: "FedEx ExpressSaver" },
        { PK: 8, METHOD: "FedEx Ground" }
    ],

    translatorPayments: [{ PK: 1, PAYMENT: "Fixed price" }, { PK: 2, PAYMENT: "By source words" }, { PK: 4, PAYMENT: "By CAT Analysis" }],

    projectPricingMethods: [{ PK: 1, PAYMENT: "Fixed price" }, { PK: 2, PAYMENT: "By source words" }, { PK: 3, PAYMENT: "By target words" }, { PK: 4, PAYMENT: "By CAT Analysis" }],

    projectCertifiedPricingMethods: [{ PK: 1, PAYMENT: "Fixed base" }, { PK: 2, PAYMENT: "By source words" }, { PK: 3, PAYMENT: "By pages" }],

    currencies: [{ PK: "EUR", CURRENCY: "EUR" }, { PK: "USD", CURRENCY: "USD" }, { PK: "GBP", CURRENCY: "GBP" }, { PK: "SEK", CURRENCY: "SEK" }, { PK: "CAD", CURRENCY: "CAD" }],

    currencySymbols: { EUR: "€", USD: "$", GBP: "£", SEK: "K", CAD: "$" },

    clientSources: [
        { PK: 1, SOURCE: "Word of mouth" },
        { PK: 2, SOURCE: "Newsletter" },
        { PK: 3, SOURCE: "Email marketing" },
        { PK: 4, SOURCE: "Social media" },
        { PK: 5, SOURCE: "Website form" },
        { PK: 6, SOURCE: "Twilio" },
        { PK: 7, SOURCE: "Chat" },
        { PK: 100, SOURCE: "Other" },
        { PK: 101, SOURCE: "Not specified" }
    ],

    certificateTypes: [
        { PK: 1, CERTIFICATE_TYPE: "Birth certificate" },
        { PK: 2, CERTIFICATE_TYPE: "Marriage certificate" },
        { PK: 3, CERTIFICATE_TYPE: "Death certificate" },
        { PK: 4, CERTIFICATE_TYPE: "Divorce certificate" },
        { PK: 5, CERTIFICATE_TYPE: "Drivers license" },
        { PK: 6, CERTIFICATE_TYPE: "Graduation degree" },
        { PK: 7, CERTIFICATE_TYPE: "Criminal record" },
        { PK: 8, CERTIFICATE_TYPE: "Bank paper" },
        { PK: 100, CERTIFICATE_TYPE: "Other" }
    ],

    projectServiceTypes: [
        { PK: 1, SERVICE_TYPE: "Certification" },
        { PK: 2, SERVICE_TYPE: "Notarization" },
        { PK: 6, SERVICE_TYPE: "Digital certification" },
        { PK: 4, SERVICE_TYPE: "Document changes" },
        { PK: 5, SERVICE_TYPE: "Extra copies" },
        { PK: 7, SERVICE_TYPE: "DMV form" }
    ],

    regions: [{ PK: 1, REGION: "Europe & Africa" }, { PK: 2, REGION: "Americas" }, { PK: 3, REGION: "Asia" }, { PK: 4, REGION: "Australia" }],

    yearsForDropdownFrom2005: [
        { PK: 2005, YEAR: "2005" },
        { PK: 2006, YEAR: "2006" },
        { PK: 2007, YEAR: "2007" },
        { PK: 2008, YEAR: "2008" },
        { PK: 2009, YEAR: "2009" },
        { PK: 2010, YEAR: "2010" },
        { PK: 2011, YEAR: "2011" },
        { PK: 2012, YEAR: "2012" },
        { PK: 2013, YEAR: "2013" },
        { PK: 2014, YEAR: "2014" },
        { PK: 2015, YEAR: "2015" },
        { PK: 2016, YEAR: "2016" },
        { PK: 2017, YEAR: "2017" },
        { PK: 2018, YEAR: "2018" },
        { PK: 2019, YEAR: "2019" },
        { PK: 2020, YEAR: "2020" },
        { PK: 2021, YEAR: "2021" },
        { PK: 2022, YEAR: "2022" },
        { PK: 2023, YEAR: "2023" },
        { PK: 2024, YEAR: "2024" }
    ],

    // PREQUOTES.STATUS
    pqPending: 0,
    pqSetup: 1,
    pqCompleted: 2,
    pqCancelled: 3,

    // PROJECTS.CERTIFIED_PAYMENT_METHOD
    ptByPages: 3,

    // PROJECTS.PREPAYMENT_STATUS
    ppsPrepaymentNone: 0,
    ppsPrepaymentPending: 1,
    ppsPrepaymentDone: 2,
    ppsPrepaymentPartlyDone: 3,

    // PROJECTS_HISTORY.ACTION
    // 1 .. 10 is the project's status
    phSendQuote: 101,
    phSendPending: 102,
    phSendInProgress: 103,
    phSendPrepaymentLink: 104,
    phSendFinalFile: 105,
    phWorkOnDelivery: 106,
    phAssignTranslator: 107,
    phAssignProofreader: 108,
    phUnassignTranslator: 109,
    phUnassignProofreader: 110,
    phAddPaymentDetails: 111,
    phActionWithDetails: 112,
    phAddProjectRefund: 113,
    phSendFileToCheckOldMethod: 114,
    phSendFileToCheckInOnlineEditor: 115,

    // EMPLOYEES.EMPLOYEE_TYPE
    // More constants in ConstantsBase
    etSales: 4,
    etExternal: 5,
    etAdmin: 100,

    // EMPLOYEES.MANAGER_TYPE
    emtAll: 1,
    emtGeneral: 2,
    emtAssignment: 3,
    emtDeadline: 4,
    emtSupport: 5,
    emtRecruitment: 6,
    emtFinancial: 7,
    emtMarketing: 8,
    emtMultitask: 9,

    // INVOICES.STATUS
    isNotPaid: 0,
    isPaid: 1,
    isWontBePaid: 2,

    // PROJECTS_FILES.FILE_TYPE
    // More constants are in ConstantsBase
    pfFinal: 4,
    pfFinalSent: 5,
    pfReopenedMain: 6,
    pfReopenedFinal: 9,
    pfReopenedFinalSent: 10,
    pfClientPO: 14,
    pfArchive: 15,
    pfDigitalCertification: 16,
    pfDigitalNotarization: 17,
    pfRegularNotarization: 18,
    // pfEdited: 19 - in ConstantsBase

    // PROJECTS_FILES.CLIENT_APPROVAL_STATUS
    casWaitingApproval: 1,
    casApproved: 2,
    casNotApproved: 3,
    casEdited: 4,

    // PROJECTS_SERVICES
    psCertification: 1,
    psNotarization: 2,
    psShipping: 3,
    psDocumentChanges: 4,
    psExtraCopies: 5,
    psDigitalCertification: 6,
    psDMVForm: 7,

    // CLIENTS_FILES.FILE_TYPE
    cfReference: 1
}

Object.assign(constants, constantsBase)

export default new Proxy(constants, {
    get: function(obj, prop) {
        if (obj[prop] === undefined) console.warn("Trying to get undefined constant: " + prop)
        return obj[prop]
    }
})
