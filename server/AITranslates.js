// Imports the Google Cloud Translation library
const { TranslationServiceClient } = require('@google-cloud/translate').v3beta1;
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const config = require("./serverConfig.js");
const projectId ='';
const location = '';
let bucketName = '';
// const projectId = config.googleApiKey.projectId || '';
// const location = config.googleApiKey.location || '';
// let bucketName = config.googleApiKey.bucketName || '';
const inputUri = 'gs://' + bucketName + '/';
const outputUri = 'gs://' + bucketName + '/';


const STORE_FOLDER = config.storeFolder;
const tempLocation = STORE_FOLDER + "Files/TEMP/"


let googleApiKey = {
    credentials: 'config.googleApiKey.credentials',
    // credentials: config.googleApiKey.credentials,
    projectId: projectId
};

// Instantiates a client
const translationClient = new TranslationServiceClient(googleApiKey);
const storage = new Storage(googleApiKey);

let mimeTypeObj = {
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pdf": "application/pdf",
    "txt": "text/plain"
}


async function translateDocument(fileFolder, mimeType, uploadedUrl, sourceLanguageCode = 'en', targetLanguageCode) {
    // Construct request
    const request = {
        parent: `projects/${projectId}/locations/${location}`,
        sourceLanguageCode,
        targetLanguageCode,
        documentInputConfig:
        {
            mimeType: mimeTypeObj[mimeType], // mime types: text/plain, text/html
            gcsSource: {
                inputUri: inputUri + uploadedUrl,
            },
        },
        documentOutputConfig: {
            gcsDestination: {
                outputUriPrefix: outputUri + fileFolder + '/output/',
            },
        },
    };
    const options = { timeout: 240000 };
    const [data] = await translationClient.translateDocument(
        request,
        options
    );
    return data;
}

async function uploadFile(fileFolder, filePath, mime = 'txt') {
    await storage.bucket(bucketName).upload(filePath, {
        destination: fileFolder + '/inputFile.' + mime,
    });
    return fileFolder + '/inputFile.' + mime;
}

async function translate(filePath, outFileName, language, targetLanguageCode, fid, fileName) {
    try {
        if (!filePath) return;
        let mime = 'txt';
        let fileInfo = filePath.split(".");
        mime = fileInfo[fileInfo.length - 1];
        mime = mime ? mime : "txt";
        // filePath = STORE_FOLDER + filePath
        if (mime !== "txt") {
            let fileFolder = new Date().getTime();
            let uploadedUrl = await uploadFile(fileFolder, filePath, mime);
            let data = await translateDocument(fileFolder, mime, uploadedUrl, language, targetLanguageCode);
            fs.writeFileSync(tempLocation + outFileName, data.documentTranslation.byteStreamOutputs[0]);
            await storage.bucket(bucketName).deleteFiles({ prefix: fileFolder });
        } else {
            let fileData = fs.readFileSync(filePath, 'utf8');
            const request = {
                parent: translationClient.locationPath(projectId, location),
                contents: [fileData],
                mimeType: 'text/plain', // mime types: text/plain, text/html
                sourceLanguageCode: language,
                targetLanguageCode: targetLanguageCode,
            };
            // Run request
            const [response] = await translationClient.translateText(request);
            let outPutText = "";
            for (let translation of response.translations) {
                if (translation.translatedText) {
                    outPutText = outPutText + translation.translatedText;
                }
            }
            fs.writeFileSync(tempLocation + outFileName, outPutText);
        }
        let { size } = await fs.statSync(tempLocation + outFileName);

        return { size };
    } catch (err) {
        console.log(err);
        throw err;
    }
}

async function rename(input, outPutFile) {
    let temp = tempLocation + input;
    await fs.renameSync(temp, outPutFile);
}
module.exports = {
    translate,
    rename
}