import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
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

    // Find or create conversation
    let conversation = await Conversation.findOne({
      where: { session_id: sessionId }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        id: uuidv4(),
        customer_id,
        session_id: sessionId
      });
    }

    // Save messages
    await Message.bulkCreate([
      {
        id: uuidv4(),
        conversation_id: conversation.id,
        role: 'user',
        content: message
      },
      {
        id: uuidv4(),
        conversation_id: conversation.id,
        role: 'assistant',
        content: response
      }
    ]);

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

    // Find or create conversation
    let conversation = await Conversation.findOne({
      where: { session_id: sessionId }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        id: uuidv4(),
        customer_id,
        session_id: sessionId
      });
    }

    // Save messages
    await Message.bulkCreate([
      {
        id: uuidv4(),
        conversation_id: conversation.id,
        role: 'user',
        content: message
      },
      {
        id: uuidv4(),
        conversation_id: conversation.id,
        role: 'assistant',
        content: response
      }
    ]);

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
