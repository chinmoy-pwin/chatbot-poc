import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'customer';
    customer_id?: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ detail: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const user = await User.findOne({ where: { id: decoded.id } });

    if (!user) {
      return res.status(401).json({ detail: 'User not found' });
    }

    req.user = user.toSafeJSON() as any;
    next();
  } catch (error) {
    res.status(401).json({ detail: 'Invalid or expired token' });
  }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
};

export const isCustomerOrAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const customerId = req.params.customer_id || req.body.customer_id;
  
  if (req.user?.role === 'admin') {
    return next();
  }
  
  if (req.user?.role === 'customer' && req.user.customer_id === customerId) {
    return next();
  }
  
  return res.status(403).json({ detail: 'Access denied' });
};

export const canAccessCustomer = (req: AuthRequest, res: Response, next: NextFunction) => {
  const customerId = req.params.customer_id || req.body.customer_id;
  
  if (req.user?.role === 'admin') {
    return next();
  }
  
  if (req.user?.customer_id === customerId) {
    return next();
  }
  
  return res.status(403).json({ detail: 'You can only access your own data' });
};