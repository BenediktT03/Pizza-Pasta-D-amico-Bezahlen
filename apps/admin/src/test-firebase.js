/**
 * Firebase Connection Test Script
 * File Path: /apps/admin/src/test-firebase.js
 * 
 * Führe dieses Script aus um die Firebase-Verbindung zu testen
 */

// Test 1: Prüfe ob Firebase importiert werden kann
console.log('🔍 Testing Firebase imports...\n');

try {
  const { initializeApp } = await import('firebase/app');
  console.log('✅ firebase/app imported successfully');
  
  const { getDatabase } = await import('firebase/database');
  console.log('✅ firebase/database imported successfully');
  
  // Test 2: Firebase App initialisieren
  console.log('\n🔥 Initializing Firebase App...');
  
  const firebaseConfig = {
    apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
    authDomain: "eatech-foodtruck.firebaseapp.com",
    databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "eatech-foodtruck",
    storageBucket: "eatech-foodtruck.firebasestorage.app",
    messagingSenderId: "261222802445",
    appId: "1:261222802445:web:edde22580422fbced22144"
  };
  
  const app = initializeApp(firebaseConfig, 'test-app');
  console.log('✅ Firebase App initialized');
  
  // Test 3: Database Verbindung
  console.log('\n📊 Testing Database connection...');
  
  const database = getDatabase(app);
  console.log('✅ Database instance created');
  
  // Test 4: Einfacher Read-Test
  const { ref, get } = await import('firebase/database');
  
  console.log('\n📖 Testing database read...');
  const testRef = ref(database, '.info/connected');
  const snapshot = await get(testRef);
  
  console.log('✅ Database read successful');
  console.log('Connected:', snapshot.val());
  
  // Test 5: Write Test
  const { set } = await import('firebase/database');
  const testWriteRef = ref(database, 'test/connection');
  
  console.log('\n✍️ Testing database write...');
  await set(testWriteRef, {
    timestamp: Date.now(),
    message: 'Firebase connection test successful'
  });
  
  console.log('✅ Database write successful');
  
  console.log('\n🎉 All Firebase tests passed!');
  
} catch (error) {
  console.error('\n❌ Firebase test failed:', error);
  console.error('Error details:', {
    message: error.message,
    code: error.code,
    stack: error.stack
  });
}