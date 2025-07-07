/**
 * EATECH Authentication Tests
 * 
 * Test suite for authentication triggers and services
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions-test';
import { expect } from '@jest/globals';
import * as sinon from 'sinon';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

// Import functions to test
import * as authTriggers from '../src/triggers/auth.triggers';
import { AuthService } from '../src/services/AuthService';
import { validateAuth } from '../src/middleware/auth.middleware';

// Initialize test environment
const test = functions();
const db = admin.firestore();

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================
describe('Authentication Tests', () => {
  let sandbox: sinon.SinonSandbox;
  
  beforeAll(() => {
    // Initialize Firebase Admin SDK for testing
    if (!admin.apps.length) {
      admin.initializeApp();
    }
  });
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  afterAll(() => {
    test.cleanup();
  });
  
  // ============================================================================
  // AUTH TRIGGERS TESTS
  // ============================================================================
  describe('Auth Triggers', () => {
    describe('onUserCreated', () => {
      it('should create user profile on user creation', async () => {
        const mockUser = {
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: 'https://example.com/photo.jpg',
        };
        
        const wrapped = test.wrap(authTriggers.onUserCreated);
        
        // Mock Firestore
        const setStub = sandbox.stub();
        sandbox.stub(db, 'collection').returns({
          doc: () => ({ set: setStub }),
        } as any);
        
        await wrapped(mockUser);
        
        expect(setStub.calledOnce).toBe(true);
        expect(setStub.firstCall.args[0]).toMatchObject({
          uid: mockUser.uid,
          email: mockUser.email,
          profile: {
            displayName: mockUser.displayName,
            photoURL: mockUser.photoURL,
          },
          createdAt: expect.any(Object),
        });
      });
      
      it('should send welcome email to new user', async () => {
        const mockUser = {
          uid: 'test-user-123',
          email: 'test@example.com',
        };
        
        const wrapped = test.wrap(authTriggers.onUserCreated);
        
        // Mock email service
        const sendEmailStub = sandbox.stub();
        sandbox.stub(require('../src/services/EmailService'), 'EmailService').returns({
          sendEmail: sendEmailStub,
        });
        
        await wrapped(mockUser);
        
        expect(sendEmailStub.calledOnce).toBe(true);
        expect(sendEmailStub.firstCall.args[0]).toMatchObject({
          to: mockUser.email,
          template: 'welcome',
        });
      });
    });
    
    describe('onUserDeleted', () => {
      it('should clean up user data on deletion', async () => {
        const mockUser = {
          uid: 'test-user-123',
        };
        
        const wrapped = test.wrap(authTriggers.onUserDeleted);
        
        // Mock Firestore batch
        const deleteStub = sandbox.stub();
        const commitStub = sandbox.stub();
        sandbox.stub(db, 'batch').returns({
          delete: deleteStub,
          commit: commitStub,
        } as any);
        
        // Mock collections
        sandbox.stub(db, 'collection').returns({
          where: () => ({
            get: async () => ({
              docs: [
                { ref: { id: 'doc1' } },
                { ref: { id: 'doc2' } },
              ],
            }),
          }),
        } as any);
        
        await wrapped(mockUser);
        
        expect(deleteStub.callCount).toBeGreaterThan(0);
        expect(commitStub.calledOnce).toBe(true);
      });
    });
    
    describe('beforeSignIn', () => {
      it('should allow sign in for active users', async () => {
        const mockData = {
          uid: 'test-user-123',
          email: 'test@example.com',
        };
        
        const mockContext = {
          auth: mockData,
        };
        
        const wrapped = test.wrap(authTriggers.beforeSignIn);
        
        // Mock user document
        sandbox.stub(db, 'collection').returns({
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => ({ isActive: true, emailVerified: true }),
            }),
          }),
        } as any);
        
        const result = await wrapped(mockData, mockContext);
        
        expect(result).toBeUndefined(); // No error thrown
      });
      
      it('should block sign in for inactive users', async () => {
        const mockData = {
          uid: 'test-user-123',
          email: 'test@example.com',
        };
        
        const mockContext = {
          auth: mockData,
        };
        
        const wrapped = test.wrap(authTriggers.beforeSignIn);
        
        // Mock user document
        sandbox.stub(db, 'collection').returns({
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => ({ isActive: false }),
            }),
          }),
        } as any);
        
        await expect(wrapped(mockData, mockContext)).rejects.toThrow('Account is deactivated');
      });
    });
  });
  
  // ============================================================================
  // AUTH SERVICE TESTS
  // ============================================================================
  describe('AuthService', () => {
    let authService: AuthService;
    
    beforeEach(() => {
      authService = new AuthService();
    });
    
    describe('validateCredentials', () => {
      it('should validate correct credentials', async () => {
        const email = 'test@example.com';
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Mock user lookup
        sandbox.stub(db, 'collection').returns({
          where: () => ({
            limit: () => ({
              get: async () => ({
                empty: false,
                docs: [{
                  id: 'user-123',
                  data: () => ({
                    email,
                    password: hashedPassword,
                    isActive: true,
                  }),
                }],
              }),
            }),
          }),
        } as any);
        
        const result = await authService.validateCredentials(email, password);
        
        expect(result).toMatchObject({
          id: 'user-123',
          email,
          isActive: true,
        });
      });
      
      it('should reject invalid password', async () => {
        const email = 'test@example.com';
        const password = 'wrongpassword';
        const hashedPassword = await bcrypt.hash('correctpassword', 10);
        
        // Mock user lookup
        sandbox.stub(db, 'collection').returns({
          where: () => ({
            limit: () => ({
              get: async () => ({
                empty: false,
                docs: [{
                  data: () => ({
                    email,
                    password: hashedPassword,
                  }),
                }],
              }),
            }),
          }),
        } as any);
        
        await expect(authService.validateCredentials(email, password))
          .rejects.toThrow('Invalid credentials');
      });
    });
    
    describe('generateTokens', () => {
      it('should generate valid JWT tokens', async () => {
        const user = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'customer',
          tenantId: 'tenant-456',
        };
        
        const tokens = await authService.generateTokens(user);
        
        expect(tokens).toHaveProperty('accessToken');
        expect(tokens).toHaveProperty('refreshToken');
        expect(tokens).toHaveProperty('expiresIn');
        
        // Verify access token
        const decoded = jwt.verify(tokens.accessToken, process.env.JWT_SECRET!) as any;
        expect(decoded).toMatchObject({
          uid: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        });
      });
    });
    
    describe('verifyToken', () => {
      it('should verify valid token', async () => {
        const payload = {
          uid: 'user-123',
          email: 'test@example.com',
          role: 'customer',
        };
        
        const token = jwt.sign(payload, process.env.JWT_SECRET!, {
          expiresIn: '1h',
        });
        
        const result = await authService.verifyToken(token);
        
        expect(result).toMatchObject(payload);
      });
      
      it('should reject expired token', async () => {
        const payload = {
          uid: 'user-123',
          email: 'test@example.com',
        };
        
        const token = jwt.sign(payload, process.env.JWT_SECRET!, {
          expiresIn: '-1h', // Already expired
        });
        
        await expect(authService.verifyToken(token))
          .rejects.toThrow('Token expired');
      });
    });
    
    describe('resetPassword', () => {
      it('should generate password reset token', async () => {
        const email = 'test@example.com';
        
        // Mock user lookup
        sandbox.stub(db, 'collection').returns({
          where: () => ({
            limit: () => ({
              get: async () => ({
                empty: false,
                docs: [{
                  id: 'user-123',
                  data: () => ({ email }),
                }],
              }),
            }),
          }),
        } as any);
        
        // Mock token storage
        const setStub = sandbox.stub();
        sandbox.stub(db, 'collection').withArgs('passwordResets').returns({
          doc: () => ({ set: setStub }),
        } as any);
        
        const token = await authService.generatePasswordResetToken(email);
        
        expect(token).toBeTruthy();
        expect(token).toHaveLength(32);
        expect(setStub.calledOnce).toBe(true);
      });
    });
  });
  
  // ============================================================================
  // MIDDLEWARE TESTS
  // ============================================================================
  describe('Auth Middleware', () => {
    describe('validateAuth', () => {
      it('should pass valid authentication', async () => {
        const mockReq = {
          headers: {
            authorization: 'Bearer valid-token',
          },
        } as any;
        
        const mockRes = {
          status: sandbox.stub().returnsThis(),
          json: sandbox.stub(),
        } as any;
        
        const mockNext = sandbox.stub();
        
        // Mock token verification
        sandbox.stub(admin.auth(), 'verifyIdToken').resolves({
          uid: 'user-123',
          email: 'test@example.com',
        } as any);
        
        await validateAuth(mockReq, mockRes, mockNext);
        
        expect(mockNext.calledOnce).toBe(true);
        expect(mockReq.user).toMatchObject({
          uid: 'user-123',
          email: 'test@example.com',
        });
      });
      
      it('should reject missing token', async () => {
        const mockReq = {
          headers: {},
        } as any;
        
        const mockRes = {
          status: sandbox.stub().returnsThis(),
          json: sandbox.stub(),
        } as any;
        
        const mockNext = sandbox.stub();
        
        await validateAuth(mockReq, mockRes, mockNext);
        
        expect(mockRes.status.calledWith(401)).toBe(true);
        expect(mockRes.json.calledOnce).toBe(true);
        expect(mockRes.json.firstCall.args[0]).toMatchObject({
          error: 'No token provided',
        });
        expect(mockNext.called).toBe(false);
      });
      
      it('should reject invalid token', async () => {
        const mockReq = {
          headers: {
            authorization: 'Bearer invalid-token',
          },
        } as any;
        
        const mockRes = {
          status: sandbox.stub().returnsThis(),
          json: sandbox.stub(),
        } as any;
        
        const mockNext = sandbox.stub();
        
        // Mock token verification failure
        sandbox.stub(admin.auth(), 'verifyIdToken').rejects(new Error('Invalid token'));
        
        await validateAuth(mockReq, mockRes, mockNext);
        
        expect(mockRes.status.calledWith(401)).toBe(true);
        expect(mockRes.json.calledOnce).toBe(true);
        expect(mockRes.json.firstCall.args[0]).toMatchObject({
          error: 'Invalid token',
        });
        expect(mockNext.called).toBe(false);
      });
    });
  });
  
  // ============================================================================
  // PERMISSION TESTS
  // ============================================================================
  describe('Permission Tests', () => {
    it('should check tenant permissions correctly', async () => {
      const user = {
        uid: 'user-123',
        role: 'admin',
        tenantId: 'tenant-456',
      };
      
      const tenantId = 'tenant-456';
      
      const hasPermission = authService.checkTenantPermission(user, tenantId);
      expect(hasPermission).toBe(true);
      
      const wrongTenant = 'tenant-789';
      const noPermission = authService.checkTenantPermission(user, wrongTenant);
      expect(noPermission).toBe(false);
    });
    
    it('should allow master admin access to all tenants', async () => {
      const masterAdmin = {
        uid: 'admin-123',
        role: 'master_admin',
        tenantId: null,
      };
      
      const anyTenantId = 'tenant-any';
      
      const hasPermission = authService.checkTenantPermission(masterAdmin, anyTenantId);
      expect(hasPermission).toBe(true);
    });
  });
});