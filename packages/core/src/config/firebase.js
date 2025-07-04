/**
 * EATECH - Firebase Configuration
 * Version: 1.0.0
 * Description: Firebase setup
 * File Path: /packages/core/src/config/firebase.js
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
    authDomain: "eatech-foodtruck.firebaseapp.com",
    databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "eatech-foodtruck",
    storageBucket: "eatech-foodtruck.firebasestorage.app",
    messagingSenderId: "261222802445",
    appId: "1:261222802445:web:edde22580422fbced22144"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

export default app;