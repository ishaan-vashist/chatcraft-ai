/// <reference types="jest" />
import { AuthController } from '../../../domain/auth/auth.controller';
import { authService } from '../../../domain/auth/auth.service';
import { mockRequest, mockResponse } from '../../utils/mocks';
import { Request, Response } from 'express';

// Mock auth service
jest.mock('../../../domain/auth/auth.service', () => ({
  authService: {
    register: jest.fn(),
    login: jest.fn(),
    getUserById: jest.fn()
  }
}));

describe('AuthController', () => {
  let authController: AuthController;
  let req: Request;
  let res: Response;
  
  beforeEach(() => {
    jest.clearAllMocks();
    authController = new AuthController();
    req = mockRequest();
    res = mockResponse();
  });
  
  describe('register', () => {
    const registerData = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User'
    };
    
    const registerResult = {
      user: {
        id: '3',
        email: 'newuser@example.com',
        name: 'New User'
      },
      token: 'mock_token'
    };
    
    it('should register a user and return 201 status', async () => {
      // Setup request
      req.body = registerData;
      
      // Mock service response
      (authService.register as jest.Mock).mockResolvedValue(registerResult);
      
      // Call controller method
      await authController.register(req, res);
      
      // Verify service was called
      expect(authService.register).toHaveBeenCalledWith(registerData);
      
      // Verify response
      expect(res.cookie).toHaveBeenCalledWith('token', 'mock_token', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ user: registerResult.user });
    });
    
    it('should handle validation errors', async () => {
      // Setup request
      req.body = { email: 'invalid-email' }; // Invalid data
      
      // Mock Zod validation error
      const zodError = new Error('Validation error');
      zodError.name = 'ZodError';
      (zodError as any).errors = [{ path: ['email'], message: 'Invalid email address' }];
      
      // Mock service to throw error
      (authService.register as jest.Mock).mockRejectedValue(zodError);
      
      // Call controller method
      await authController.register(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: expect.any(Array)
        }
      });
    });
    
    it('should handle service errors', async () => {
      // Setup request
      req.body = registerData;
      
      // Mock service error
      const serviceError = new Error('User already exists');
      (serviceError as any).statusCode = 409;
      (serviceError as any).code = 'USER_EXISTS';
      (authService.register as jest.Mock).mockRejectedValue(serviceError);
      
      // Call controller method
      await authController.register(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'USER_EXISTS',
          message: 'User already exists'
        }
      });
    });
  });
  
  describe('login', () => {
    const loginData = {
      email: 'user@example.com',
      password: 'password123'
    };
    
    const loginResult = {
      user: {
        id: '1',
        email: 'user@example.com',
        name: 'User'
      },
      token: 'mock_token'
    };
    
    it('should login a user and return 200 status', async () => {
      // Setup request
      req.body = loginData;
      
      // Mock service response
      (authService.login as jest.Mock).mockResolvedValue(loginResult);
      
      // Call controller method
      await authController.login(req, res);
      
      // Verify service was called
      expect(authService.login).toHaveBeenCalledWith(loginData);
      
      // Verify response
      expect(res.cookie).toHaveBeenCalledWith('token', 'mock_token', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ user: loginResult.user });
    });
    
    it('should handle validation errors', async () => {
      // Setup request
      req.body = { email: 'invalid-email' }; // Invalid data
      
      // Mock Zod validation error
      const zodError = new Error('Validation error');
      zodError.name = 'ZodError';
      (zodError as any).errors = [{ path: ['email'], message: 'Invalid email address' }];
      
      // Mock service to throw error
      (authService.login as jest.Mock).mockRejectedValue(zodError);
      
      // Call controller method
      await authController.login(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: expect.any(Array)
        }
      });
    });
    
    it('should handle invalid credentials', async () => {
      // Setup request
      req.body = loginData;
      
      // Mock service error
      const serviceError = new Error('Invalid email or password');
      (serviceError as any).statusCode = 401;
      (serviceError as any).code = 'INVALID_CREDENTIALS';
      (authService.login as jest.Mock).mockRejectedValue(serviceError);
      
      // Call controller method
      await authController.login(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    });
  });
  
  describe('me', () => {
    const userData = {
      id: '1',
      email: 'user@example.com',
      name: 'User'
    };
    
    it('should return current user data', async () => {
      // Setup request with user data (added by auth middleware)
      (req as any).user = { id: '1', email: 'user@example.com' };
      
      // Mock service response
      (authService.getUserById as jest.Mock).mockResolvedValue(userData);
      
      // Call controller method
      await authController.me(req, res);
      
      // Verify service was called
      expect(authService.getUserById).toHaveBeenCalledWith('1');
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ user: userData });
    });
    
    it('should handle service errors', async () => {
      // Setup request with user data
      (req as any).user = { id: '1', email: 'user@example.com' };
      
      // Mock service error
      const serviceError = new Error('User not found');
      (serviceError as any).statusCode = 404;
      (serviceError as any).code = 'USER_NOT_FOUND';
      (authService.getUserById as jest.Mock).mockRejectedValue(serviceError);
      
      // Call controller method
      await authController.me(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    });
  });
  
  describe('logout', () => {
    it('should clear token cookie and return success message', async () => {
      // Call controller method
      authController.logout(req, res);
      
      // Verify response
      expect(res.clearCookie).toHaveBeenCalledWith('token');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });
  });
});
