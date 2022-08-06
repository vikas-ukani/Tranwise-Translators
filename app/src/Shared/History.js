const history = []
let position = -1

function isSameObject(x, y) {
    if (x && y && x === y) return true
    if (x && y && typeof x === "object" && typeof y === "object") {
        if (x.page || y.page) return x.page === y.page
        const objX = x.project || x.subproject || x.client || x.employee || x.invoice
        const objY = y.project || y.subproject || y.client || y.employee || y.invoice
        return objX && objY && objX.table === objY.table && objX.PK === objY.PK
    }
    return false
}

function add(object) {
    const lastObject = history[position]

    // If the object we are trying to add is identical to the last object, return
    if (isSameObject(lastObject, object)) return

    // If we added an object after going back, remove the remaining elements,
    // so the history is reset to that point
    if (position < history.length - 1) history.splice(position + 1)

    // Check if the last object was a page and the current object is something on that page
    // and replace the last object with the current object
    // ie. merge two steps like "Go to EmployeesMain" and "Go to employee X" into a single step
    if (lastObject) {
        if (object.project && lastObject.page === "ProjectsMain") history[position--] = object
        else if (object.employee && lastObject.page === "EmployeesMain") history[position--] = object
        else if (object.client && lastObject.page === "ClientsMain") history[position--] = object
        else if (object.invoice && lastObject.page === "InvoicesMain") history[position--] = object
        else history.push(object)
    } else history.push(object)

    position++
}

function goBack() {
    if (position <= 0) return
    position--
    return history[position]
}

function goForward() {
    if (position >= history.length - 1) return
    return history[++position]
}

export default {
    add,
    goBack,
    goForward
}
