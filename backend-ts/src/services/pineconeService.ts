import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

interface VectorMetadata {
  customer_id: string;
  file_id?: string;
  filename?: string;
  url?: string;
  chunk_index: number;
  text: string;
  source_type: 'file' | 'scraped';
}

export class PineconeService {
  private pinecone: Pinecone;
  private openai: OpenAI;
  private indexName: string;

  constructor(apiKey: string, indexName: string, openaiKey: string) {
    this.pinecone = new Pinecone({ apiKey });
    this.openai = new OpenAI({ 
      apiKey: openaiKey,
      baseURL: 'https://api.emergent.sh/openai/v1'
    });
    this.indexName = indexName;
  }

  // Chunk text into smaller pieces (roughly 500 tokens each)
  private chunkText(text: string, chunkSize: number = 2000): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      if ((currentChunk + trimmedSentence).length > chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = trimmedSentence;
        } else {
          // Single sentence is too long, split it
          chunks.push(trimmedSentence.substring(0, chunkSize));
          currentChunk = trimmedSentence.substring(chunkSize);
        }
      } else {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 50); // Filter out very small chunks
  }

  // Generate embeddings for text
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000) // Limit to 8k chars for safety
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  // Upsert knowledge file to Pinecone
  async upsertKnowledgeFile(
    fileId: string,
    customerId: string,
    filename: string,
    content: string
  ): Promise<void> {
    try {
      const chunks = this.chunkText(content);
      const index = this.pinecone.index(this.indexName);

      console.log(`Upserting ${chunks.length} chunks for file ${filename}`);

      // Process chunks in batches of 10 for better performance
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batchChunks = chunks.slice(i, i + batchSize);
        const vectors = await Promise.all(
          batchChunks.map(async (chunk, idx) => {
            const embedding = await this.generateEmbedding(chunk);
            return {
              id: `${fileId}-chunk-${i + idx}`,
              values: embedding,
              metadata: {
                customer_id: customerId,
                file_id: fileId,
                filename,
                chunk_index: i + idx,
                text: chunk,
                source_type: 'file'
              } as VectorMetadata
            };
          })
        );

        await index.upsert(vectors);
      }

      console.log(`Successfully upserted ${chunks.length} chunks for ${filename}`);
    } catch (error) {
      console.error('Error upserting to Pinecone:', error);
      throw error;
    }
  }

  // Upsert scraped content to Pinecone
  async upsertScrapedContent(
    contentId: string,
    customerId: string,
    url: string,
    content: string
  ): Promise<void> {
    try {
      const chunks = this.chunkText(content);
      const index = this.pinecone.index(this.indexName);

      console.log(`Upserting ${chunks.length} chunks for URL ${url}`);

      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batchChunks = chunks.slice(i, i + batchSize);
        const vectors = await Promise.all(
          batchChunks.map(async (chunk, idx) => {
            const embedding = await this.generateEmbedding(chunk);
            return {
              id: `${contentId}-chunk-${i + idx}`,
              values: embedding,
              metadata: {
                customer_id: customerId,
                url,
                chunk_index: i + idx,
                text: chunk,
                source_type: 'scraped'
              } as VectorMetadata
            };
          })
        );

        await index.upsert(vectors);
      }

      console.log(`Successfully upserted ${chunks.length} chunks for ${url}`);
    } catch (error) {
      console.error('Error upserting scraped content to Pinecone:', error);
      throw error;
    }
  }

  // Query Pinecone for relevant context
  async queryRelevantContext(
    customerId: string,
    query: string,
    topK: number = 5
  ): Promise<{ text: string; source: string }[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const index = this.pinecone.index(this.indexName);

      const queryResponse = await index.query({
        vector: queryEmbedding,
        topK,
        filter: { customer_id: customerId },
        includeMetadata: true
      });

      const results = queryResponse.matches.map(match => {
        const metadata = match.metadata as VectorMetadata;
        return {
          text: metadata.text,
          source: metadata.source_type === 'file' 
            ? metadata.filename || 'Unknown file'
            : metadata.url || 'Unknown URL',
          score: match.score || 0
        };
      });

      console.log(`Found ${results.length} relevant chunks for query`);
      return results;
    } catch (error) {
      console.error('Error querying Pinecone:', error);
      throw error;
    }
  }

  // Delete vectors for a specific file
  async deleteKnowledgeFile(fileId: string): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Delete all chunks for this file
      // Note: Pinecone deleteMany with prefix filter
      await index.deleteMany({
        filter: { file_id: fileId }
      });

      console.log(`Deleted vectors for file ${fileId}`);
    } catch (error) {
      console.error('Error deleting from Pinecone:', error);
      throw error;
    }
  }

  // Initialize Pinecone index if it doesn't exist
  async initializeIndex(dimension: number = 1536): Promise<void> {
    try {
      const existingIndexes = await this.pinecone.listIndexes();
      const indexExists = existingIndexes.indexes?.some(
        idx => idx.name === this.indexName
      );

      if (!indexExists) {
        console.log(`Creating Pinecone index: ${this.indexName}`);
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        console.log('Index created successfully');
      } else {
        console.log(`Index ${this.indexName} already exists`);
      }
    } catch (error) {
      console.error('Error initializing Pinecone index:', error);
      // Don't throw, continue even if index creation fails
    }
  }
}
