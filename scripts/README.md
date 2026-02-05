# Database Scripts

This directory contains MySQL database initialization and management scripts for KbaseAI.

## Scripts Overview

### mysql_schema.sql
Creates the complete MySQL database schema with all tables, indexes, and foreign keys.

**What it does:**
- Creates `kbaseai` database
- Creates 6 tables (customers, knowledge_files, scraped_contents, scrape_configs, conversations, messages)
- Sets up indexes for optimal query performance
- Configures foreign keys with CASCADE delete
- Uses utf8mb4 character set for full Unicode support

**Usage:**
```bash
# Initialize database
mysql -u root < /app/scripts/mysql_schema.sql

# Or with password
mysql -u root -p < /app/scripts/mysql_schema.sql

# Verify tables created
mysql -u root kbaseai -e "SHOW TABLES;"
```

**When to use:**
- First time setup
- After database reset
- Creating new environment
- Disaster recovery

## Complete Setup Workflow

### Fresh Database Setup
```bash
# 1. Start MySQL (if not running)
sudo service mariadb start

# 2. Initialize database structure
mysql -u root < /app/scripts/mysql_schema.sql

# 3. Verify database
mysql -u root kbaseai -e "SHOW TABLES;"

# 4. Check table structure
mysql -u root kbaseai -e "DESCRIBE customers;"
```

### Production Setup
```bash
# 1. Initialize database
mysql -u root < /app/scripts/mysql_schema.sql

# 2. Create production user (recommended)
mysql -u root <<EOF
CREATE USER 'kbaseai'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON kbaseai.* TO 'kbaseai'@'localhost';
FLUSH PRIVILEGES;
EOF

# 3. Update backend .env with production credentials
```

## Database Connection

**Default Connection:**
```
Host: localhost
Port: 3306
Database: kbaseai
User: root
Password: (empty)
```

**From Backend:**
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=kbaseai
DB_USER=root
DB_PASSWORD=
```

## Maintenance Commands

### Backup Database
```bash
# Full backup
mysqldump -u root kbaseai > backup_$(date +%Y%m%d).sql

# Backup with gzip compression
mysqldump -u root kbaseai | gzip > backup_$(date +%Y%m%d).sql.gz

# Backup specific table
mysqldump -u root kbaseai customers > customers_backup.sql

# Backup structure only (no data)
mysqldump -u root kbaseai --no-data > schema_only.sql
```

### Restore Database
```bash
# Restore from backup
mysql -u root kbaseai < backup_20240205.sql

# Restore from compressed backup
gunzip < backup_20240205.sql.gz | mysql -u root kbaseai

# Drop and recreate before restore
mysql -u root -e "DROP DATABASE IF EXISTS kbaseai;"
mysql -u root < /app/scripts/mysql_schema.sql
mysql -u root kbaseai < backup_20240205.sql
```

### Reset Database
```bash
# WARNING: This deletes all data!
mysql -u root -e "DROP DATABASE IF EXISTS kbaseai;"
mysql -u root < /app/scripts/mysql_schema.sql
echo "Database reset complete"
```

### Check Database Status
```bash
# Database size and table counts
mysql -u root kbaseai <<EOF
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  ROUND(DATA_LENGTH / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'kbaseai'
ORDER BY DATA_LENGTH DESC;
EOF

# Quick stats
mysql -u root kbaseai <<EOF
SELECT 'Customers' as table_name, COUNT(*) as count FROM customers
UNION ALL
SELECT 'Knowledge Files', COUNT(*) FROM knowledge_files
UNION ALL
SELECT 'Scraped Contents', COUNT(*) FROM scraped_contents
UNION ALL
SELECT 'Conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'Messages', COUNT(*) FROM messages;
EOF
```

### Optimize Tables
```bash
# Optimize all tables
mysql -u root kbaseai -e "
  OPTIMIZE TABLE customers, knowledge_files, scraped_contents, 
  scrape_configs, conversations, messages;
"

# Analyze tables (update statistics)
mysql -u root kbaseai -e "
  ANALYZE TABLE customers, knowledge_files, scraped_contents, 
  scrape_configs, conversations, messages;
"
```

## Common Tasks

### Check Index Usage
```bash
mysql -u root kbaseai <<EOF
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  SEQ_IN_INDEX,
  COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'kbaseai'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
EOF
```

### Find Large Tables
```bash
mysql -u root kbaseai <<EOF
SELECT 
  TABLE_NAME,
  ROUND(DATA_LENGTH / 1024 / 1024, 2) AS 'Data Size (MB)',
  ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS 'Index Size (MB)',
  ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS 'Total Size (MB)'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'kbaseai'
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;
EOF
```

### Clean Old Data
```bash
# Delete conversations older than 90 days
mysql -u root kbaseai <<EOF
DELETE FROM conversations 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
EOF

# Delete orphaned messages (conversations deleted)
mysql -u root kbaseai <<EOF
DELETE m FROM messages m
LEFT JOIN conversations c ON m.conversation_id = c.id
WHERE c.id IS NULL;
EOF
```

### Export Data
```bash
# Export customers to CSV
mysql -u root kbaseai -e "
  SELECT * FROM customers
" --batch --silent > customers.csv

# Export with headers
mysql -u root kbaseai <<EOF
SELECT 'id', 'name', 'webhook_url', 'created_at'
UNION ALL
SELECT id, name, IFNULL(webhook_url, ''), created_at
FROM customers
INTO OUTFILE '/tmp/customers_export.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
EOF
```

### Import Data
```bash
# Import CSV (if exporting to file directly)
mysql -u root kbaseai <<EOF
LOAD DATA LOCAL INFILE '/tmp/customers.csv'
INTO TABLE customers
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
EOF
```

## Database Schema Details

### Tables Summary
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| customers | Multi-tenant customer data | id (PK), name |
| knowledge_files | Uploaded files with content | id (PK), customer_id (FK), content |
| scraped_contents | Website scraped data | id (PK), customer_id (FK), url |
| scrape_configs | Scraping schedules | id (PK), customer_id (FK), urls (JSON) |
| conversations | Chat sessions | id (PK), customer_id (FK), session_id |
| messages | Chat messages | id (PK), conversation_id (FK), role |

### Foreign Key Relationships
- All tables with `customer_id` → `customers(id)` with CASCADE delete
- `messages.conversation_id` → `conversations(id)` with CASCADE delete

### Indexes Created
- Primary keys on all `id` columns
- Foreign key indexes on all `*_id` columns
- Composite indexes for common queries (e.g., customer_id + created_at)
- URL index on scraped_contents (partial, 255 chars)

## Troubleshooting

### MySQL Not Running
```bash
# Check status
sudo service mariadb status

# Start MySQL
sudo service mariadb start

# Check if port is open
netstat -an | grep 3306

# Verify MySQL process
ps aux | grep mysqld
```

### Access Denied Errors
```bash
# Grant all privileges to root
sudo mysql -e "
  GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost';
  FLUSH PRIVILEGES;
"

# Reset root password (if needed)
sudo mysql -e "
  ALTER USER 'root'@'localhost' IDENTIFIED BY '';
  FLUSH PRIVILEGES;
"
```

### Table Already Exists
```bash
# Drop and recreate single table
mysql -u root kbaseai -e "DROP TABLE IF EXISTS customers;"
# Then re-run schema creation

# Or use IF NOT EXISTS (already in schema.sql)
```

### Disk Space Issues
```bash
# Check disk usage
df -h

# Check MySQL data directory size
du -sh /var/lib/mysql/

# Clean binary logs if needed
mysql -u root -e "PURGE BINARY LOGS BEFORE NOW();"
```

### Slow Queries
```bash
# Enable slow query log
mysql -u root -e "
  SET GLOBAL slow_query_log = 'ON';
  SET GLOBAL long_query_time = 2;
"

# Check slow query log
tail -f /var/log/mysql/mysql-slow.log

# Analyze slow queries
mysql -u root kbaseai -e "EXPLAIN SELECT * FROM knowledge_files WHERE customer_id = 'xxx';"
```

## Performance Tips

1. **Use Indexes** - Schema already includes optimal indexes
2. **Limit Results** - Always use LIMIT for large tables
3. **Avoid SELECT *** - Exclude `content` field when not needed
4. **Use Connection Pooling** - Backend already configured (max: 10)
5. **Regular Maintenance** - Run OPTIMIZE TABLE monthly
6. **Monitor Slow Queries** - Enable and review slow query log
7. **Use EXPLAIN** - Analyze query execution plans

## Security Best Practices

### Production Security
```bash
# 1. Create dedicated user
mysql -u root <<EOF
CREATE USER 'kbaseai_prod'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON kbaseai.* TO 'kbaseai_prod'@'localhost';
FLUSH PRIVILEGES;
EOF

# 2. Remove test users
mysql -u root -e "DELETE FROM mysql.user WHERE User='';"

# 3. Bind to localhost only (in /etc/mysql/mariadb.conf.d/50-server.cnf)
# bind-address = 127.0.0.1

# 4. Enable SSL (if needed for remote connections)

# 5. Regular password rotation
```

### Backup Best Practices
- Automate daily backups via cron
- Store backups off-server (S3, remote storage)
- Test restore procedures regularly
- Keep at least 30 days of backups
- Encrypt backup files

### Example Backup Cron Job
```bash
# Add to crontab: crontab -e
0 2 * * * mysqldump -u root kbaseai | gzip > /backups/kbaseai_$(date +\%Y\%m\%d).sql.gz

# With automatic cleanup (keep last 30 days)
0 2 * * * mysqldump -u root kbaseai | gzip > /backups/kbaseai_$(date +\%Y\%m\%d).sql.gz && find /backups -name "kbaseai_*.sql.gz" -mtime +30 -delete
```

## Additional Resources

- MySQL Documentation: https://dev.mysql.com/doc/
- MariaDB Documentation: https://mariadb.com/kb/en/
- Sequelize ORM: https://sequelize.org/docs/
- MySQL Performance Tuning: https://dev.mysql.com/doc/refman/8.0/en/optimization.html

## Support

For database issues:
1. Check MySQL service: `sudo service mariadb status`
2. Review error logs: `tail -f /var/log/mysql/error.log`
3. Test connection: `mysql -u root -e "SELECT 1;"`
4. Verify database exists: `mysql -u root -e "SHOW DATABASES;" | grep kbaseai`
5. Check table structure: `mysql -u root kbaseai -e "SHOW TABLES;"`
