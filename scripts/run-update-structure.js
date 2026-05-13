const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Updating organizational structure...\n');
  
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
    console.log('📡 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected\n');

    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', 'update_organizational_structure.sql');
    console.log('📄 Reading migration file...');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Loaded\n');

    console.log('⚙️  Executing migration...');
    await connection.query(sql);
    console.log('✅ Migration executed\n');

    // Count units
    const [count] = await connection.query('SELECT COUNT(*) as count FROM organizational_units');
    console.log(`📊 Total organizational units: ${count[0].count}\n`);
    
    // Show structure
    const [units] = await connection.query(`
      SELECT unit_code, unit_name, unit_type, office_type, level 
      FROM organizational_units 
      ORDER BY path
    `);
    
    console.log('📋 Organizational Structure:');
    units.forEach(unit => {
      const indent = '  '.repeat(unit.level);
      const type = unit.office_type !== 'none' ? `${unit.unit_type}/${unit.office_type}` : unit.unit_type;
      console.log(`${indent}└─ ${unit.unit_name} (${type})`);
    });
    console.log('');

    console.log('🎉 Structure updated successfully!\n');
    console.log('📝 Next: Open Admin Panel → Organization tab');

  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runMigration().catch(console.error);
