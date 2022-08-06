// Server constants

const constants = {
    // PROJECTS.STATUS
    psQuote: 1,
    psSetup: 2,
    psPending: 3,
    psTranslation: 4,
    psProofreading: 5,
    psCheckPhase: 6,
    psReopened: 7,
    psCompleted: 8,
    psCompletedAfterReopen: 9,
    psCancelled: 10,

    // PROJECTS.PROJECT_TYPE
    ptTranslateProofread: 1,
    ptTranslate: 2,
    ptProofread: 3,

    // PROJECTS.PAYMENT_CLIENT PAYMENT_TRANSLATOR PAYMENT_PROOFREADER
    ptFixedPrice: 1,
    ptBySourceWords: 2,
    ptByTargetWords: 3,
    ptByCatAnalysis: 4,

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

    // EMPLOYEES.PAYMENT_METHOD
    epPayoneerEuro: 1,
    epPayoneerUSD: 2,
    epPayPal: 3,

    // INVOICES.STATUS
    isNotPaid: 0,
    isPaid: 1,
    isWontBePaid: 2,

    // PROJECTS_SERVICES
    psCertification: 1,
    psNotarization: 2,
    psShipping: 3,
    psDocumentChanges: 4,
    psExtraCopies: 5,
    psDigitalCertification: 6,
    psDMVForm: 7,

    // PROJECTS_FILES.FILE_TYPE
    pfMain: 1,
    pfMainConvPDF: 101,
    pfTranslated: 2,
    pfProofread: 3,
    pfFinal: 4,
    pfFinalSent: 5,
    pfReopenedMain: 6,
    pfReopenedTranslated: 7,
    pfReopenedProofread: 8,
    pfReopenedFinal: 9,
    pfReopenedFinalSent: 10,
    pfReference: 11,
    pfCATAnalysis: 12,
    pfCATMemory: 13,
    pfClientPO: 14,
    pfArchive: 15,
    pfDigitalCertification: 16,
    pfDigitalNotarization: 17,
    pfRegularNotarization: 18,
    pfEdited: 19,

    // PROJECTS_FILES.CLIENT_APPROVAL_STATUS
    casWaitingApproval: 1,
    casApproved: 2,
    casNotApproved: 3,
    casEdited: 4,

    // TRANSLATIONS.REPLY

    trNone: 1,
    trTranslation: 2,
    trProofreading: 3,
    trBoth: 4,

    // TRANSLATIONS.STATUS

    tsNone: 0,
    tsTranslating: 1,
    tsProofreading: 2,
    tsUnassignedTranslation: 3,
    tsUnassignedProofreading: 4,

    // EMPLOYEES.EMPLOYEE_TYPE
    etPending: 0,
    etTranslator: 1,
    etManager: 2,
    etDisabled: 3,

    // EMPLOYEES.ONLINE_STATUS
    eoOffline: 0,
    eoOnline: 1,
    eoAway: 2,
    eoIdle: 3,

    // EMPLOYEES.GENDER
    egNotDefined: 0,
    egMale: 1,
    egFemale: 2,

    // PAYMENT_SHEETS.PAYMENT_STATUS
    pssPending: 0,
    pssOnHold: 1,
    pssPartiallyPaid: 2,
    pssPaid: 3,

    longMonthNames: ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],

    shortMonthNames: ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],

    catToolsNames: [
        "Trados Word",
        "TagEditor",
        "Wordfast",
        "Trados Studio",
        "Transit",
        "Across",
        "SDLx",
        "DejaVu",
        "MemoQ",
        "cleaned files",
        "uncleaned files",
        "TagEditor TTX files",
        "TagEditor target files",
        "Matecat"
    ],

    areasOfExpertiseValues: ["General", "Art / Literary", "Business / Financial", "Law / Patent", "Marketing", "Medical", "Science", "Technical"],

    currencySymbols: { EUR: "€", USD: "$", GBP: "£", SEK: "K", CAD: "$" }
}

module.exports = new Proxy(constants, {
    get: function (obj, prop) {
        if (obj[prop] === undefined) console.warn(" - - - WARNING !!! Trying to get undefined constant: " + prop)
        return obj[prop]
    }
})
