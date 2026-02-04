import OpenAI from 'openai';
import { KnowledgeFile } from '../models/KnowledgeFile';
import { ScrapedContent } from '../models/ScrapedContent';

export class ChatService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.emergent.sh/openai/v1'
    });
  }

  async getKnowledgeContext(customerId: string, query: string): Promise<{ context: string; sources: string[] }> {
    // Get KB files
    const kbFiles = await KnowledgeFile.find({ customer_id: customerId }).limit(5).lean();

    // Get scraped content
    const scrapedContent = await ScrapedContent.find({ customer_id: customerId }).limit(5).lean();

    const allContent: string[] = [];
    const sources: string[] = [];

    kbFiles.forEach(kb => {
      allContent.push(`From ${kb.filename}: ${kb.content.substring(0, 1000)}`);
      sources.push(kb.filename);
    });

    scrapedContent.forEach(sc => {
      allContent.push(`From ${sc.url}: ${sc.content.substring(0, 1000)}`);
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