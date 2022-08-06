import SetupBase from "../Shared/SetupBase"

export default function setupApplicationManagers() {
    // Run the setup function from the Shared folder (common to managers and translators)
    SetupBase()

    // Perform setup actions specific to the translators version
}
