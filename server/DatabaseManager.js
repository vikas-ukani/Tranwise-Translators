const mysql = require("mysql")
const tableViews = require("./TableViews")
const config = require("./serverConfig.js")
const log = require("./Logger")

const pool = mysql.createPool(config.databaseConfiguration)

function handleMySQLError(error, query, onFailureCallback) {
    const uniqueID = Date.now() + "-" + Math.random().toString().substring(2)

    // Log the error message to the main log file
    log("DATABASE", `${uniqueID} - ${query} - ${error.sqlMessage}`)

    // Log the stack trace to a separate category, so we don't pollute the main log
    // Store the uniqueID in both logs, for easier retrieval
    log("MYSQL_STACK", uniqueID, true)
    log("MYSQL_STACK", error.stack + "\n\n", true)

    if (onFailureCallback) onFailureCallback(error)
}

function doSelect(selectQuery, table, callback, returnSingleObject = false) {
    pool.query(selectQuery, (error, data) => {
        if (error) handleMySQLError(error, selectQuery)
        else if (callback) {
            callback(table, returnSingleObject ? data[0] : data)
        }
    })
}

function doUpdate(updateQuery, onSuccessCallback, onFailureCallback) {
    if (config.preventDatabaseChanges) return
    pool.query(updateQuery, error => {
        if (error) handleMySQLError(error, updateQuery, onFailureCallback)
        else if (onSuccessCallback) onSuccessCallback()
    })
}

function doDelete(deleteQuery, onSuccessCallback, onFailureCallback) {
    if (config.preventDatabaseChanges) return
    pool.query(deleteQuery, error => {
        if (error) handleMySQLError(error, deleteQuery, onFailureCallback)
        else if (onSuccessCallback) onSuccessCallback()
    })
}

function doInsert(insertQuery, object, onSuccessCallback, onFailureCallback) {
    if (config.preventDatabaseChanges) return
    pool.query(insertQuery, (error, result) => {
        if (error) handleMySQLError(error, insertQuery, onFailureCallback)
        else {
            object.PK = result.insertId
            if (onSuccessCallback) onSuccessCallback(object)
        }
    })
}

function getLogin(employeeType, username, callback) {
    const query = `SELECT PK, EMPLOYEE_TYPE, FIRST_NAME, LAST_NAME, USERNAME, PASSWORD_HASH, PERMISSIONS, LAST_IP, ACCEPTED_CONFIDENTIALITY_AGREEMENT FROM EMPLOYEES WHERE USERNAME = ${pool.escape(
        username
    )} AND EMPLOYEE_TYPE IN (${employeeType})`

    doSelect(query, "EMPLOYEES", (_table, objects) => {
        if (objects.length <= 1) return callback(objects[0])
        // In case we found more accounts with the same username (compared case-insensitively),
        // filter only those that match case sensitively and return the first one
        callback(objects.filter(e => e.USERNAME === username)[0])
    })
}

// employeeID is used when getting some objects for a specific employee
// (eg. EMPLOYEES_FILES, EMPLOYEES_MESSAGES)
function getObjects(tableViewName, callback, employeeID) {
    const tableView = tableViews[tableViewName]
    let query = `SELECT ${tableView.fieldsCompressed || tableView.fields} FROM ${tableView.table}`
    if (tableView.where) query += ` WHERE ${tableView.where.replace(/<#EMPLOYEE_ID#>/g, employeeID)}`
    if (tableView.join) query += " " + tableView.join.replace(/<#EMPLOYEE_ID#>/g, employeeID)
    doSelect(query, tableView.table, callback)
}

function getObjectWithQuery(query) {
    return new Promise(function (resolve) {
        pool.query(query, (error, data) => {
            if (error) {
                handleMySQLError(error, query)
                resolve(undefined)
            } else resolve(data[0])
        })
    })
}

function getObjectsWithQuery(query) {
    return new Promise(function (resolve) {
        pool.query(query, (error, data) => {
            if (error) {
                handleMySQLError(error, query)
                resolve([])
            } else resolve(data)
        })
    })
}

function getFullObject(pk, table) {
    return getObjectWithQuery(`SELECT * FROM ${table} WHERE PK = ${pool.escape(pk)}`)
}

function getFullObjects(table) {
    return getObjectsWithQuery(`SELECT * FROM ${table}`)
}
function getObjectsWithCriteria(tableViewName, criteria, callback) {
    const tableView = tableViews[tableViewName]
    let query = `SELECT ${tableView.fieldsCompressed || tableView.fields} FROM ${tableView.from || tableView.table}`
    if (tableView.where || tableView.join) {
        let where = `${tableView.where}`
        let join = `${tableView.join}`

        Object.keys(criteria).forEach(key => {
            if (!criteria[key] || !criteria[key].toString().trim()) return
            // Manually escape the criteria
            // pool.escape() doesn't work here because it adds quotes at the beginning and end
            // of the criteria (abc -> 'abc') and we can't use it anymore in criteria like
            // "EMAILS LIKE '%<#EMAIL#>%'"
            const regex = new RegExp(`<#${key}#>`, "g")
            where = where.replace(regex, criteria[key].toString().replace(/'/g, "\\'"))
            join = join.replace(regex, criteria[key].toString().replace(/'/g, "\\'"))
        })
        if (tableView.where) query += ` WHERE ${where}`
        if (tableView.join) query += ` JOIN ${join}`
    }

    doSelect(query, tableView.table, callback)
}

function getObjectsForID(tableView, id, callback) {
    let query = `SELECT ${tableView.fields} FROM ${tableView.from || tableView.table}`
    if (tableView.key) query += ` WHERE ${tableView.key} = ${id}`
    if (tableView.where) query += ` WHERE ${tableView.where.replace("<$PKs$>", id)}`
    if (tableView.join) query += " " + tableView.join.replace("<$PKs$>", id)
    query = query.replace(/<#OWN_ID#>/g, this.pk)
    doSelect(query, tableView.table, callback)
}

function getObject(tableViewName, pk, callback) {
    const tableView = tableViews[tableViewName]
    let query = `SELECT ${tableView.fields} FROM ${tableView.table}`
    if (tableView.join) query += " " + tableView.join.replace("<$PKs$>", pk)
    query += ` WHERE ${tableView.table}.PK = ${pk}`
    doSelect(query, tableView.table, callback, true)
}

function updateObject(pk, table, field, value, onSuccessCallback, onFailureCallback) {
    doUpdate(`UPDATE ${table} SET ${field} = ${pool.escape(value)} WHERE PK = ${pool.escape(pk)}`, onSuccessCallback, onFailureCallback)
}

function deleteObject(pk, table, onSuccessCallback, onFailureCallback) {
    doDelete(`DELETE FROM ${table} WHERE PK = ${pk}`, onSuccessCallback, onFailureCallback)
}

function insertObject(object, onSuccessCallback, onFailureCallback) {
    // Iterate through all the keys of object and add those that are in UPPERCASE
    // to the fields and values lists, in order to create the query string.
    // This ensures that extra properties like "table", "children", "parentKey"
    // will not be added to the query.
    const fields = []
    const values = []

    for (let key in object) {
        if (key !== key.toUpperCase()) continue
        fields.push(key)
        values.push(object[key])
    }

    const query = `INSERT INTO ${object.table} (${fields.join()}) VALUES (${pool.escape(values)})`

    // Perform the insert and recursively call insertObject on all the children
    doInsert(
        query,
        object,
        () => {
            if (typeof onSuccessCallback === "function") onSuccessCallback(object)
            // If the object has any children, recursively call insertObject on each of them
            if (Array.isArray(object.children)) {
                object.children.forEach(child => {
                    // Set the child's parentKey to the main object's generated PK
                    child[child.parentKey] = object.PK
                    // Run the insert
                    insertObject(child, () => onSuccessCallback(child), onFailureCallback)
                })
            }
        },
        onFailureCallback
    )
}

function runQuery(query, onSuccessCallback, onFailureCallback) {
    if (config.preventDatabaseChanges) return
    log("DATABASE", query, true)

    pool.query(query, error => {
        if (error) handleMySQLError(error, query, onFailureCallback)
        else if (onSuccessCallback) onSuccessCallback()
    })
}

function findObject(query, callback) {
    pool.query(query, (error, foundObjects) => {
        if (error) {
            handleMySQLError(error, query)
        } else {
            callback(foundObjects)
        }
    })
}

function escape(value) {
    return pool.escape(value)
}

module.exports = {
    getLogin,
    getObjects,
    getObjectsForID,
    getObject,
    getObjectsWithCriteria,
    findObject,
    updateObject,
    insertObject,
    deleteObject,
    getFullObject,
    getFullObjects,
    getObjectWithQuery,
    getObjectsWithQuery,
    runQuery,
    escape
}
