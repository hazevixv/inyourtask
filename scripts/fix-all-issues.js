/**
 * Fix All Common Issues
 * Run: node scripts/fix-all-issues.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function fixAllIssues() {
  console.log('🔧 Fixing all common issues...\n');
  
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  };

  let connection;
  let issuesFixed = 0;
  let issuesFound = 0;

  try {
    // 1. Test database connection
    console.log('1️⃣  Testing database connection...');
    try {
      connection = await mysql.createConnection(config);
      console.log('   ✅ Database connected\n');
    } catch (error) {
      console.error('   ❌ Database connection failed:', error.message);
      console.error('\n💡 Fix: Check if MySQL is running and .env is configured correctly\n');
      process.exit(1);
    }

    // 2. Check required tables
    console.log('2️⃣  Checking required tables...');
    const requiredTables = [
      'users', 'projects', 'tasks', 'brain_config', 'brain_defaults',
      'weekly_snapshot', 'calendar_events', 'ai_conversations', 'ai_messages',
      'chat_conversations', 'chat_members', 'chat_messages', 'chat_ai_agents'
    ];

    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?
    `, [config.database]);

    const existingTables = tables.map(t => t.TABLE_NAME);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));

    if (missingTables.length > 0) {
      issuesFound++;
      console.log(`   ⚠️  Missing tables: ${missingTables.join(', ')}`);
      console.log('   💡 Run: node scripts/init-chat-tables.js');
      console.log('   💡 Or import your SQL dump\n');
    } else {
      console.log('   ✅ All required tables exist\n');
    }

    // 3. Check if tables have data
    console.log('3️⃣  Checking table data...');
    const [projectCount] = await connection.execute('SELECT COUNT(*) as count FROM projects');
    const [taskCount] = await connection.execute('SELECT COUNT(*) as count FROM tasks');
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');

    console.log(`   Projects: ${projectCount[0].count}`);
    console.log(`   Tasks: ${taskCount[0].count}`);
    console.log(`   Users: ${userCount[0].count}`);

    if (projectCount[0].count === 0 && taskCount[0].count === 0) {
      issuesFound++;
      console.log('   ⚠️  No data found');
      console.log('   💡 Run: node scripts/init-sample-data.js\n');
    } else {
      console.log('   ✅ Data exists\n');
    }

    // 4. Check brain_config
    console.log('4️⃣  Checking brain configuration...');
    const [brainConfig] = await connection.execute('SELECT COUNT(*) as count FROM brain_config');
    const [brainDefaults] = await connection.execute('SELECT COUNT(*) as count FROM brain_defaults');

    console.log(`   Brain Config: ${brainConfig[0].count}`);
    console.log(`   Brain Defaults: ${brainDefaults[0].count}`);

    if (brainConfig[0].count === 0 || brainDefaults[0].count === 0) {
      issuesFound++;
      console.log('   ⚠️  Brain configuration incomplete');
      console.log('   💡 Run: node scripts/init-brain-tables.js\n');
    } else {
      console.log('   ✅ Brain configuration OK\n');
    }

    // 5. Check for orphaned tasks (tasks without projects)
    console.log('5️⃣  Checking for orphaned tasks...');
    const [orphanedTasks] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM tasks t 
      LEFT JOIN projects p ON t.project_id = p.project_id 
      WHERE p.project_id IS NULL
    `);

    if (orphanedTasks[0].count > 0) {
      issuesFound++;
      console.log(`   ⚠️  Found ${orphanedTasks[0].count} orphaned tasks`);
      console.log('   💡 These tasks reference non-existent projects\n');
    } else {
      console.log('   ✅ No orphaned tasks\n');
    }

    // 6. Check project due_date sync
    console.log('6️⃣  Checking project due_date sync...');
    const [unsyncedProjects] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM projects p
      LEFT JOIN (
        SELECT project_id, MAX(due_date) as max_due_date
        FROM tasks
        WHERE due_date IS NOT NULL
        GROUP BY project_id
      ) t ON p.project_id = t.project_id
      WHERE t.max_due_date IS NOT NULL 
      AND (p.due_date IS NULL OR p.due_date != t.max_due_date)
    `);

    if (unsyncedProjects[0].count > 0) {
      issuesFound++;
      issuesFixed++;
      console.log(`   ⚠️  Found ${unsyncedProjects[0].count} projects with unsynced due_date`);
      console.log('   🔧 Syncing now...');
      
      await connection.execute(`
        UPDATE projects p
        LEFT JOIN (
          SELECT project_id, MAX(due_date) as max_due_date
          FROM tasks
          WHERE due_date IS NOT NULL
          GROUP BY project_id
        ) t ON p.project_id = t.project_id
        SET p.due_date = t.max_due_date
        WHERE t.max_due_date IS NOT NULL
      `);
      
      console.log('   ✅ Project due dates synced\n');
    } else {
      console.log('   ✅ Project due dates are synced\n');
    }

    // 7. Check .next cache
    console.log('7️⃣  Checking Next.js cache...');
    const nextPath = path.join(process.cwd(), '.next');
    if (fs.existsSync(nextPath)) {
      issuesFound++;
      console.log('   ⚠️  .next cache exists (may cause webpack issues)');
      console.log('   💡 Recommendation: Delete .next folder and restart dev server\n');
    } else {
      console.log('   ✅ No .next cache\n');
    }

    // 8. Check .env configuration
    console.log('8️⃣  Checking .env configuration...');
    const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME', 'GROQ_API_KEY'];
    const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

    if (missingEnvVars.length > 0) {
      issuesFound++;
      console.log(`   ⚠️  Missing env vars: ${missingEnvVars.join(', ')}`);
      console.log('   💡 Check your .env file\n');
    } else {
      console.log('   ✅ All required env vars present\n');
    }

    // Summary
    console.log('═'.repeat(50));
    console.log('📊 SUMMARY\n');
    console.log(`   Issues Found: ${issuesFound}`);
    console.log(`   Issues Fixed: ${issuesFixed}`);
    console.log(`   Manual Fixes Needed: ${issuesFound - issuesFixed}`);
    console.log('═'.repeat(50));

    if (issuesFound === 0) {
      console.log('\n✅ Everything looks good! No issues found.\n');
    } else if (issuesFound === issuesFixed) {
      console.log('\n✅ All issues have been fixed automatically!\n');
      console.log('💡 Recommended next steps:');
      console.log('   1. Delete .next folder: rm -rf .next');
      console.log('   2. Restart dev server: npm run dev');
      console.log('   3. Hard refresh browser: Ctrl+Shift+R\n');
    } else {
      console.log('\n⚠️  Some issues require manual fixes. See recommendations above.\n');
      console.log('💡 Quick fix commands:');
      console.log('   node scripts/init-sample-data.js     # Add sample data');
      console.log('   node scripts/init-brain-tables.js    # Fix brain config');
      console.log('   node scripts/init-chat-tables.js     # Create chat tables');
      console.log('   rm -rf .next && npm run dev          # Clear cache & restart\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixAllIssues();
