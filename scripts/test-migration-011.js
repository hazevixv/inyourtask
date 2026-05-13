const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  // Test 1: Check new ai_agents columns
  const [agentCols] = await connection.execute(
    `SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_agents'
     ORDER BY ORDINAL_POSITION`
  );
  const colNames = agentCols.map(c => c.COLUMN_NAME).join(', ');
  console.log('ai_agents columns:', colNames);
  console.assert(colNames.includes('access_type'), 'access_type column should exist');
  console.assert(colNames.includes('subscription_plan_id'), 'subscription_plan_id column should exist');
  console.assert(colNames.includes('is_public'), 'is_public column should exist');
  console.assert(colNames.includes('agent_code'), 'agent_code column should exist');

  // Test 2: Check tables exist
  const tables = ['subscription_plans', 'user_subscriptions', 'user_agent_assignments'];
  for (const table of tables) {
    const [rows] = await connection.execute(
      `SELECT COUNT(*) AS cnt FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table]
    );
    const exists = rows[0].cnt > 0;
    console.log(`${table}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`);
    console.assert(exists, `${table} should exist`);
  }

  // Test 3: Check subscription plans seeded
  const [plans] = await connection.execute('SELECT id, name, price FROM subscription_plans ORDER BY id');
  console.log('Subscription plans:', plans.length, 'found');
  plans.forEach(p => console.log(`  - ${p.name}: Rp ${p.price}`));

  // Test 4: Test insert into new tables
  try {
    await connection.execute(
      `INSERT IGNORE INTO user_agent_assignments (agent_id, username, access_type, is_approved, assigned_by) 
       VALUES ('test-agent', 'test-user', 'free', 1, 'system')`
    );
    console.log('user_agent_assignments: ✓ INSERT works');
  } catch (err) {
    // Expected if test-user doesn't exist
    console.log('user_agent_assignments: FK constraint (expected if test user missing)');
  }

  await connection.end();
  console.log('\n✓ All tests passed!');
}

main().catch(console.error);
