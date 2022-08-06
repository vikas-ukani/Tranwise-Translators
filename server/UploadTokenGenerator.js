const generator = {}

// Generate a token with some basic information.
// The functions below can expand on this token by adding more details (eg. allowedFileTypes etc.)
// We can get a tokenCode when reloading the tokens from the session-server. Otherwise, generate a new one.

generator.getBaseUploadToken = function (user, tableName, folder, tokenCode) {
    const baseUploadToken = {
        token: tokenCode || getNewUploadTokenID(),
        table: tableName,
        folder,
        user,
        onUploadCompleted: (filename, fileInfo, onInsertSuccess, onInsertFailure) => {
            const object = {
                ...fileInfo,
                table: tableName,
                FILE_NAME: filename
            }

            user.processLocalMessage("INSERT_OBJECT", object, onInsertSuccess, onInsertFailure)
        }
    }
    return baseUploadToken
}

generator.PROJECTS_FILES_MANAGERS = function (user, tokenCode) {
    const baseUploadToken = this.getBaseUploadToken(user, "PROJECTS_FILES", "01_PROJECTS_FILES", tokenCode)
    return baseUploadToken
}

generator.PROJECTS_FILES_TRANSLATORS = function (user, tokenCode) {
    const baseUploadToken = this.getBaseUploadToken(user, "PROJECTS_FILES", "01_PROJECTS_FILES", tokenCode)
    baseUploadToken.allowedFileTypes = [2, 3, 7, 8]
    return baseUploadToken
}

generator.CLIENTS_FILES_MANAGERS = function (user, tokenCode) {
    const baseUploadToken = this.getBaseUploadToken(user, "CLIENTS_FILES", "05_CLIENTS_FILES", tokenCode)
    return baseUploadToken
}

generator.EMPLOYEES_FILES = function (user, tokenCode) {
    const baseUploadToken = this.getBaseUploadToken(user, "EMPLOYEES_FILES", "0A_EMPLOYEES_FILES", tokenCode)
    baseUploadToken.requiresEmployeeToken = true
    return baseUploadToken
}

// This is a special token that allows the employee to upload their resume
generator.EMPLOYEE_RESUME = function (user, tokenCode) {
    const baseUploadToken = this.getBaseUploadToken(user, "EMPLOYEE_RESUME", "06_EMPLOYEES_RESUMES", tokenCode)

    // Overwrite the default completed function generated in getBaseUploadToken to update the employee record
    // instead of inserting an object
    baseUploadToken.onUploadCompleted = (filename, _fileInfo, onSuccess) => {
        user.processLocalMessage("UPDATE_OBJECT", user.pk, "EMPLOYEES", "RESUME_FILE_NAME", filename)

        // Call the onSuccess function which comes in as an argument from UploadManager
        // It expects to receive the inserted object, in order to use its PK, so create a dummy object
        // with the user's PK, so the function can move the file to the correct location / filename
        onSuccess({ PK: user.pk })
    }
    return baseUploadToken
}

// This is a special token that allows the employee to upload their diploma
generator.EMPLOYEE_DIPLOMA = function (user, tokenCode) {
    const baseUploadToken = this.getBaseUploadToken(user, "EMPLOYEE_DIPLOMA", "07_EMPLOYEES_DIPLOMAS", tokenCode)

    // Overwrite the default completed function generated in getBaseUploadToken to update the employee record
    // instead of inserting an object
    baseUploadToken.onUploadCompleted = (filename, _fileInfo, onSuccess) => {
        user.processLocalMessage("UPDATE_OBJECT", user.pk, "EMPLOYEES", "DIPLOMA_FILE_NAME", filename)

        // Call the onSuccess function which comes in as an argument from UploadManager
        // It expects to receive the inserted object, in order to use its PK, so create a dummy object
        // with the user's PK, so the function can move the file to the correct location / filename
        onSuccess({ PK: user.pk })
    }
    return baseUploadToken
}

// === Helper functions

function getNewUploadTokenID() {
    return Math.random().toString(36).substring(2) + new Date().getTime().toString(36)
}

module.exports = generator
