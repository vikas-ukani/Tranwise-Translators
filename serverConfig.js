const config = {
    databaseConfiguration: {
        connectionLimit: 50,
        host: "localhost",
        user: "root",
        password: "RootPassword",
        database: "tranwise"
    },
    smtpMailer: {
        pool: true,
        port: 465,
        secure: true, // use TLS
        auth: {}
    },
    serverPort: 3343,
    preventDatabaseChanges: false,
    isDeployed: false,
    storeFolder: "/var/www/html/logs/tranwise/ServerStore/",
    invoiceResourcesPath: "/var/www/html/logs/tranwise/ServerStore/InvoiceResources/",
    resourcesPath: "/var/www/html/logs/tranwise/ServerStore/Resources/",
    server3LogsFolder: "/var/www/html/logs/tranwise/ServerStore/Logs/ServerLogs/",
    chatLogsFolder: "/var/www/html/logs/tranwise/ServerStore/Logs/ChatLogs/",
    activityLogsFolder: "/var/www/html/logs/tranwise/ServerStore/Logs/ActivityLogs/",
    loginPageManagersPath: "/code/static/loginManagers.html",
    loginPageManagersPreviewPath: "/code/static/loginManagers.html",
    translatorsAgreementPath: "/code/static/translatorsAgreement.html",
    translatorsMigratePath: "/code/static/translatorsMigrate.html",
    staticFolderPath: "/code/static/",
    deployPath: "/code/app/dist",
    certificatesPath: "/code/server/cert",
    certificatesPathClients: "/code/server/cert",
    useHTTPS: false
}

module.exports = config
