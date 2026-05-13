/**
 * Migration: Chat & Calendar tables
 * Run: node scripts/migrate-chat-calendar.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
    multipleStatements: true,
  });

  console.log('Connected. Running migrations...');

  const sql = `
-- ─────────────────────────────────────────────
-- CHAT SYSTEM
-- ─────────────────────────────────────────────

-- Conversations (direct, group, ai-agent)
CREATE TABLE IF NOT EXISTS chat_conversations (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  conv_id       VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
  type          ENUM('direct','group','ai_agent','ai_personal') NOT NULL DEFAULT 'direct',
  name          VARCHAR(255) NULL,
  description   TEXT NULL,
  avatar        VARCHAR(500) NULL,
  created_by    VARCHAR(100) NOT NULL,
  agent_id      VARCHAR(100) NULL,   -- for ai_agent type
  is_archived   TINYINT(1) DEFAULT 0,
  last_message  TEXT NULL,
  last_msg_at   DATETIME NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_created_by (created_by),
  INDEX idx_last_msg_at (last_msg_at)
);

-- Conversation members
CREATE TABLE IF NOT EXISTS chat_members (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  conv_id       VARCHAR(36) NOT NULL,
  username      VARCHAR(100) NOT NULL,
  role          ENUM('owner','admin','member') DEFAULT 'member',
  joined_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_read_at  DATETIME NULL,
  is_muted      TINYINT(1) DEFAULT 0,
  UNIQUE KEY uq_conv_user (conv_id, username),
  INDEX idx_username (username),
  FOREIGN KEY (conv_id) REFERENCES chat_conversations(conv_id) ON DELETE CASCADE
);

-- Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  msg_id        VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
  conv_id       VARCHAR(36) NOT NULL,
  sender        VARCHAR(100) NOT NULL,
  content       TEXT NOT NULL,
  msg_type      ENUM('text','image','file','system','ai') DEFAULT 'text',
  reply_to      VARCHAR(36) NULL,
  is_edited     TINYINT(1) DEFAULT 0,
  is_deleted    TINYINT(1) DEFAULT 0,
  metadata      JSON NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_conv_id (conv_id),
  INDEX idx_sender (sender),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (conv_id) REFERENCES chat_conversations(conv_id) ON DELETE CASCADE
);

-- AI Agents
CREATE TABLE IF NOT EXISTS ai_agents (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  agent_id      VARCHAR(100) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  description   TEXT NULL,
  avatar        VARCHAR(500) NULL,
  role          VARCHAR(255) NULL,
  system_prompt TEXT NOT NULL,
  knowledge_base TEXT NULL,
  model         VARCHAR(100) DEFAULT 'gpt-4o-mini',
  is_active     TINYINT(1) DEFAULT 1,
  is_personal   TINYINT(1) DEFAULT 0,
  owner_username VARCHAR(100) NULL,
  created_by    VARCHAR(100) NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_agent_id (agent_id),
  INDEX idx_is_active (is_active)
);

-- AI Agent memory (per user)
CREATE TABLE IF NOT EXISTS ai_agent_memory (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  agent_id      VARCHAR(100) NOT NULL,
  username      VARCHAR(100) NOT NULL,
  memory_key    VARCHAR(255) NOT NULL,
  memory_value  TEXT NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_agent_user_key (agent_id, username, memory_key),
  INDEX idx_agent_user (agent_id, username)
);

-- ─────────────────────────────────────────────
-- CALENDAR SYSTEM
-- ─────────────────────────────────────────────

-- Calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  event_id      VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
  title         VARCHAR(500) NOT NULL,
  description   TEXT NULL,
  event_type    ENUM('event','task','reminder','appointment','meeting') DEFAULT 'event',
  start_at      DATETIME NOT NULL,
  end_at        DATETIME NOT NULL,
  all_day       TINYINT(1) DEFAULT 0,
  color         VARCHAR(20) DEFAULT '#7c3aed',
  location      VARCHAR(500) NULL,
  attendees     TEXT NULL,
  created_by    VARCHAR(100) NOT NULL,
  -- Links to existing entities
  task_id       VARCHAR(20) NULL,
  project_id    VARCHAR(20) NULL,
  -- Recurrence
  recurrence    ENUM('none','daily','weekly','monthly','yearly') DEFAULT 'none',
  recur_until   DATE NULL,
  is_cancelled  TINYINT(1) DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_start_at (start_at),
  INDEX idx_created_by (created_by),
  INDEX idx_task_id (task_id),
  INDEX idx_project_id (project_id)
);

-- ─────────────────────────────────────────────
-- SEED: Default AI Agents
-- ─────────────────────────────────────────────

INSERT IGNORE INTO ai_agents (agent_id, name, description, role, system_prompt, is_active, is_personal, created_by) VALUES
(
  'agent-project-manager',
  'Project Manager AI',
  'Ahli manajemen project, timeline, dan resource allocation',
  'Project Manager',
  'Kamu adalah AI Project Manager yang ahli. Kamu membantu tim dalam merencanakan project, mengidentifikasi risiko, membuat timeline, dan memastikan semua task berjalan sesuai rencana. Kamu punya akses ke data project dan task terbaru. Berikan saran yang actionable dan spesifik.',
  1, 0, 'system'
),
(
  'agent-analyst',
  'Data Analyst AI',
  'Analisis data, laporan, dan insight bisnis',
  'Data Analyst',
  'Kamu adalah AI Data Analyst. Kamu menganalisis data project, task, dan performa tim untuk memberikan insight yang berguna. Kamu bisa membuat ringkasan, mengidentifikasi bottleneck, dan memberikan rekomendasi berbasis data.',
  1, 0, 'system'
),
(
  'agent-writer',
  'Content Writer AI',
  'Membantu menulis brief, dokumentasi, dan konten',
  'Content Writer',
  'Kamu adalah AI Content Writer yang kreatif. Kamu membantu tim dalam menulis brief project, dokumentasi teknis, email profesional, dan konten lainnya. Kamu selalu menulis dengan jelas, terstruktur, dan sesuai konteks.',
  1, 0, 'system'
),
(
  'agent-dev',
  'Developer AI',
  'Bantuan coding, review code, dan solusi teknis',
  'Software Developer',
  'Kamu adalah AI Developer yang berpengalaman. Kamu membantu dengan pertanyaan teknis, review code, debugging, arsitektur sistem, dan best practices. Kamu memberikan contoh kode yang konkret dan penjelasan yang mudah dipahami.',
  1, 0, 'system'
);
  `;

  try {
    await conn.query(sql);
    console.log('✅ Migration completed successfully!');
    console.log('Tables created: chat_conversations, chat_members, chat_messages, ai_agents, ai_agent_memory, calendar_events');
    console.log('Seeded: 4 default AI agents');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    throw err;
  } finally {
    await conn.end();
  }
}

migrate().catch(console.error);
