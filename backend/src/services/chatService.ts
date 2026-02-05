import OpenAI from 'openai';
import { PineconeService } from './pineconeService';

export class ChatService {
  private openai: OpenAI;
  private pineconeService: PineconeService | null;

  constructor(apiKey: string, pineconeApiKey?: string, pineconeIndex?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.emergent.sh/openai/v1'
    });

    // Initialize Pinecone if credentials provided
    if (pineconeApiKey && pineconeIndex) {
      this.pineconeService = new PineconeService(pineconeApiKey, pineconeIndex, apiKey);
      // Initialize index in background
      this.pineconeService.initializeIndex().catch(console.error);
    } else {
      this.pineconeService = null;
      console.warn('Pinecone not configured, using fallback context retrieval');
    }
  }

  async getKnowledgeContext(customerId: string, query: string): Promise<{ context: string; sources: string[] }> {
    // Use Pinecone if available
    if (this.pineconeService) {
      try {
        const results = await this.pineconeService.queryRelevantContext(customerId, query, 5);
        
        const context = results.map((r, idx) => 
          `[${idx + 1}] From ${r.source}:\n${r.text}`
        ).join('\n\n');

        const sources = [...new Set(results.map(r => r.source))];

        return { context, sources };
      } catch (error) {
        console.error('Pinecone query failed, using fallback:', error);
        // Fall through to fallback method
      }
    }

    // Fallback: Use simple MySQL retrieval
    const KnowledgeFile = (await import('../models/KnowledgeFile')).default;
    const ScrapedContent = (await import('../models/ScrapedContent')).default;

    const kbFiles = await KnowledgeFile.findAll({
      where: { customer_id: customerId },
      attributes: ['filename', 'content'],
      limit: 5,
      order: [['uploaded_at', 'DESC']]
    });

    const scrapedContent = await ScrapedContent.findAll({
      where: { customer_id: customerId },
      attributes: ['url', 'content'],
      limit: 5,
      order: [['scraped_at', 'DESC']]
    });

    const allContent: string[] = [];
    const sources: string[] = [];

    kbFiles.forEach(kb => {
      const content = kb.content || '';
      allContent.push(`From ${kb.filename}: ${content.substring(0, 1000)}`);
      sources.push(kb.filename);
    });

    scrapedContent.forEach(sc => {
      const content = sc.content || '';
      allContent.push(`From ${sc.url}: ${content.substring(0, 1000)}`);
      sources.push(sc.url);
    });

    const context = allContent.slice(0, 5).join('\n\n');
    return { context, sources: sources.slice(0, 5) };
  }

  async chat(customerId: string, message: string, sessionId: string): Promise<{ response: string; sources: string[] }> {
    const { context, sources } = await this.getKnowledgeContext(customerId, message);

    const systemMessage = `You are a helpful AI assistant. Answer questions based on the following knowledge base context.
If the answer is not in the context, say so politely.

Context:
${context}`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-5.2',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return { response, sources };
  }
}