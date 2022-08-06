<template lang="pug">
PageBase(headerText="Resources")
    #resources-wrapper(slot="page-contents")
        .ui.form
            p You can find translation-related resources on our website:
            a(@click="goToWebsite" style="cursor: pointer") www.universal-translation-services.com
            h3 Payoneer
            h5 Bank transfer via Payoneer
            p Payoneer's Global Bank Transfer Service allows you to get paid directly to your bank account, supporting multiple currencies to over 210 countries. You can use this service to receive the money that you have earned with us. Benefits include:
            |<br>- Cost-Effective : Great for receiving large payment amounts 
            |<br>- Easy : One time setup of bank account details
            |<br>- No monthly fees
            h5 Payoneer prepaid MasterCard
            p The Payoneer card is a service translators can now request through Universal Translation Services. This is a debit card that you can use to spend money as well as withdraw money from any cash machine. You can also use it to make payments online if you do not have a credit card. It does not work exactly the same as a credit card as it only allows you to spend money to the maximum limit that is available on the card. The service is free and the transfer and withdrawal costs are low. Payoneer has approved us as a vendor so we hope that you will enjoy the benefits of the payoneer card; you can use this service to receive and spend the money that you have earned with us.
            p    If you want to know more, please visit their website at www.payoneer.com
            P    When you sign up with Payoneer, you will have to select one of the two options for the account: bank transfer or debit card.
            p    Important! In order to receive payments from us using Payoneer, you will have to register with them by going to our website (click the button below). After you provide your Tranwise login details and select your preferred currency, you will be redirected to the sign-up form. Please do not create an account by going directly to the Payoneer website, as that will prevent us from making payments to you.
            p &nbsp;
            .ui.coolblue.button.small(@click="requestPayoneerAccount") Request a Payoneer account
</template>

<script>
import utils from "./UtilsTR"
export default {
    methods: {
        requestPayoneerAccount() {
            utils.openURL("https://www.universal-translation-services.com/recruitment/payoneer-8/")
        },

        goToWebsite() {
            utils.openURL("https://www.universal-translation-services.com/")
        }
    }
}
</script>

<style scoped>
#resources-wrapper {
    padding: 10px 10px 30px 15px;
    width: 70%;
    height: 0;
    flex: 1 1 auto;
    overflow-y: auto;
}
</style>