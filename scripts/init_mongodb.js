// MongoDB Database Initialization Script for KbaseAI
// Run this script using: mongosh < init_mongodb.js

// Switch to database
use test_database;

print("=== Initializing KbaseAI MongoDB Database ===\n");

// Drop existing collections (WARNING: This will delete all data!)
// Uncomment the following lines if you want to start fresh
// db.customers.drop();
// db.knowledgefiles.drop();
// db.scrapedcontents.drop();
// db.scrapeconfigs.drop();
// db.conversations.drop();

// Create indexes for customers
print("Creating indexes for 'customers' collection...");
db.customers.createIndex({ "id": 1 }, { unique: true });
db.customers.createIndex({ "created_at": -1 });

// Create indexes for knowledgefiles
print("Creating indexes for 'knowledgefiles' collection...");
db.knowledgefiles.createIndex({ "id": 1 }, { unique: true });
db.knowledgefiles.createIndex({ "customer_id": 1 });
db.knowledgefiles.createIndex({ "uploaded_at": -1 });
db.knowledgefiles.createIndex({ "customer_id": 1, "uploaded_at": -1 });

// Create indexes for scrapedcontents
print("Creating indexes for 'scrapedcontents' collection...");
db.scrapedcontents.createIndex({ "id": 1 }, { unique: true });
db.scrapedcontents.createIndex({ "customer_id": 1 });
db.scrapedcontents.createIndex({ "url": 1 });
db.scrapedcontents.createIndex({ "customer_id": 1, "scraped_at": -1 });
db.scrapedcontents.createIndex({ "customer_id": 1, "url": 1 });

// Create indexes for scrapeconfigs
print("Creating indexes for 'scrapeconfigs' collection...");
db.scrapeconfigs.createIndex({ "id": 1 }, { unique: true });
db.scrapeconfigs.createIndex({ "customer_id": 1 });
db.scrapeconfigs.createIndex({ "auto_scrape": 1 });
db.scrapeconfigs.createIndex({ "customer_id": 1, "auto_scrape": 1 });

// Create indexes for conversations
print("Creating indexes for 'conversations' collection...");
db.conversations.createIndex({ "customer_id": 1 });
db.conversations.createIndex({ "session_id": 1 });
db.conversations.createIndex({ "customer_id": 1, "session_id": 1 });
db.conversations.createIndex({ "messages.timestamp": -1 });

print("\n=== Database Initialization Complete ===");

// Display collection stats
print("\nCollection Statistics:");
print("- customers: " + db.customers.countDocuments() + " documents");
print("- knowledgefiles: " + db.knowledgefiles.countDocuments() + " documents");
print("- scrapedcontents: " + db.scrapedcontents.countDocuments() + " documents");
print("- scrapeconfigs: " + db.scrapeconfigs.countDocuments() + " documents");
print("- conversations: " + db.conversations.countDocuments() + " documents");

// Display database size
const stats = db.stats();
print("\nDatabase Size: " + (stats.dataSize / 1024 / 1024).toFixed(2) + " MB");
print("Storage Size: " + (stats.storageSize / 1024 / 1024).toFixed(2) + " MB");
print("Index Size: " + (stats.indexSize / 1024 / 1024).toFixed(2) + " MB");

print("\n=== Ready for use! ===");
