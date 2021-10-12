// call in the DocuSign eSignature API
let docusign = require("docusign-esign");
// call in the DocuSign Admin API
let adminApi = require("docusign-admin");
// call in the DocuSign Click API
let clickApi = require("docusign-click");

// call in fs (filesystem) module to point to a file on our hard disk
let fs = require("fs/promises");

// call in the process.exit() function to stop the script for error handling
const { exit } = require("process");

// These are the variables we intend to set using today's javascript demo.
var accessToken, expiry, accountId, organizationId, clickwraps, envelopes;

//  These are on your apps and keys page at https://developers.docusign.com 
let impersonationUserGuid = "";
let integrationKey = "";

// 'signature' for eSignature, organization_read to retreive your OrgId 
let scopes = "signature+organization_read+click.manage";

// This is also set for for specific Integration key, found on the Apps and Keys page
let redirectUri = "https://httpbin.org/get";

// NOTE: change this to account.docusign.com for production
let oAuthBasePath = "account-d.docusign.com"

// NOTE: change this to https://docusign.net/ for production
let ApiBasePath = "https://demo.docusign.net";


// The a bit of a gotcha going on here.  When providing scopes for generating your access token, specifing 'impersonation' is not necessary
// after the first time because you're using the mechanism itself, IMPLYING, that jwt is being used. HOWEVER, the very first time we confirm
// grant consent, we DO need to include the impersonation scope to grant JWT future consent. If you do not include impersonation, the JWT
// request user token method will continue to return 'consent_required'. 
let consentUrl = `https://${oAuthBasePath}/oauth/auth?response_type=code&scope=impersonation+${scopes}&client_id=${integrationKey}&redirect_uri=${redirectUri}`;


// Setting a global DocuSign (DS) object so we can reuse the function elsewhere.
let DS = {};

// Sets the accessToken and expiry variables
DS.getJWT = async function _getJWT() {
    try {
        let apiClient = new docusign.ApiClient();
        apiClient.setOAuthBasePath(oAuthBasePath);

        let privateKey = await fs.readFile("private.key", "utf8");

        // Let's get an access token
        let response = await apiClient.requestJWTUserToken(integrationKey, impersonationUserGuid, scopes, privateKey, 3600);

        // Show the API response 
        console.log(response.body);

        // Save the expiration time and accessToken variables
        expiry = response.body.expires_in;
        accessToken = response.body.access_token;

        // Accessible JSON from module exports
        return { "expiry" : expiry, "accessToken" : accessToken};

    } catch (err) {
        // Let's check if there's even a response body before trying to parse it
       if (err.response){      
        // The time spent to find this line that took me more effort than I'd like to admit

        if (err.response.body.error == "consent_required") {
            console.log("Consent required");
            // Interesting quirk - any user can grant consent for
            // their user GUID through your integration key's URL
            console.log("Consent URL: " + consentUrl);

            // Exit since we cannot run further API calls
            exit(0);
        }
     } else {

            // Something else has gone wrong, let's halt execution further
            console.error(err);
            exit(0);
        }
    }
}



// Sets the Account Id variable
DS.getUserInfo = async function _getUserInfo(accessToken) {
    try {
        let apiClient = new docusign.ApiClient();
        apiClient.setOAuthBasePath(oAuthBasePath);

        // Let's get the API Account ID
        let response = await apiClient.getUserInfo(accessToken);

        // Show the API Response
        console.log(response);

        // Save the API Account ID to a variable
        accountId = response.accounts[0].accountId

        // Accessible JSON from module exports
        return { "accountId" : accountId } ;

    }  catch (err) {
        console.error(err);
    };
};

// Sets the Organziation ID variable
DS.getOrgId = async function _getOrgId(accessToken) {
    try {

        let adminClient = new adminApi.ApiClient();
        // The Admin API uses a Different base path
        adminClient.setBasePath("https://api-d.docusign.net/management");
        adminClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

        // Instantiate the DocuSign Admin's Accounts API
        let accounts = new adminApi.AccountsApi(adminClient);

        // Let's get the Organization Id using the Admin API
        let response = await accounts.getOrganizations();

        // Show the API Response
        console.log(response);
        
        // Save the Organization ID to a variable IF we belong to an organization
        if (response.organizations.length > 0 ){
            organizationId = response.organizations[0].id;

            // Accessible JSON from module exports
            return { "organizationId" : organizationId };
        }
        else {
            console.log("User does not belong to an organization");
        }
        


    } catch (err) {
        console.error(err);
    };
};

DS.getEnvelopes = async function _getEnvelopes(accessToken, accountId) {
    try {
        let apiClient = new docusign.ApiClient();
        apiClient.setBasePath(ApiBasePath + "/restapi");
        apiClient.addDefaultHeader("Authorization", `Bearer ${accessToken}`);

        let envelopesApi = new docusign.EnvelopesApi(apiClient);
        const msSinceEpoch = (new Date()).getTime();
        // 720 hours OR 30 days ago
        const thirtyDaysAgo = new Date(msSinceEpoch - 720 * 60 * 60 * 1000).toISOString();
        let options = {fromDate: thirtyDaysAgo};

        let response = await envelopesApi.listStatusChanges(accountId, options);

        // Show the API response
        console.log(response);

        envelopes = response.body;

        return envelopes;
    } catch (err) {
        console.error(err);
    }
}

DS.getClickwraps = async function _getClickwraps(accessToken, accountId) {
    try {
        let apiClient = new clickApi.ApiClient();
        apiClient.setBasePath(ApiBasePath + "/clickapi");
        apiClient.addDefaultHeader("Authorization", `Bearer ${accessToken}`);

        let accounts = new clickApi.AccountsApi(apiClient);

        let response = await accounts.getClickwraps(accountId);

        // Show the API response
        console.log(response);

        clickwraps = response.body

        return clickwraps;
    } catch (err) {
        console.error(err);
    }
};


// Main code execution - this will execute immediately after being read
(async ()=> {
    await DS.getJWT();
    await DS.getUserInfo(accessToken);
    await DS.getOrgId(accessToken);
    await DS.getEnvelopes(accessToken, accountId);
    await DS.getClickwraps(accessToken, accountId);
})();




// ****************************************** 
// OR - If your intention is to use this code in an export,
// comment out the IIFE above and this instead: 

// module.exports.DS = DS;

// THEN try this in your terminal REPL or your external file:

// const DS = require("./index.js");
// DS.DS.getJWT().then( done => {console.log(done.accessToken)});

// ******************************************




/*

******************************************
 LONGHANDED CALLBACK oldschool sort-of way. 
 IIFE (as above) is easier to read!

 JS is non blocking which means callbacks, promises,
 or async/await. I went async/await, but this 
 is how it would work using promises:
******************************************

DS.getJWT().then((response) => {
    // Sanity Check to verify we're passing in our token
    console.log("Access Token" , response.body.access_token);
    accessToken = response.body.access_token

    DS.getUserInfo(accessToken).then((response) => {
        console.log("UserInfo Response", response)
        // Save the API Account Id
        accountId = response.accounts[0].exports.accountId
    })
});

*/