const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Starting database migration...\n');
  
  // Database connection config
  const config = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'ray-task_management',
    multipleStatements: true
  };

  let connection;
  
  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', 'add_organizational_tree.sql');
    console.log('📄 Reading migration file:', migrationPath);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Execute migration
    console.log('⚙️  Executing migration...');
    const [results] = await connection.query(sql);
    console.log('✅ Migration executed successfully\n');

    // Verify tables
    console.log('🔍 Verifying organizational_units table...');
    const [tables] = await connection.query("SHOW TABLES LIKE 'organizational_units'");
    if (tables.length > 0) {
      console.log('✅ organizational_units table exists\n');
      
      // Count units
      const [count] = await connection.query('SELECT COUNT(*) as count FROM organizational_units');
      console.log(`📊 Total organizational units: ${count[0].count}\n`);
      
      // Show sample data
      const [units] = await connection.query('SELECT unit_code, unit_name, unit_type, level FROM organizational_units ORDER BY path LIMIT 10');
      console.log('📋 Sample organizational units:');
      units.forEach(unit => {
        console.log(`   ${' '.repeat(unit.level * 2)}└─ ${unit.unit_name} (${unit.unit_type})`);
      });
      console.log('');
    }

    // Verify view
    console.log('🔍 Verifying v_org_hierarchy view...');
    const [views] = await connection.query("SHOW FULL TABLES LIKE 'v_org_hierarchy'");
    if (views.length > 0) {
      console.log('✅ v_org_hierarchy view exists\n');
    }

    // Check users table
    console.log('🔍 Checking users table for org_unit_id column...');
    const [userCols] = await connection.query("SHOW COLUMNS FROM users LIKE 'org_unit_id'");
    if (userCols.length > 0) {
      console.log('✅ users.org_unit_id column exists\n');
    }

    // Check projects table
    console.log('🔍 Checking projects table for org_unit_id column...');
    const [projectCols] = await connection.query("SHOW COLUMNS FROM projects LIKE 'org_unit_id'");
    if (projectCols.length > 0) {
      console.log('✅ projects.org_unit_id column exists\n');
    }

    // Check tasks table
    console.log('🔍 Checking tasks table for org_unit_id column...');
    const [taskCols] = await connection.query("SHOW COLUMNS FROM tasks LIKE 'org_unit_id'");
    if (taskCols.length > 0) {
      console.log('✅ tasks.org_unit_id column exists\n');
    }

    console.log('🎉 Migration completed successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Open browser and login as admin');
    console.log('   2. Go to Admin Panel → Organization tab');
    console.log('   3. You should see the organizational tree\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('👋 Database connection closed');
    }
  }
}

// Run migration
runMigration().catch(console.error);
