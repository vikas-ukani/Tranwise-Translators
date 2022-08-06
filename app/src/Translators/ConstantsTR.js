import constantsBase from "../Shared/ConstantsBase"

const constants = {
    projectFilesStringTypes: [
        "",
        "MAIN",
        "TRANSLATED",
        "PROOFREAD",
        "",
        "",
        "REOPENED",
        "TRANSLATED (R)",
        "PROOFREAD (R)",
        "",
        "",
        "REFERENCE",
        "CAT ANALYSIS",
        "CAT MEMORY",
        "",
        "",
        "",
        "",
        "",
        "EDITED"
    ],

    projectFilesStringTypesShort: [
        "",
        "MAIN",
        "TRANS",
        "PROOF",
        "",
        "",
        "REOPENED",
        "TRANS (R)",
        "PROOF (R)",
        "",
        "",
        "REFERENCE",
        "CAT ANALYSIS",
        "CAT MEMORY",
        "",
        "",
        "",
        "",
        "",
        "EDITED"
    ],

    projectStatusNames: {
        0: "",
        1: "Pending",
        2: "Pending",
        3: "Pending",
        4: "In progress (translation)",
        5: "In progress (proofreading)",
        6: "In progress (check phase)",
        7: "Reopened",
        8: "Completed",
        9: "Completed",
        10: "Cancelled"
    },

    tagEditorHelp: `Very important when working with TagEditor.
    
1. Make sure that before you open tageditor that you have workbench opened in the right language combination or you make a new one.
    
2. Very important is the ini file. The ini file has to be selected before you start with your translation. Not only important for the translation but also for the proofreader otherwise we can never convert it back.

3. Open the file in tageditor that you have to translate or proofread.

4. After your translation make sure that you VERIFY TAGS. In this way you check if you have not touch any code in the document. Tageditor will show you the tags that are not correct or touched during translation.

5. Always deliver ttx files after your translation and after proofreading ttx and target files.

If you do not know how to work with TagEditor, please follow the online course.
To follow the online Trados course you can go to the website:
www.isotranslations.com/info/isologin.php

Your username and password are:
translator
isotrans123

This tutorial will explain how Trados is used.`,

    qaHelp: `CAT Tool projects will be accompanied by a mandatory QA report. In this way, you can easily check for any errors (missing tags, inconsistencies, numeric mismatches, spelling and terminology) you might have made in the documents and will save you a lot of time. To generate these reports you will need APSic Xbench.
    
The software is free to download from this link:
<a href="http://www.apsic.com/en/products_xbench.html" target="_blank">http://www.apsic.com/en/products_xbench.html</a>

To watch the video tutorial, click here:
<a href="http://vimeo.com/35951136" target="_blank">http://vimeo.com/35951136</a>

You can also find PDF guides and other useful plugins here:
<a href="http://www.apsic.com/en/downloads.aspx" target="_blank">http://www.apsic.com/en/downloads.aspx</a>

Please contact Support for other questions regarding QA reports.`,

    holdPaymentsInformation:
        "Starting with July 1, 2013, we have removed the minimum amount of 25 euro you have to earn in order to get paid. " +
        "From now on, you well be paid every month, no matter how small the amount you have earned is. However, if you would like us to " +
        "hold the payment for a while and pay it only on the following month, you may check this box and you won't be paid until you uncheck the box again. " +
        "If you uncheck the box later, at the beginning of the following month, when all payments are made, you will be paid the entire outstanding amount.\n\n" +
        "Please keep in mind that if you want your upcoming payment to be held, you have to select the box before the first day of the month, " +
        "when the payment sheets are generated. You may check the list of the projects you have completed before the end of each month and decide whether you want " +
        "your next payment to be made at the beginning of next month or not.",

    paymentMethodHelp:
        "As of July, 1, 2013, the money you earn with us can be transfered to you using one of the following payment types:\n\n" +
        "=== Bank transfer or debit card using Payoneer ===\n\n" +
        "Payoneer's Bank Transfer Service allows you to get paid directly to your bank account, supporting multiple currencies to over 210 countries. " +
        "If you would like to receive your earnings via bank transfer, you will have to register with Payoneer (www.payoneer.com), which is our bank transfer gateway. " +
        "They will act as an intermediate company, check all the details and send out all the bank transfers. The setup is free and there are no monthy fees. " +
        "Recently they have lowered their charges, so that the transfer fee is now $9.95 (equivalent of 7.75 Euro). You will receive a notification as soon as your bank transfer " +
        "is on the way and there will be no errors and no delays in payments, as you will know when your details are correct. " +
        "We will transfer your earnings in the currency you have selected (Euro or US Dollars), and the money will get directly to your local bank account.\n\n" +
        "Payoneer also offers a debit card option, which you can use to receive payments from us. MasterCard®, powered by Payoneer, allows you to be paid directly to your own personalized card, " +
        "which can be used in stores, online, and at ATMs worldwide that accept MasterCard. A bank account is not required and the funds will be on your card within minutes.\n\n" +
        "If you want to sign up for an account with Payoneer now, please go to https://www.universal-translation-services.com/recruitment/payoneer-8/ or select Request Payoneer Account from the Resources menu.\n\n" +
        "=== PayPal ===\n\n" +
        "Your money will be transfered to the PayPal email address you have provided on this page."
}

Object.assign(constants, constantsBase)

export default new Proxy(constants, {
    get: function(obj, prop) {
        if (obj[prop] === undefined) console.warn("Trying to get undefined constant: " + prop)
        return obj[prop]
    }
})
