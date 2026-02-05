import { Router } from 'express';
import KnowledgeFile from '../models/KnowledgeFile';
import ScrapedContent from '../models/ScrapedContent';
import Conversation from '../models/Conversation';
import { authenticate, AuthRequest, canAccessCustomer } from '../middleware/auth';

const router = Router();

// Get stats for customer (Admin or customer owner)
router.get('/:customer_id', authenticate, canAccessCustomer, async (req: AuthRequest, res) => {
  try {
    const { customer_id } = req.params;

    const [kbCount, scrapedCount, conversationCount] = await Promise.all([
      KnowledgeFile.count({ where: { customer_id } }),
      ScrapedContent.count({ where: { customer_id } }),
      Conversation.count({ where: { customer_id } })
    ]);

    res.json({
      knowledge_files: kbCount,
      scraped_pages: scrapedCount,
      conversations: conversationCount
    });
  } catch (error) {
    res.status(500).json({ detail: `Error fetching stats: ${error}` });
  }
});

export default router;
