const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
    port: parseInt(process.env.DB_PORT || '3306')
  });
  
  console.log('🗑️  Removing duplicate personal AIs...');
  
  // Delete duplicate personal AIs (keep the oldest one)
  await conn.execute(`
    DELETE a1 FROM ai_agents a1
    INNER JOIN ai_agents a2 
    WHERE a1.is_personal = 1 
      AND a2.is_personal = 1
      AND a1.owner_username = a2.owner_username
      AND a1.id > a2.id
  `);
  
  console.log('✅ Duplicates removed\n');
  
  // Show remaining personal AIs
  const [personal] = await conn.execute(`
    SELECT agent_id, name, owner_username 
    FROM ai_agents 
    WHERE is_personal = 1
  `);
  
  console.log('Personal AIs:');
  personal.forEach(ai => {
    console.log(`   - ${ai.name} (${ai.owner_username})`);
  });
  
  await conn.end();
})();
