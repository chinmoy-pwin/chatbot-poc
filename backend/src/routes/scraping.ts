import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import ScrapeConfig from '../models/ScrapeConfig';
import ScrapedContent from '../models/ScrapedContent';
import { WebScraper } from '../utils/webScraper';
import { PineconeService } from '../services/pineconeService';
import { authenticate, AuthRequest, canAccessCustomer } from '../middleware/auth';

const router = Router();
const scheduledJobs = new Map<string, cron.ScheduledTask>();

// Initialize Pinecone service
const pineconeService = process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME
  ? new PineconeService(
      process.env.PINECONE_API_KEY,
      process.env.PINECONE_INDEX_NAME,
      process.env.OPENAI_API_KEY || ''
    )
  : null;

// Create scrape config (Admin or customer owner)
router.post('/config', authenticate, async (req: AuthRequest, res) => {
  try {
    const { customer_id, urls, schedule, auto_scrape } = req.body;

    // Check authorization
    if (req.user?.role !== 'admin' && req.user?.customer_id !== customer_id) {
      return res.status(403).json({ detail: 'You can only manage your own scraping configs' });
    }

    const config = await ScrapeConfig.create({
      id: uuidv4(),
      customer_id,
      urls,
      schedule: schedule || '0 0 * * *',
      auto_scrape: auto_scrape || false
    });

    // Schedule auto-scraping if enabled
    if (config.auto_scrape && cron.validate(config.schedule)) {
      const task = cron.schedule(config.schedule, async () => {
        await scrapeUrlsForCustomer(customer_id);
      });
      scheduledJobs.set(config.id, task);
    }

    res.json({
      id: config.id,
      customer_id: config.customer_id,
      urls: config.urls,
      schedule: config.schedule,
      auto_scrape: config.auto_scrape,
      created_at: config.created_at
    });
  } catch (error) {
    res.status(500).json({ detail: `Error creating scrape config: ${error}` });
  }
});

// Get scrape configs (Admin or customer owner)
router.get('/config/:customer_id', authenticate, canAccessCustomer, async (req: AuthRequest, res) => {
  try {
    const configs = await ScrapeConfig.findAll({
      where: { customer_id: req.params.customer_id },
      order: [['created_at', 'DESC']]
    });
    
    res.json(configs.map(c => ({
      id: c.id,
      customer_id: c.customer_id,
      urls: c.urls,
      schedule: c.schedule,
      auto_scrape: c.auto_scrape,
      created_at: c.created_at
    })));
  } catch (error) {
    res.status(500).json({ detail: `Error fetching configs: ${error}` });
  }
});

// Manual scrape (Admin or customer owner)
router.post('/manual', authenticate, async (req: AuthRequest, res) => {
  try {
    const { customer_id, urls } = req.body;

    if (!customer_id || !urls || !Array.isArray(urls)) {
      return res.status(400).json({ detail: 'customer_id and urls array are required' });
    }

    // Check authorization
    if (req.user?.role !== 'admin' && req.user?.customer_id !== customer_id) {
      return res.status(403).json({ detail: 'You can only scrape for your own account' });
    }

    const results = [];

    for (const url of urls) {
      try {
        const content = await WebScraper.scrapeUrl(url);

        const scraped = await ScrapedContent.create({
          id: uuidv4(),
          customer_id,
          url,
          content
        });

        // Upsert to Pinecone in background
        if (pineconeService) {
          pineconeService.upsertScrapedContent(
            scraped.id,
            customer_id,
            url,
            content
          ).catch(err => console.error('Pinecone upsert failed:', err));
        }

        results.push({ url, status: 'success', content_length: content.length });
      } catch (error) {
        results.push({ url, status: 'error', error: String(error) });
      }
    }

    res.json({ message: 'Scraping completed', results });
  } catch (error) {
    res.status(500).json({ detail: `Error scraping: ${error}` });
  }
});

// Get scraped content (Admin or customer owner)
router.get('/content/:customer_id', authenticate, canAccessCustomer, async (req: AuthRequest, res) => {
  try {
    const content = await ScrapedContent.findAll({
      where: { customer_id: req.params.customer_id },
      attributes: { exclude: ['content'] },
      order: [['scraped_at', 'DESC']]
    });

    res.json(content.map(c => ({
      id: c.id,
      customer_id: c.customer_id,
      url: c.url,
      scraped_at: c.scraped_at
    })));
  } catch (error) {
    res.status(500).json({ detail: `Error fetching scraped content: ${error}` });
  }
});

// Helper function
async function scrapeUrlsForCustomer(customerId: string) {
  const configs = await ScrapeConfig.findAll({
    where: { customer_id: customerId, auto_scrape: true }
  });

  for (const config of configs) {
    for (const url of config.urls) {
      try {
        const content = await WebScraper.scrapeUrl(url);
        const scraped = await ScrapedContent.create({
          id: uuidv4(),
          customer_id: customerId,
          url,
          content
        });

        // Upsert to Pinecone in background
        if (pineconeService) {
          pineconeService.upsertScrapedContent(
            scraped.id,
            customerId,
            url,
            content
          ).catch(err => console.error('Auto-scrape Pinecone upsert failed:', err));
        }
      } catch (error) {
        console.error(`Auto-scrape failed for ${url}:`, error);
      }
    }
  }
}

export default router;
