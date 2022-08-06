import { TWObject, setTWObjectPrototypeFunctions as setTWObjectPrototypeFunctionsBase } from "../../Shared/TWObjectBase"

export default TWObject

export function setTWObjectPrototypeFunctions(store) {
    setTWObjectPrototypeFunctionsBase(store)

    TWObject.prototype.projectsFiles = function() {
        this.assertTable("PROJECTS")
        return store.projectsFiles.filter(projectFile => projectFile && projectFile.PROJECT_ID === this.PK)
    }

    TWObject.prototype.sourceOrIntermediate = function() {
        this.assertTable("SUBPROJECTS")
        const project = this.project()
        if (!project) return ""

        let result = store.languageName(project.SOURCE_LANGUAGE_ID)
        if (!this.INTERMEDIATE_LANGUAGE_ID) return result
        if (store.myself.hasLanguagePair(project.SOURCE_LANGUAGE_ID, this.LANGUAGE_ID)) return result
        if (store.myself.hasLanguagePair(this.INTERMEDIATE_LANGUAGE_ID, this.LANGUAGE_ID)) return store.languageName(this.INTERMEDIATE_LANGUAGE_ID)
        return result
    }

    TWObject.prototype.targetOrIntermediate = function() {
        this.assertTable("SUBPROJECTS")
        const project = this.project()
        if (!project) return ""

        let result = store.languageName(this.LANGUAGE_ID)
        if (!this.INTERMEDIATE_LANGUAGE_ID) return result
        if (store.myself.hasLanguagePair(project.SOURCE_LANGUAGE_ID, this.LANGUAGE_ID)) return result
        if (store.myself.hasLanguagePair(project.SOURCE_LANGUAGE_ID, this.INTERMEDIATE_LANGUAGE_ID)) return store.languageName(this.INTERMEDIATE_LANGUAGE_ID)
        return result
    }

    TWObject.prototype.canWorkOnProject = function(project, subproject) {
        if (!project || !subproject || !project.SOURCE_LANGUAGE_ID || !subproject.LANGUAGE_ID) return false

        // C_.ptProofread == 3
        if (project.PROJECT_TYPE === 3 && !store.myself.hasNativeLanguage(subproject.LANGUAGE_ID)) return false

        if (store.myself.hasLanguagePair(project.SOURCE_LANGUAGE_ID, subproject.LANGUAGE_ID)) return true

        if (subproject.ALLOW_PROOFREADERS_SPECIAL && store.myself.hasNativeLanguage(subproject.LANGUAGE_ID)) return true

        if (
            subproject.INTERMEDIATE_LANGUAGE_ID > 0 &&
            (store.myself.hasLanguagePair(project.SOURCE_LANGUAGE_ID, subproject.INTERMEDIATE_LANGUAGE_ID) ||
                store.myself.hasLanguagePair(subproject.INTERMEDIATE_LANGUAGE_ID, subproject.LANGUAGE_ID))
        )
            return true

        return false
    }
}
