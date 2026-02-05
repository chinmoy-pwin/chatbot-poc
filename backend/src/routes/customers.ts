import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Customer from '../models/Customer';
import { authenticate, AuthRequest, isAdmin } from '../middleware/auth';

const router = Router();

// Create customer (Admin only)
router.post('/', authenticate, isAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, webhook_url } = req.body;

    const customer = await Customer.create({
      id: uuidv4(),
      name,
      webhook_url
    });

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
      customers = await Customer.findAll({
        order: [['created_at', 'DESC']]
      });
    } else {
      // Customer users can only see their own customer record
      customers = await Customer.findAll({
        where: { id: req.user?.customer_id },
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(customers.map(c => ({
      id: c.id,
      name: c.name,
      webhook_url: c.webhook_url,
      created_at: c.created_at
    })));
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

    const customer = await Customer.findOne({
      where: { id: req.params.customer_id }
    });
    
    if (!customer) {
      return res.status(404).json({ detail: 'Customer not found' });
    }
    
    res.json({
      id: customer.id,
      name: customer.name,
      webhook_url: customer.webhook_url,
      created_at: customer.created_at
    });
  } catch (error) {
    res.status(500).json({ detail: `Error fetching customer: ${error}` });
  }
});

export default router;