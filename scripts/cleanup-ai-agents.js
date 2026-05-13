/**
 * Cleanup and Fix AI Agents
 * Remove old agents and keep only the 4 main ones
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
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected\n');

    // Delete old agents (keep only the new ones with gemini model)
    console.log('🗑️  Removing old AI agents...');
    await connection.execute(`
      DELETE FROM ai_agents 
      WHERE agent_id IN ('agent-writer', 'agent-analyst', 'agent-dev')
        OR model = 'gpt-4o-mini'
    `);
    console.log('✅ Old agents removed\n');

    // Update agent names to match screenshot
    console.log('📝 Updating agent names...');
    
    await connection.execute(`
      UPDATE ai_agents 
      SET name = 'Content Writer AI',
          description = 'Expert in creating engaging content, blog posts, and marketing copy.',
          role = 'Content Writer'
      WHERE agent_id = 'agent-content-writer'
    `);
    
    await connection.execute(`
      UPDATE ai_agents 
      SET name = 'Data Analyst AI',
          description = 'Specialized in data analysis, visualization, and insights.',
          role = 'Data Analyst'
      WHERE agent_id = 'agent-data-analyst'
    `);
    
    await connection.execute(`
      UPDATE ai_agents 
      SET name = 'Developer AI',
          description = 'Expert in software development, debugging, and code review.',
          role = 'Software Developer'
      WHERE agent_id = 'agent-developer'
    `);
    
    await connection.execute(`
      UPDATE ai_agents 
      SET name = 'Project Manager AI',
          description = 'Helps with project planning, task management, and team coordination.',
          role = 'Project Manager'
      WHERE agent_id = 'agent-project-manager'
    `);
    
    console.log('✅ Agent names updated\n');

    // Verify final list
    console.log('📋 Final AI Agents List:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const [agents] = await connection.execute(`
      SELECT agent_id, name, role, description, model, is_active
      FROM ai_agents
      WHERE is_personal = 0
      ORDER BY name
    `);

    agents.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.name}`);
      console.log(`   Role: ${agent.role}`);
      console.log(`   Description: ${agent.description}`);
      console.log(`   Model: ${agent.model}`);
      console.log(`   Status: ${agent.is_active ? '✅ Active' : '❌ Inactive'}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  🎉 ${agents.length} AI Agents Ready!`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
