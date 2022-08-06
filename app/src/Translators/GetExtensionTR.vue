<template lang="pug">
PageBase(headerText="Chrome Extension")
    #get-extension-wrapper(slot="page-contents")
        .ui.form
            p Like any other website, Tranwise saves the files that you are downloading to the browse's default location for downloads — most likely your Downloads folder. Or, if you have set Chrome to ask where to save each file, it will allow you to select the location. If this is fine for you, then you don't need to install the extension. Keep on reading only if you want Tranwise to automatically organize the files by project.
            h5 How to organize the files downloaded from Tranwise
            p In order to have the files organized in separate folders for each project, we have created a Chrome extension called Tranwise Addon. To install this extension, click on the link below to go to the extension page and click the <em>Add to Chrome</em> button on that page.
            a(@click="openExtensionPage" style="cursor: pointer") https://chrome.google.com/webstore/detail/tranwise-addon/mhjkohmjaaijpkeepfjigolaelfickng
            p Then reload this Tranwise page in order to activate the extension. A new folder named Tranwise will be created inside your downloads folder, and from now on, all the files that you download from Tranwise will go into separate subfolders for each project (inside the Tranwise folder).
            h5 How to save files in a different location than your Downloads folder
            p By default, this extension will download all the files to a folder named Tranwise inside your downloads folder (the folder where Chrome downloads the files by default, which can be Downloads, Desktop or whatever you have set it previously). While this is entirely fine, if you want to automatically download the Tranwise files to a different folder (for example on the D: drive), you have to make a soft symbolic link (similar to a shortcut) to that folder. Here are the instructions on how to do that. Although they might sound complicated, please just follow them carefully and you will be done in no time:
            p Open the Windows search bar and start typing <em>Command</em> until the application Command Prompt shows up on the list (don't open it yet).
            p Right-click on the Command Prompt application and choose "Run as administrator" and click Allow or Yes on the following prompt (if any). The command line application should show up as a black window with a blinking cursor.
            p Here you have to type the command to create the soft symbolic link. The command is:
            p(style="margin-left: 30px;") <strong>mklink /D "path_to_your_downloads_folder\Tranwise" "path_to_the_target_folder"</strong>	
            p(style="margin-left: 40px;") <strong><em>path_to_your_downloads_folder</em></strong> is the location of the folder where Chrome downloads files by default. For example, <em>C:\Users\Administrator\Downloads</em> or <em>C:\Users\John\Desktop</em>. Here's how you can find this path if you don't know it already: Go to the folder where Chrome is downloading files and right-click on any of the downloaded files, then choose Properties. The path you are looking for is specified by the Location property. To this path, you have to add \Tranwise when you add it to the command.
            p(style="margin-left: 50px;") <strong>Important!</strong> For the symbolic link to work, you need to make sure that there is no Tranwise folder inside your downloads folder. If you are doing this step after you have already used Tranwise 3, it means the folder was automatically created when you downloaded the first file. Therefore, you have to rename the Tranwise folder to something else.
            p(style="margin-left: 40px;") <strong><em>path_to_the_target_folder</em></strong> is the path where you want the actual files to be stored. For example, if you have a D: drive, with a Tranwise folder, the path would be <em>D:\Tranwise</em>, or if you have a <em>work&nbsp;=>&nbsp;TranwiseFiles</em> folder on the C: drive, the path would be <em>C:\work\TranwiseFiles</em>
            p(style="margin-left: 50px;") <strong>Note:</strong> The path where you want the files to be stored should already exist. For example, if you want to store the files in the folder D:\Tranwise, you should create the Tranwise folder on the D: drive before running the command.
            p <strong>To summarize,</strong> the first folder in your mklink command should not exist, while the second folder in the mklink command should already exist (you should create that folder prior to running the command).
            p Here are a couple of examples of the command that you might run:
            p(style="margin-left: 30px;") <strong>mklink /D "C:\Users\Administrator\Downloads\Tranwise" "D:\Tranwise"</strong><br /><em>This will make all the files to download to D:\Tranwise</em>
            p(style="margin-left: 30px;") <strong>mklink /D "C:\Users\John\Desktop\Tranwise" "C:\work\TranwiseFiles"</strong><br /><em>This will make all the files to download to C:\work\TranwiseFiles</em>
            p Type the command above (using your actual path values) in the Command Prompt and press Enter. Make sure to include the quotation marks. You should see a confirmation similar to this:
            p(style="margin-left: 30px;") <em>symbolic link created for C:\Users\John\Downloads\Tranwise <<===>> D:\Tranwise</em>
            p Close the Command Prompt and you're done.</p>
            p <strong>Troubleshooting:</strong> If, when running the command, you don't get a success message like above, but instead you get a message like "Cannot create a file when that file already exists", it means that there already is a folder named Tranwise inside you default Chrome downloads folder. If that's the case, please rename that Tranwise folder to something else and run the command again (you can press the Up arrow on your keyboard in the Command Prompt window to get to the previous command).
 
</template>

<script>
import utils from "./UtilsTR"
export default {
    methods: {
        openExtensionPage() {
            utils.openURL("https://chrome.google.com/webstore/detail/tranwise-addon/mhjkohmjaaijpkeepfjigolaelfickng")
        }
    }
}
</script>

<style scoped>
#get-extension-wrapper {
    padding: 10px 30px 30px 15px;
    width: 70%;
    max-width: 720px;
    height: 0;
    flex: 1 1 auto;
    overflow-y: auto;
}
</style>