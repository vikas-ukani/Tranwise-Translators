export default `v. 3.0.16

- small improvements.

v. 3.0.15

- added option to send online editor link to translators for checking

v. 3.0.14

- UI improvements

v. 3.0.13

- added option to upload Edited files for translators (only visible by assigned translators)
- updated the notification to show if a prequote is from the template shop
- updated the sorting of translators' replies to show positive replies first and high rated translators first
- added a mention of how files were sent for checking (online editor or old method)
- the action of sending files for checking is now added to the project's history

v. 3.0.12

- updated the colors of notifications about clients editing, approving or having comments about files sent for checking
- added mouse over details for project's tags in the overview
- added option to delete payments for project (only for general manager)
- removed the proofreading status icon for translation-only projects

v. 3.0.11

- added client order number to the projects on the Invoices page
- added right-click option to sort Employees by registration date

v. 3.0.10

- added option to open the template editor for template-based prequotes and projects

v. 3.0.9

- automatically hide some fields in the quote creation window if the project is certified
- increased the size of the quote creation window
- fixed a bug when the target language selection didn't work for the first time when creating a quote from scratch
- some more bug fixes

v. 3.0.8

- bug fixes

v. 3.0.7

- updated warning about overdue invoices when creating projects
- fixed some typos
- bug fixes

v. 3.0.6

- added word count to files received from OCR

v. 3.0.5

- showing who and when set an invoice on paid (for invoices set on paid from now on)
- added payment information on all invoices that have a payment registered
- Twilio messages that are not answered are shown in red. A thread gets answered
when someone sends a message to the client or Anita marks it as answered.

v. 3.0.4

- added functionality for preferred translators when assigning
- added option to filter projects by certificate type

v. 3.0.3

- added filters for the notification messages on the right
- added the options to call translators by phone
- fixed the option to call translators in Skype
- other bug fixes

v. 3.0.2

- added checkbox when a project has to be added to the template shop
- added option to search by email address on the Employees page
- added the name of the person who is converting the prequote

v. 3.0.1

- added currency selector to the client's details page
- when returning to the Invoices page, the clients filter is preserved
- fixed a display bug in the holidays calendar

v. 3.0.0 beta 78

- when a refund is added, it is mentioned in the project's history
- bug fixes

v. 3.0.0 beta 77

- improvements and bug fixes

v. 3.0.0 beta 76

- improvements and bug fixes

v. 3.0.0 beta 75

- you can now filter by the sender name in Personal Messages & Files
- you can now drag & drop to send a file when chatting with someone

v. 3.0.0 beta 74

- when creating a quote, if the total amount of words to be translated is over 10,000, the project will require 50% prepayment
- added a right-click option to translators to "Show assigned projects"
- some more improvements

v. 3.0.0 beta 73

- a few optimizations and improvements

v. 3.0.0 beta 72

- added job price for translators and proofreaders. When you create a quote, if the payment to translators is fixed, you can already specify the job price, which will be set automatically when you assign the translator.
- when creating quotes for clients with a price per word lower than 0.09, the payment to translators is automatically set to fixed price

v. 3.0.0 beta 71

- added option to create video interpreting projects
- some bug fixes

v. 3.0.0 beta 70

- added templates to "Send SMS to number" on the Twilio page

v. 3.0.0 beta 69

- the Digital Certifications list now includes the projects that are partly paid

v. 3.0.0 beta 68

- fixed some bugs in the invoice filters

v. 3.0.0 beta 67

- added colors to the file uploaders
- added the payment details on the invoices page for prepaid invoices
- removed some payment methods on the invoices
- added Stripe to the payment methods
- other bug fixes

v. 3.0.0 beta 66

- Added a new project service, DMV form
- Added a new file type: regular notarization. So DIGI NOTR is digital notarization and NOTRZ is regular notarization.

v. 3.0.0 beta 65

- The payment details field (on the pricing page) is read-only now. You can not add payment details there anymore (but you can see the former details). From now on, please add all the payment information in the list below, to keep everything organized.
- When you add a payment to a project, it will also show up in the history, to keep track of everything.
- Added an alternate chat sound when the same person is sending multiple messages
- Fixed a bug that sometimes didn't make a language or file disappear when you deleted it, although it was deleted on the server
- Hopefully fixed a bug that made the calendar for the deadlines show underneath the overview, making it invisible
- Some visual improvements on the refunds section
- A few other bug fixes and improvements

v. 3.0.0 beta 64

- Added the prequotes to the end of the projects list. From now on, you can convert the prequotes from there, you don't have to go to the email and import the code anymore.
- Updated the question when setting on Pending a prepaid project, to make it more clear
- Updated the completion colors on the refunds list
- Increased the width of the scrollbar on the projects page
- A few other minor improvements

v. 3.0.0 beta 63

- Improved the sorting on the Employees page
- Added the option to show disabled accounts on the Employees page
- A few other bug fixes

v. 3.0.0 beta 62

- Updated the message that requested translators to upload a PDF. It now says a doc and a PDF.
- Fixed the sorting of project files when it was out of order for certain projects.
- A few other bug fixes

v. 3.0.0 beta 61

- Added refunds to the pricing page. When a refund needs to be made for a project, just add it there with all the details and Anita will be informed about it.
- Improved the layout of the invoices page
- A few bug fixes

v. 3.0.0 beta 60

- Quotes for NordicTrans clients that don't require prepayment are not set to 100% automatically anymore
- When showing the projects of a client, the list displays what is selected at the top
   (ie. closed projects are not shown automatically unless the closed button is selected at the top)
- Added a new checkbox for clients, Pays by check. When checked, the prepayment is set automatically to 0 when creating a quote.
- Added a filter to the clients list: Only Pays by check.

v. 3.0.0 beta 59

- Added option to show invoices for client. Start searching and select the client on the invoices page.
- Added option to search employees be email. On the Employees page, type a valid email address in the filter field.
- Added option to search clients be email. On the Clients page, type a valid email address in the filter field. It includes the client's emails, as well as the email for invoices and accounting emails.
- A few bug fixes

v. 3.0.0 beta 58

- Added the list of initial services on the pricing page to explain the additional costs.
- Projects with more than 10,000 source words are automatically marked as big projects.
- All quotes are set to 100% prepayment automatically. If it's not prepaid, you have to remove it manually.
- Added "Please make sure to upload a PDF of your translation" for translators on certified projects.
- When a project has a price of 0.075 / word or less, the payment for translators is set automatically to Fixed price and a note is added about the price of 0.02 / 0.004 in their instructions.
- Added an option when you right-click on project files, Mark me as working on project. It's available only if you are a delivery manager, in order to have your initial added to projects you are working on.
- More bug fixes and performance improvements

v. 3.0.0 beta 57

- Added some help for the project's icons (click the question mark at the top left)
- Projects with watch flow also have an eye icon to make them stand out more
- In the projects list, the delivered projects have a blue/green checkmark instead of the black one
- When creating a big project, "Watch flow" will also be selected automatically
- Removed the Important checkbox for projects, as it's not used anymore
- Removed the warning about original signatures from the instructions for translators
    (only for the managers - translators still see it)
- Added the option to reset a translator's password (and your password too)
- A few other bug fixes

v. 3.0.0 beta 56

- Added languages: Hawaiian, Shona, Tongan
- Added option to search by Payoneer ID. On the Employees page type the ID in the filter box.
- Fixed a bug that sometimes didn't allow sending quotes with CAT pricing
- Other bug fixes and improvements

v. 3.0.0 beta 55

- Added DC (digital certification) + NT (notarization) tags on the project's deliveries page
- Added Total of outstanding invoices for the client on the invoice's details page
- Added total amount of extra services to the project's pricing page
- You can also use the "Filter employees..." field to search for employees, not just the Search bar at the top
- When searching for an invoice number on the invoices page, paid invoices are displayed as well
(showing paid invoices when searching for a client will come soon as well)

v. 3.0.0 beta 54

- Updated the client's details page to add some of the missing fields
- Added invoice reminders to the invoice's details page
- Added invoice reminders to the client's details page

v. 3.0.0 beta 53

- Fixed the amount displayed on the invoices
- Added option to scroll between invoices using the arrow keys
- Added the payment name field for all invoices
- Added the option to search invoices by payment name (at the bottom of the invoices list)

v. 3.0.0 beta 52

- Updated the layout of the pricing page
- Added the payments made by the client to the pricing page

v. 3.0.0 beta 51

- Added Payment terms and Payer type fields to clients' details
- Improved layout of deliveries page for projects
- Added [NEW] tag for pending employees that have connected in the past 7 days

v. 3.0.0 beta 50

- Projects with watching flow show up in pink on the list and have a pink W tag at the top overview
- Added option to edit a client's name. Just click on the client's name at the top green area.
- To cancel a project or a quote, right-click on the last icon in the overview (which can be either the cancel icon or the complete icon) and select 'Cancel project'
`
