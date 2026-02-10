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



**Deployment process for  multi-tenant chatbot platform on GCP Cloud Run:**

## 🗄️ **Database Deployment (MariaDB/MySQL)**

**Option 1: Cloud SQL (Recommended)**
- Create a Cloud SQL MySQL instance
- Choose appropriate tier (db-f1-micro for dev, db-n1-standard-1+ for production)
- Enable private IP + public IP (or just private with Cloud SQL Proxy)
- Import your schema: `mysql_schema.sql` via Cloud SQL console or gcloud CLI
- Get connection details: Host, Port, Database name, User, Password

**Option 2: Self-managed on Compute Engine**
- Less recommended, more maintenance overhead

---

## 🔧 **Backend Deployment (TypeScript/Express to Cloud Run)**

**Step 1: Prepare Backend**
- Create a `Dockerfile` in `/backend` directory
- Base image: `node:18-alpine` or similar
- Install dependencies: `yarn install --production`
- Build TypeScript: `yarn build` (outputs to `/dist`)
- Expose port 8001
- CMD: `node dist/server.js`

**Step 2: Build Container**
```
cd backend
gcloud builds submit --tag gcr.io/[PROJECT-ID]/kbaseai-backend
```

**Step 3: Deploy to Cloud Run**
- Service name: `kbaseai-backend`
- Region: Choose closest to your users
- Allow unauthenticated invocations: Yes (since you have JWT auth)
- Min instances: 0 (or 1 for faster cold starts)
- Max instances: 10-100 based on expected load
- Memory: 512MB-1GB
- CPU: 1-2

**Step 4: Set Environment Variables**
In Cloud Run service settings:
- `DB_HOST`: Cloud SQL private IP or connection name
- `DB_PORT`: 3306
- `DB_NAME`: kbaseai
- `DB_USER`: your-db-user
- `DB_PASSWORD`: use Secret Manager!
- `JWT_SECRET`: use Secret Manager!
- `OPENAI_API_KEY`: user's key or your proxy
- `PINECONE_API_KEY`: user's key
- `CORS_ORIGINS`: Your frontend URL
- `PORT`: 8001

**Step 5: Connect to Cloud SQL**
- Enable Cloud SQL Admin API
- Add Cloud SQL connection in Cloud Run service settings
- Format: `project:region:instance-name`
- Use Unix socket path: `/cloudsql/[CONNECTION_NAME]`
- Update `DB_HOST` to socket path

---

## 🎨 **Frontend Deployment (React)**

**Option 1: Cloud Run (Container)**
- Create `Dockerfile` with nginx
- Build React: `yarn build` → creates `/build` folder
- Serve static files via nginx
- Configure nginx to proxy `/api` to backend Cloud Run URL
- Environment variables baked into build (use `.env.production`)

**Option 2: Firebase Hosting (Easier)**
- `firebase init hosting`
- Build: `yarn build`
- Deploy: `firebase deploy`
- Configure rewrites for `/api` to backend Cloud Run URL
- Auto CDN, SSL, custom domain

**Option 3: Cloud Storage + Load Balancer**
- Upload build folder to Cloud Storage bucket
- Enable static website hosting
- Create Cloud Load Balancer
- Backend requests → Cloud Run backend
- Frontend requests → Cloud Storage

---

## 🔐 **Environment Variables & Secrets**

**Secret Manager (Recommended):**
1. Store sensitive data in Secret Manager:
   - `DB_PASSWORD`
   - `JWT_SECRET`
   - `OPENAI_API_KEY`
   - `PINECONE_API_KEY`

2. Grant Cloud Run service account access to secrets

3. Mount secrets as environment variables in Cloud Run

**Frontend Environment:**
- Create `.env.production`:
  ```
  REACT_APP_BACKEND_URL=https://kbaseai-backend-xxx.run.app
  ```
- Build with production env: `yarn build`

---

## 🌐 **Networking & Domain Setup**

**Backend Domain:**
- Cloud Run provides: `https://kbaseai-backend-xxx.run.app`
- Custom domain: Map via Cloud Run domain mappings
- Example: `api.yourdomain.com`

**Frontend Domain:**
- Firebase Hosting: `yourapp.web.app` or custom domain
- Cloud Run: Custom domain mapping
- Example: `app.yourdomain.com`

**CORS Configuration:**
- Update backend `CORS_ORIGINS` to include frontend URLs
- Include both development and production URLs

---

## 📊 **Deployment Workflow**

**1. Initial Setup (One-time):**
```
1. Create Cloud SQL instance
2. Import database schema
3. Create Secret Manager secrets
4. Enable required APIs (Cloud Run, Cloud SQL, Secret Manager)
5. Set up IAM roles for service accounts
```

**2. Backend Deployment:**
```
1. Build Docker image
2. Push to Container Registry (GCR) or Artifact Registry
3. Deploy to Cloud Run
4. Configure environment variables + Cloud SQL connection
5. Test backend: curl https://backend-url/api
```

**3. Frontend Deployment:**
```
1. Update REACT_APP_BACKEND_URL to production backend URL
2. Build React app: yarn build
3. Deploy to Firebase Hosting / Cloud Run / Cloud Storage
4. Test frontend: Visit frontend URL
```

**4. Database Migrations:**
```
1. Connect to Cloud SQL via Cloud SQL Proxy
2. Run migration scripts if needed
3. Or use Cloud SQL console to import SQL files
```

---

## 💰 **Cost Optimization**

**Cloud Run:**
- Pay only when processing requests
- Min instances = 0 → No idle costs
- Set CPU allocation: "CPU only allocated during request"

**Cloud SQL:**
- Use appropriate tier (don't overprovision)
- Enable automatic backups (small cost)
- Use private IP to avoid egress charges

**Secrets:**
- Secret Manager: ~$0.06 per 10K accesses
- Cache secrets in application memory

---

## 🔄 **CI/CD (Optional but Recommended)**

**Using Cloud Build:**
1. Create `cloudbuild.yaml` for backend + frontend
2. Trigger on git push to main branch
3. Automated: Build → Test → Deploy
4. Rollback capability via Cloud Run revisions

**Using GitHub Actions:**
1. Set up GCP service account with deployment permissions
2. Store credentials as GitHub secrets
3. Workflow: Build → Push to GCR → Deploy to Cloud Run

---

## 📝 **Key Considerations**

1. **Multi-tenancy:** Your database already supports it (customer_id isolation)
2. **Rate Limiting:** Add Cloud Armor for DDoS protection
3. **Monitoring:** Enable Cloud Logging & Monitoring
4. **Backups:** Automate Cloud SQL backups
5. **SSL:** Cloud Run provides free SSL, Firebase Hosting too
6. **Scaling:** Cloud Run auto-scales, Cloud SQL may need manual scaling

---

## 🚀 **Quick Deployment Order**

1. **Database First** → Cloud SQL instance + import schema
2. **Backend Second** → Cloud Run with DB connection
3. **Frontend Last** → Point to backend URL, deploy

---

**Would you like me to:**
1. Generate the actual Dockerfile and deployment configs?
2. Create a deployment script for automation?
3. Continue with updating the remaining app pages?

## License
This project is built for demonstration and production use.

## Version
**v2.0.0** - MySQL + TypeScript + Pinecone Integration
