-- Migration: Add status tracking fields for async job processing
-- Version: 2.0.0
-- Date: 2025-02-05

USE kbaseai;

-- Add status column to knowledge_files for tracking async processing
ALTER TABLE knowledge_files 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed' AFTER content,
ADD COLUMN IF NOT EXISTS job_id VARCHAR(100) DEFAULT NULL AFTER status,
ADD COLUMN IF NOT EXISTS processing_error TEXT DEFAULT NULL AFTER job_id,
ADD INDEX IF NOT EXISTS idx_status (status),
ADD INDEX IF NOT EXISTS idx_job_id (job_id);

-- Add status column to scraped_contents for tracking async scraping
ALTER TABLE scraped_contents 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed' AFTER content,
ADD COLUMN IF NOT EXISTS job_id VARCHAR(100) DEFAULT NULL AFTER status,
ADD COLUMN IF NOT EXISTS processing_error TEXT DEFAULT NULL AFTER job_id,
ADD INDEX IF NOT EXISTS idx_status (status),
ADD INDEX IF NOT EXISTS idx_job_id (job_id);

-- Update existing records to have 'completed' status (they were processed synchronously before)
UPDATE knowledge_files SET status = 'completed' WHERE status IS NULL;
UPDATE scraped_contents SET status = 'completed' WHERE status IS NULL;

-- Add comments for documentation
ALTER TABLE knowledge_files 
COMMENT = 'Knowledge base files with async processing support';

ALTER TABLE scraped_contents 
COMMENT = 'Scraped website content with async processing support';
