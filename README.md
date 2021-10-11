# AccessTokenDemo
DocuSign Devcon Conference: Access Token Generator Demo

 -- Don't be scared, give it a whirl! -- 

To run this demo:

1. Open this repository locally and run `npm install`.
2. Login to your DocuSign developer account located at developers.docusign.com. Visit `My Apps and Keys` and save the user id at Impersonation Guid in `index.js`.
2. Create a new integration for your DocuSign Developer account on your apps and keys page. Save the Integration key in `index.js`. 
3. Edit this new integration and create a new RSA keypair. Save the private key as a file named private.key in the same directory as `index.js`.
4. Run it!  `node index.js` -> click the link to login (a first time) and grant application consent*
5. Run it again! `node index.js` to see a generated access token, user info, and (if configured) an organization ID.


\* Before you can make any API calls using JWT Grant, you must get your user’s consent for your app to impersonate them.

# Under the hood

This is a simple node.JS script that harnesses the DocuSign eSignature and Admin SDKs to complete the OAuth portion of a DocuSign integration. DocuSign SDKs harness promises in Node which means you'll need to resolve callbacks using promise chains ( like .then({}).catch({}).finally({}) ) OR using Async/Await functions.  

For the sake of simplicity I've gone about it using an [Immediately invoking function expression](https://developer.mozilla.org/en-US/docs/Glossary/IIFE), due to superior readability. As a bonus, I kept a small portion of the old code commented for you to glean ideas from.

Finally, in an attempt to make this code resuable for others, I've created a parent `DS` function that binds all methods into their own child functions under this parent DS object, (as in DS.getUserInfo() or DS.getJWT()). This will allow you modularize the code to use in other scripts (like `export default DS;`, `import DS from {DS};` )
