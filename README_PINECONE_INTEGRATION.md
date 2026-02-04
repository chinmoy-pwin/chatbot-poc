# Pinecone Vector Database Integration

## Overview
KbaseAI now uses Pinecone for semantic search and retrieval of knowledge base content. This provides much better context retrieval compared to simple text matching, enabling the AI to find relevant information based on meaning rather than exact keywords.

## How It Works

### 1. **Text Chunking**
When files are uploaded or websites are scraped:
- Text is split into chunks of ~2000 characters
- Chunks are created at sentence boundaries for coherence
- Very small chunks (<50 chars) are filtered out

### 2. **Embedding Generation**
- Each chunk is converted to a vector embedding using OpenAI's `text-embedding-3-small` model
- Embeddings capture semantic meaning in 1536 dimensions
- Same model is used for both storage and query

### 3. **Vector Storage**
Chunks are stored in Pinecone with metadata:
```typescript
{
  id: "file-id-chunk-0",
  values: [0.123, -0.456, ...], // 1536-dim vector
  metadata: {
    customer_id: "customer-123",
    file_id: "file-456" | undefined,
    filename: "document.pdf" | undefined,
    url: "https://example.com" | undefined,
    chunk_index: 0,
    text: "Original chunk text...",
    source_type: "file" | "scraped"
  }
}
```

### 4. **Semantic Search**
When a user asks a question:
- Query is converted to embedding
- Pinecone finds top-K most similar chunks (cosine similarity)
- Results are filtered by `customer_id` for multi-tenancy
- Retrieved chunks are used as context for GPT-5.2

## Setup

### 1. Get Pinecone API Key
1. Sign up at https://www.pinecone.io/
2. Create a new project
3. Get your API key from the dashboard
4. Choose a serverless region (default: us-east-1)

### 2. Configure Environment
Add to `/app/backend-ts/.env`:
```env
PINECONE_API_KEY=your_actual_pinecone_api_key_here
PINECONE_INDEX_NAME=kbaseai
```

### 3. Index Creation
The index is automatically created on first startup:
- Name: `kbaseai` (or your configured name)
- Dimension: 1536 (for text-embedding-3-small)
- Metric: cosine similarity
- Cloud: AWS Serverless (us-east-1)

## API Flow

### File Upload
```
1. User uploads file
2. Extract text from file
3. Save to MongoDB
4. [Background] Chunk text → Generate embeddings → Upsert to Pinecone
5. Return success to user
```

### Web Scraping
```
1. Scrape website content
2. Save to MongoDB
3. [Background] Chunk text → Generate embeddings → Upsert to Pinecone
4. Return scraping results
```

### Chat Query
```
1. User sends message
2. Generate embedding for query
3. Search Pinecone for top 5 relevant chunks (filtered by customer_id)
4. Build context from retrieved chunks
5. Send context + query to GPT-5.2
6. Return AI response with sources
```

### File Deletion
```
1. Delete file from MongoDB
2. [Background] Delete all related vectors from Pinecone
3. Return success
```

## Fallback Mechanism

If Pinecone is not configured or fails:
- System automatically falls back to simple MongoDB retrieval
- Returns first 5 files/scraped pages
- Truncates content to 1000 chars per source
- Still functional but less accurate

## Configuration Options

### Chunk Size
Adjust in `PineconeService`:
```typescript
private chunkText(text: string, chunkSize: number = 2000): string[]
```

### Top-K Results
Adjust in chat query:
```typescript
await this.pineconeService.queryRelevantContext(customerId, query, 5)
```

### Batch Size
For upsert performance:
```typescript
const batchSize = 10; // Process 10 chunks at a time
```

## Performance Considerations

### Embedding Generation
- Cost: ~$0.0001 per 1K tokens
- Speed: ~100ms per embedding
- Batching: 10 chunks processed in parallel

### Pinecone Operations
- Upsert: Async, doesn't block file upload response
- Query: ~50-100ms per search
- Delete: Async, doesn't block file deletion response

### Token Limits
- Max input for embedding: 8000 chars (safety limit)
- Typical chunk: 2000 chars (~500 tokens)
- Embedding model max: 8191 tokens

## Monitoring

### Logs
Check for Pinecone operations:
```bash
tail -f /var/log/supervisor/backend.out.log | grep -i pinecone
```

Common log messages:
- `Upserting X chunks for file Y`
- `Successfully upserted X chunks`
- `Found X relevant chunks for query`
- `Pinecone query failed, using fallback`

### Pinecone Dashboard
Monitor at https://app.pinecone.io/:
- Index usage and storage
- Query latency
- Vector count per namespace
- API usage and billing

## Cost Estimation

### OpenAI Embeddings
- Model: text-embedding-3-small
- Cost: $0.02 per 1M tokens
- Example: 100 pages (50K words) = ~67K tokens = $0.0013

### Pinecone Storage
- Serverless: Pay per usage
- Storage: ~$0.40 per GB per month
- Example: 10,000 chunks = ~60 MB = ~$0.024/month

### Query Costs
- Pinecone: $0.004 per 1,000 queries (serverless)
- OpenAI: $0.0001 per query embedding

## Advantages Over Simple Retrieval

1. **Semantic Understanding**: Finds relevant content even with different wording
2. **Better Accuracy**: Returns most relevant chunks, not just recent files
3. **Scalability**: Efficient for large knowledge bases
4. **Multi-language**: Embeddings work across languages
5. **Context Quality**: Provides focused, relevant chunks instead of entire documents

## Example Query Flow

**User Query**: "What are the benefits of our product?"

**Simple Retrieval** (old method):
- Returns: First 5 files (truncated)
- May miss relevant info in later files
- No ranking by relevance

**Pinecone Retrieval** (new method):
- Embedding: [0.23, -0.45, 0.78, ...]
- Search: Find 5 most similar chunks
- Results:
  1. "Our product offers 24/7 support..." (from benefits.pdf, score: 0.92)
  2. "Key advantages include..." (from features.md, score: 0.89)
  3. "Customer testimonials show..." (from reviews.txt, score: 0.85)
  4. "Compared to competitors..." (from comparison.docx, score: 0.82)
  5. "Pricing benefits include..." (from pricing.pdf, score: 0.80)
- Context: Highly relevant, semantically matched content
- AI Response: Accurate, comprehensive answer

## Troubleshooting

### Index Creation Fails
```
Error: Index already exists with different configuration
Solution: Delete old index or use different name
```

### Embedding Generation Fails
```
Error: OpenAI API key invalid
Solution: Check OPENAI_API_KEY in .env
```

### Upsert Fails
```
Error: Pinecone API key invalid
Solution: Check PINECONE_API_KEY in .env
```

### No Results Found
```
Issue: Query returns empty results
Solution: 
- Check customer_id filter
- Verify vectors were upserted
- Check Pinecone dashboard for vector count
```

## Migration from MongoDB-only

Existing data in MongoDB is not automatically migrated to Pinecone. Two options:

### Option 1: Gradual Migration
- New uploads automatically go to Pinecone
- Old data uses fallback retrieval
- Re-upload important files to get Pinecone benefits

### Option 2: Batch Migration
Create a migration script to:
1. Fetch all knowledge files from MongoDB
2. Process each file through Pinecone upsert
3. Same for scraped content

Example migration script:
```typescript
async function migrateExistingData() {
  const files = await KnowledgeFile.find();
  for (const file of files) {
    await pineconeService.upsertKnowledgeFile(
      file.id,
      file.customer_id,
      file.filename,
      file.content
    );
  }
}
```

## Best Practices

1. **Index Naming**: Use descriptive names (e.g., `kbaseai-production`, `kbaseai-staging`)
2. **Monitoring**: Set up alerts for failed upserts
3. **Costs**: Monitor Pinecone usage dashboard regularly
4. **Cleanup**: Delete vectors when files are deleted
5. **Testing**: Test with various query types to validate relevance
6. **Chunking**: Adjust chunk size based on your content type
7. **Top-K**: Experiment with 3-10 results for optimal context

## Future Enhancements

- [ ] Hybrid search (combine keyword + semantic)
- [ ] Reranking with cross-encoder models
- [ ] Custom metadata filtering (date ranges, file types)
- [ ] Multi-vector search (different embedding models)
- [ ] Incremental updates (update vectors when files change)
- [ ] Analytics (most queried topics, unused content)
