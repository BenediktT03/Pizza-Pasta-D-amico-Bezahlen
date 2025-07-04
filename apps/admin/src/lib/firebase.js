/**
 * EATECH - Firebase Singleton Instance
 * File Path: /apps/admin/src/lib/firebase.js
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
  authDomain: "eatech-foodtruck.firebaseapp.com",
  databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "eatech-foodtruck",
  storageBucket: "eatech-foodtruck.firebasestorage.app",
  messagingSenderId: "261222802445",
  appId: "1:261222802445:web:edde22580422fbced22144"
};

// App initialisieren
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Services als Getter Functions (lazy loading)
let _auth;
let _database;
let _storage;

export const getAuthInstance = () => {
  if (!_auth) {
    _auth = getAuth(app);
  }
  return _auth;
};

export const getDatabaseInstance = () => {
  if (!_database) {
    _database = getDatabase(app);
  }
  return _database;
};

export const getStorageInstance = () => {
  if (!_storage) {
    _storage = getStorage(app);
  }
  return _storage;
};



export default app;