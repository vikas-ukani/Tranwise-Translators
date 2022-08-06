const db = require("./DatabaseManager")
const log = require("./Logger")

let serverStore = {
    languages: [],

    language(languageID) {
        for (let language of this.languages) if (language.PK === languageID) return language
    },

    getNextProjectNumber() {
        if (this.lastProjectNumber === undefined) return
        return ++this.lastProjectNumber
    },

    async loadItems() {
        // Get the languages
        db.getObjects("LANGUAGES", (table, objects) => (this.languages = objects))

        // Get the last project number, so we can increment it when receiving a new project
        const lastProject = await db.getObjectWithQuery("SELECT MAX(CAST(SUBSTRING(PROJECT_NUMBER, 3) AS DECIMAL)) AS LAST_PROJECT_NUMBER FROM PROJECTS")
        if (!lastProject) return log("ERROR", "Could not get last project.")
        this.lastProjectNumber = lastProject.LAST_PROJECT_NUMBER
    }
}

serverStore.loadItems()

module.exports = serverStore
