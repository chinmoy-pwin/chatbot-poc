import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Conversation } from '../models/Conversation';
import { ChatService } from '../services/chatService';

const router = Router();
const chatService = new ChatService(
  process.env.OPENAI_API_KEY || '',
  process.env.PINECONE_API_KEY,
  process.env.PINECONE_INDEX_NAME
);

// Chat endpoint
router.post('/', async (req, res) => {
  try {
    const { customer_id, message, session_id } = req.body;

    if (!customer_id || !message) {
      return res.status(400).json({ detail: 'customer_id and message are required' });
    }

    const sessionId = session_id || uuidv4();

    const { response, sources } = await chatService.chat(customer_id, message, sessionId);

    // Store conversation
    await Conversation.create({
      customer_id,
      session_id: sessionId,
      messages: [
        { role: 'user', content: message, timestamp: new Date() },
        { role: 'assistant', content: response, timestamp: new Date() }
      ]
    });

    res.json({
      response,
      session_id: sessionId,
      sources
    });
  } catch (error) {
    res.status(500).json({ detail: `Error processing chat: ${error}` });
  }
});

// Webhook chat endpoint
router.post('/webhook', async (req, res) => {
  try {
    const { customer_id, message, user_id } = req.body;

    if (!customer_id || !message) {
      return res.status(400).json({ detail: 'customer_id and message are required' });
    }

    const sessionId = user_id || uuidv4();

    const { response, sources } = await chatService.chat(customer_id, message, sessionId);

    // Store conversation
    await Conversation.create({
      customer_id,
      session_id: sessionId,
      messages: [
        { role: 'user', content: message, timestamp: new Date() },
        { role: 'assistant', content: response, timestamp: new Date() }
      ]
    });

    res.json({
      response,
      session_id: sessionId,
      sources
    });
  } catch (error) {
    res.status(500).json({ detail: `Error processing webhook chat: ${error}` });
  }
});

export default router;