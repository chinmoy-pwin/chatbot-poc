# MongoDB Database Scripts

This directory contains MongoDB initialization and data management scripts for KbaseAI.

## Scripts Overview

### 1. init_mongodb.js
Initializes the MongoDB database with proper indexes and collection structure.

**What it does:**
- Creates indexes for all collections
- Sets up unique constraints
- Optimizes query performance
- Displays database statistics

**Usage:**
```bash
# Using mongosh
mongosh < /app/scripts/init_mongodb.js

# Or connect first, then run
mongosh
use test_database
load('/app/scripts/init_mongodb.js')
```

**When to use:**
- First time setup
- After database reset
- When adding new indexes
- Performance optimization

### 2. sample_data.js
Inserts sample data for testing and demonstration purposes.

**What it inserts:**
- 2 sample customers (Tech Startup, E-commerce Store)
- 4 knowledge base files (various formats)
- 2 scraped content entries
- 2 scrape configurations
- 3 sample conversations

**Usage:**
```bash
# Using mongosh
mongosh < /app/scripts/sample_data.js

# Or within mongosh
use test_database
load('/app/scripts/sample_data.js')
```

**When to use:**
- Testing the application
- Demonstrating features
- Development environment setup
- Training purposes

## Complete Setup Workflow

### Fresh Database Setup
```bash
# 1. Start MongoDB (if not running)
sudo supervisorctl start mongodb

# 2. Initialize database structure
mongosh < /app/scripts/init_mongodb.js

# 3. Insert sample data (optional)
mongosh < /app/scripts/sample_data.js

# 4. Verify data
mongosh
use test_database
db.customers.find().pretty()
```

### Production Setup
```bash
# 1. Initialize database (indexes only)
mongosh < /app/scripts/init_mongodb.js

# 2. Skip sample data for production
# 3. Let application create real data
```

## Database Connection

**Default Connection String:**
```
mongodb://localhost:27017/test_database
```

**From Application:**
```bash
# Backend uses this from .env
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
```

## Maintenance Scripts

### Backup Database
```bash
# Full backup
mongodump --db test_database --out /tmp/backup/$(date +%Y%m%d)

# Backup specific collection
mongodump --db test_database --collection customers --out /tmp/backup/customers

# Restore from backup
mongorestore --db test_database /tmp/backup/20240204
```

### Reset Database
```bash
# WARNING: This deletes all data!
mongosh <<EOF
use test_database
db.customers.drop()
db.knowledgefiles.drop()
db.scrapedcontents.drop()
db.scrapeconfigs.drop()
db.conversations.drop()
EOF

# Then re-initialize
mongosh < /app/scripts/init_mongodb.js
```

### Check Database Status
```bash
mongosh <<EOF
use test_database
print("Database Stats:")
printjson(db.stats())
print("\nCollections:")
db.getCollectionNames().forEach(function(col) {
    print("- " + col + ": " + db[col].countDocuments() + " documents")
})
EOF
```

### Rebuild Indexes
```bash
mongosh <<EOF
use test_database
db.customers.reIndex()
db.knowledgefiles.reIndex()
db.scrapedcontents.reIndex()
db.scrapeconfigs.reIndex()
db.conversations.reIndex()
print("All indexes rebuilt successfully")
EOF
```

## Common Tasks

### Check Index Usage
```bash
mongosh <<EOF
use test_database
db.knowledgefiles.aggregate([
  { \$indexStats: {} }
]).pretty()
EOF
```

### Find Large Documents
```bash
mongosh <<EOF
use test_database
db.knowledgefiles.find({}, {
  filename: 1,
  size: { \$bsonSize: "$$ROOT" }
}).sort({ size: -1 }).limit(10).pretty()
EOF
```

### Clean Old Conversations
```bash
mongosh <<EOF
use test_database
const ninetyDaysAgo = new Date()
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
const result = db.conversations.deleteMany({
  "messages.timestamp": { \$lt: ninetyDaysAgo }
})
print("Deleted " + result.deletedCount + " old conversations")
EOF
```

### Export Data to JSON
```bash
# Export customers
mongoexport --db test_database --collection customers --out customers.json --pretty

# Export with query
mongoexport --db test_database --collection knowledgefiles \
  --query '{"customer_id":"some-id"}' --out kb_files.json
```

### Import Data from JSON
```bash
# Import customers
mongoimport --db test_database --collection customers --file customers.json

# Drop collection before import
mongoimport --db test_database --collection customers \
  --file customers.json --drop
```

## Troubleshooting

### MongoDB Not Running
```bash
# Check status
sudo supervisorctl status mongodb

# Start MongoDB
sudo supervisorctl start mongodb

# Check logs
tail -f /var/log/mongodb.out.log
```

### Connection Issues
```bash
# Test connection
mongosh --eval "db.adminCommand('ping')"

# Check if port is open
netstat -an | grep 27017

# Verify MongoDB process
ps aux | grep mongod
```

### Index Creation Fails
```bash
# Drop and recreate
mongosh <<EOF
use test_database
db.customers.dropIndexes()
db.customers.createIndex({ "id": 1 }, { unique: true })
EOF
```

### Disk Space Issues
```bash
# Check disk usage
df -h

# Check MongoDB data size
du -sh /var/lib/mongodb/

# Compact database (requires downtime)
mongosh <<EOF
use test_database
db.runCommand({ compact: 'knowledgefiles' })
EOF
```

## Performance Tips

1. **Always use indexes** - Run init_mongodb.js to ensure indexes exist
2. **Project fields** - Don't fetch content field when not needed
3. **Limit results** - Use `.limit()` for large collections
4. **Use lean()** - In Mongoose, use `.lean()` for read-only queries
5. **Monitor slow queries** - Enable profiling in production

## Security Notes

1. **Enable Authentication** - For production, enable MongoDB auth
2. **Use Strong Passwords** - Generate secure passwords for DB users
3. **Network Security** - Bind to localhost only for local deployments
4. **Regular Backups** - Automate daily backups with retention policy
5. **Audit Logs** - Enable audit logging for compliance

## Additional Resources

- Full Schema Documentation: `/app/mongodb_schema_documentation.md`
- MongoDB Manual: https://docs.mongodb.com/manual/
- Mongoose Docs: https://mongoosejs.com/docs/
- mongosh Reference: https://docs.mongodb.com/mongodb-shell/

## Support

For issues with these scripts:
1. Check MongoDB logs: `/var/log/mongodb.out.log`
2. Verify MongoDB is running: `sudo supervisorctl status mongodb`
3. Test connection: `mongosh --eval "db.adminCommand('ping')"`
4. Review error messages carefully
5. Check disk space and permissions
