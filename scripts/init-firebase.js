/**
 * EATECH - Firebase Demo Data Initialization
 * File Path: /scripts/init-firebase.js
 * 
 * Führe dieses Script einmal aus um Demo-Daten zu erstellen
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
  authDomain: "eatech-foodtruck.firebaseapp.com",
  databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "eatech-foodtruck",
  storageBucket: "eatech-foodtruck.firebasestorage.app",
  messagingSenderId: "261222802445",
  appId: "1:261222802445:web:edde22580422fbced22144"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const TENANT_ID = 'demo-restaurant';

// Demo Produkte
const demoProducts = [
  {
    name: 'Classic Burger',
    description: 'Saftiger Beef-Patty mit Salat, Tomaten und hausgemachter Sauce',
    price: 16.50,
    category: 'main',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
    available: true,
    featured: true,
    ingredients: ['Rindfleisch', 'Brioche-Bun', 'Salat', 'Tomaten', 'Zwiebeln', 'Hausgemachte Sauce'],
    allergens: ['Gluten', 'Eier', 'Senf'],
    preparationTime: 12,
    spicyLevel: 0,
    vegetarian: false,
    vegan: false,
    stock: { enabled: true, quantity: 50, lowStockAlert: 10 }
  },
  {
    name: 'Veggie Delight',
    description: 'Gegrilltes Gemüse mit Halloumi und Pesto',
    price: 14.50,
    category: 'main',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500',
    available: true,
    featured: false,
    ingredients: ['Zucchini', 'Aubergine', 'Paprika', 'Halloumi', 'Pesto'],
    allergens: ['Milch', 'Nüsse'],
    preparationTime: 10,
    spicyLevel: 1,
    vegetarian: true,
    vegan: false,
    stock: { enabled: true, quantity: 30, lowStockAlert: 5 }
  },
  {
    name: 'Crispy Chicken Wings',
    description: 'Knusprige Hähnchenflügel mit BBQ-Sauce',
    price: 12.50,
    category: 'vorspeise',
    imageUrl: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=500',
    available: true,
    featured: true,
    ingredients: ['Hähnchenflügel', 'BBQ-Sauce', 'Gewürze'],
    allergens: ['Sellerie', 'Senf'],
    preparationTime: 15,
    spicyLevel: 2,
    vegetarian: false,
    vegan: false,
    stock: { enabled: false }
  },
  {
    name: 'Caesar Salad',
    description: 'Frischer Römersalat mit Parmesan und Croutons',
    price: 11.50,
    category: 'vorspeise',
    imageUrl: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=500',
    available: true,
    featured: false,
    ingredients: ['Römersalat', 'Parmesan', 'Croutons', 'Caesar-Dressing'],
    allergens: ['Gluten', 'Milch', 'Eier', 'Fisch'],
    preparationTime: 8,
    spicyLevel: 0,
    vegetarian: true,
    vegan: false,
    stock: { enabled: true, quantity: 20, lowStockAlert: 5 }
  },
  {
    name: 'Pommes Frites',
    description: 'Knusprige Pommes mit Meersalz',
    price: 6.50,
    category: 'beilage',
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500',
    available: true,
    featured: false,
    ingredients: ['Kartoffeln', 'Meersalz'],
    allergens: [],
    preparationTime: 8,
    spicyLevel: 0,
    vegetarian: true,
    vegan: true,
    stock: { enabled: false }
  }
];

async function initializeData() {
  console.log('🚀 Initialisiere Demo-Daten...');
  
  try {
    // Tenant erstellen
    const tenantRef = ref(database, `tenants/${TENANT_ID}`);
    await set(tenantRef, {
      name: 'Demo Restaurant',
      created: Date.now(),
      settings: {
        currency: 'CHF',
        language: 'de'
      }
    });
    console.log('✅ Tenant erstellt');
    
    // Produkte erstellen
    for (const product of demoProducts) {
      const productsRef = ref(database, `tenants/${TENANT_ID}/products`);
      const newRef = push(productsRef);
      
      await set(newRef, {
        ...product,
        id: newRef.key,
        createdAt: Date.now(),
        tenantId: TENANT_ID
      });
      
      console.log(`✅ Produkt erstellt: ${product.name}`);
    }
    
    console.log('🎉 Alle Demo-Daten erfolgreich erstellt!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

// Script ausführen
initializeData();