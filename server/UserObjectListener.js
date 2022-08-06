const tableViews = require("./TableViews")
const dbs = require("./DatabaseStructure")

class UserObjectListener {
    constructor() {
        this.loadedObjects = {}
        this.newObjectsListeners = {}
    }

    getLoadedObjects() {
        return this.loadedObjects
    }

    setLoadedObjects(obj) {
        this.loadedObjects = obj
    }

    getNewObjectsListeners() {
        return this.newObjectsListeners
    }

    setNewObjectsListeners(obj) {
        this.newObjectsListeners = obj
    }

    listenForObject(tableView, pk) {
        if (!this.loadedObjects[tableView]) this.loadedObjects[tableView] = []
        if (!this.loadedObjects[tableView].includes(0) && !this.loadedObjects[tableView].includes(pk)) this.loadedObjects[tableView].push(pk)
    }

    listenForObjects(tableView, objects) {
        if (!this.loadedObjects[tableView]) this.loadedObjects[tableView] = []
        if (this.loadedObjects[tableView].includes(0)) return

        objects.forEach(object => {
            if (!this.loadedObjects[tableView].includes(object.PK)) this.loadedObjects[tableView].push(object.PK)
        })
    }

    listenForNewObjectChanges(table, pk) {
        // If the table is marked as UnlistenableByTranslators and the user is not a manager, don't listen
        if (dbs[table].UnlistenableByTranslators && !this.isManager) return false

        // The newObjectsListener for a table stores only the first pk that came here (subsequent pk's are not required).
        // This way, we know which was the first object that was inserted after the user has logged in,
        // and we know that starting with this pk, we should listen to changes for all objects with a pk higher than this one.
        if (!this.newObjectsListeners[table]) this.newObjectsListeners[table] = pk
        return true
    }

    isListeningForObject(table, field, pk) {
        // Loaded objects looks like:
        // {
        //      EMPLOYEES_DETAILS: [ 21234, 21345 ],  <- loaded the details of employees with pk 21234 and 21345
        //      PROJECTS_DETAILS: [ 1000001 ],  <- loaded the details of project with pk 1000001
        //      PROJECTS: [0]   <- loaded all the projects
        // }

        // Go through all the loaded objects and check if:
        //   - the tableView (key) matches the "table" parameter
        //   - the tableView (key) includes the "field"
        //   - the object with "pk" has been loaded or all objects have been loaded (0) for that tableview
        for (let tableViewName in this.loadedObjects) {
            const tableView = tableViews[tableViewName]

            if (tableView.table != table) continue

            const fields = tableView.fields.split(",")
            // Some of the fields are "PRICE" and others are "CLIENTS.PRICE", so check for both (ie. field and table.field)
            if (!fields.includes(field) && !fields.includes(`${table}.${field}`)) continue

            const pks = this.loadedObjects[tableViewName]
            if (pks.includes(pk) || pks.includes(0)) return true
        }

        // If we didn't return yet, check if:

        // 1. ... the user is listening for new objects on this table
        const isListeningForTable = this.isListeningForNewObjects(table)

        // 2. ... the field is included in the list of Required or Optional fields for inserting or is marked as Listenable (in the database structure)
        let isListeningForField = false

        const fieldData = dbs[table] && dbs[table][field]
        if (Array.isArray(fieldData)) {
            if (fieldData.includes(dbs.symbols.Optional)) isListeningForField = true
            if (fieldData.includes(dbs.symbols.Required)) isListeningForField = true
            if (fieldData.includes(dbs.symbols.Listenable)) isListeningForField = true
            if (this.isManager && fieldData.includes(dbs.symbols.ListenableByManagers)) isListeningForField = true
            if (this.isManager && fieldData.includes(dbs.symbols.OptionalForManagers)) isListeningForField = true
            if (this.isManager && fieldData.includes(dbs.symbols.RequiredForManagers)) isListeningForField = true
        }

        // 3. ... this pk is higher than or equal to the pk that was added to the listener
        // (ie. the object was inserted after the user logged in)

        // If newObjectsListeners[table] in undefined, it means that no object with this table has been created after
        // the user has logged in, therefore the user is not listening to changes for new objects with this table yet.
        const isListeningForPK = this.newObjectsListeners[table] && pk >= this.newObjectsListeners[table]

        // If all three conditions are met, return true
        if (isListeningForTable && isListeningForField && isListeningForPK) return true

        // otherwise, the user is not listening for that object
        return false
    }

    isListeningForNewObjects(table, object) {
        // The user is listening for new objects if the user can insert objects in that table
        // (ie. the new object's table is Insertable or InsertableByManagers in the database structure)
        // or the table is marked as Listenable or ListenableByManagers
        let isListening =
            dbs[table].Insertable || dbs[table].Listenable || (dbs[table].InsertableByManagers && this.isManager) || (dbs[table].ListenableByManagers && this.isManager)

        // However, if the table has an ownIDField set, then only listen for objects that are for this user
        // Eg. EMPLOYEES_MESSAGES has ownIDField: "TO_ID", so only listen for objects that match TO_ID = this.pk (the user's PK)
        const ownIDField = dbs[table].ownIDField
        if (ownIDField && object && object[ownIDField] != this.pk) isListening = false

        // Some custom rules
        if (table === "PAYMENT_SHEETS" && object && object.EMPLOYEE_ID === this.pk) isListening = true

        return isListening
    }
}

module.exports = UserObjectListener
