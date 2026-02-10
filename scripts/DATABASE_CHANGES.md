# Database Changes for Scalability Features

## Overview
To support async job processing, caching, and rate limiting, we've added new fields to the database schema.

## Changes Made

### 1. knowledge_files Table
**New Columns:**
- `status` VARCHAR(50) - Track processing state
  - Values: `pending`, `processing`, `completed`, `failed`
  - Default: `pending`
- `job_id` VARCHAR(100) - Bull queue job ID for tracking
- `processing_error` TEXT - Store error messages if processing fails

**New Indexes:**
- `idx_status` - Fast filtering by processing status
- `idx_job_id` - Quick job lookup

### 2. scraped_contents Table  
**New Columns:**
- `status` VARCHAR(50) - Track scraping state
  - Values: `pending`, `processing`, `completed`, `failed`
  - Default: `pending`
- `job_id` VARCHAR(100) - Bull queue job ID for tracking
- `processing_error` TEXT - Store error messages if scraping fails

**New Indexes:**
- `idx_status` - Fast filtering by processing status
- `idx_job_id` - Quick job lookup

## Why These Changes?

### Async Processing Support
- Files now upload instantly and process in background
- Users don't wait for text extraction or embedding generation
- Status field lets UI show "Processing..." or "Failed" states

### Job Tracking
- `job_id` links database records to Bull queue jobs
- Can query job status: progress, errors, completion time
- Enables retry logic and failure recovery

### Error Handling
- `processing_error` stores detailed error messages
- Helps debugging and user support
- Can show meaningful errors in UI

## Migration

### For Existing Databases:
Run the migration script:
```bash
sudo mysql < /app/scripts/migration_add_status_fields.sql
```

### For New Databases:
Use the updated schema:
```bash
sudo mysql < /app/scripts/mysql_schema.sql
```

## Impact on Application

### File Upload Flow (Before):
1. User uploads file → waits
2. Server extracts text → user waits
3. Server creates embeddings → user waits
4. Server stores in Pinecone → user waits
5. Response returned (can take 30+ seconds)

### File Upload Flow (After):
1. User uploads file → instant response ✅
2. Record created with `status='pending'`
3. Job queued for background processing
4. User can continue using app
5. Background worker processes file
6. Status updates to `completed` or `failed`

### Benefits:
- **Better UX:** No more waiting for uploads
- **Scalability:** Workers can be scaled independently
- **Resilience:** Failed jobs can be retried automatically
- **Visibility:** Users can see processing progress

## Status Values

### knowledge_files.status
- `pending` - File uploaded, waiting for processing
- `processing` - Currently being processed by worker
- `completed` - Successfully processed and embedded
- `failed` - Processing failed (see processing_error)

### scraped_contents.status  
- `pending` - URL added, waiting for scraping
- `processing` - Currently being scraped
- `completed` - Successfully scraped and embedded
- `failed` - Scraping failed (see processing_error)

## Monitoring Queries

### Check Processing Status:
```sql
-- Files by status
SELECT status, COUNT(*) as count 
FROM knowledge_files 
GROUP BY status;

-- Failed files with errors
SELECT filename, status, processing_error, uploaded_at
FROM knowledge_files
WHERE status = 'failed'
ORDER BY uploaded_at DESC;

-- Pending jobs older than 10 minutes (stuck?)
SELECT id, filename, uploaded_at, TIMESTAMPDIFF(MINUTE, uploaded_at, NOW()) as minutes_pending
FROM knowledge_files
WHERE status = 'pending' 
  AND uploaded_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE);
```

### Check Queue Health:
```sql
-- Processing time distribution
SELECT 
  TIMESTAMPDIFF(SECOND, uploaded_at, updated_at) as processing_seconds,
  COUNT(*) as count
FROM knowledge_files
WHERE status = 'completed'
GROUP BY processing_seconds
ORDER BY processing_seconds;
```

## Rollback (If Needed)

To remove the new columns:
```sql
ALTER TABLE knowledge_files 
  DROP COLUMN status,
  DROP COLUMN job_id,
  DROP COLUMN processing_error,
  DROP INDEX idx_status,
  DROP INDEX idx_job_id;

ALTER TABLE scraped_contents 
  DROP COLUMN status,
  DROP COLUMN job_id,
  DROP COLUMN processing_error,
  DROP INDEX idx_status,
  DROP INDEX idx_job_id;
```

## Notes

- **Existing Records:** Set to `status='completed'` during migration (they were processed synchronously)
- **Backward Compatible:** App works even if status is NULL (defaults to completed)
- **No Data Loss:** Adding columns is non-destructive
- **Index Performance:** New indexes improve query performance for status filtering
