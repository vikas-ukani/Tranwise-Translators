const Int = Symbol("Int")
const Float = Symbol("Float")
const Bool = Symbol("Bool")
const Str = Symbol("Str")
const Language = Symbol("Language")
const Country = Symbol("Country")
const Division = Symbol("Division")
const Employee = Symbol("Employee")
const Client = Symbol("Client")
const Required = Symbol("Required")
const RequiredForManagers = Symbol("RequiredForManagers")
const Optional = Symbol("Optional")
const OptionalForManagers = Symbol("OptionalForManagers")
const Editable = Symbol("Editable")
const EditableByManagers = Symbol("EditableByManagers")
const EditableBySelf = Symbol("EditableBySelf")
const Insertable = Symbol("Insertable")
const InsertableByManagers = Symbol("InsertableByManagers")
const Updateable = Symbol("Updateable")
const UpdateableByManagers = Symbol("UpdateableByManagers")
const Deletable = Symbol("Deletable")
const DeletableByManagers = Symbol("DeletableByManagers")
const Listenable = Symbol("Listenable")
const ListenableByManagers = Symbol("ListenableByManagers")
const UnlistenableByTranslators = Symbol("UnlistenableByTranslators")
const Protected = Symbol("Protected")

// ! ! ! When adding new symbols here, don't forget to add them to module.exports below

// For new objects (ie. objects inserted after the user has logged in),  listening
// for changes to the new objects if the changed field is marked as Optithe user is automaticallyonal or Required in the table structure
// (ie. the field was or could have been added when the object was inserted). If the user should listen to other fields
// (that are not included in the insert), mark those fields as Listenable or ListenableByManagers.

// Also, Listenable and ListenableByManagers can be added to tables (not particular fields),
// if users have to listen to tables that are not Insertable (ie. objects are inserted by the server)
// eg. EMPLOYEES, LANGUAGES, COUNTRIES, DIVISIONS etc.

module.exports = {
    symbols: {
        Int,
        Float,
        Bool,
        Str,
        Language,
        Country,
        Division,
        Employee,
        Client,
        Required,
        RequiredForManagers,
        Optional,
        OptionalForManagers,
        Editable,
        EditableByManagers,
        EditableBySelf,
        Insertable,
        InsertableByManagers,
        Updateable,
        UpdateableByManagers,
        Deletable,
        DeletableByManagers,
        Listenable,
        ListenableByManagers,
        UnlistenableByTranslators,
        Protected
    },

    tableExists(tableName) {
        return this[tableName] != undefined
    },

    fieldExists(tableName, fieldName) {
        const table = this[tableName]
        if (!table) return false
        return table[fieldName] != undefined
    },

    fieldType(tableName, fieldName) {
        const table = this[tableName]
        if (!table) return null
        const field = table[fieldName]
        if (!field) return null
        // If the field information is an array, look for the field type in the array
        if (Array.isArray(field)) {
            let fieldType
            const symbols = [Int, Float, Bool, Str, Language, Country, Division, Employee, Client]
            for (let symbol of field) {
                symbols.forEach(sym => {
                    if (symbol === sym) fieldType = symbol
                })
            }
            return fieldType
        } else return field
    },

    // Check if the value is valid based on the field's type
    isFieldValueValid(table, field, value) {
        let fieldType = this.fieldType(table, field)
        if ([Language, Country, Division, Employee, Client].includes(fieldType)) fieldType = Int

        if (fieldType === this.symbols.Bool) if (value !== 0 && value !== 1 && value !== true && value !== false) return false
        if (fieldType === this.symbols.Int) if (!Number.isSafeInteger(value)) return false
        if (fieldType === this.symbols.Float) if (!Number.isFinite(value)) return false

        return true
    },

    isFieldOptional(table, field) {
        return this[table][field].includes(Optional)
    },

    // Projects
    PROJECTS: {
        InsertableByManagers,
        allowedChildrenTables: ["SUBPROJECTS", "PROJECTS_FILES", "PROJECTS_MESSAGES", "PROJECTS_SERVICES"],
        PK: Int,
        PROJECT_NUMBER: [Str, EditableByManagers],
        STATUS: [Int, EditableByManagers], // Quote, Setup, Pending, InProgress, Completed etc.
        CLIENT_ORDER_NUMBER: [Str, Optional, EditableByManagers],
        CLIENT_ID: [Int, Required],
        PROJECT_TYPE: [Int, Required, EditableByManagers], // Translation, Proofreading, Translation & Proofreading
        SOURCE_LANGUAGE_ID: [Int, Required, EditableByManagers],
        RESPONSIBLE_MANAGER: [Str, Optional, EditableByManagers],
        AREA_OF_EXPERTISE: [Int, Optional, EditableByManagers], // General, Business, Medical etc.
        SOURCE_WORDS: [Int, Required, EditableByManagers],
        SOURCE_WORDS_NOT_COUNTABLE: [Bool, Optional, EditableByManagers],
        INITIAL_SOURCE_WORDS: Int,
        TARGET_WORDS: [Int, EditableByManagers],
        PRIORITY: [Int, Optional, EditableByManagers],
        PROJECT_EMAIL: [Str, Optional, EditableByManagers],
        WORK_DETAILS: [Str, Optional, EditableByManagers], // The instructions for project managers
        SPECIAL_INSTRUCTIONS: [Str, Optional, EditableByManagers], // The instructions for translators
        QUOTE_COMMENTS: [Str, Optional, EditableByManagers],
        INVOICE_ID: [Int, EditableByManagers],
        // CAT figures for the three main CAT categories of words: No match, Fuzzy match, 100% match & reps
        WORDS_NO_MATCH: [Int, Optional, EditableByManagers],
        WORDS_FUZZY_MATCH: [Int, Optional, EditableByManagers],
        WORDS_REPS: [Int, Optional, EditableByManagers],
        RATE_NO_MATCH: [Float, Optional, EditableByManagers],
        RATE_FUZZY_MATCH: [Float, Optional, EditableByManagers],
        RATE_REPS: [Float, Optional, EditableByManagers],
        TRANSLATOR_PRICE: [Float, Optional, EditableByManagers],
        PROOFREADER_PRICE: [Float, Optional, EditableByManagers],
        DEADLINE: [Int, Required, EditableByManagers],
        DEADLINE_TRANSLATOR: [Int, Optional, EditableByManagers],
        DEADLINE_PROOFREADER: [Int, Optional, EditableByManagers],
        DEADLINE_INTERMEDIATE: [Int, EditableByManagers],
        DEADLINE_REOPENED: [Int, EditableByManagers],
        DATE_RECEIVED: Int,
        DATE_COMPLETED: [Int, EditableByManagers],
        PAYMENT_CLIENT: [Int, Optional, EditableByManagers],
        PAYMENT_QUOTE: [Int, Optional, EditableByManagers], // Not used anymore
        PRICE: [Float, Required, EditableByManagers],
        CALCULATED_PRICE: Float,
        PRICE_QUOTE: [Float, Optional, EditableByManagers], // Not used anymore
        CURRENCY: [Str, Required, EditableByManagers],
        PAYMENT_TRANSLATOR: [Int, Optional, EditableByManagers],
        PAYMENT_PROOFREADER: [Int, Optional, EditableByManagers],
        VAT_RATE: [Float, EditableByManagers],
        PROMO_CODE: Str, // Not used anymore
        CAT_TOOLS: [Str, Optional, EditableByManagers],
        CAT_TOOLS_OTHER: [Str, Optional, EditableByManagers],
        BIG_PROJECT_COMMENTS: Str, // Not used anymore
        REOPEN_COMMENTS: [Str, EditableByManagers],
        REOPEN_RESPONSE: [Str, EditableByManagers],
        REOPENED_TIME: [Int, EditableByManagers],
        WORKING_MANAGER_ID: [Int, EditableByManagers], // The ID of the manager who is working to deliver the project
        IS_BIG: [Bool, Optional, EditableByManagers],
        IS_IMPORTANT: [Bool, Optional, EditableByManagers],
        IS_TEST_TRANSLATION: [Bool, Optional], // Not used anymore
        IS_QA_PROJECT: [Bool, Optional],
        IS_PROGRESS_WATCHED: [Bool, Optional, EditableByManagers],
        IS_POTENTIAL_PROJECT: [Bool, Optional],
        NEEDS_QA_REPORT: [Bool, Optional],
        HAS_REFERENCE_MATERIAL_AVAILABLE: [Bool, Optional, EditableByManagers],
        HAS_PDF_FILES: [Bool, Optional],
        REQUIRES_SUPPORT_ASSISTANCE: [Bool, Optional, EditableByManagers],
        CANCEL_REASON: [Str, EditableByManagers],
        LATE_DELIVERY_INFORMED_COUNT: [Int, EditableByManagers], // Used to know if the client was informed about a late delivery
        IN_PROGRESS_INFO_SENT: Bool,
        PREPAYMENT_STATUS: [Int, Optional, EditableByManagers],
        IS_QUOTE_SENT: [Bool, EditableByManagers],
        IS_NOTARIZED: [Bool, Optional, EditableByManagers],
        IS_CERTIFIED: [Bool, Optional, EditableByManagers],
        IS_DELIVERED: [Bool, EditableByManagers],
        DELIVERY_COMMENTS: [Str, EditableByManagers],
        PREPAID_INVOICE_NUMBER: Str,
        IS_ON_HOLD: [Bool, EditableByManagers],
        REQUEST_PO_HISTORY: [Str, EditableByManagers], // The history of messages sent to the client asking them to provide the PO (Purchase Order)
        OVERDUE_REASON: [Str, EditableByManagers],
        REOPEN_UPDATES: [Str, EditableByManagers],
        REQUIRES_PDF_ASSISTANCE: [Bool, Optional],
        REQUIRED_PREPAYMENT_PERCENT: [Int, Optional],
        TWILIO_STATUS: [Int, Optional, EditableByManagers],
        DEADLINE_COMMENTS: Str,
        GENERAL_MANAGER_COMMENTS: Str,
        USES_GLOSSARIES: [Bool, Optional, EditableByManagers],
        SHOULD_BE_SENT_BY_POST: [Bool, Optional, EditableByManagers],
        CLIENT_APPROVAL_STATUS: EditableByManagers,
        NOTARY_NUMBER: [Str, EditableByManagers],
        PAYMENT_DETAILS: [Str, EditableByManagers],
        CERTIFICATE_TYPE: [Int, Optional, EditableByManagers],
        CERTIFICATE_TYPE_OTHER: [Str, Optional, EditableByManagers],
        CERTIFICATE_COUNTRY: [Int, Optional, EditableByManagers],
        SHIPPING_METHOD: [Int, Optional, EditableByManagers],
        SHIPPING_COST: [Float, EditableByManagers],
        SHIPPING_IS_PAID: [Bool, EditableByManagers],
        SHIPPING_PAYMENT_DETAILS: [Str, EditableByManagers],
        SHIPPING_WAS_REQUESTED_LATER: [Bool, EditableByManagers],
        SHIPPING_TRACKING_NUMBER: [Str, EditableByManagers],
        SHIPPING_NAME: [Str, Optional, EditableByManagers],
        SHIPPING_DETAILS: [Str, Optional, EditableByManagers],
        SHIPPING_STREET: [Str, Optional, EditableByManagers],
        SHIPPING_CITY: [Str, Optional, EditableByManagers],
        SHIPPING_ZIP: [Str, Optional, EditableByManagers],
        SHIPPING_STATE: [Str, Optional, EditableByManagers],
        SHIPPING_COUNTRY: [Str, Optional, EditableByManagers],
        SHIPPING_PHONE: [Str, Optional, EditableByManagers],
        EXTRA_COSTS: [Float, EditableByManagers],
        EXTRA_COSTS_DETAILS: [Str, EditableByManagers],
        PAGES_COUNT: [Int, Optional, EditableByManagers],
        CERTIFIED_PRICE_PER_PAGE: [Float, Optional, EditableByManagers],
        PRINT_COPIES_COUNT: [Int, Optional, EditableByManagers],
        PRICE_PER_PRINT_COPY: [Float, Optional, EditableByManagers],
        CERTIFIED_PAYMENT_METHOD: [Int, Optional, EditableByManagers],
        CERTIFIED_BASE_PRICE: [Float, Optional, EditableByManagers],
        CERTIFIED_PRICE_PER_WORD: [Float, Optional, EditableByManagers],
        CLAIMED_BY: [Int, EditableByManagers], // The ID of the manager that claimed the project (ie. will work to solve problems on it)
        REQUESTED_SHIPPING_INFORMATION_DATE: [Int, EditableByManagers],
        CLIENT_REQUESTED_EXTRA_COPIES: [Bool, EditableByManagers],
        ADDITIONAL_TRACKING_NUMBER: [Str, EditableByManagers],
        IMPORTANT_INFORMATION: [Str, EditableByManagers],
        INITIAL_SERVICES_COST: [Float, Optional, EditableByManagers],
        DIGITAL_CERTIFICATION_STATUS: [Int, Optional, EditableByManagers],
        VIDEO_INTERPRETING_STATUS: [Int, Optional, EditableByManagers],
        WEBSITE_ORDER_ID: [Str, Optional, EditableByManagers],
        TEMPLATE_EDITOR_LINK: [Str, Optional, EditableByManagers],
        QUOTE_IS_ACCEPTED: Bool,
        TELEPHONE_INTERPRETING_STATUS: [Int, Optional, EditableByManagers] ,
        AUDIO_TRANSLATION_STATUS: [Int, Optional, EditableByManagers],
        AI_TRANSLATION_STATUS: [Int, Optional, EditableByManagers],
        UPWORK_ID: [Str, Optional, EditableByManagers],
        UPWORK_PRICE: [Int, Optional, EditableByManagers],  
        STUDENT_DISCOUNT: [Int, Optional, EditableByManagers],
        STUDENT_EMAIL: [Str, Optional, EditableByManagers],
    },

    // Files uploaded to projects
    PROJECTS_FILES: {
        Insertable,
        DeletableByManagers,
        UnlistenableByTranslators,
        PK: Int,
        PROJECT_ID: [Int, Required],
        SUBPROJECT_ID: [Int, Optional],
        FILE_TYPE: [Int, Required, EditableByManagers],
        FILE_NAME: [Str, Required],
        SIZE: [Int, Required],
        EMPLOYEE_ID: Int,
        UPLOAD_TIME: Int,
        PREFIX: [Int, Optional],
        CONTENTS: [Str, Optional],
        CONTENTS_OTHER: [Str, Optional],
        COMMENTS: [Str, Optional],
        CLIENT_APPROVAL_STATUS: [Int, OptionalForManagers],
        FILE_WAS_CHECKED_WITH_GRAMMARLY: [Bool, OptionalForManagers, EditableByManagers],
        ONLINE_EDITOR_LINK: [Str, OptionalForManagers],
        ONLINE_CHECKED_BY: [Int, EditableByManagers]
    },

    // Target languages added to a project. Each project can have one or more target languages,
    // which are stored in this table
    SUBPROJECTS: {
        InsertableByManagers,
        DeletableByManagers,
        PK: Int,
        PROJECT_ID: [Int, Required],
        LANGUAGE_ID: [Language, Required],
        INTERMEDIATE_LANGUAGE_ID: [Language, EditableByManagers],
        IS_REOPENED: [Bool, EditableByManagers],
        ALLOW_PROOFREADERS_SPECIAL: [Bool, EditableByManagers]
    },

    // When translators reply to a project, a translation record is created. When a translator is assigned,
    // the record's status is updated
    TRANSLATIONS: {
        Insertable,
        DeletableByManagers,
        UnlistenableByTranslators,
        PK: Int,
        EMPLOYEE_ID: [Employee, Required],
        SUBPROJECT_ID: [Int, Required],
        REPLY: [Int, Editable, Optional], // The reply of the translator: I can do translation, I can do proofreading, I can do both, I can do none
        REPLY_COMMENTS: [Str, Editable, Optional],
        STATUS: [Int, OptionalForManagers, EditableByManagers, Listenable], // The status of assignment (not assigned, assigned, unassigned)
        COMMENTS: [Str, Editable],
        PAYMENT_METHOD: [Int, OptionalForManagers, EditableByManagers, Listenable],
        PRICE: [Float, OptionalForManagers, EditableByManagers, Listenable],
        UNASSIGN_REASON: [Str, EditableByManagers, Listenable],
        CONFIRMED: [Bool, OptionalForManagers, Editable], // The translator confirmed working on the project
        STATUS_TEXT: [Str, Editable], // The status of the translation, editable by the translator
        TARGET_WORDS: [Int, Editable, Listenable], // The number of target words generated, editable by the translator
        AMOUNT_CORRECTION: [Float, EditableByManagers, Listenable],
        AMOUNT_CORRECTION_PERCENT: [Float, EditableByManagers, Listenable],
        PAYMENT_SHEET_ID: [Int, EditableByManagers, Listenable],
        UPLOADED_ALL_FILES: [Bool, Editable],
        WATCH_STATUS: [Int, Editable], // If the project is under watch, the translator fills in this status
        RECEIVED_CALL_REMINDER: [Bool, EditableByManagers], // Not used anymore
        TIME_ASSIGNED: [Int, EditableByManagers],
        UNASSIGNED_AFTER_REOPEN: [Bool, EditableByManagers, Listenable], // Whether the transaltor was unassigned after the project was reopened
        RECEIVED_REMINDER: Bool,
        WAS_LATE: [Bool, EditableByManagers]
    },

    // Messages added to projects
    PROJECTS_MESSAGES: {
        Insertable,
        PK: Int,
        PROJECT_ID: [Int, Required],
        SUBPROJECT_ID: [Int, Optional],
        TRANSLATION_ID: [Int, Optional],
        SENDER: [Str, Required, EditableByManagers],
        RECIPIENT: [Str, Required, EditableByManagers],
        MESSAGE: [Str, Required, EditableByManagers],
        MESSAGE_TIME: Int,
        IS_READ: [Bool, Editable],
        IS_PROBLEM: [Bool, Optional, EditableByManagers],
        IN_REPLY_TO: [Int, Optional],
        COMPLETED_BY: [Int, EditableByManagers],
        COMPLETED_TIME: [Int, EditableByManagers],
        PREVIEW: [Str, Optional, EditableByManagers],
        CLAIMED_BY: [Int, EditableByManagers]
    },

    // Actions performed by the managers regarding projects
    PROJECTS_HISTORY: {
        InsertableByManagers,
        PK: Int,
        PROJECT_ID: [Int, Required],
        EMPLOYEE_ID: Int,
        ACTION: [Int, Required],
        DATE: Int,
        DETAILS: [Str, Optional]
    },

    // A service (notarization, certification, document changes etc.) added to a project
    PROJECTS_SERVICES: {
        InsertableByManagers,
        DeletableByManagers,
        PK: Int,
        PROJECT_ID: [Int, Required],
        SERVICE_TYPE: [Int, Required],
        SERVICE_DATE: Int,
        SERVICE_DETAILS: [Str, Optional, EditableByManagers],
        ITEM_COUNT: [Int, Optional, EditableByManagers],
        IS_PAID: [Bool, EditableByManagers],
        IS_COMPLETED: [Bool, EditableByManagers],
        COST: [Float, Required, EditableByManagers],
        SHIPPING_METHOD: [Int, EditableByManagers],
        SHIPPING_DATE: [Int, EditableByManagers],
        SHIPPING_TRACKING_NUMBER: [Str, EditableByManagers],
        SHIPPING_NAME: [Str, EditableByManagers],
        SHIPPING_DETAILS: [Str, EditableByManagers],
        SHIPPING_STREET: [Str, EditableByManagers],
        SHIPPING_CITY: [Str, EditableByManagers],
        SHIPPING_ZIP: [Str, EditableByManagers],
        SHIPPING_STATE: [Str, EditableByManagers],
        SHIPPING_COUNTRY: [Str, EditableByManagers],
        SHIPPING_PHONE: [Str, EditableByManagers],
        REQUESTED_SHIPPING_INFORMATION_DATE: [Int, EditableByManagers],
        WAS_INITIAL: [Bool, Optional] // Whether the service was requested with the quote or later
    },

    // A payment added to a project
    PROJECTS_PAYMENTS: {
        InsertableByManagers,
        DeletableByManagers,
        PK: Int,
        PROJECT_ID: [Int, Required],
        AMOUNT: [Float, Required, EditableByManagers, Protected],
        DATE: [Int, Required],
        PAYMENT_ID: [Str, Required, EditableByManagers, Protected],
        EMAIL: [Str, Required, EditableByManagers, Protected],
        DETAILS: [Str],
        METHOD: [Str, Optional]
    },

    // A refund added to a project
    PROJECTS_REFUNDS: {
        InsertableByManagers,
        DeletableByManagers,
        PK: Int,
        PROJECT_ID: [Int, Required],
        AMOUNT: [Float, Required],
        REASON: [Str, Required],
        PAYMENT_METHOD: [Str, Required],
        PAYMENT_ID: [Str, Required],
        DATE_COMPLETED: [Int, EditableByManagers, ListenableByManagers]
    },

    // Certificate templates for projects
    CERTIFICATE_TEMPLATES: {
        PK: Int,
        COUNTRY_ID: Country,
        SOURCE_LANGUAGE_ID: Language,
        TARGET_LANGUAGE_ID: Language,
        CERTIFICATE_TYPE: Int,
        SOURCE_LINK: Str,
        TARGET_LINK: Str
    },

    // User accounts (managers, translators, pending translators)
    EMPLOYEES: {
        ListenableByManagers,
        PK: Int,
        EMPLOYEE_TYPE: [Int, EditableByManagers],
        ONLINE_STATUS: [Int, EditableBySelf],
        ACCEPTED_CONFIDENTIALITY_AGREEMENT: [Bool, EditableBySelf],
        LAST_LOGIN_TIME: Int,
        DISABLE_REASON: [Str, EditableByManagers],
        USERNAME: Str,
        PASSWORD_HASH: Str,
        FIRST_NAME: [Str, EditableByManagers, EditableBySelf],
        LAST_NAME: [Str, EditableByManagers, EditableBySelf],
        NAME_CODE: Str, // Some managers have a one-letter name code which shows up in the projects list when they work on a project
        EMAIL: [Str, EditableByManagers, EditableBySelf],
        NATIVE_LANGUAGE_1_ID: [Language, EditableByManagers],
        NATIVE_LANGUAGE_2_ID: [Language, EditableByManagers],
        IS_VIDEO_INTERPRETER: [Bool, EditableByManagers, EditableBySelf],
        IS_PHONE_INTERPRETER: [Bool, EditableByManagers, EditableBySelf],
        IS_BELGIAN: [Bool, EditableByManagers],
        GENDER: [Int, EditableByManagers, EditableBySelf],
        ADDRESS: [Str, EditableByManagers, EditableBySelf],
        COUNTRY_ID: [Country, EditableByManagers, EditableBySelf],
        DATE_OF_BIRTH: Str, // Not used anymore
        RATE_TRANSLATION: [Float, EditableByManagers],
        RATE_PROOFREADING: [Float, EditableByManagers],
        PAYMENT_METHOD: [Int, EditableByManagers, EditableBySelf],
        PAYMENT_COMMENTS: [Str, EditableByManagers],
        PAYPAL_EMAIL: [Str, EditableByManagers, EditableBySelf],
        MONEYBOOKERS_EMAIL: [Str, EditableByManagers, EditableBySelf],
        PAYONEER_STATUS: [Str, EditableBySelf],
        CAT_TOOLS: [Str, EditableByManagers, EditableBySelf],
        TRANSLATION_AREAS: [Str, EditableByManagers, EditableBySelf],
        TRANSLATION_AREAS_OTHER: [Str, EditableByManagers, EditableBySelf],
        SMS_CREDIT: Float, // Not used anymore
        AMOUNT_FOR_SMS: Float, // Not used anymore
        IS_NOT_AVAILABLE: [Bool, EditableBySelf],
        AVAILABILITY: [Str, EditableBySelf], // The message set by the employee about their availability
        MINUS_POINTS: [Int, EditableByManagers],
        PLUS_POINTS: [Int, EditableByManagers],
        POINTS_COMMENTS: [Str, EditableByManagers],
        RESPONSIVENESS: [Int, EditableByManagers],
        CHECKS_TESTS: Bool, // Not used anymore
        WORK_REFERENCES: [Str, EditableByManagers],
        EXPERIENCE: [Str, EditableByManagers],
        DICTIONARIES: [Str, EditableByManagers],
        DIPLOMA_FILE_NAME: [Str, EditableByManagers, EditableBySelf],
        RESUME_FILE_NAME: [Str, EditableByManagers, EditableBySelf],
        COMMENTS: [Str, EditableByManagers, EditableBySelf],
        PHONE_NUMBER: [Str, EditableByManagers, EditableBySelf],
        MOBILE_NUMBER: [Str, EditableByManagers, EditableBySelf],
        SKYPE_ID: [Str, EditableByManagers, EditableBySelf],
        AWAY_MESSAGE: [Str, EditableBySelf],
        UTC_OFFSET_SECONDS: [Int, EditableBySelf], // Not used anymore, only UTC_OFFSET is used in Tranwise 3
        UTC_OFFSET: [Int, EditableBySelf], // Set when the employee logs in, used to calculate the deadline in their timezone when sending emails about new jobs
        AFFILIATE_RATE_EUR: Float, // Not used anymore
        AFFILIATE_RATE_USD: Float, // Not used anymore
        AFFILIATE_RATE_FIXED_PERCENT: Float, // Not used anymore
        AFFILIATE_DIVISION_ID: Int, // Not used anymore
        COMPANY: [Str, EditableByManagers, EditableBySelf],
        TELEGRAM_ID: [Str, EditableByManagers, EditableBySelf],
        TELEGRAM_WHEN_ONLINE: [Bool, EditableBySelf], // Whether we should send a telegram about new jobs even if the employee is online
        MANAGER_TYPE: [Int, EditableByManagers, Protected],
        IS_NEW_TRANSLATOR: [Bool, EditableByManagers],
        ACCEPTED_DATE: Int,
        LATE_DELIVERIES_STATUS: [Int, EditableByManagers],
        SETTINGS: Str,
        PREFERENCES: [Str, EditableBySelf],
        PERMISSIONS: [Str, EditableByManagers, Protected]
    },

    // Clients
    CLIENTS: {
        InsertableByManagers,
        PK: Int,
        CLIENT_NAME: [Str, Required, EditableByManagers],
        NAME_TAG: [Str, Optional, EditableByManagers], // A tag used when we have multiple clients with the same name, so we can distinguish between them
        CLIENT_GROUP: [Str, EditableByManagers], // Not used anymore
        ADDRESS: [Str, Optional, EditableByManagers],
        COUNTRY_ID: [Country, Required, EditableByManagers],
        DIVISION_ID: [Division, Required],
        EMAILS: [Str, Optional, EditableByManagers],
        EMAIL_FOR_INVOICES: [Str, EditableByManagers],
        ACCOUNTING_EMAIL: [Str, EditableByManagers],
        COMMENTS: [Str, Optional, EditableByManagers],
        SPECIAL_INSTRUCTIONS: [Str, EditableByManagers],
        INSTRUCTIONS_FOR_TRANSLATORS: [Str, EditableByManagers],
        VAT_NUMBER: [Str, Optional, EditableByManagers],
        HAS_NO_VAT_NUMBER: [Bool, EditableByManagers],
        CONTACT: [Str, EditableByManagers], // Contact person
        SOURCE: [Int, Required, EditableByManagers], // How did the client find us (newsletter, website form, chat etc.)
        SOURCE_OTHER: [Str, Optional, EditableByManagers],
        PHONE_NUMBERS: [Str, Optional, EditableByManagers],
        IS_NOT_CALLABLE: [Bool, EditableByManagers],
        WEBSITE: [Str, EditableByManagers],
        PORTAL_URL: [Str, EditableByManagers], // Some clients have their own translation portal
        PORTAL_USERNAME: [Str, EditableByManagers],
        PORTAL_PASSWORD: [Str, EditableByManagers],
        PRICE: [Float, Required, EditableByManagers], // Default price when setting up a project
        CURRENCY: [Str, Required, EditableByManagers], // Default currency when setting up a project
        PAYER_TYPE: [Int, EditableByManagers], // Good or bad payer
        PAYMENT_TERMS: [Int, EditableByManagers], // 30 days, 45 days etc. - Used when sending invoice reminders
        USERNAME: [Str, EditableByManagers], // Used for logging into TranwiseWeb
        PASSWORD: [Str, EditableByManagers],
        CREATION_DATE: Int,
        AFFILIATE_ID: [Str, Optional, EditableByManagers],
        IS_INVOICED_MONTHLY: [Bool, EditableByManagers],
        IS_INVOICED_BY_POST: [Bool, EditableByManagers],
        IS_INVOICED_ONLINE: [Bool, EditableByManagers],
        IS_NOT_COLLECTABLE: [Bool, EditableByManagers], // The invoices from this client can't be collected anymore
        HOLD_REMINDERS: [Bool, EditableByManagers], // Whether to skip sending invoice reminders
        IS_LOCKED_FOR_PROJECTS: [Bool, EditableByManagers], // We can't create new projects for them (mostly because of not paying their invoices)
        IS_AGENCY: [Bool, Optional, EditableByManagers],
        REQUIRES_PREPAYMENT: [Bool, Optional, EditableByManagers],
        LAST_TWILIO_PROJECT_ID: Int, // Used in the TwilioChat page to display the latest project for this client
        NO_PREPAID_QUOTES: [Bool, EditableByManagers, Protected], // We can't create prepaid quotes for this client
        PAYS_BY_CHECK: [Bool, EditableByManagers]
    },

    // Reference files uploaded for clients
    CLIENTS_FILES: {
        InsertableByManagers,
        DeletableByManagers,
        PK: Int,
        CLIENT_ID: [Client, Required],
        FILE_TYPE: [Int, Required],
        FILE_NAME: [Str, Required],
        SIZE: [Int, Required]
    },

    // Threads in the Message Board
    MB_THREADS: {
        Insertable,
        DeletableByManagers,
        allowedChildrenTables: ["MB_POSTS"],
        PK: Int,
        EMPLOYEE_ID: Employee,
        DATE: Int,
        SUBJECT: [Str, Required],
        IS_STICKY: [Bool, EditableByManagers],
        LANGUAGE_ID: [Language, Optional]
    },

    // Posts in a MB_THREAD
    MB_POSTS: {
        Insertable,
        DeletableByManagers,
        PK: Int,
        MB_THREAD_ID: [Int, Required],
        EMPLOYEE_ID: Employee,
        DATE: Int,
        TEXT: [Str, Required]
    },

    // Tips for translators (shown on the Tips page)
    TIPS: {
        InsertableByManagers,
        DeletableByManagers,
        PK: Int,
        DATE: Int,
        SUBJECT: [Str, Required, EditableByManagers],
        DESCRIPTION: [Str, Required, EditableByManagers],
        CATEGORY: [Int, Required]
    },

    // Files attached to tips for translators (not used anymore in Tranwise 3)
    TIPS_FILES: {
        InsertableByManagers,
        DeletableByManagers,
        PK: Int,
        TIP_ID: Int,
        FILE_NAME: [Str, Required],
        SIZE: [Int, Required]
    },

    // Tips for managers (shown on the Tips page)
    TIPS_MANAGERS: {
        InsertableByManagers,
        DeletableByManagers,
        PK: Int,
        DATE: Int,
        SUBJECT: [Str, Required, EditableByManagers],
        DESCRIPTION: [Str, Required, EditableByManagers],
        CATEGORY: [Int, Required]
    },

    // Files attached to tips for managers (not used anymore in Tranwise 3)
    TIPS_FILES_MANAGERS: {
        InsertableByManagers,
        DeletableByManagers,
        PK: Int,
        TIP_ID: Int,
        FILE_NAME: [Str, Required],
        SIZE: [Int, Required]
    },

    // All the languages in the system, used for projects, subprojects, employees
    LANGUAGES: {
        Listenable,
        PK: Int,
        LANGUAGE: Language
    },

    // All the countries in the system, used for employees and clients
    COUNTRIES: {
        ListenableByManagers,
        PK: Int,
        COUNTRY: Str,
        CODE2: Str,
        IS_EU: Bool,
        REGION: Int
    },

    // All the divisions in the system. Each client is created for a certain division.
    DIVISIONS: {
        ListenableByManagers,
        PK: Int,
        DIVISION: Str,
        NAME: Str,
        EMAIL: Str,
        EMAIL_SIGNATURE: Str,
        DIVISION_CODE: Str,
        HTML_EMAIL_TEMPLATE: Str,
        TERMS_LINK: Str,
        INVOICE_LINKS: Str,
        SATISFACTION_LINK: Str,
        MAILCHIMP_API_KEY: Str,
        MAILCHIMP_LIST_ID: Str,
        ALLOWS_PREPAID_PROJECTS: Bool
    },

    // Settings for the server
    SETTINGS: {
        PK: Int,
        PARAMETER: Str,
        VALUE: Str,
        CATEGORY: Int
    },

    // Templates for emails that are sent to clients and translators
    EMAIL_TEMPLATES: {
        PK: Int,
        EMAIL_TYPE: Str,
        SUBJECT: Str,
        BODY: Str,
        HTML_BODY: Str,
        TITLE: Str,
        IS_HTML: Bool
    },

    // Invoices. When a project is completed, an invoice is created for that project.
    INVOICES: {
        InsertableByManagers,
        PK: Int,
        INVOICE_NUMBER: Str,
        INVOICE_DATE: Int,
        CLIENT_ID: [Client, Required],
        IS_MONTHLY: [Bool, Optional],
        MONTH: [Int, Optional],
        YEAR: [Int, Optional],
        STATUS: [Int, EditableByManagers, Required], // Not paid, Paid, Won't be paid
        COMMENTS: [Str, EditableByManagers],
        COMMENTS_FROM_CLIENT: Str,
        DATE_PAID: [Int, EditableByManagers],
        PAYMENT_METHOD: [Int, EditableByManagers],
        PAYMENT_METHOD_OTHER: [Str, EditableByManagers],
        TRANSACTION_ID: [Str, EditableByManagers],
        CALL_RESULT: [Int, EditableByManagers],
        CALL_COMMENTS: [Str, EditableByManagers],
        DATE_CALLED: [Int, EditableByManagers],
        FOLLOW_UP_DATE: [Int, EditableByManagers],
        CLIENT_PAID_DETAILS: [Str, EditableByManagers],
        EXCHANGE_RATE: Float, // Not used anymore
        PO_RECEIVED: Bool,
        INVOICE_UPLOADED: Bool,
        COMMISSION_PAID: Bool,
        IS_USA_SPECIAL: [Bool, Optional],
        CLIENT_PAYMENT_METHOD: [Str],
        CLIENT_PAYPAL_TRANSACTION: [Str],
        CLIENT_PAID_DATE: [Str],
        CLIENT_WILL_PAY_DATE: [Str],
        PAYMENT_NAME: [Str, EditableByManagers],
        SET_ON_PAID_BY: [Str, EditableByManagers],
        SET_ON_PAID_AT: [Int, EditableByManagers]
    },

    // History of reminders sent to clients about invoices
    INVOICE_REMINDERS: {
        ListenableByManagers,
        PK: Int,
        INVOICE_ID: Int,
        DATE: Int
    },

    // The language pairs of each employee
    EMPLOYEES_LANGUAGES: {
        InsertableByManagers,
        DeletableByManagers,
        PK: Int,
        EMPLOYEE_ID: [Employee, Required],
        SOURCE_LANGUAGE_ID: [Language, Required],
        TARGET_LANGUAGE_ID: [Language, Required]
    },

    // Messages sent between employees
    EMPLOYEES_MESSAGES: {
        Insertable,
        Deletable,
        ownIDField: "TO_ID",
        PK: Int,
        FROM_ID: Int,
        TO_ID: [Employee, Required],
        FROM_CLIENT_ID: [Client, Optional],
        MESSAGE: [Str, Required],
        MESSAGE_TIME: Int,
        IS_READ: [Bool, Editable]
    },

    // Files sent between employees
    EMPLOYEES_FILES: {
        Insertable,
        Deletable,
        ownIDField: "TO_ID",
        PK: Int,
        FROM_ID: Employee,
        TO_ID: [Employee, Required],
        FILE_NAME: [Str, Required],
        SIZE: [Int, Required],
        UPLOAD_TIME: Int,
        IS_DOWNLOADED: [Bool, Editable]
    },

    // Holidays for project managers (shown in the Holidays Calendar)
    EMPLOYEES_HOLIDAYS: {
        InsertableByManagers,
        DeletableByManagers,
        PK: Int,
        EMPLOYEE_ID: [Int, Required],
        DATE: [Int, Required],
        IS_HALF_DAY: [Bool, Optional]
    },

    // Payment corrections for employees (visible on the EmployeesPayments page). When a manager needs to add or remove
    // money from an employee for some reason, they add a correction there and the corrections are approved manually
    // at the end of the month and added to the payment sheet.
    EMPLOYEES_PAYMENT_CORRECTIONS: {
        InsertableByManagers,
        DeletableByManagers,
        PK: Int,
        EMPLOYEE_ID: [Employee, Required],
        MANAGER_ID: [Employee, Required],
        PROJECT: [Str, Required],
        AMOUNT: [Float, Required],
        COMMENTS: [Str, Optional],
        IS_APPROVED: [Bool, EditableByManagers]
    },

    // At the beginning of each month, a payment sheet is created for each translator that was assigned to projects
    // in the previous month. The payment sheets are visible in EmployeesPayments.js for managers and in
    // PaymentSheetsTR.js for translators. The payment sheets are generated from the Monthly Actions screen.
    PAYMENT_SHEETS: {
        InsertableByManagers,
        PK: Int,
        EMPLOYEE_ID: [Employee, Required],
        PAYMENT_STATUS: [Int, EditableByManagers],
        COMMENTS: [Str, Optional, EditableByManagers],
        EMPLOYEE_COMMENTS: [Str, Editable],
        MONTH: [Int, Required],
        YEAR: [Int, Required],
        EXTRA_AMOUNT: [Float, Optional, EditableByManagers, Protected],
        INVOICE_FILE_NAME: [Str, Editable],
        TEST_TRANSLATIONS_COUNT: [Int, Optional] // The number of tests checked by the transator in that month. Not used for some years now.
    },

    // Twilio SMS messages, visible in the Twilio Chat screen
    TWILIO_MESSAGES: {
        InsertableByManagers,
        PK: Int,
        PHONE_NUMBER: [Str, Required],
        MESSAGE: [Str, Required],
        MESSAGE_TIME: Int,
        SENDER_ID: Int, // Set to 0 if the message was from the client, set to 1000000 if the message was sent by the Tranwise server, set to the PK of the manager who sent the message (if it's from a manager to the client)
        CLIENT_ID: [Int, EditableByManagers],
        ATTACHMENT_LINKS: [Str, Optional],
        IS_ANSWERED: [Bool, Optional, EditableByManagers],
        IS_WHATSAPP: [Bool, Optional, EditableByManagers],
        DIVISION_ID: [Int, Optional, EditableByManagers]
    },

    // Templates for sending SMS to clients from the Twilio Chat screen
    SMS_TEMPLATES: {
        InsertableByManagers,
        PK: Int,
        TITLE: [Str, Required],
        TEXT: [Str, Required]
    },

    // Prequotes. When a customer places an order on an external website like universal-translation-services.com,
    // a prequote record is created with the order details. All pending prequotes are shown at the end of the projects
    // list on the Projects page. A prequote can be converted to a proper quote (ie. a PROJECTS record), with the
    // quote having the details set from the prequote details.
    PREQUOTES: {
        ListenableByManagers,
        PK: Int,
        CLIENT_ID: Int,
        WEBSITE_CREATION_ID: Str, // Not used anymore
        STATUS: [Int, EditableByManagers],
        WORKING_MANAGER_NAME: [Str, EditableByManagers],
        PROJECT_EMAIL: Str,
        SOURCE_LANGUAGE: Str,
        TARGET_LANGUAGES: Str,
        COMMENTS: Str,
        FILES_DATA: Str,
        FILE_URLS: Str,
        IS_CERTIFIED: Bool,
        IS_NOTARIZED: Bool,
        WEBSITE_ORDER_ID: Str,
        PRICE: Float,
        CLIENT_ORDER_NUMBER: Str,
        SHOULD_BE_SENT_BY_POST: Bool,
        SHIPPING_NAME: Str,
        SHIPPING_STREET: Str,
        SHIPPING_CITY: Str,
        SHIPPING_ZIP: Str,
        SHIPPING_STATE: Str,
        SHIPPING_COUNTRY: Str,
        SHIPPING_PHONE: Str,
        HAS_DIGITAL_CERTIFICATION: Bool,
        TEMPLATE_EDITOR_LINK: Str,
        PAYMENT_METHOD: Str,
        TRANSACTION_ID: Str,
        PAYMENT_DATE: Int,
        PAYMENT_TOTAL_PRICE: Float
    },

    // Chats sent by a translator to which the manager hasn't replied yet
    PENDING_CHATS: {
        PK: Int,
        FROM_ID: Int,
        TO_ID: Int,
        TIME: Int,
        ANSWERED_TIME: Int,
        TEXT: Str
    },

    EMPLOYEE_RATINGS: {
        PK: Int,
        PROJECT_ID: [Int, Required],
        SUBPROJECT_ID: [Int, Required],
        EMPLOYEE_ID: [Employee, Required],
        CLIENT_ID: Int,
        RATING: [Int, Required],
        COMMENTS: [Str, Optional]
    }
}
