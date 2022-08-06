module.exports = {
    genders: ["Gender", "Male", "Female"],

    catToolsList: ["Trados Word", "TagEditor", "Wordfast", "Trados Studio", "Transit", "Across", "SDLX", "DejaVu", "MemoQ", "", "", "", "", "Matecat"],

    translationAreasList: ["Art / Literary", "Business / Financial", "Insurance", "Law / Patent", "Marketing", "Medical", "Pensions", "Science"],

    longMonthNames: ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],

    monthsForDropdown: [
        { PK: 1, MONTH: "January" },
        { PK: 2, MONTH: "February" },
        { PK: 3, MONTH: "March" },
        { PK: 4, MONTH: "April" },
        { PK: 5, MONTH: "May" },
        { PK: 6, MONTH: "June" },
        { PK: 7, MONTH: "July" },
        { PK: 8, MONTH: "August" },
        { PK: 9, MONTH: "September" },
        { PK: 10, MONTH: "October" },
        { PK: 11, MONTH: "November" },
        { PK: 12, MONTH: "December" }
    ],

    yearsForDropdown: [
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

    areasOfExpertise: [
        { PK: 1, AREA: "Art / Literary" },
        { PK: 2, AREA: "Business / Financial" },
        { PK: 0, AREA: "General" },
        { PK: 3, AREA: "Law / Patent" },
        { PK: 4, AREA: "Marketing" },
        { PK: 5, AREA: "Medical" },
        { PK: 6, AREA: "Science" },
        { PK: 7, AREA: "Technical" }
    ],

    employeePaymentMethods: [{ PK: 1, text: "Payoneer (Euro)" }, { PK: 2, text: "Payoneer (USD)" }, { PK: 3, text: "PayPal" }],

    epPayoneerEuro: 1,
    epPayoneerUSD: 2,
    epPayPal: 3,

    paymentSheetStatuses: [{ PK: 0, text: "Pending" }, { PK: 1, text: "On hold" }, { PK: 2, text: "Partially paid" }, { PK: 3, text: "Paid" }],

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

    // PROJECTS_FILES.FILE_TYPE

    // When changing this list, update projectFilesStringTypes and projectFilesStringTypesShort
    pfMain: 1,
    pfMainConvPDF: 101,
    pfTranslated: 2,
    pfProofread: 3,
    // pfFinal: 4, // Moved to Managers/Constants
    // pfFinalSent: 5, // Moved to Managers/Constants
    pfReopenedMain: 6,
    pfReopenedTranslated: 7,
    pfReopenedProofread: 8,
    // pfReopenedFinal: 9, // Moved to Managers/Constants
    // pfReopenedFinalSent: 10, // Moved to Managers/Constants
    pfReference: 11,
    pfCATAnalysis: 12,
    pfCATMemory: 13,
    // pfClientPO: 14, // Moved to Managers/Constants
    // pfArchive: 15, // Moved to Managers/Constants
    // pfDigitalCertification: 16, // Moved to Managers/Constants
    // pfDigitalNotarization: 17, // Moved to Managers/Constants
    // pfRegularNotarization: 18, // Moved to Managers/Constants
    pfEdited: 19,

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
    // More constants in Managers/Constants

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
    pssPaid: 3
}
