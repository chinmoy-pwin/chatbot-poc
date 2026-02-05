import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Customer from '../models/Customer';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, customer_name } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ detail: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ detail: 'User with this email already exists' });
    }

    let customer_id;

    // If registering as customer, create customer record
    if (role === 'customer' || !role) {
      const customerNameToUse = customer_name || `${name}'s Company`;
      const customer = await Customer.create({
        id: uuidv4(),
        name: customerNameToUse
      });
      customer_id = customer.id;
    }

    // Create user
    const user = await User.create({
      id: uuidv4(),
      email,
      password,
      name,
      role: role || 'customer',
      customer_id
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toSafeJSON(),
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ detail: `Registration failed: ${error}` });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: user.toSafeJSON(),
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ detail: `Login failed: ${error}` });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    res.status(500).json({ detail: `Error fetching user: ${error}` });
  }
});

// Change password
router.post('/change-password', authenticate, async (req: AuthRequest, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ detail: 'Current and new passwords are required' });
    }

    const user = await User.findOne({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(current_password);
    if (!isPasswordValid) {
      return res.status(401).json({ detail: 'Current password is incorrect' });
    }

    // Update password
    user.password = new_password;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ detail: `Error changing password: ${error}` });
  }
});

export default router;