import { Request, Response, NextFunction } from 'express';
import cacheService from '../services/cacheService';
import { AuthRequest } from './auth';

// Rate limiting middleware
export const rateLimitMiddleware = (maxRequests: number = 60, windowSeconds: number = 60) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const customerId = req.user?.customer_id || req.user?.id || 'anonymous';
    
    const allowed = await cacheService.checkCustomerRateLimit(customerId, maxRequests, windowSeconds);
    
    if (!allowed) {
      return res.status(429).json({
        detail: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowSeconds} seconds.`,
        retryAfter: windowSeconds,
      });
    }
    
    next();
  };
};

// Global rate limiting (for unauthenticated endpoints)
export const globalRateLimitMiddleware = (key: string, maxRequests: number = 100, windowSeconds: number = 60) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const rateLimitKey = `${key}:${clientIp}`;
    
    const allowed = await cacheService.checkGlobalRateLimit(rateLimitKey, maxRequests, windowSeconds);
    
    if (!allowed) {
      return res.status(429).json({
        detail: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowSeconds} seconds.`,
        retryAfter: windowSeconds,
      });
    }
    
    next();
  };
};

// Webhook rate limiting (per customer)
export const webhookRateLimitMiddleware = (maxRequests: number = 300, windowSeconds: number = 60) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const customerId = req.body.customer_id;
    
    if (!customerId) {
      return res.status(400).json({ detail: 'customer_id is required' });
    }
    
    const allowed = await cacheService.checkCustomerRateLimit(customerId, maxRequests, windowSeconds);
    
    if (!allowed) {
      return res.status(429).json({
        detail: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowSeconds} seconds.`,
        retryAfter: windowSeconds,
      });
    }
    
    next();
  };
};
