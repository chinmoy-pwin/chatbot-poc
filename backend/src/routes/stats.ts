import { Router } from 'express';
import KnowledgeFile from '../models/KnowledgeFile';
import ScrapedContent from '../models/ScrapedContent';
import Conversation from '../models/Conversation';
import { authenticate, AuthRequest, canAccessCustomer } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import cacheService from '../services/cacheService';

const router = Router();

// Apply rate limiting
router.use(rateLimitMiddleware(120, 60)); // 120 requests per minute

// Get stats for customer (Admin or customer owner)
router.get('/:customer_id', authenticate, canAccessCustomer, async (req: AuthRequest, res) => {
  try {
    const { customer_id } = req.params;

    // Check cache first
    const cached = await cacheService.getCachedStats(customer_id);
    if (cached) {
      return res.json(cached);
    }

    // Fetch from database
    const [kbCount, scrapedCount, conversationCount] = await Promise.all([
      KnowledgeFile.count({ where: { customer_id } }),
      ScrapedContent.count({ where: { customer_id } }),
      Conversation.count({ where: { customer_id } })
    ]);

    const stats = {
      knowledge_files: kbCount,
      scraped_pages: scrapedCount,
      conversations: conversationCount
    };

    // Cache for 1 minute
    await cacheService.setCachedStats(customer_id, stats);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ detail: `Error fetching stats: ${error}` });
  }
});

export default router;
