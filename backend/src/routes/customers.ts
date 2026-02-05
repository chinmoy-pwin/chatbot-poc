import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Customer from '../models/Customer';

const router = Router();

// Create customer
router.post('/', async (req, res) => {
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

// Get all customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.findAll({
      order: [['created_at', 'DESC']]
    });
    
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

// Get customer by ID
router.get('/:customer_id', async (req, res) => {
  try {
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