# KbaseAI - Complete System Documentation

## System Overview
KbaseAI is a multi-tenant AI chatbot platform with semantic search powered by Pinecone vector database. Built with TypeScript backend (Node.js/Express) and React frontend.

## Architecture

### Backend Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Vector DB**: Pinecone (for semantic search)
- **LLM**: OpenAI GPT-5.2 (via Emergent integration)
- **Voice**: ElevenLabs (TTS/STT)
- **File Processing**: pdf-parse, mammoth, csv-parse
- **Web Scraping**: Cheerio + Axios
- **Scheduling**: node-cron

### Frontend Stack
- **Framework**: React 19
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **HTTP Client**: Axios
- **File Upload**: react-dropzone
- **Design Theme**: Organic & Earthy (KbaseAI brand)

### Infrastructure
- **Port**: Backend 8001, Frontend 3000
- **Process Manager**: Supervisor
- **Hot Reload**: tsx watch (backend), React dev server (frontend)
- **Database**: MongoDB (local instance)

## Core Features

### 1. Customer Management
- Create and manage multiple customers
- Isolated knowledge bases per customer
- Webhook URL configuration
- Customer statistics dashboard

### 2. Knowledge Base with Vector Search
- **File Upload**: PDF, DOCX, TXT, JSON, CSV, MD
- **Text Extraction**: Automatic for all formats
- **Chunking**: ~2000 chars per chunk with sentence boundaries
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Storage**: MongoDB (full text) + Pinecone (vectors)
- **Search**: Semantic similarity via Pinecone cosine distance

### 3. Web Scraping
- **Manual Trigger**: Scrape URLs on demand
- **Auto Scraping**: Cron-scheduled periodic scraping
- **Processing**: HTML parsing, text extraction, vector indexing
- **Storage**: MongoDB + Pinecone

### 4. AI Chat with RAG
- **Retrieval**: Top-5 semantic search via Pinecone
- **Generation**: GPT-5.2 with retrieved context
- **Sources**: Shows which files/URLs were used
- **Sessions**: Session-based conversation tracking
- **Fallback**: MongoDB retrieval if Pinecone unavailable

### 5. Voice Features
- **TTS**: ElevenLabs text-to-speech
- **STT**: Speech-to-text (placeholder, needs API key)
- **Voices**: Multiple voice options available
- **Integration**: Seamless with chat interface

### 6. Webhook API
- **Endpoint**: `/api/webhook/chat`
- **Method**: POST with JSON body
- **Authentication**: Customer ID based
- **Response**: AI answer with sources
- **Use Case**: Embed chatbot in customer websites

## API Endpoints

### Customer Management
```
POST   /api/customers              Create customer
GET    /api/customers              List all customers
GET    /api/customers/:id          Get customer by ID
```

### Knowledge Base
```
POST   /api/knowledge/upload       Upload file (multipart/form-data)
GET    /api/knowledge/:customer_id List files for customer
DELETE /api/knowledge/:file_id     Delete file and vectors
```

### Web Scraping
```
POST   /api/scrape/config          Save scraping configuration
GET    /api/scrape/config/:id      Get scraping configs
POST   /api/scrape/manual          Manual scrape URLs
GET    /api/scrape/content/:id     Get scraped content
```

### Chat
```
POST   /api/chat                   Chat with AI (with KB context)
POST   /api/webhook/chat           Webhook endpoint (same functionality)
```

### Voice
```
POST   /api/voice/tts              Text-to-speech
POST   /api/voice/stt              Speech-to-text
GET    /api/voice/voices           List available voices
```

### Stats
```
GET    /api/stats/:customer_id     Get customer statistics
```

## Data Flow

### File Upload Flow
```
1. User uploads file via frontend
2. Multer receives file buffer
3. FileProcessor extracts text
4. Save to MongoDB (full document)
5. Background: Chunk text → Generate embeddings → Upsert to Pinecone
6. Return success immediately (Pinecone async)
```

### Chat Query Flow
```
1. User sends message
2. Generate query embedding (OpenAI)
3. Search Pinecone for top-5 chunks (filtered by customer_id)
4. Build context from retrieved chunks
5. Send [system_message + context + user_query] to GPT-5.2
6. Save conversation to MongoDB
7. Return AI response with sources
```

### Web Scraping Flow
```
1. User configures URLs and schedule
2. Save config to MongoDB
3. If auto_scrape enabled: Schedule cron job
4. On trigger: Scrape URLs → Extract text → Save to MongoDB
5. Background: Chunk text → Generate embeddings → Upsert to Pinecone
```

## Environment Configuration

### Backend (.env)
```env
# Database
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database

# API Keys
OPENAI_API_KEY=sk-emergent-99855F400Bb6d550eD
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here

# Pinecone Config
PINECONE_INDEX_NAME=kbaseai

# Server
PORT=8001
CORS_ORIGINS=*
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=https://knowledgebot-11.preview.emergentagent.com
```

## Development

### Backend
```bash
cd /app/backend-ts
yarn install          # Install dependencies
yarn dev             # Start dev server (hot reload)
yarn build           # Build for production
yarn start           # Run production build
```

### Frontend
```bash
cd /app/frontend
yarn install         # Install dependencies
yarn start           # Start dev server
yarn build           # Build for production
```

### Supervisor Commands
```bash
sudo supervisorctl status              # Check all services
sudo supervisorctl restart backend     # Restart backend
sudo supervisorctl restart frontend    # Restart frontend
sudo supervisorctl tail backend        # View backend logs
```

## Testing

### Backend API Tests
```bash
# Test root endpoint
curl http://localhost:8001/api/

# Test customer creation
curl -X POST http://localhost:8001/api/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Customer"}'

# Test file upload
curl -X POST http://localhost:8001/api/knowledge/upload \
  -F "file=@test.pdf" \
  -F "customer_id=customer-123"

# Test chat
curl -X POST http://localhost:8001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id":"customer-123",
    "message":"What are the main features?",
    "session_id":"test-session"
  }'
```

### Frontend Testing
1. Navigate to http://localhost:3000
2. Create a customer
3. Upload knowledge files
4. Configure web scraping
5. Test chat interface
6. Verify voice features

## Deployment Checklist

### Pre-Deployment
- [ ] Add real ElevenLabs API key (if using voice)
- [ ] Add real Pinecone API key
- [ ] Create Pinecone index (auto-created on first run)
- [ ] Review CORS settings for production domain
- [ ] Test all API endpoints
- [ ] Verify file upload limits
- [ ] Check MongoDB connection string
- [ ] Review logs for errors

### Production Settings
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS
- [ ] Configure rate limiting
- [ ] Set up monitoring (Pinecone dashboard)
- [ ] Configure backup strategy
- [ ] Set up error tracking (Sentry)
- [ ] Review API key security

## Monitoring

### Logs
```bash
# Backend logs
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/backend.err.log

# Frontend logs
tail -f /var/log/supervisor/frontend.out.log

# MongoDB logs
tail -f /var/log/mongodb.out.log

# Filter for Pinecone operations
tail -f /var/log/supervisor/backend.out.log | grep -i pinecone
```

### Health Checks
```bash
# API health
curl http://localhost:8001/api/

# MongoDB connection
mongo --eval "db.adminCommand('ping')"

# Check running processes
sudo supervisorctl status
```

### Metrics to Monitor
- API response times
- File upload success rate
- Embedding generation time
- Pinecone query latency
- MongoDB query performance
- Memory usage
- Disk space (for MongoDB)

## Security Considerations

### Current Setup
- No authentication on API endpoints (implement JWT)
- No rate limiting (add express-rate-limit)
- CORS set to `*` (restrict to specific domains)
- No input validation (add express-validator)
- API keys in .env (consider secrets manager)

### Recommended Additions
1. **Authentication**: JWT tokens for API access
2. **Authorization**: Role-based access control
3. **Rate Limiting**: Prevent abuse
4. **Input Validation**: Sanitize all inputs
5. **File Upload Limits**: Restrict file size/type
6. **HTTPS**: Use SSL certificates
7. **API Key Rotation**: Regular key updates

## Cost Estimation

### Monthly Costs (1000 users, 10K queries/month)

**OpenAI**
- Embeddings: 10K files × 5KB avg = 50MB = ~12.5K tokens = $0.25
- Chat: 10K queries × 500 tokens avg = 5M tokens = $10
- Total: ~$10.25/month

**Pinecone**
- Storage: 100K vectors × 1536 dim × 4 bytes = 615MB = $0.25/month
- Queries: 10K queries = $0.04
- Total: ~$0.29/month

**ElevenLabs** (if voice enabled)
- TTS: ~$0.30 per 1K characters
- Depends on usage

**Total Estimate**: ~$10-15/month for basic usage

## Troubleshooting

### Backend Won't Start
```bash
# Check logs
tail -n 50 /var/log/supervisor/backend.err.log

# Common issues
- MongoDB not running: sudo supervisorctl start mongodb
- Port 8001 in use: lsof -i :8001
- Missing dependencies: cd /app/backend-ts && yarn install
```

### Frontend Won't Load
```bash
# Check logs
tail -n 50 /var/log/supervisor/frontend.out.log

# Common issues
- Compilation errors: Check for syntax errors
- Backend not responding: Test API with curl
- CORS errors: Check backend CORS settings
```

### Pinecone Not Working
```bash
# Check API key
echo $PINECONE_API_KEY

# Check logs for errors
grep -i "pinecone" /var/log/supervisor/backend.out.log

# Fallback behavior
- System will use MongoDB retrieval if Pinecone fails
- No error thrown to user
```

### Chat Not Returning Context
```bash
# Check if vectors exist
- Verify files were uploaded
- Check Pinecone dashboard for vector count
- Test query directly in Pinecone console

# Check customer_id filter
- Ensure customer_id matches in query
```

## Documentation Files

- `/app/README_KBASEAI.md` - Original product documentation
- `/app/README_TYPESCRIPT_MIGRATION.md` - Backend migration details
- `/app/README_PINECONE_INTEGRATION.md` - Vector DB integration guide
- `/app/README_COMPLETE_SYSTEM.md` - This comprehensive guide

## Support & Resources

### Internal Documentation
- API endpoints: Built-in API docs page
- Code comments: Inline TypeScript documentation
- Type definitions: Full TypeScript interfaces

### External Resources
- Pinecone Docs: https://docs.pinecone.io/
- OpenAI Embeddings: https://platform.openai.com/docs/guides/embeddings
- ElevenLabs: https://elevenlabs.io/docs
- MongoDB: https://www.mongodb.com/docs/
- Express.js: https://expressjs.com/

## Future Roadmap

### Short Term
- [ ] Add unit tests (Jest)
- [ ] Implement API authentication
- [ ] Add request validation
- [ ] Enhance error handling
- [ ] Add API documentation (Swagger)

### Medium Term
- [ ] Hybrid search (keyword + semantic)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Conversation history export
- [ ] Custom model fine-tuning

### Long Term
- [ ] Multi-modal support (images, audio)
- [ ] Real-time collaboration
- [ ] Advanced RAG techniques (HyDE, RAG-Fusion)
- [ ] Custom embedding models
- [ ] Enterprise features (SSO, audit logs)
