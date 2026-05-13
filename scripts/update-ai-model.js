/**
 * Update AI Model to gemini-2.5-flash
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ray-task_management',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function main() {
  const connection = await mysql.createConnection(dbConfig);
  
  console.log('🔄 Updating AI model to gemini-2.5-flash...\n');
  
  await connection.execute(`
    UPDATE ai_agents 
    SET model = 'gemini-2.5-flash'
    WHERE model LIKE 'gemini%'
  `);
  
  const [agents] = await connection.execute(`
    SELECT agent_id, name, model 
    FROM ai_agents 
    ORDER BY name
  `);
  
  console.log('✅ Updated AI Agents:');
  agents.forEach(agent => {
    console.log(`   - ${agent.name}: ${agent.model}`);
  });
  
  await connection.end();
  console.log('\n✅ Done!');
}

main();
