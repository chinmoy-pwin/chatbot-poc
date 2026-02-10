import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Customer from '../models/Customer';
import { authenticate, AuthRequest, isAdmin } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import cacheService from '../services/cacheService';

const router = Router();

// Apply rate limiting to all customer routes
router.use(rateLimitMiddleware(60, 60)); // 60 requests per minute

// Create customer (Admin only)
router.post('/', authenticate, isAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, webhook_url } = req.body;

    const customer = await Customer.create({
      id: uuidv4(),
      name,
      webhook_url
    });

    // Cache the new customer
    await cacheService.setCachedCustomer(customer.id, customer);

    res.json({
      id: customer.id,
      name: customer.name,
      webhook_url: customer.webhook_url,
      created_at: customer.created_at
    });
  } catch (error) {
    res.status(500).json({ detail: `Error creating customer: ${error}` });
  }
});

// Get all customers (Admin sees all, Customer sees only their own)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    let customers;
    
    if (req.user?.role === 'admin') {
      // Admin: Check cache for all customers list
      const cacheKey = 'customers:all';
      const cached = await cacheService.getCachedCustomer(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }
      
      customers = await Customer.findAll({
        order: [['created_at', 'DESC']]
      });
      
      const customersData = customers.map(c => ({
        id: c.id,
        name: c.name,
        webhook_url: c.webhook_url,
        created_at: c.created_at
      }));
      
      // Cache for 5 minutes
      await cacheService.setCachedCustomer(cacheKey, customersData);
      
      res.json(customersData);
    } else {
      // Customer users: Check cache first
      const customerId = req.user?.customer_id;
      const cached = await cacheService.getCachedCustomer(customerId!);
      
      if (cached) {
        return res.json([cached]);
      }
      
      customers = await Customer.findAll({
        where: { id: customerId },
        order: [['created_at', 'DESC']]
      });
      
      const customersData = customers.map(c => ({
        id: c.id,
        name: c.name,
        webhook_url: c.webhook_url,
        created_at: c.created_at
      }));
      
      // Cache the customer data
      if (customersData.length > 0) {
        await cacheService.setCachedCustomer(customerId!, customersData[0]);
      }
      
      res.json(customersData);
    }
  } catch (error) {
    res.status(500).json({ detail: `Error fetching customers: ${error}` });
  }
});

// Get customer by ID (Admin or owner only)
router.get('/:customer_id', authenticate, async (req: AuthRequest, res) => {
  try {
    // Check authorization
    if (req.user?.role !== 'admin' && req.user?.customer_id !== req.params.customer_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    // Check cache first
    const cached = await cacheService.getCachedCustomer(req.params.customer_id);
    if (cached) {
      return res.json(cached);
    }

    const customer = await Customer.findOne({
      where: { id: req.params.customer_id }
    });
    
    if (!customer) {
      return res.status(404).json({ detail: 'Customer not found' });
    }
    
    const customerData = {
      id: customer.id,
      name: customer.name,
      webhook_url: customer.webhook_url,
      created_at: customer.created_at
    };
    
    // Cache the customer
    await cacheService.setCachedCustomer(customer.id, customerData);
    
    res.json(customerData);
  } catch (error) {
    res.status(500).json({ detail: `Error fetching customer: ${error}` });
  }
});
    res.status(500).json({ detail: `Error fetching customer: ${error}` });
  }
});

export default router;