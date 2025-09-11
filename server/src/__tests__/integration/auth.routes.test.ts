// Import the mock first to ensure it's loaded before any other imports
import { mockPrisma } from '../utils/prisma-mock';

import request from 'supertest';
import { app } from '../../../src/app';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { mockUsers } from '../utils/mocks';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('Auth API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('POST /api/auth/register', () => {
    const registerData = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User'
    };
    
    it('should register a new user successfully', async () => {
      // Mock bcrypt hash
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      
      // Mock JWT sign
      (jwt.sign as jest.Mock).mockReturnValue('mock_token');
      
      // Mock user not existing
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      // Mock user creation
      mockPrisma.user.create.mockResolvedValue({
        id: '3',
        email: registerData.email,
        name: registerData.name,
        passwordHash: 'hashed_password',
        createdAt: new Date()
      });
      
      // Make request
      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(201);
      
      // Verify response structure
      expect(response.body).toEqual({
        user: {
          id: '3',
          email: registerData.email,
          name: registerData.name
        }
      });
      
      // Verify cookie was set
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('token=');
    });
    
    it('should return 409 if user already exists', async () => {
      // Mock user already existing
      mockPrisma.user.findUnique.mockResolvedValue(mockUsers[0]);
      
      // Make request
      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(409);
      
      // Verify error response
      expect(response.body).toEqual({
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists'
        }
      });
    });
    
    it('should return 400 for invalid input', async () => {
      // Make request with invalid data
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123' // Too short
        })
        .expect(400);
      
      // Verify error response
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
  
  describe('POST /api/auth/login', () => {
    const loginData = {
      email: 'user1@example.com',
      password: 'password123'
    };
    
    it('should login successfully with correct credentials', async () => {
      // Mock user found
      mockPrisma.user.findUnique.mockResolvedValue(mockUsers[0]);
      
      // Mock password comparison success
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      
      // Mock JWT sign
      (jwt.sign as jest.Mock).mockReturnValue('mock_token');
      
      // Make request
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);
      
      // Verify response structure
      expect(response.body).toEqual({
        user: {
          id: mockUsers[0].id,
          email: mockUsers[0].email,
          name: mockUsers[0].name
        }
      });
      
      // Verify cookie was set
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('token=');
    });
    
    it('should return 401 for invalid credentials', async () => {
      // Mock user found
      mockPrisma.user.findUnique.mockResolvedValue(mockUsers[0]);
      
      // Mock password comparison failure
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      // Make request
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
      
      // Verify error response
      expect(response.body).toEqual({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    });
    
    it('should return 401 for non-existent user', async () => {
      // Mock user not found
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      // Make request
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
      
      // Verify error response
      expect(response.body).toEqual({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    });
  });
  
  describe('GET /api/auth/me', () => {
    it('should return user data for authenticated user', async () => {
      // Mock JWT verify
      (jwt.verify as jest.Mock).mockReturnValue({ id: mockUsers[0].id, email: mockUsers[0].email });
      
      // Mock user found
      mockPrisma.user.findUnique.mockResolvedValue(mockUsers[0]);
      
      // Make request
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer mock_token')
        .expect(200);
      
      // Verify response structure
      expect(response.body).toEqual({
        user: {
          id: mockUsers[0].id,
          email: mockUsers[0].email,
          name: mockUsers[0].name
        }
      });
    });
    
    it('should return 401 for missing token', async () => {
      // Make request without token
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);
      
      // Verify error response
      expect(response.body).toEqual({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    });
    
    it('should return 401 for invalid token', async () => {
      // Mock JWT verify to throw error
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Make request with invalid token
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
      
      // Verify error response
      expect(response.body).toEqual({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    });
  });
  
  describe('POST /api/auth/logout', () => {
    it('should clear token cookie', async () => {
      // Mock JWT verify
      (jwt.verify as jest.Mock).mockReturnValue({ id: mockUsers[0].id, email: mockUsers[0].email });
      
      // Make request
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer mock_token')
        .expect(200);
      
      // Verify response
      expect(response.body).toEqual({ message: 'Logged out successfully' });
      
      // Verify cookie was cleared
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('token=;');
    });
    
    it('should return 401 for unauthenticated request', async () => {
      // Make request without token
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);
      
      // Verify error response
      expect(response.body).toEqual({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    });
  });
});
