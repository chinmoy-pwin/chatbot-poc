import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { ChatService } from '../services/chatService';
import { webhookRateLimitMiddleware } from '../middleware/rateLimit';
import queueService from '../services/queueService';

const router = Router();

// Apply webhook rate limiting (300 requests per minute per customer)
router.use(webhookRateLimitMiddleware(300, 60));

const chatService = new ChatService(
  process.env.OPENAI_API_KEY || '',
  process.env.PINECONE_API_KEY,
  process.env.PINECONE_INDEX_NAME
);

// Chat endpoint with queuing
router.post('/', async (req, res) => {
  try {
    const { customer_id, message, session_id } = req.body;

    if (!customer_id || !message) {
      return res.status(400).json({ detail: 'customer_id and message are required' });
    }

    const sessionId = session_id || uuidv4();

    // Add to queue for rate-limited processing
    const job = await queueService.addOpenAIChatJob({
      customerId: customer_id,
      sessionId,
      message,
      context: [],
    }, 5); // Normal priority

    // Poll for completion (max 25 seconds)
    const MAX_WAIT = 25000;
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_WAIT) {
      const state = await job.getState();
      
      if (state === 'completed') {
        const result = job.returnvalue;
        return res.json({
          response: result.response,
          session_id: sessionId,
          sources: result.sources || []
        });
      }
      
      if (state === 'failed') {
        throw new Error(job.failedReason || 'Processing failed');
      }

      await new Promise(r => setTimeout(r, 500));
    }

    // Timeout
    res.status(202).json({
      response: 'Processing your message...',
      session_id: sessionId,
      job_id: job.id,
      status: 'processing'
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ detail: `Error processing chat: ${error}` });
  }
});

// Webhook chat endpoint (legacy compatibility)
router.post('/webhook', async (req, res) => {
  try {
    const { customer_id, message, session_id, user_id } = req.body;

    if (!customer_id || !message) {
      return res.status(400).json({ detail: 'customer_id and message are required' });
    }

    const sessionId = session_id || user_id || uuidv4();

    // Add to queue
    const job = await queueService.addOpenAIChatJob({
      customerId: customer_id,
      sessionId,
      message,
      context: [],
    }, 5);

    // Poll for completion
    const MAX_WAIT = 25000;
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_WAIT) {
      const state = await job.getState();
      
      if (state === 'completed') {
        const result = job.returnvalue;
        return res.json({
          response: result.response,
          session_id: sessionId,
          sources: result.sources || []
        });
      }
      
      if (state === 'failed') {
        throw new Error(job.failedReason || 'Processing failed');
      }

      await new Promise(r => setTimeout(r, 500));
    }

    res.status(202).json({
      response: 'Processing your message...',
      session_id: sessionId,
      job_id: job.id,
      status: 'processing'
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ detail: `Error processing chat: ${error}` });
  }
});

    if (!conversation) {
      const conversationId = uuidv4();
      conversation = await Conversation.create({
        id: conversationId,
        customer_id,
        session_id: sessionId
      });
    }

    const conversationId = conversation.get('id') as string;
    if (!conversationId) {
      throw new Error('Failed to get conversation ID');
    }

    // Save messages individually to avoid bulkCreate issues
    await Message.create({
      id: uuidv4(),
      conversation_id: conversationId,
      role: 'user',
      content: message
    });

    await Message.create({
      id: uuidv4(),
      conversation_id: conversationId,
      role: 'assistant',
      content: response
    });

    res.json({
      response,
      session_id: sessionId,
      sources
    });
  } catch (error) {
    console.error('Webhook chat error:', error);
    res.status(500).json({ detail: `Error processing webhook chat: ${error}` });
  }
});

export default router;