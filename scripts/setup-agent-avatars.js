/**
 * Generate and assign avatar images for AI agents
 * Creates SVG-based avatars and saves them as PNG files
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

// Agent avatar configs - each agent gets a unique color + icon
const AGENT_AVATARS = {
  'content-writer': { color: '#8B5CF6', bg: '#EDE9FE', icon: '✍️', label: 'CW' },
  'data-analyst':   { color: '#0EA5E9', bg: '#E0F2FE', icon: '📊', label: 'DA' },
  'developer':      { color: '#10B981', bg: '#D1FAE5', icon: '💻', label: 'DEV' },
  'project-manager':{ color: '#F59E0B', bg: '#FEF3C7', icon: '📋', label: 'PM' },
};

function generateSVGAvatar(label, color, bg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color}cc;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="100" fill="url(#grad)"/>
  <text x="100" y="115" font-family="Arial, sans-serif" font-size="${label.length > 2 ? '52' : '64'}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`;
}

async function setupAgentAvatars() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'raytask',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to database');

    // Create avatar directory
    const avatarDir = path.join(process.cwd(), 'public', 'uploads', 'avatar');
    if (!fs.existsSync(avatarDir)) {
      fs.mkdirSync(avatarDir, { recursive: true });
    }

    // Get all agents
    const [agents] = await conn.execute('SELECT agent_id, name, role, avatar FROM ai_agents WHERE is_personal = 0');
    console.log(`Found ${agents.length} global AI agents`);

    for (const agent of agents) {
      // Determine which config to use based on role/name
      let config = null;
      const nameLower = agent.name.toLowerCase();
      const roleLower = (agent.role || '').toLowerCase();

      if (nameLower.includes('content') || roleLower.includes('content')) {
        config = AGENT_AVATARS['content-writer'];
      } else if (nameLower.includes('data') || roleLower.includes('data') || roleLower.includes('analyst')) {
        config = AGENT_AVATARS['data-analyst'];
      } else if (nameLower.includes('developer') || nameLower.includes('dev') || roleLower.includes('developer')) {
        config = AGENT_AVATARS['developer'];
      } else if (nameLower.includes('project') || nameLower.includes('manager') || roleLower.includes('project')) {
        config = AGENT_AVATARS['project-manager'];
      } else {
        // Default: use first 2 chars of name
        config = { color: '#6366F1', bg: '#EEF2FF', label: agent.name.substring(0, 2).toUpperCase() };
      }

      const filename = `agent-${agent.agent_id}.svg`;
      const filepath = path.join(avatarDir, filename);
      const avatarPath = `avatar/${filename}`;

      // Generate SVG avatar
      const svg = generateSVGAvatar(config.label, config.color, config.bg);
      fs.writeFileSync(filepath, svg);

      // Update database
      await conn.execute(
        'UPDATE ai_agents SET avatar = ? WHERE agent_id = ?',
        [avatarPath, agent.agent_id]
      );

      console.log(`✅ ${agent.name} → ${avatarPath}`);
    }

    // Also copy user avatars from assets to public/uploads/avatar if not already there
    const sourceDir = path.join(process.cwd(), 'assets', 'database', 'employee', 'avatar');
    if (fs.existsSync(sourceDir)) {
      const files = fs.readdirSync(sourceDir);
      let copied = 0;
      for (const file of files) {
        const dest = path.join(avatarDir, file);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(sourceDir, file), dest);
          copied++;
        }
      }
      console.log(`\n✅ Copied ${copied} user avatar files to public/uploads/avatar`);
    }

    // Verify user avatars are set in DB
    const [usersWithAvatar] = await conn.execute(
      'SELECT COUNT(*) as total FROM users WHERE avatar IS NOT NULL AND avatar != ""'
    );
    const [usersTotal] = await conn.execute('SELECT COUNT(*) as total FROM users');
    console.log(`\n📊 Users with avatar: ${usersWithAvatar[0].total} / ${usersTotal[0].total}`);

    const [agentsWithAvatar] = await conn.execute(
      'SELECT COUNT(*) as total FROM ai_agents WHERE avatar IS NOT NULL AND avatar != ""'
    );
    const [agentsTotal] = await conn.execute('SELECT COUNT(*) as total FROM ai_agents');
    console.log(`📊 Agents with avatar: ${agentsWithAvatar[0].total} / ${agentsTotal[0].total}`);

    console.log('\n🎉 Agent avatars setup complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

setupAgentAvatars();
