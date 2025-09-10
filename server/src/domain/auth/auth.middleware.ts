import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from './auth.types';
import env from '../../config/env';

/**
 * Middleware to verify JWT token from Authorization header or cookies
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header or cookies
    const token = 
      req.headers.authorization?.split(' ')[1] || 
      req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // Verify token
    const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;
    
    // Attach user data to request
    (req as any).user = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }
};

/**
 * Utility function to verify JWT token (for Socket.IO)
 */
export const verifyJwtToken = (token: string): Promise<JwtPayload> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, env.jwt.secret, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded as JwtPayload);
      }
    });
  });
};
