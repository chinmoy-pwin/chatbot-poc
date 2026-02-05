import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import KnowledgeFile from '../models/KnowledgeFile';
import { FileProcessor } from '../utils/fileProcessor';
import { PineconeService } from '../services/pineconeService';
import { authenticate, AuthRequest, canAccessCustomer } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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

// Upload knowledge file (Admin or customer owner)
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

    const content = await FileProcessor.extractText(req.file.buffer, req.file.originalname);

    const kbFile = await KnowledgeFile.create({
      id: uuidv4(),
      customer_id,
      filename: req.file.originalname,
      file_type: req.file.originalname.split('.').pop()?.toLowerCase() || 'unknown',
      content
    });

    // Upsert to Pinecone in background
    if (pineconeService) {
      pineconeService.upsertKnowledgeFile(
        kbFile.id,
        customer_id,
        req.file.originalname,
        content
      ).catch(err => console.error('Pinecone upsert failed:', err));
    }

    res.json({
      message: 'File uploaded successfully',
      file_id: kbFile.id,
      filename: kbFile.filename
    });
  } catch (error) {
    res.status(500).json({ detail: `Error uploading file: ${error}` });
  }
});

// Get knowledge files for customer (Admin or customer owner)
router.get('/:customer_id', authenticate, canAccessCustomer, async (req: AuthRequest, res) => {
  try {
    const files = await KnowledgeFile.findAll({
      where: { customer_id: req.params.customer_id },
      attributes: { exclude: ['content'] },
      order: [['uploaded_at', 'DESC']]
    });

    res.json(files.map(f => ({
      id: f.id,
      customer_id: f.customer_id,
      filename: f.filename,
      file_type: f.file_type,
      uploaded_at: f.uploaded_at
    })));
  } catch (error) {
    res.status(500).json({ detail: `Error fetching files: ${error}` });
  }
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