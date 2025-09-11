// Import the mock first to ensure it's loaded before any other imports
import { mockPrisma } from '../../utils/prisma-mock';

import { AuthService } from '../../../domain/auth/auth.service';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { mockUsers } from '../../utils/mocks';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
  });
  
  describe('register', () => {
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
      
      // Call register
      const result = await authService.register(registerData);
      
      // Verify user was checked for existence
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerData.email }
      });
      
      // Verify password was hashed
      expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 10);
      
      // Verify user was created
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: registerData.email,
          name: registerData.name,
          passwordHash: 'hashed_password'
        }
      });
      
      // Verify token was generated
      expect(jwt.sign).toHaveBeenCalled();
      
      // Verify result structure
      expect(result).toEqual({
        user: {
          id: '3',
          email: registerData.email,
          name: registerData.name
        },
        token: 'mock_token'
      });
    });
    
    it('should throw error if user already exists', async () => {
      // Mock user already existing
      mockPrisma.user.findUnique.mockResolvedValue(mockUsers[0]);
      
      // Call register and expect error
      await expect(authService.register(registerData)).rejects.toThrow('User with this email already exists');
      
      // Verify user was checked for existence
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerData.email }
      });
      
      // Verify user was not created
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });
  
  describe('login', () => {
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
      
      // Call login
      const result = await authService.login(loginData);
      
      // Verify user was looked up
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginData.email }
      });
      
      // Verify password was compared
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUsers[0].passwordHash);
      
      // Verify token was generated
      expect(jwt.sign).toHaveBeenCalled();
      
      // Verify result structure
      expect(result).toEqual({
        user: {
          id: mockUsers[0].id,
          email: mockUsers[0].email,
          name: mockUsers[0].name
        },
        token: 'mock_token'
      });
    });
    
    it('should throw error if user not found', async () => {
      // Mock user not found
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      // Call login and expect error
      await expect(authService.login(loginData)).rejects.toThrow('Invalid email or password');
      
      // Verify user was looked up
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginData.email }
      });
      
      // Verify password was not compared
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
    
    it('should throw error if password is incorrect', async () => {
      // Mock user found
      mockPrisma.user.findUnique.mockResolvedValue(mockUsers[0]);
      
      // Mock password comparison failure
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      // Call login and expect error
      await expect(authService.login(loginData)).rejects.toThrow('Invalid email or password');
      
      // Verify user was looked up
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginData.email }
      });
      
      // Verify password was compared
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUsers[0].passwordHash);
      
      // Verify token was not generated
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });
  
  describe('getUserById', () => {
    it('should return user when found', async () => {
      // Mock user found
      mockPrisma.user.findUnique.mockResolvedValue(mockUsers[0]);
      
      // Call getUserById
      const result = await authService.getUserById(mockUsers[0].id);
      
      // Verify user was looked up
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUsers[0].id }
      });
      
      // Verify result structure
      expect(result).toEqual({
        id: mockUsers[0].id,
        email: mockUsers[0].email,
        name: mockUsers[0].name
      });
    });
    
    it('should throw error if user not found', async () => {
      // Mock user not found
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      // Call getUserById and expect error
      await expect(authService.getUserById('nonexistent-id')).rejects.toThrow('User not found');
      
      // Verify user was looked up
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent-id' }
      });
    });
  });
  
  describe('generateToken', () => {
    it('should generate a JWT token', () => {
      // Mock JWT sign
      (jwt.sign as jest.Mock).mockReturnValue('mock_token');
      
      // Create a new instance with access to private method
      const service = new AuthService();
      const generateToken = (service as any).generateToken.bind(service);
      
      // Call generateToken
      const payload = { id: '1', email: 'user1@example.com' };
      const result = generateToken(payload);
      
      // Verify JWT sign was called
      expect(jwt.sign).toHaveBeenCalledWith(payload, expect.any(String), expect.any(Object));
      
      // Verify result
      expect(result).toBe('mock_token');
    });
    
    it('should throw error if JWT_SECRET is not defined', () => {
      // Mock env module to return undefined for jwt.secret
      jest.resetModules();
      
      // Save original module
      const originalModule = jest.requireMock('../../../config/env');
      
      // Override the mock for this test
      jest.doMock('../../../config/env', () => ({
        __esModule: true,
        default: {
          jwt: {
            secret: undefined,
            expiresIn: '24h'
          }
        }
      }), { virtual: true });
      
      // Re-import the AuthService to use the new mock
      const { AuthService } = require('../../../domain/auth/auth.service');
      
      // Create a new instance with access to private method
      const service = new AuthService();
      const generateToken = (service as any).generateToken.bind(service);
      
      // Call generateToken and expect error
      const payload = { id: '1', email: 'user1@example.com' };
      expect(() => generateToken(payload)).toThrow('Failed to generate authentication token');
      
      // Restore original mock
      jest.doMock('../../../config/env', () => originalModule, { virtual: true });
    });
  });
});
