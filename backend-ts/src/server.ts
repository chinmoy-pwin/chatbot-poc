import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import customersRouter from './routes/customers';
import knowledgeRouter from './routes/knowledge';
import scrapingRouter from './routes/scraping';
import chatRouter from './routes/chat';
import voiceRouter from './routes/voice';
import statsRouter from './routes/stats';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['*'];
app.use(cors({
  origin: corsOrigins[0] === '*' ? true : corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'test_database';

mongoose.connect(`${MONGO_URL}/${DB_NAME}`)
  .then(() => console.log('✓ Connected to MongoDB'))
  .catch(err => console.error('✗ MongoDB connection error:', err));

// Routes
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'KbaseAI Chatbot API is running' });
});

app.use('/api/customers', customersRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/scrape', scrapingRouter);
app.use('/api/chat', chatRouter);
app.use('/api/webhook/chat', chatRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/stats', statsRouter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({ detail: err.message });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on http://0.0.0.0:${PORT}`);
  console.log(`✓ API available at http://0.0.0.0:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await mongoose.connection.close();
  process.exit(0);
});
