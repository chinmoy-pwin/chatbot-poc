import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import KnowledgeFile from '../models/KnowledgeFile';
import { FileProcessor } from '../utils/fileProcessor';
import { PineconeService } from '../services/pineconeService';
import { authenticate, AuthRequest, canAccessCustomer } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import queueService from '../services/queueService';
import cacheService from '../services/cacheService';
import fs from 'fs/promises';

const router = Router();

// Apply rate limiting
router.use(rateLimitMiddleware(30, 60)); // 30 requests per minute

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize Pinecone service
const pineconeService = process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME
  ? new PineconeService(
      process.env.PINECONE_API_KEY,
      process.env.PINECONE_INDEX_NAME,
      process.env.OPENAI_API_KEY || ''
    )
  : null;

// Initialize Pinecone index on startup
if (pineconeService) {
  pineconeService.initializeIndex().catch(console.error);
}

// Upload knowledge file (Admin or customer owner) - ASYNC
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No file provided' });
    }

    const { customer_id } = req.body;
    if (!customer_id) {
      return res.status(400).json({ detail: 'customer_id is required' });
    }

    // Check authorization
    if (req.user?.role !== 'admin' && req.user?.customer_id !== customer_id) {
      return res.status(403).json({ detail: 'You can only upload files for your own account' });
    }

    const fileId = uuidv4();
    const filename = req.file.originalname;
    const filePath = req.file.path;

    // Create database record with pending status
    const kbFile = await KnowledgeFile.create({
      id: fileId,
      customer_id,
      filename: filename,
      file_type: filename.split('.').pop()?.toLowerCase() || 'unknown',
      content: '', // Will be filled by worker
    });

    // Add to job queue for async processing
    const job = await queueService.addFileProcessJob({
      fileId,
      customerId: customer_id,
      filePath,
      filename,
    });

    // Invalidate cache
    await cacheService.invalidateKnowledgeFiles(customer_id);
    await cacheService.invalidateStats(customer_id);

    res.json({
      message: 'File queued for processing',
      file_id: kbFile.id,
      filename: kbFile.filename,
      job_id: job.id,
      status: 'pending',
    });
  } catch (error) {
    res.status(500).json({ detail: `Error uploading file: ${error}` });
  }
});

// Get knowledge files for customer (Admin or customer owner)
router.get('/:customer_id', authenticate, canAccessCustomer, async (req: AuthRequest, res) => {
  try {
    const customer_id = req.params.customer_id;

    // Check cache first
    const cached = await cacheService.getCachedKnowledgeFiles(customer_id);
    if (cached) {
      return res.json(cached);
    }

    // Fetch from database
    const files = await KnowledgeFile.findAll({
      where: { customer_id },
      attributes: { exclude: ['content'] },
      order: [['uploaded_at', 'DESC']]
    });

    const filesData = files.map(f => ({
      id: f.id,
      filename: f.filename,
      file_type: f.file_type,
      uploaded_at: f.uploaded_at,
    }));

    // Cache for 5 minutes
    await cacheService.setCachedKnowledgeFiles(customer_id, filesData);

    res.json(filesData);
  } catch (error) {
    res.status(500).json({ detail: `Error fetching files: ${error}` });
  }
});

// Get job status
router.get('/job/:job_id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { job_id } = req.params;
    const jobStatus = await queueService.getJobStatus(job_id, queueService.JobType.PROCESS_FILE);
    
    if (!jobStatus) {
      return res.status(404).json({ detail: 'Job not found' });
    }

    res.json(jobStatus);
  } catch (error) {
    res.status(500).json({ detail: `Error fetching job status: ${error}` });
  }
});
});

// Delete knowledge file (Admin or customer owner)
router.delete('/:file_id', authenticate, async (req: AuthRequest, res) => {
  try {
    // First, get the file to check ownership
    const file = await KnowledgeFile.findOne({ where: { id: req.params.file_id } });
    
    if (!file) {
      return res.status(404).json({ detail: 'File not found' });
    }

    // Check authorization
    if (req.user?.role !== 'admin' && req.user?.customer_id !== file.customer_id) {
      return res.status(403).json({ detail: 'You can only delete your own files' });
    }

    await file.destroy();

    // Delete from Pinecone in background
    if (pineconeService) {
      pineconeService.deleteKnowledgeFile(req.params.file_id)
        .catch(err => console.error('Pinecone delete failed:', err));
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ detail: `Error deleting file: ${error}` });
  }
});

export default router;