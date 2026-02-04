import { Router } from 'express';
import { KnowledgeFile } from '../models/KnowledgeFile';
import { ScrapedContent } from '../models/ScrapedContent';
import { Conversation } from '../models/Conversation';

const router = Router();

// Get stats for customer
router.get('/:customer_id', async (req, res) => {
  try {
    const { customer_id } = req.params;

    const [kbCount, scrapedCount, conversationCount] = await Promise.all([
      KnowledgeFile.countDocuments({ customer_id }),
      ScrapedContent.countDocuments({ customer_id }),
      Conversation.countDocuments({ customer_id })
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