-- ============================================
-- MIGRATION 008: CHAT SESSIONS & HISTORY
-- ============================================
-- Purpose: Add session management for AI chat conversations
-- Date: 2026-04-25
-- ============================================

-- Create chat_sessions table (using correct table name: chat_conversations)
CREATE TABLE IF NOT EXISTS chat_sessions (
  session_id VARCHAR(50) PRIMARY KEY,
  conv_id VARCHAR(50) NOT NULL,
  title VARCHAR(255) DEFAULT 'New Chat',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP NULL,
  message_count INT DEFAULT 0,
  folder VARCHAR(100) DEFAULT 'general',
  is_archived BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (conv_id) REFERENCES chat_conversations(conv_id) ON DELETE CASCADE,
  INDEX idx_conv_id (conv_id),
  INDEX idx_updated_at (updated_at DESC),
  INDEX idx_folder (folder),
  INDEX idx_archived (is_archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add session_id to chat_messages table (if not exists)
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS session_id VARCHAR(50) DEFAULT NULL AFTER conv_id,
ADD INDEX IF NOT EXISTS idx_session_id (session_id);

-- Add foreign key constraint (optional, skip if causes issues)
-- ALTER TABLE chat_messages
-- ADD CONSTRAINT fk_chat_messages_session
-- FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE SET NULL;

-- Create default session for existing AI conversations
INSERT IGNORE INTO chat_sessions (session_id, conv_id, title, message_count, last_message_at)
SELECT 
  CONCAT('session-', c.conv_id, '-default') as session_id,
  c.conv_id,
  'General Chat' as title,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as last_message_at
FROM chat_conversations c
LEFT JOIN chat_messages m ON c.conv_id = m.conv_id
WHERE c.type IN ('ai_agent', 'ai_personal')
GROUP BY c.conv_id;

-- Update existing messages to link to default session
UPDATE chat_messages m
JOIN chat_sessions s ON m.conv_id = s.conv_id AND s.title = 'General Chat'
SET m.session_id = s.session_id
WHERE m.session_id IS NULL;
