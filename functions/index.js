const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Example function
exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from EATECH Functions!");
});
