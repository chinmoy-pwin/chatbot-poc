# KbaseAI - AI Chatbot Platform

## Overview
KbaseAI is a production-ready, multi-tenant AI chatbot platform with semantic search powered by Pinecone vector database. Built with TypeScript backend (Node.js/Express) and React frontend.

## Tech Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: MySQL (MariaDB) with Sequelize ORM
- **Vector DB**: Pinecone (semantic search)
- **LLM**: OpenAI GPT-5.2
- **Voice**: ElevenLabs (TTS/STT)
- **File Processing**: pdf-parse, mammoth, csv-parse
- **Web Scraping**: Cheerio + Axios
- **Scheduling**: node-cron

### Frontend
- **Framework**: React 19
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **HTTP Client**: Axios
- **Design**: Organic & Earthy theme (KbaseAI brand)

## Project Structure

```
/app/
├── backend/                  # TypeScript backend
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── models/          # Sequelize models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic (Chat, Pinecone, Voice)
│   │   ├── utils/           # Utilities (File processor, Web scraper)
│   │   └── server.ts        # Main application
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── App.js
│   │   └── index.css
│   ├── public/
│   └── package.json
└── scripts/                  # Database scripts
    ├── mysql_schema.sql     # Database schema
    └── README.md            # Scripts documentation
```

## Core Features

### 1. Multi-Tenant Customer Management
- Create and manage multiple customers
- Isolated knowledge bases per customer
- Customer-specific webhook URLs
- Statistics dashboard

### 2. Knowledge Base with Vector Search
- **File Upload**: PDF, DOCX, TXT, JSON, CSV, MD
- **Text Extraction**: Automatic for all formats
- **Vector Indexing**: Semantic embeddings via OpenAI
- **Storage**: MySQL (full text) + Pinecone (vectors)
- **Search**: Semantic similarity with top-K retrieval

### 3. Web Scraping
- Manual trigger for immediate scraping
- Automatic periodic scraping (cron-based)
- HTML parsing and text extraction
- Vector indexing of scraped content

### 4. AI Chat with RAG (Retrieval-Augmented Generation)
- Semantic search via Pinecone (top-5 relevant chunks)
- GPT-5.2 response generation with context
- Source attribution (shows which files/URLs used)
- Session-based conversation tracking
- Graceful fallback to MySQL if Pinecone unavailable

### 5. Voice Features (ElevenLabs)
- Text-to-Speech (TTS) for bot responses
- Speech-to-Text (STT) for voice input
- Multiple voice options
- Seamless integration with chat interface

### 6. Webhook API
- REST endpoint for external integration
- Customer ID-based routing
- Returns AI responses with sources
- Perfect for embedding in customer websites

## Database Schema (MySQL)

### Tables
1. **customers** - Customer/tenant information
2. **knowledge_files** - Uploaded files with content
3. **scraped_contents** - Scraped website data
4. **scrape_configs** - Scraping schedules and URLs
5. **conversations** - Chat sessions
6. **messages** - Individual chat messages

### Relationships
- One customer has many knowledge files
- One customer has many scraped contents
- One customer has many scrape configs
- One customer has many conversations
- One conversation has many messages
- All foreign keys with CASCADE delete

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
POST   /api/webhook/chat           Webhook endpoint (external use)
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

## Setup & Installation

### Prerequisites
- Node.js 18+
- MySQL/MariaDB 10.5+
- Yarn package manager

### Backend Setup
```bash
cd /app/backend

# Install dependencies
yarn install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Initialize database
mysql -u root < /app/scripts/mysql_schema.sql

# Start development server
yarn dev

# Or build for production
yarn build
yarn start
```

### Frontend Setup
```bash
cd /app/frontend

# Install dependencies
yarn install

# Start development server
yarn start

# Or build for production
yarn build
```

### Database Initialization
```bash
# Create database and tables
mysql -u root < /app/scripts/mysql_schema.sql

# Verify database
mysql -u root -e "USE kbaseai; SHOW TABLES;"
```

## Environment Variables

### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=kbaseai
DB_USER=root
DB_PASSWORD=

# API Keys
OPENAI_API_KEY=sk-emergent-99855F400Bb6d550eD
OPENAI_BASE_URL=https://api.emergent.sh/openai/v1
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
REACT_APP_BACKEND_URL=https://your-backend-url.com
```

## Development

### Running Services
```bash
# Check all services
sudo supervisorctl status

# Restart backend
sudo supervisorctl restart backend

# Restart frontend
sudo supervisorctl restart frontend

# View logs
sudo supervisorctl tail backend
sudo supervisorctl tail frontend
```

### Database Management
```bash
# Access MySQL
mysql -u root kbaseai

# Backup database
mysqldump -u root kbaseai > backup_$(date +%Y%m%d).sql

# Restore database
mysql -u root kbaseai < backup_20240205.sql

# Check tables
mysql -u root kbaseai -e "SHOW TABLES;"
```

## Testing

### Backend API Tests
```bash
# Test API root
curl http://localhost:8001/api/

# Create customer
curl -X POST http://localhost:8001/api/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Customer"}'

# Upload file
curl -X POST http://localhost:8001/api/knowledge/upload \
  -F "file=@test.pdf" \
  -F "customer_id=customer-id"

# Chat
curl -X POST http://localhost:8001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id":"customer-id",
    "message":"What are the main features?"
  }'
```

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Add real ElevenLabs API key (for voice features)
- [ ] Add real Pinecone API key (for semantic search)
- [ ] Configure CORS for production domain
- [ ] Set up MySQL backups
- [ ] Enable HTTPS/SSL
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Set up error tracking (e.g., Sentry)

### Scaling Considerations
- MySQL read replicas for query performance
- Pinecone serverless auto-scales
- Load balancer for multiple backend instances
- CDN for frontend assets
- Redis for session management (if needed)

## Key Features Explained

### Semantic Search with Pinecone
- **Problem**: Traditional keyword search misses semantically similar content
- **Solution**: Vector embeddings capture meaning, enabling "smart" search
- **How it works**:
  1. Text is chunked (~2000 chars)
  2. Each chunk is embedded (1536-dim vector)
  3. Stored in Pinecone with metadata
  4. Queries are embedded and matched by cosine similarity
  5. Top-K relevant chunks returned for AI context

### RAG (Retrieval-Augmented Generation)
- Combines retrieval (search) with generation (AI)
- Retrieves relevant knowledge chunks
- Provides them as context to GPT-5.2
- AI generates accurate, source-attributed answers
- Reduces hallucinations by grounding in facts

### Multi-Tenant Architecture
- Each customer has isolated data
- All queries filtered by `customer_id`
- Prevents data leakage between customers
- Scalable for SaaS deployment

## Performance

### Benchmarks (approximate)
- API response time: 50-200ms (without AI)
- Chat response time: 2-5s (with GPT-5.2 + Pinecone)
- File upload: < 1s (+ background vector indexing)
- Web scraping: 1-3s per URL
- Concurrent users: 100+ (single instance)

### Optimization Tips
- Use connection pooling (already configured)
- Add Redis caching for frequent queries
- Optimize Pinecone queries (adjust top-K)
- Use database indexes (already in place)
- Enable gzip compression

## Security

### Current Implementation
- SQL injection protection (Sequelize parameterized queries)
- XSS protection (React auto-escaping)
- CORS configured
- Environment variables for secrets

### Recommended Additions
- [ ] Add JWT authentication
- [ ] Implement rate limiting
- [ ] Add input validation (express-validator)
- [ ] Set up WAF (Web Application Firewall)
- [ ] Enable database encryption at rest
- [ ] Set up API key management
- [ ] Add audit logging

## Troubleshooting

### Backend Won't Start
```bash
# Check logs
tail -f /var/log/supervisor/backend.err.log

# Common fixes
- Verify MySQL is running: sudo service mariadb status
- Check .env configuration
- Ensure port 8001 is available: lsof -i :8001
- Reinstall dependencies: cd /app/backend && yarn install
```

### Database Connection Issues
```bash
# Test MySQL connection
mysql -u root -e "SELECT 1;"

# Grant permissions
sudo mysql -e "GRANT ALL PRIVILEGES ON kbaseai.* TO 'root'@'localhost'; FLUSH PRIVILEGES;"

# Check database exists
mysql -u root -e "SHOW DATABASES;" | grep kbaseai
```

### Pinecone Errors
```bash
# If you see Pinecone errors in logs, it's expected if:
- No PINECONE_API_KEY set (uses fallback to MySQL retrieval)
- Invalid API key (get key from app.pinecone.io)

# System works without Pinecone, but search quality is lower
```

### Frontend Not Loading
```bash
# Check frontend logs
tail -f /var/log/supervisor/frontend.out.log

# Verify backend is accessible
curl http://localhost:8001/api/

# Check for compilation errors
cd /app/frontend && yarn start
```

## Documentation

- **Database Schema**: `/app/scripts/mysql_schema.sql`
- **Scripts Guide**: `/app/scripts/README.md`
- **Pinecone Integration**: `/app/README_PINECONE_INTEGRATION.md`
- **API Documentation**: Built-in at `/api-docs` page

## Support

### Common Issues
1. **Empty API responses**: Check Sequelize model declarations (use `declare` not `public`)
2. **MySQL access denied**: Run permission grant commands
3. **Port conflicts**: Change PORT in .env
4. **Pinecone errors**: Add valid API key or system uses fallback

### Getting Help
- Check logs: `/var/log/supervisor/backend.*.log`
- Review error messages carefully
- Verify environment variables
- Test database connectivity
- Check API endpoint responses with curl

## License
This project is built for demonstration and production use.

## Version
**v2.0.0** - MySQL + TypeScript + Pinecone Integration
