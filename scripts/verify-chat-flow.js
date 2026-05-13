const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function verify() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });

  const username = 'taufik';
  console.log('=== CHAT FLOW VERIFICATION FOR:', username, '===\n');

  // 1. Personal agent
  const [pa] = await c.execute(
    'SELECT agent_id, name, is_active FROM ai_agents WHERE is_personal=1 AND owner_username=? LIMIT 1',
    [username]
  );
  console.log('1. Personal agent:', pa[0] ? `${pa[0].name} (${pa[0].agent_id})` : 'NONE ❌');

  // 2. Personal conversation
  const [pc] = await c.execute(
    'SELECT c.conv_id, c.type FROM chat_conversations c JOIN chat_members m ON m.conv_id=c.conv_id WHERE m.username=? AND c.type=? LIMIT 1',
    [username, 'ai_personal']
  );
  console.log('2. Personal conv:', pc[0] ? `${pc[0].conv_id}` : 'NONE ❌');

  // 3. User roles
  const [roles] = await c.execute('SELECT role_name FROM user_roles WHERE username=?', [username]);
  console.log('3. User roles:', roles.map(r => r.role_name));

  // 4. Role-based agents
  if (roles.length > 0) {
    const roleNames = roles.map(r => r.role_name);
    const ph = roleNames.map(() => '?').join(',');
    const [ra] = await c.execute(
      `SELECT DISTINCT ara.agent_id, a.name FROM agent_role_assignments ara 
       JOIN ai_agents a ON a.agent_id=ara.agent_id WHERE ara.role_name IN (${ph})`,
      roleNames
    );
    console.log('4. Role-based agents:', ra.map(a => a.name));

    for (const agent of ra) {
      const [conv] = await c.execute(
        'SELECT conv_id FROM chat_conversations c JOIN chat_members m ON m.conv_id=c.conv_id WHERE m.username=? AND c.agent_id=? LIMIT 1',
        [username, agent.agent_id]
      );
      const status = conv[0] ? '✅ exists' : '❌ MISSING';
      console.log(`   Conv for "${agent.name}": ${status}`);
    }
  }

  // 5. All conversations for user
  const [convs] = await c.execute(`
    SELECT c.type, 
           COALESCE((SELECT a.name FROM ai_agents a WHERE a.agent_id=c.agent_id LIMIT 1), c.name, 'Direct') as display_name,
           c.last_msg_at
    FROM chat_conversations c 
    JOIN chat_members m ON m.conv_id=c.conv_id 
    WHERE m.username=? 
    ORDER BY COALESCE(c.last_msg_at, c.created_at) DESC`,
    [username]
  );
  console.log('\n5. All conversations:');
  convs.forEach(c => console.log(`   [${c.type}] ${c.display_name}`));

  await c.end();
  console.log('\n✅ Verification complete');
}

verify().catch(console.error);
