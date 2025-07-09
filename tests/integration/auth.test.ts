import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import request from 'supertest';
import { app } from '../../services/functions/src/index';
import { AuthService } from '@packages/core';

// Test configuration
const TEST_TIMEOUT = 30000;
const TEST_USER_PREFIX = 'test-auth-user';

// Services
let auth: any;
let db: FirebaseFirestore.Firestore;
let authService: AuthService;

// Test users
interface TestUser {
  uid: string;
  email: string;
  role: string;
  metadata?: any;
}

const testUsers: TestUser[] = [];

beforeAll(async () => {
  // Initialize Firebase Admin
  const serviceAccount = require('../../test-service-account.json');
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'eatech-test'
  });
  
  auth = getAuth();
  db = getFirestore();
  authService = new AuthService(auth, db);
  
  // Set up test users
  await setupTestUsers();
}, TEST_TIMEOUT);

afterAll(async () => {
  await cleanupTestUsers();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// Helper functions
async function setupTestUsers() {
  // Create different user roles
  const roles = [
    { role: 'customer', email: 'customer@test.eatech.ch' },
    { role: 'truck_owner', email: 'truck@test.eatech.ch', truckId: 'test-truck-auth' },
    { role: 'manager', email: 'manager@test.eatech.ch', managedTrucks: ['truck-1', 'truck-2'] },
    { role: 'master_admin', email: 'admin@test.eatech.ch' }
  ];
  
  for (const userData of roles) {
    const uid = `${TEST_USER_PREFIX}-${userData.role}-${Date.now()}`;
    
    // Create user
    const user = await auth.createUser({
      uid,
      email: userData.email,
      emailVerified: true,
      displayName: `Test ${userData.role}`,
      password: 'Test123!@#'
    });
    
    // Set custom claims
    const claims: any = { role: userData.role };
    if (userData.truckId) claims.truckId = userData.truckId;
    if (userData.managedTrucks) claims.managedTrucks = userData.managedTrucks;
    
    await auth.setCustomUserClaims(uid, claims);
    
    testUsers.push({
      uid,
      email: userData.email,
      role: userData.role,
      metadata: claims
    });
  }
  
  // Create test truck for truck owner
  await db.collection('foodtrucks').doc('test-truck-auth').set({
    name: 'Auth Test Truck',
    ownerId: testUsers.find(u => u.role === 'truck_owner')?.uid,
    stripeAccountId: 'acct_test_auth',
    createdAt: new Date()
  });
}

async function cleanupTestUsers() {
  // Delete test users
  for (const user of testUsers) {
    try {
      await auth.deleteUser(user.uid);
    } catch (error) {
      // User might already be deleted
    }
  }
  
  // Delete test truck
  await db.collection('foodtrucks').doc('test-truck-auth').delete();
}

async function getIdToken(user: TestUser): Promise<string> {
  // In real tests, this would use Firebase Auth SDK
  // For integration tests, we create custom tokens
  return await auth.createCustomToken(user.uid, user.metadata);
}

// Auth Integration Tests
describe('Auth Integration Tests', () => {
  describe('User Registration and Onboarding', () => {
    it('should complete full truck owner registration flow', async () => {
      // Step 1: Register new user
      const registrationData = {
        email: 'newtruck@test.eatech.ch',
        password: 'SecurePass123!',
        displayName: 'New Food Truck',
        truckName: 'Awesome Burgers',
        phoneNumber: '+41791234567'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);
      
      expect(response.body).toMatchObject({
        user: {
          email: registrationData.email,
          displayName: registrationData.displayName
        },
        truck: {
          name: registrationData.truckName,
          trial_ends_at: expect.any(String)
        },
        onboardingUrl: expect.stringContaining('stripe.com')
      });
      
      const newUserId = response.body.user.uid;
      const newTruckId = response.body.truck.id;
      
      // Verify user created with correct claims
      const userRecord = await auth.getUser(newUserId);
      expect(userRecord.customClaims).toMatchObject({
        role: 'truck_owner',
        truckId: newTruckId
      });
      
      // Verify truck created
      const truck = await db.collection('foodtrucks').doc(newTruckId).get();
      expect(truck.exists).toBe(true);
      expect(truck.data()).toMatchObject({
        name: registrationData.truckName,
        ownerId: newUserId,
        platformFeePercentage: 0 // Trial period
      });
      
      // Cleanup
      await auth.deleteUser(newUserId);
      await db.collection('foodtrucks').doc(newTruckId).delete();
    });
    
    it('should prevent duplicate email registration', async () => {
      const existingEmail = testUsers[0].email;
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: existingEmail,
          password: 'Password123!',
          displayName: 'Duplicate User'
        })
        .expect(400);
      
      expect(response.body.error).toContain('already exists');
    });
    
    it('should validate Swiss phone numbers during registration', async () => {
      const invalidPhones = [
        '+49791234567',  // German number
        '0791234567',    // Missing country code
        '+41123456789'   // Invalid format
      ];
      
      for (const phone of invalidPhones) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test${Date.now()}@eatech.ch`,
            password: 'Pass123!',
            phoneNumber: phone
          })
          .expect(400);
        
        expect(response.body.error).toContain('phone');
      }
    });
  });
  
  describe('Authentication Flow', () => {
    it('should authenticate user and return valid tokens', async () => {
      const testUser = testUsers.find(u => u.role === 'truck_owner')!;
      
      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'Test123!@#'
        })
        .expect(200);
      
      expect(response.body).toMatchObject({
        user: {
          uid: testUser.uid,
          email: testUser.email,
          role: 'truck_owner'
        },
        token: expect.any(String),
        refreshToken: expect.any(String)
      });
      
      // Verify token works
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${response.body.token}`)
        .expect(200);
      
      expect(profileResponse.body).toMatchObject({
        uid: testUser.uid,
        email: testUser.email,
        role: 'truck_owner',
        truckId: testUser.metadata.truckId
      });
    });
    
    it('should refresh expired tokens', async () => {
      const testUser = testUsers[0];
      const refreshToken = await authService.generateRefreshToken(testUser.uid);
      
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      
      expect(response.body).toMatchObject({
        token: expect.any(String),
        refreshToken: expect.any(String)
      });
      
      // Old refresh token should be invalidated
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
    
    it('should handle logout correctly', async () => {
      const testUser = testUsers[0];
      const token = await getIdToken(testUser);
      
      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      // Token should be blacklisted
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });
  
  describe('Role-Based Access Control', () => {
    it('should enforce role hierarchy correctly', async () => {
      const endpoints = [
        { path: '/api/public/menu', allowedRoles: ['*'] },
        { path: '/api/trucks/test-truck-auth/orders', allowedRoles: ['truck_owner', 'manager', 'master_admin'] },
        { path: '/api/manager/dashboard', allowedRoles: ['manager', 'master_admin'] },
        { path: '/api/admin/global-stats', allowedRoles: ['master_admin'] }
      ];
      
      for (const endpoint of endpoints) {
        for (const user of testUsers) {
          const token = await getIdToken(user);
          const isAllowed = endpoint.allowedRoles.includes('*') || 
                           endpoint.allowedRoles.includes(user.role);
          
          const response = await request(app)
            .get(endpoint.path)
            .set('Authorization', `Bearer ${token}`);
          
          if (isAllowed) {
            expect([200, 404]).toContain(response.status); // 404 if resource doesn't exist
          } else {
            expect(response.status).toBe(403);
          }
        }
      }
    });
    
    it('should handle manager access to multiple trucks', async () => {
      const manager = testUsers.find(u => u.role === 'manager')!;
      const token = await getIdToken(manager);
      
      // Create trucks for manager
      for (const truckId of manager.metadata.managedTrucks) {
        await db.collection('foodtrucks').doc(truckId).set({
          name: `Managed ${truckId}`,
          managerId: manager.uid
        });
      }
      
      // Manager should access all managed trucks
      const response = await request(app)
        .get('/api/manager/trucks')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.trucks).toHaveLength(2);
      expect(response.body.trucks.map((t: any) => t.id))
        .toEqual(expect.arrayContaining(manager.metadata.managedTrucks));
      
      // Cleanup
      for (const truckId of manager.metadata.managedTrucks) {
        await db.collection('foodtrucks').doc(truckId).delete();
      }
    });
    
    it('should allow master admin to impersonate other users', async () => {
      const admin = testUsers.find(u => u.role === 'master_admin')!;
      const truckOwner = testUsers.find(u => u.role === 'truck_owner')!;
      const adminToken = await getIdToken(admin);
      
      // Admin impersonates truck owner
      const response = await request(app)
        .post('/api/admin/impersonate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetUserId: truckOwner.uid })
        .expect(200);
      
      expect(response.body).toMatchObject({
        impersonationToken: expect.any(String),
        targetUser: {
          uid: truckOwner.uid,
          role: 'truck_owner'
        }
      });
      
      // Use impersonation token
      const impersonationResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${response.body.impersonationToken}`)
        .expect(200);
      
      expect(impersonationResponse.body).toMatchObject({
        uid: truckOwner.uid,
        impersonatedBy: admin.uid
      });
    });
  });
  
  describe('Password Management', () => {
    it('should handle password reset flow', async () => {
      const testUser = testUsers[0];
      
      // Request password reset
      const resetResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: testUser.email })
        .expect(200);
      
      expect(resetResponse.body.message).toContain('Email sent');
      
      // In real scenario, user would receive email with reset code
      // For testing, we'll simulate the reset
      const resetCode = await authService.generatePasswordResetCode(testUser.email);
      
      // Complete password reset
      const newPassword = 'NewSecurePass123!';
      await request(app)
        .post('/api/auth/confirm-reset')
        .send({
          code: resetCode,
          newPassword
        })
        .expect(200);
      
      // Try login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: newPassword
        })
        .expect(200);
      
      expect(loginResponse.body.user.uid).toBe(testUser.uid);
    });
    
    it('should enforce password complexity requirements', async () => {
      const weakPasswords = [
        'short',           // Too short
        'nouppercase123!', // No uppercase
        'NOLOWERCASE123!', // No lowercase
        'NoNumbers!',      // No numbers
        'NoSpecial123',    // No special characters
        'password123!',    // Common password
      ];
      
      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `weak${Date.now()}@test.ch`,
            password,
            displayName: 'Test'
          })
          .expect(400);
        
        expect(response.body.error).toContain('password');
      }
    });
  });
  
  describe('Session Management', () => {
    it('should track active sessions per user', async () => {
      const testUser = testUsers[0];
      
      // Create multiple sessions
      const sessions = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'Test123!@#',
            deviceInfo: {
              name: `Device ${i}`,
              type: i === 0 ? 'mobile' : 'desktop'
            }
          })
          .expect(200);
        
        sessions.push(response.body.sessionId);
      }
      
      // Get active sessions
      const token = await getIdToken(testUser);
      const sessionsResponse = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(sessionsResponse.body.sessions).toHaveLength(3);
      expect(sessionsResponse.body.sessions[0]).toMatchObject({
        deviceName: expect.any(String),
        deviceType: expect.stringMatching(/mobile|desktop/),
        lastActive: expect.any(String)
      });
      
      // Revoke specific session
      await request(app)
        .delete(`/api/auth/sessions/${sessions[1]}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      // Verify session revoked
      const updatedSessions = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(updatedSessions.body.sessions).toHaveLength(2);
    });
    
    it('should auto-logout after inactivity', async () => {
      // This would typically be tested with time manipulation
      // For integration test, we verify the mechanism exists
      const testUser = testUsers[0];
      const token = await getIdToken(testUser);
      
      // Set session with short timeout for testing
      await authService.createSession(testUser.uid, {
        token,
        expiresIn: 1, // 1 second
        deviceInfo: { name: 'Test Device' }
      });
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Session should be expired
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });
  
  describe('Multi-Factor Authentication', () => {
    it('should handle 2FA setup and verification', async () => {
      const testUser = testUsers.find(u => u.role === 'truck_owner')!;
      const token = await getIdToken(testUser);
      
      // Enable 2FA
      const setupResponse = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(setupResponse.body).toMatchObject({
        secret: expect.any(String),
        qrCode: expect.stringContaining('data:image/png'),
        backupCodes: expect.arrayContaining([
          expect.stringMatching(/^[A-Z0-9]{8}$/)
        ])
      });
      
      // In real scenario, user would scan QR code
      // For testing, we use the secret directly
      const totp = authService.generateTOTP(setupResponse.body.secret);
      
      // Verify 2FA code
      const verifyResponse = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: totp })
        .expect(200);
      
      expect(verifyResponse.body.verified).toBe(true);
      
      // Future logins should require 2FA
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'Test123!@#'
        })
        .expect(200);
      
      expect(loginResponse.body).toMatchObject({
        requires2FA: true,
        tempToken: expect.any(String)
      });
      
      // Complete login with 2FA
      const newTotp = authService.generateTOTP(setupResponse.body.secret);
      const completeResponse = await request(app)
        .post('/api/auth/2fa/complete-login')
        .send({
          tempToken: loginResponse.body.tempToken,
          code: newTotp
        })
        .expect(200);
      
      expect(completeResponse.body).toMatchObject({
        user: expect.objectContaining({ uid: testUser.uid }),
        token: expect.any(String)
      });
    });
  });
  
  describe('OAuth Integration', () => {
    it('should handle Google OAuth flow', async () => {
      // Mock Google OAuth token
      const mockGoogleToken = 'mock-google-oauth-token';
      const mockGoogleUser = {
        sub: 'google-user-123',
        email: 'googleuser@gmail.com',
        name: 'Google User',
        picture: 'https://example.com/photo.jpg'
      };
      
      // Mock Google token verification
      jest.spyOn(authService, 'verifyGoogleToken')
        .mockResolvedValue(mockGoogleUser);
      
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);
      
      expect(response.body).toMatchObject({
        user: {
          email: mockGoogleUser.email,
          displayName: mockGoogleUser.name,
          photoURL: mockGoogleUser.picture
        },
        token: expect.any(String),
        isNewUser: expect.any(Boolean)
      });
      
      // Verify user created in Firebase
      const users = await auth.getUserByEmail(mockGoogleUser.email);
      expect(users).toBeDefined();
      
      // Cleanup
      await auth.deleteUser(users.uid);
    });
  });
  
  describe('Security Headers and CORS', () => {
    it('should set proper security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      // Check security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security'])
        .toContain('max-age=');
    });
    
    it('should handle CORS for allowed origins', async () => {
      const allowedOrigins = [
        'https://eatech.ch',
        'https://app.eatech.ch',
        'http://localhost:3000' // Development
      ];
      
      for (const origin of allowedOrigins) {
        const response = await request(app)
          .options('/api/trucks/test/menu')
          .set('Origin', origin)
          .expect(204);
        
        expect(response.headers['access-control-allow-origin']).toBe(origin);
        expect(response.headers['access-control-allow-methods'])
          .toContain('GET');
      }
      
      // Disallowed origin
      const badResponse = await request(app)
        .options('/api/trucks/test/menu')
        .set('Origin', 'https://evil.com')
        .expect(204);
      
      expect(badResponse.headers['access-control-allow-origin'])
        .toBeUndefined();
    });
  });
  
  describe('Audit Logging', () => {
    it('should log authentication events', async () => {
      const testUser = testUsers[0];
      
      // Perform auth actions
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'Test123!@#'
        });
      
      // Check audit logs
      const logs = await db.collection('audit_logs')
        .where('userId', '==', testUser.uid)
        .where('action', '==', 'login')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();
      
      expect(logs.empty).toBe(false);
      expect(logs.docs[0].data()).toMatchObject({
        userId: testUser.uid,
        action: 'login',
        ipAddress: expect.any(String),
        userAgent: expect.any(String),
        timestamp: expect.any(Object)
      });
    });
  });
});