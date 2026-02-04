# KbaseAI - MongoDB Schema Documentation

## Database Overview

**Database Name**: `test_database` (configurable via `DB_NAME` env variable)  
**Connection**: MongoDB 4.4+ (via Mongoose ODM)  
**Collections**: 5 main collections for multi-tenant chatbot platform

---

## Collections

### 1. customers

**Purpose**: Store customer/tenant information for multi-tenant architecture

**Schema**:
```javascript
{
  _id: ObjectId,                    // MongoDB internal ID
  id: String,                       // UUID v4 (application-level unique ID)
  name: String,                     // Customer display name
  webhook_url: String (optional),   // Customer's webhook URL for callbacks
  created_at: Date,                 // Timestamp of customer creation
  __v: Number                       // Mongoose version key
}
```

**Mongoose Model**:
```typescript
interface ICustomer {
  id: string;                       // Required, unique
  name: string;                     // Required
  webhook_url?: string;             // Optional
  created_at: Date;                 // Default: Date.now
}
```

**Indexes**:
```javascript
db.customers.createIndex({ "id": 1 }, { unique: true });
db.customers.createIndex({ "created_at": -1 });
```

**Sample Document**:
```json
{
  "_id": ObjectId("65a1b2c3d4e5f6a7b8c9d0e1"),
  "id": "795881f1-6857-4581-8417-1dde39704c12",
  "name": "Demo Customer",
  "webhook_url": "https://example.com/webhook",
  "created_at": ISODate("2024-02-04T12:30:00.000Z"),
  "__v": 0
}
```

**Query Patterns**:
```javascript
// Find customer by application ID
db.customers.findOne({ id: "795881f1-..." });

// List all customers (sorted by newest)
db.customers.find().sort({ created_at: -1 });

// Count total customers
db.customers.countDocuments();
```

---

### 2. knowledgefiles

**Purpose**: Store uploaded knowledge base files with extracted text content

**Schema**:
```javascript
{
  _id: ObjectId,                    // MongoDB internal ID
  id: String,                       // UUID v4 (file unique ID)
  customer_id: String,              // Reference to customer.id
  filename: String,                 // Original filename
  file_type: String,                // File extension (pdf, docx, txt, etc.)
  content: String,                  // Extracted text content (can be large)
  uploaded_at: Date,                // Upload timestamp
  __v: Number                       // Mongoose version key
}
```

**Mongoose Model**:
```typescript
interface IKnowledgeFile {
  id: string;                       // Required, unique
  customer_id: string;              // Required (foreign key to customer)
  filename: string;                 // Required
  file_type: string;                // Required
  content: string;                  // Required (can be 10MB+)
  uploaded_at: Date;                // Default: Date.now
}
```

**Indexes**:
```javascript
db.knowledgefiles.createIndex({ "id": 1 }, { unique: true });
db.knowledgefiles.createIndex({ "customer_id": 1 });
db.knowledgefiles.createIndex({ "uploaded_at": -1 });
db.knowledgefiles.createIndex({ "customer_id": 1, "uploaded_at": -1 });
```

**Sample Document**:
```json
{
  "_id": ObjectId("65a1b2c3d4e5f6a7b8c9d0e2"),
  "id": "f8e7d6c5-b4a3-9281-7654-321098fedcba",
  "customer_id": "795881f1-6857-4581-8417-1dde39704c12",
  "filename": "product_manual.pdf",
  "file_type": "pdf",
  "content": "This is the extracted text content from the PDF file...",
  "uploaded_at": ISODate("2024-02-04T13:00:00.000Z"),
  "__v": 0
}
```

**Query Patterns**:
```javascript
// Get all files for a customer (without content for listing)
db.knowledgefiles.find(
  { customer_id: "795881f1-..." },
  { content: 0, _id: 0 }
).sort({ uploaded_at: -1 });

// Get file with content for processing
db.knowledgefiles.findOne({ id: "f8e7d6c5-..." });

// Count files per customer
db.knowledgefiles.countDocuments({ customer_id: "795881f1-..." });

// Delete file
db.knowledgefiles.deleteOne({ id: "f8e7d6c5-..." });

// Get recent files (last 5)
db.knowledgefiles.find(
  { customer_id: "795881f1-..." }
).sort({ uploaded_at: -1 }).limit(5);
```

**Storage Considerations**:
- Content field can be very large (1MB - 50MB per document)
- Consider using GridFS for files > 16MB
- Current implementation stores full text in document

---

### 3. scrapedcontents

**Purpose**: Store scraped website content for knowledge base

**Schema**:
```javascript
{
  _id: ObjectId,                    // MongoDB internal ID
  id: String,                       // UUID v4 (scraped content unique ID)
  customer_id: String,              // Reference to customer.id
  url: String,                      // Source URL that was scraped
  content: String,                  // Extracted text from webpage
  scraped_at: Date,                 // Scraping timestamp
  __v: Number                       // Mongoose version key
}
```

**Mongoose Model**:
```typescript
interface IScrapedContent {
  id: string;                       // Required, unique
  customer_id: string;              // Required (foreign key to customer)
  url: string;                      // Required
  content: string;                  // Required
  scraped_at: Date;                 // Default: Date.now
}
```

**Indexes**:
```javascript
db.scrapedcontents.createIndex({ "id": 1 }, { unique: true });
db.scrapedcontents.createIndex({ "customer_id": 1 });
db.scrapedcontents.createIndex({ "url": 1 });
db.scrapedcontents.createIndex({ "customer_id": 1, "scraped_at": -1 });
db.scrapedcontents.createIndex({ "customer_id": 1, "url": 1 });
```

**Sample Document**:
```json
{
  "_id": ObjectId("65a1b2c3d4e5f6a7b8c9d0e3"),
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "customer_id": "795881f1-6857-4581-8417-1dde39704c12",
  "url": "https://example.com/blog/article-1",
  "content": "Article title\n\nThis is the scraped content from the webpage...",
  "scraped_at": ISODate("2024-02-04T14:00:00.000Z"),
  "__v": 0
}
```

**Query Patterns**:
```javascript
// Get all scraped content for customer (without content field)
db.scrapedcontents.find(
  { customer_id: "795881f1-..." },
  { content: 0, _id: 0 }
).sort({ scraped_at: -1 });

// Get content for specific URL
db.scrapedcontents.findOne({ 
  customer_id: "795881f1-...",
  url: "https://example.com/blog/article-1"
});

// Count scraped pages per customer
db.scrapedcontents.countDocuments({ customer_id: "795881f1-..." });

// Get recent scraped content (last 5)
db.scrapedcontents.find(
  { customer_id: "795881f1-..." }
).sort({ scraped_at: -1 }).limit(5);

// Check if URL already scraped
db.scrapedcontents.findOne({
  customer_id: "795881f1-...",
  url: "https://example.com/blog/article-1"
});
```

---

### 4. scrapeconfigs

**Purpose**: Store scraping configuration and scheduling information

**Schema**:
```javascript
{
  _id: ObjectId,                    // MongoDB internal ID
  id: String,                       // UUID v4 (config unique ID)
  customer_id: String,              // Reference to customer.id
  urls: [String],                   // Array of URLs to scrape
  schedule: String,                 // Cron expression (e.g., "0 0 * * *")
  auto_scrape: Boolean,             // Enable/disable auto-scraping
  created_at: Date,                 // Config creation timestamp
  __v: Number                       // Mongoose version key
}
```

**Mongoose Model**:
```typescript
interface IScrapeConfig {
  id: string;                       // Required, unique
  customer_id: string;              // Required (foreign key to customer)
  urls: string[];                   // Required, array of URLs
  schedule: string;                 // Default: "0 0 * * *" (daily midnight)
  auto_scrape: boolean;             // Default: false
  created_at: Date;                 // Default: Date.now
}
```

**Indexes**:
```javascript
db.scrapeconfigs.createIndex({ "id": 1 }, { unique: true });
db.scrapeconfigs.createIndex({ "customer_id": 1 });
db.scrapeconfigs.createIndex({ "auto_scrape": 1 });
db.scrapeconfigs.createIndex({ "customer_id": 1, "auto_scrape": 1 });
```

**Sample Document**:
```json
{
  "_id": ObjectId("65a1b2c3d4e5f6a7b8c9d0e4"),
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "customer_id": "795881f1-6857-4581-8417-1dde39704c12",
  "urls": [
    "https://example.com/blog",
    "https://example.com/docs",
    "https://example.com/faq"
  ],
  "schedule": "0 0 * * *",
  "auto_scrape": true,
  "created_at": ISODate("2024-02-04T15:00:00.000Z"),
  "__v": 0
}
```

**Query Patterns**:
```javascript
// Get all configs for customer
db.scrapeconfigs.find({ customer_id: "795881f1-..." });

// Get configs with auto-scraping enabled
db.scrapeconfigs.find({ 
  customer_id: "795881f1-...",
  auto_scrape: true 
});

// Get all active auto-scrape configs (for scheduler)
db.scrapeconfigs.find({ auto_scrape: true });

// Update config
db.scrapeconfigs.updateOne(
  { id: "b2c3d4e5-..." },
  { $set: { auto_scrape: false } }
);
```

---

### 5. conversations

**Purpose**: Store chat conversations and message history

**Schema**:
```javascript
{
  _id: ObjectId,                    // MongoDB internal ID
  customer_id: String,              // Reference to customer.id
  session_id: String,               // User session ID (for tracking conversations)
  messages: [                       // Array of message objects
    {
      role: String,                 // "user" or "assistant"
      content: String,              // Message text
      timestamp: Date,              // Message timestamp
      _id: ObjectId                 // Sub-document ID (auto-generated)
    }
  ],
  __v: Number                       // Mongoose version key
}
```

**Mongoose Model**:
```typescript
interface IMessage {
  role: string;                     // "user" | "assistant"
  content: string;                  // Required
  timestamp: Date;                  // Default: Date.now
}

interface IConversation {
  customer_id: string;              // Required
  session_id: string;               // Required
  messages: IMessage[];             // Array of messages
}
```

**Indexes**:
```javascript
db.conversations.createIndex({ "customer_id": 1 });
db.conversations.createIndex({ "session_id": 1 });
db.conversations.createIndex({ "customer_id": 1, "session_id": 1 });
db.conversations.createIndex({ "messages.timestamp": -1 });
```

**Sample Document**:
```json
{
  "_id": ObjectId("65a1b2c3d4e5f6a7b8c9d0e5"),
  "customer_id": "795881f1-6857-4581-8417-1dde39704c12",
  "session_id": "user-session-123",
  "messages": [
    {
      "role": "user",
      "content": "What are the main features of your product?",
      "timestamp": ISODate("2024-02-04T16:00:00.000Z"),
      "_id": ObjectId("65a1b2c3d4e5f6a7b8c9d0e6")
    },
    {
      "role": "assistant",
      "content": "Our product offers 24/7 support, cloud storage, and AI-powered analytics...",
      "timestamp": ISODate("2024-02-04T16:00:05.000Z"),
      "_id": ObjectId("65a1b2c3d4e5f6a7b8c9d0e7")
    }
  ],
  "__v": 0
}
```

**Query Patterns**:
```javascript
// Get conversation by session
db.conversations.findOne({ 
  customer_id: "795881f1-...",
  session_id: "user-session-123" 
});

// Get all conversations for customer
db.conversations.find({ customer_id: "795881f1-..." })
  .sort({ "messages.timestamp": -1 });

// Count conversations per customer
db.conversations.countDocuments({ customer_id: "795881f1-..." });

// Get recent conversations (last 10)
db.conversations.find({ customer_id: "795881f1-..." })
  .sort({ "messages.timestamp": -1 })
  .limit(10);

// Add message to existing conversation
db.conversations.updateOne(
  { session_id: "user-session-123" },
  { 
    $push: { 
      messages: {
        role: "user",
        content: "Follow-up question",
        timestamp: new Date()
      }
    }
  }
);
```

---

## Collection Relationships

```
customers (1) ----< (M) knowledgefiles
    |
    +----< (M) scrapedcontents
    |
    +----< (M) scrapeconfigs
    |
    +----< (M) conversations
```

**Relationship Details**:
- One customer can have many knowledge files
- One customer can have many scraped content entries
- One customer can have many scraping configurations
- One customer can have many conversations
- All relationships use `customer_id` as foreign key

---

## Database Initialization Script

```javascript
// Connect to MongoDB
use test_database;

// Create collections with validation
db.createCollection("customers", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "name", "created_at"],
      properties: {
        id: {
          bsonType: "string",
          description: "UUID v4 - required"
        },
        name: {
          bsonType: "string",
          minLength: 1,
          description: "Customer name - required"
        },
        webhook_url: {
          bsonType: "string",
          description: "Optional webhook URL"
        },
        created_at: {
          bsonType: "date",
          description: "Creation timestamp - required"
        }
      }
    }
  }
});

db.createCollection("knowledgefiles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "customer_id", "filename", "file_type", "content", "uploaded_at"],
      properties: {
        id: {
          bsonType: "string",
          description: "UUID v4 - required"
        },
        customer_id: {
          bsonType: "string",
          description: "Customer reference - required"
        },
        filename: {
          bsonType: "string",
          minLength: 1,
          description: "File name - required"
        },
        file_type: {
          bsonType: "string",
          enum: ["pdf", "docx", "txt", "json", "csv", "md"],
          description: "File type - required"
        },
        content: {
          bsonType: "string",
          description: "Extracted text content - required"
        },
        uploaded_at: {
          bsonType: "date",
          description: "Upload timestamp - required"
        }
      }
    }
  }
});

db.createCollection("scrapedcontents", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "customer_id", "url", "content", "scraped_at"],
      properties: {
        id: {
          bsonType: "string",
          description: "UUID v4 - required"
        },
        customer_id: {
          bsonType: "string",
          description: "Customer reference - required"
        },
        url: {
          bsonType: "string",
          pattern: "^https?://",
          description: "Source URL - required"
        },
        content: {
          bsonType: "string",
          description: "Scraped content - required"
        },
        scraped_at: {
          bsonType: "date",
          description: "Scraping timestamp - required"
        }
      }
    }
  }
});

db.createCollection("scrapeconfigs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "customer_id", "urls", "schedule", "auto_scrape", "created_at"],
      properties: {
        id: {
          bsonType: "string",
          description: "UUID v4 - required"
        },
        customer_id: {
          bsonType: "string",
          description: "Customer reference - required"
        },
        urls: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "string",
            pattern: "^https?://"
          },
          description: "Array of URLs - required"
        },
        schedule: {
          bsonType: "string",
          description: "Cron expression - required"
        },
        auto_scrape: {
          bsonType: "bool",
          description: "Auto-scrape enabled - required"
        },
        created_at: {
          bsonType: "date",
          description: "Creation timestamp - required"
        }
      }
    }
  }
});

db.createCollection("conversations", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["customer_id", "session_id", "messages"],
      properties: {
        customer_id: {
          bsonType: "string",
          description: "Customer reference - required"
        },
        session_id: {
          bsonType: "string",
          description: "Session ID - required"
        },
        messages: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["role", "content", "timestamp"],
            properties: {
              role: {
                enum: ["user", "assistant"],
                description: "Message role - required"
              },
              content: {
                bsonType: "string",
                minLength: 1,
                description: "Message content - required"
              },
              timestamp: {
                bsonType: "date",
                description: "Message timestamp - required"
              }
            }
          },
          description: "Array of messages - required"
        }
      }
    }
  }
});

// Create indexes
db.customers.createIndex({ "id": 1 }, { unique: true });
db.customers.createIndex({ "created_at": -1 });

db.knowledgefiles.createIndex({ "id": 1 }, { unique: true });
db.knowledgefiles.createIndex({ "customer_id": 1 });
db.knowledgefiles.createIndex({ "uploaded_at": -1 });
db.knowledgefiles.createIndex({ "customer_id": 1, "uploaded_at": -1 });

db.scrapedcontents.createIndex({ "id": 1 }, { unique: true });
db.scrapedcontents.createIndex({ "customer_id": 1 });
db.scrapedcontents.createIndex({ "url": 1 });
db.scrapedcontents.createIndex({ "customer_id": 1, "scraped_at": -1 });
db.scrapedcontents.createIndex({ "customer_id": 1, "url": 1 });

db.scrapeconfigs.createIndex({ "id": 1 }, { unique: true });
db.scrapeconfigs.createIndex({ "customer_id": 1 });
db.scrapeconfigs.createIndex({ "auto_scrape": 1 });
db.scrapeconfigs.createIndex({ "customer_id": 1, "auto_scrape": 1 });

db.conversations.createIndex({ "customer_id": 1 });
db.conversations.createIndex({ "session_id": 1 });
db.conversations.createIndex({ "customer_id": 1, "session_id": 1 });
db.conversations.createIndex({ "messages.timestamp": -1 });

print("MongoDB schema initialization complete!");
```

---

## Sample Data Insertion

```javascript
// Insert sample customer
db.customers.insertOne({
  id: "795881f1-6857-4581-8417-1dde39704c12",
  name: "Acme Corporation",
  webhook_url: "https://acme.com/webhook",
  created_at: new Date()
});

// Insert sample knowledge file
db.knowledgefiles.insertOne({
  id: "f8e7d6c5-b4a3-9281-7654-321098fedcba",
  customer_id: "795881f1-6857-4581-8417-1dde39704c12",
  filename: "product_guide.pdf",
  file_type: "pdf",
  content: "Product Guide\n\nFeature 1: Real-time analytics...",
  uploaded_at: new Date()
});

// Insert sample scraped content
db.scrapedcontents.insertOne({
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  customer_id: "795881f1-6857-4581-8417-1dde39704c12",
  url: "https://acme.com/blog/announcement",
  content: "Company Announcement\n\nWe are excited to announce...",
  scraped_at: new Date()
});

// Insert sample scrape config
db.scrapeconfigs.insertOne({
  id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  customer_id: "795881f1-6857-4581-8417-1dde39704c12",
  urls: [
    "https://acme.com/blog",
    "https://acme.com/docs"
  ],
  schedule: "0 0 * * *",
  auto_scrape: true,
  created_at: new Date()
});

// Insert sample conversation
db.conversations.insertOne({
  customer_id: "795881f1-6857-4581-8417-1dde39704c12",
  session_id: "user-abc-123",
  messages: [
    {
      role: "user",
      content: "What are your business hours?",
      timestamp: new Date()
    },
    {
      role: "assistant",
      content: "We are open Monday-Friday, 9AM-5PM EST.",
      timestamp: new Date()
    }
  ]
});
```

---

## Database Maintenance

### Backup Commands
```bash
# Full database backup
mongodump --db test_database --out /backup/mongodb/$(date +%Y%m%d)

# Backup specific collection
mongodump --db test_database --collection customers --out /backup/customers

# Restore database
mongorestore --db test_database /backup/mongodb/20240204
```

### Performance Optimization
```javascript
// Check collection stats
db.knowledgefiles.stats();

// Analyze query performance
db.knowledgefiles.find({ customer_id: "..." }).explain("executionStats");

// Rebuild indexes
db.knowledgefiles.reIndex();

// Check index usage
db.knowledgefiles.aggregate([
  { $indexStats: {} }
]);
```

### Data Cleanup
```javascript
// Delete customer and all related data
const customerId = "795881f1-6857-4581-8417-1dde39704c12";

db.conversations.deleteMany({ customer_id: customerId });
db.scrapeconfigs.deleteMany({ customer_id: customerId });
db.scrapedcontents.deleteMany({ customer_id: customerId });
db.knowledgefiles.deleteMany({ customer_id: customerId });
db.customers.deleteOne({ id: customerId });

// Archive old conversations (older than 90 days)
const ninetyDaysAgo = new Date();
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

db.conversations.deleteMany({
  "messages.timestamp": { $lt: ninetyDaysAgo }
});

// Remove duplicate scraped content (keep latest)
db.scrapedcontents.aggregate([
  {
    $group: {
      _id: { customer_id: "$customer_id", url: "$url" },
      docs: { $push: "$$ROOT" },
      count: { $sum: 1 }
    }
  },
  { $match: { count: { $gt: 1 } } }
]).forEach(function(doc) {
  doc.docs.sort((a, b) => b.scraped_at - a.scraped_at);
  doc.docs.slice(1).forEach(function(d) {
    db.scrapedcontents.deleteOne({ _id: d._id });
  });
});
```

---

## Security Recommendations

1. **Authentication**: Enable MongoDB authentication
   ```javascript
   use admin;
   db.createUser({
     user: "kbaseai_admin",
     pwd: "secure_password_here",
     roles: [
       { role: "readWrite", db: "test_database" }
     ]
   });
   ```

2. **Network Security**: Bind to localhost only (for local deployments)
   ```yaml
   net:
     bindIp: 127.0.0.1
     port: 27017
   ```

3. **Encryption**: Enable encryption at rest (MongoDB Enterprise)
   ```yaml
   security:
     enableEncryption: true
     encryptionKeyFile: /path/to/keyfile
   ```

4. **Field-Level Encryption**: Encrypt sensitive content fields
5. **Audit Logging**: Enable audit logs for compliance
6. **Regular Backups**: Automated daily backups with retention policy

---

## Monitoring Queries

```javascript
// Database size
db.stats();

// Collection sizes
db.customers.stats().size;
db.knowledgefiles.stats().size;
db.scrapedcontents.stats().size;

// Document counts
db.customers.countDocuments();
db.knowledgefiles.countDocuments();
db.scrapedcontents.countDocuments();
db.conversations.countDocuments();

// Average document size
db.knowledgefiles.stats().avgObjSize;

// Index sizes
db.knowledgefiles.stats().indexSizes;

// Current operations
db.currentOp();

// Server status
db.serverStatus();
```

---

## Migration Scripts

### Add New Field to Existing Collection
```javascript
// Add 'tags' field to knowledgefiles
db.knowledgefiles.updateMany(
  { tags: { $exists: false } },
  { $set: { tags: [] } }
);
```

### Change Field Type
```javascript
// Convert created_at from string to date (if needed)
db.customers.find({ created_at: { $type: "string" } }).forEach(function(doc) {
  db.customers.updateOne(
    { _id: doc._id },
    { $set: { created_at: new Date(doc.created_at) } }
  );
});
```

### Add Customer ID to Legacy Data
```javascript
// If old data exists without customer_id
const defaultCustomerId = "default-customer-id";
db.knowledgefiles.updateMany(
  { customer_id: { $exists: false } },
  { $set: { customer_id: defaultCustomerId } }
);
```

---

## Conclusion

This MongoDB schema provides:
- ✅ Multi-tenant architecture via `customer_id`
- ✅ Flexible document structure for varying content
- ✅ Efficient indexing for common queries
- ✅ Conversation history tracking
- ✅ Scalable for large knowledge bases
- ✅ Easy integration with Pinecone vectors

For production deployments, consider:
- MongoDB Atlas for managed hosting
- GridFS for files > 16MB
- Sharding for horizontal scaling
- Read replicas for query performance
