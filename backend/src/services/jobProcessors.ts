import Queue from 'bull';
import queueService, { FileProcessJob, ScrapeUrlJob, OpenAIChatJob } from './queueService';
import { PineconeService } from './pineconeService';
import { ChatService } from './chatService';
import KnowledgeFile from '../models/KnowledgeFile';
import ScrapedContent from '../models/ScrapedContent';
import Message from '../models/Message';
import Conversation from '../models/Conversation';
import cacheService from './cacheService';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';

// Initialize services
const pineconeService = new PineconeService(
  process.env.PINECONE_API_KEY || '',
  process.env.PINECONE_INDEX_NAME || 'kbaseai'
);

const chatService = new ChatService(
  process.env.OPENAI_API_KEY || '',
  process.env.PINECONE_API_KEY,
  process.env.PINECONE_INDEX_NAME
);

class JobProcessors {
  startProcessors() {
    this.startFileProcessor();
    this.startScrapeProcessor();
    this.startOpenAIProcessor();
    console.log('✓ Job processors started');
  }

  // File processing worker
  private startFileProcessor() {
    const queue = queueService.getFileProcessQueue();

    queue.process(async (job: Queue.Job<FileProcessJob>) => {
      const { fileId, customerId, filePath, filename } = job.data;
      
      console.log(`Processing file: ${filename} for customer: ${customerId}`);
      
      try {
        // Update status to processing
        await KnowledgeFile.update(
          { status: 'processing' },
          { where: { id: fileId } }
        );

        job.progress(10);

        // Read file content
        const content = await fs.readFile(filePath, 'utf-8');
        job.progress(30);

        // Store in Pinecone
        await pineconeService.uploadFile(fileId, content, customerId, filename);
        job.progress(80);

        // Update database
        await KnowledgeFile.update(
          {
            status: 'completed',
            content: content.substring(0, 10000), // Store first 10k chars
          },
          { where: { id: fileId } }
        );

        job.progress(100);

        // Invalidate cache
        await cacheService.invalidateKnowledgeFiles(customerId);
        await cacheService.invalidateStats(customerId);

        console.log(`✓ File processed: ${filename}`);
        return { success: true, fileId };
      } catch (error: any) {
        console.error(`✗ File processing failed: ${error.message}`);
        
        await KnowledgeFile.update(
          { status: 'failed' },
          { where: { id: fileId } }
        );

        throw error;
      }
    });

    // Event handlers
    queue.on('completed', (job) => {
      console.log(`File job ${job.id} completed`);
    });

    queue.on('failed', (job, err) => {
      console.error(`File job ${job?.id} failed:`, err.message);
    });
  }

  // Web scraping worker
  private startScrapeProcessor() {
    const queue = queueService.getScrapeQueue();

    queue.process(async (job: Queue.Job<ScrapeUrlJob>) => {
      const { urlId, customerId, url } = job.data;
      
      console.log(`Scraping URL: ${url} for customer: ${customerId}`);
      
      try {
        // Update status
        await ScrapedContent.update(
          { status: 'processing' },
          { where: { id: urlId } }
        );

        job.progress(20);

        // Fetch URL
        const response = await axios.get(url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; KbaseAI/1.0; +https://kbaseai.com)',
          },
        });

        job.progress(50);

        // Parse content
        const $ = cheerio.load(response.data);
        $('script, style, nav, header, footer').remove();
        const content = $('body').text().trim().replace(/\s+/g, ' ');

        job.progress(70);

        // Store in Pinecone
        await pineconeService.uploadScrapedContent(urlId, content, customerId, url);

        job.progress(90);

        // Update database
        await ScrapedContent.update(
          {
            status: 'completed',
            content: content.substring(0, 10000),
          },
          { where: { id: urlId } }
        );

        job.progress(100);

        // Invalidate cache
        await cacheService.invalidateAllCustomerCache(customerId);

        console.log(`✓ URL scraped: ${url}`);
        return { success: true, urlId };
      } catch (error: any) {
        console.error(`✗ Scraping failed: ${error.message}`);
        
        await ScrapedContent.update(
          { status: 'failed' },
          { where: { id: urlId } }
        );

        throw error;
      }
    });

    queue.on('completed', (job) => {
      console.log(`Scrape job ${job.id} completed`);
    });

    queue.on('failed', (job, err) => {
      console.error(`Scrape job ${job?.id} failed:`, err.message);
    });
  }

  // OpenAI chat worker (with rate limiting and caching)
  private startOpenAIProcessor() {
    const queue = queueService.getOpenAIQueue();

    queue.process(async (job: Queue.Job<OpenAIChatJob>) => {
      const { customerId, sessionId, message, context } = job.data;
      
      console.log(`Processing chat for session: ${sessionId}`);
      
      try {
        job.progress(10);

        // Check cache first for existing conversation
        let conversation = await cacheService.getCachedConversation(sessionId);
        
        if (!conversation) {
          // Not in cache, check database
          conversation = await Conversation.findOne({
            where: { session_id: sessionId }
          });

          // If found in DB, cache it
          if (conversation) {
            await cacheService.setCachedConversation(sessionId, conversation.toJSON());
          }
        } else {
          console.log(`✓ Conversation cache hit for session: ${sessionId}`);
        }

        job.progress(30);

        // Call OpenAI with context
        const { response, sources } = await chatService.chat(customerId, message, sessionId);

        job.progress(70);

        // If conversation doesn't exist, create it
        if (!conversation) {
          const newConversation = await Conversation.create({
            id: uuidv4(),
            customer_id: customerId,
            session_id: sessionId,
          });
          
          conversation = newConversation;
          
          // Cache the new conversation
          await cacheService.setCachedConversation(sessionId, newConversation.toJSON());
          console.log(`✓ New conversation created and cached: ${sessionId}`);
        }

        job.progress(80);

        // Get conversation ID (handle both cached and DB objects)
        const conversationId = typeof conversation === 'object' && conversation.id 
          ? conversation.id 
          : (conversation as any).id;

        // Save user message
        await Message.create({
          id: uuidv4(),
          conversation_id: conversationId,
          content: message,
          sender: 'user',
        });

        // Save bot response
        await Message.create({
          id: uuidv4(),
          conversation_id: conversationId,
          content: response,
          sender: 'bot',
        });

        job.progress(95);

        // Invalidate stats cache (conversation count changed)
        await cacheService.invalidateStats(customerId);

        job.progress(100);

        console.log(`✓ Chat processed for session: ${sessionId}`);
        return { success: true, response, sources, sessionId };
      } catch (error: any) {
        console.error(`✗ Chat processing failed: ${error.message}`);
        
        // Invalidate conversation cache on error to force fresh lookup
        await cacheService.invalidateConversation(sessionId);
        
        throw error;
      }
    });

    queue.on('completed', (job) => {
      console.log(`Chat job ${job.id} completed`);
    });

    queue.on('failed', (job, err) => {
      console.error(`Chat job ${job?.id} failed:`, err.message);
    });
  }
}

const jobProcessors = new JobProcessors();

export default jobProcessors;
