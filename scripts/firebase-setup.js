/**
 * EATECH - Firebase Setup & Initial Data
 * Version: 17.0.0
 * Description: Script zum Initialisieren der Firebase-Datenbank mit Demo-Daten
 * Author: EATECH Development Team
 * Created: 2025-07-05
 * File Path: /scripts/firebase-setup.js
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set, push } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Firebase Config (aus .env.local)
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
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

// ============================================================================
// DEMO DATA
// ============================================================================

const DEMO_TENANT_ID = 'demo-restaurant';

const DEMO_PRODUCTS = [
  // BURGER
  {
    name: 'Classic Cheeseburger',
    description: 'Saftiges Rindfleisch-Patty mit Cheddar, Salat, Tomate und unserer Spezialsauce',
    price: 18.50,
    category: 'burger',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
    available: true,
    featured: true,
    ingredients: ['Rindfleisch', 'Cheddar', 'Salat', 'Tomate', 'Zwiebel', 'Spezialsauce', 'Brioche Bun'],
    allergens: ['Gluten', 'Milch', 'Eier'],
    preparationTime: 15,
    spicyLevel: 0,
    stock: { enabled: true, quantity: 50, lowStockAlert: 10 }
  },
  {
    name: 'Bacon BBQ Burger',
    description: 'Double Beef mit knusprigem Bacon, BBQ-Sauce und Röstzwiebeln',
    price: 22.50,
    category: 'burger',
    imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500',
    available: true,
    featured: false,
    ingredients: ['Rindfleisch', 'Bacon', 'Cheddar', 'BBQ-Sauce', 'Röstzwiebeln', 'Salat'],
    allergens: ['Gluten', 'Milch'],
    preparationTime: 18,
    spicyLevel: 1,
    stock: { enabled: true, quantity: 30, lowStockAlert: 10 }
  },
  {
    name: 'Veggie Deluxe',
    description: 'Hausgemachtes Gemüse-Patty mit Avocado, gegrilltem Gemüse und Pesto',
    price: 19.50,
    category: 'burger',
    imageUrl: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=500',
    available: true,
    featured: false,
    ingredients: ['Gemüse-Patty', 'Avocado', 'Zucchini', 'Paprika', 'Pesto', 'Rucola'],
    allergens: ['Gluten', 'Nüsse'],
    preparationTime: 15,
    spicyLevel: 0,
    vegetarian: true,
    stock: { enabled: true, quantity: 25, lowStockAlert: 10 }
  },
  
  // PIZZA
  {
    name: 'Margherita',
    description: 'Der Klassiker mit San Marzano Tomaten, Mozzarella und frischem Basilikum',
    price: 16.50,
    category: 'pizza',
    imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500',
    available: true,
    featured: false,
    ingredients: ['Tomatensauce', 'Mozzarella', 'Basilikum', 'Olivenöl'],
    allergens: ['Gluten', 'Milch'],
    preparationTime: 12,
    spicyLevel: 0,
    vegetarian: true,
    stock: { enabled: false }
  },
  {
    name: 'Diavola',
    description: 'Scharfe Salami, Mozzarella und Chili-Öl für Liebhaber der Schärfe',
    price: 19.50,
    category: 'pizza',
    imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500',
    available: true,
    featured: true,
    ingredients: ['Tomatensauce', 'Mozzarella', 'Scharfe Salami', 'Chili-Öl', 'Oregano'],
    allergens: ['Gluten', 'Milch'],
    preparationTime: 12,
    spicyLevel: 3,
    stock: { enabled: false }
  },
  
  // SALATE
  {
    name: 'Caesar Salad',
    description: 'Knackiger Römersalat mit Parmesan, Croutons und Caesar-Dressing',
    price: 14.50,
    category: 'salat',
    imageUrl: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=500',
    available: true,
    featured: false,
    ingredients: ['Römersalat', 'Parmesan', 'Croutons', 'Caesar-Dressing', 'Hähnchenbrust'],
    allergens: ['Gluten', 'Milch', 'Eier', 'Fisch'],
    preparationTime: 10,
    spicyLevel: 0,
    stock: { enabled: true, quantity: 20, lowStockAlert: 5 }
  },
  
  // GETRÄNKE
  {
    name: 'Hausgemachte Limonade',
    description: 'Erfrischende Zitronenlimonade mit Minze',
    price: 5.50,
    category: 'getraenke',
    imageUrl: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=500',
    available: true,
    featured: false,
    ingredients: ['Zitrone', 'Zucker', 'Minze', 'Sprudelwasser'],
    allergens: [],
    preparationTime: 5,
    spicyLevel: 0,
    stock: { enabled: true, quantity: 100, lowStockAlert: 20 }
  },
  {
    name: 'Craft Beer',
    description: 'Lokales Craft Beer vom Fass',
    price: 7.50,
    category: 'getraenke',
    imageUrl: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=500',
    available: true,
    featured: false,
    ingredients: [],
    allergens: ['Gluten'],
    preparationTime: 1,
    spicyLevel: 0,
    stock: { enabled: true, quantity: 50, lowStockAlert: 10 }
  },
  
  // DESSERTS
  {
    name: 'Chocolate Brownie',
    description: 'Warmer Schokoladen-Brownie mit Vanilleeis',
    price: 8.50,
    category: 'dessert',
    imageUrl: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=500',
    available: true,
    featured: true,
    ingredients: ['Schokolade', 'Butter', 'Eier', 'Zucker', 'Mehl', 'Vanilleeis'],
    allergens: ['Gluten', 'Milch', 'Eier'],
    preparationTime: 8,
    spicyLevel: 0,
    stock: { enabled: true, quantity: 15, lowStockAlert: 5 }
  },
  
  // BEILAGEN
  {
    name: 'French Fries',
    description: 'Knusprige Pommes Frites mit Meersalz',
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
  },
  {
    name: 'Sweet Potato Fries',
    description: 'Süßkartoffel-Pommes mit Rosmarin und Aioli',
    price: 8.50,
    category: 'beilage',
    imageUrl: 'https://images.unsplash.com/photo-1598679253544-2c97992403ea?w=500',
    available: true,
    featured: false,
    ingredients: ['Süßkartoffeln', 'Rosmarin', 'Aioli'],
    allergens: ['Eier'],
    preparationTime: 10,
    spicyLevel: 0,
    vegetarian: true,
    stock: { enabled: false }
  }
];

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

async function createDemoAdmin() {
  try {
    const email = 'admin@eatech.ch';
    const password = 'eatech2025!';
    
    console.log('Creating demo admin user...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('✅ Admin user created:', userCredential.user.email);
    
    // Set admin profile
    await set(ref(db, `users/${userCredential.user.uid}/profile`), {
      email: email,
      displayName: 'Demo Admin',
      role: 'admin',
      tenantId: DEMO_TENANT_ID,
      createdAt: Date.now()
    });
    
    return userCredential.user;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Admin user already exists, signing in...');
      const userCredential = await signInWithEmailAndPassword(auth, 'admin@eatech.ch', 'eatech2025!');
      return userCredential.user;
    }
    throw error;
  }
}

async function createTenant() {
  console.log('Creating demo tenant...');
  
  const tenantData = {
    id: DEMO_TENANT_ID,
    name: 'Demo Restaurant',
    subdomain: 'demo',
    settings: {
      currency: 'CHF',
      language: 'de',
      timezone: 'Europe/Zurich',
      openingHours: {
        monday: { open: '11:00', close: '22:00' },
        tuesday: { open: '11:00', close: '22:00' },
        wednesday: { open: '11:00', close: '22:00' },
        thursday: { open: '11:00', close: '22:00' },
        friday: { open: '11:00', close: '23:00' },
        saturday: { open: '11:00', close: '23:00' },
        sunday: { open: '12:00', close: '21:00' }
      }
    },
    createdAt: Date.now()
  };
  
  await set(ref(db, `tenants/${DEMO_TENANT_ID}`), tenantData);
  console.log('✅ Tenant created:', DEMO_TENANT_ID);
}

async function createProducts() {
  console.log('Creating demo products...');
  
  for (const product of DEMO_PRODUCTS) {
    const productsRef = ref(db, `tenants/${DEMO_TENANT_ID}/products`);
    const newProductRef = push(productsRef);
    
    const productData = {
      ...product,
      id: newProductRef.key,
      tenantId: DEMO_TENANT_ID,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: auth.currentUser?.uid || 'system',
      createdByEmail: auth.currentUser?.email || 'system@eatech.ch',
      orderCount: 0,
      revenue: 0,
      rating: 0,
      reviewCount: 0
    };
    
    await set(newProductRef, productData);
    console.log(`✅ Product created: ${product.name}`);
  }
  
  console.log(`✅ All ${DEMO_PRODUCTS.length} products created!`);
}

// ============================================================================
// MAIN SETUP
// ============================================================================

async function runSetup() {
  try {
    console.log('🚀 Starting EATECH Firebase Setup...\n');
    
    // 1. Create admin user
    const adminUser = await createDemoAdmin();
    
    // 2. Create tenant
    await createTenant();
    
    // 3. Create products
    await createProducts();
    
    console.log('\n✅ Setup completed successfully!');
    console.log('\n📋 Demo Credentials:');
    console.log('Email: admin@eatech.ch');
    console.log('Password: eatech2025!');
    console.log('Tenant ID:', DEMO_TENANT_ID);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
runSetup();