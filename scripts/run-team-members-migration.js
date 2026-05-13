const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'raymaizing_db',
    multipleStatements: true
  });

  try {
    console.log('🔄 Running team_members table migration...');
    
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', 'create_team_members_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await connection.query(sql);
    
    console.log('✅ Team members table created successfully!');
    console.log('📊 Table structure:');
    console.log('   - id (PK)');
    console.log('   - org_unit_id (FK to organizational_units)');
    console.log('   - username (FK to users)');
    console.log('   - role (member, lead, manager, pic, coordinator)');
    console.log('   - added_at (timestamp)');
    console.log('   - added_by (FK to users)');
    console.log('');
    console.log('🎯 Features:');
    console.log('   ✓ Employees can have multiple roles in different units');
    console.log('   ✓ Unique constraint per unit-username pair');
    console.log('   ✓ Cascade delete when unit or user is deleted');
    console.log('   ✓ Track who added the member and when');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
