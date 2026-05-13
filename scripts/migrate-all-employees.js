/**
 * Migrate All Employees to Users Table
 * 
 * This script:
 * 1. Reads all 93 employees from employees table
 * 2. Creates users with properly hashed passwords
 * 3. Updates existing users (wendra, iman, rizky, taufik)
 * 4. Creates taufan user
 * 5. Creates remaining 88 employees as users
 * 
 * Default password for all new users: "raymaizing2024"
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DEFAULT_PASSWORD = 'raymaizing2024';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ray-task_management',
  port: parseInt(process.env.DB_PORT || '3306')
};

// Existing users mapping
const EXISTING_USERS = {
  'wendra': '12001',
  'iman': '20033',
  'rizky': '25137',
  'taufik': '25126',
  'taufan': '20047'
};

async function main() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Step 1: Add missing columns
    console.log('📋 Step 1: Adding missing columns to users table...');
    await addMissingColumns(connection);
    console.log('✅ Columns added\n');

    // Step 2: Get all employees
    console.log('📋 Step 2: Reading employees from database...');
    const [employees] = await connection.execute('SELECT * FROM employees ORDER BY name');
    console.log(`✅ Found ${employees.length} employees\n`);

    // Step 3: Hash default password
    console.log('🔐 Step 3: Hashing default password...');
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    console.log('✅ Password hashed\n');

    // Step 4: Update existing users
    console.log('📋 Step 4: Updating existing users...');
    await updateExistingUsers(connection, employees);
    console.log('✅ Existing users updated\n');

    // Step 5: Create new users
    console.log('📋 Step 5: Creating new users from employees...');
    const newUsersCount = await createNewUsers(connection, employees, hashedPassword);
    console.log(`✅ Created ${newUsersCount} new users\n`);

    // Step 6: Verification
    console.log('📋 Step 6: Verification...');
    await verifyMigration(connection);
    console.log('✅ Verification complete\n');

    console.log('🎉 SUCCESS! All employees migrated to users table!');
    console.log('\n📝 Next steps:');
    console.log('   1. Copy avatar files: .\\copy-avatars.ps1');
    console.log('   2. Start server: npm run dev');
    console.log('   3. Test login with any employee email');
    console.log(`   4. Default password for all: "${DEFAULT_PASSWORD}"`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

async function addMissingColumns(connection) {
  // Check and add columns one by one
  const columnsToAdd = [
    { name: 'employee_id', sql: 'ALTER TABLE users ADD COLUMN employee_id VARCHAR(50) NULL AFTER username' },
    { name: 'bio', sql: 'ALTER TABLE users ADD COLUMN bio TEXT NULL AFTER organization' },
    { name: 'phone', sql: 'ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL AFTER bio' },
    { name: 'last_login', sql: 'ALTER TABLE users ADD COLUMN last_login DATETIME NULL AFTER updated_at' }
  ];

  for (const col of columnsToAdd) {
    try {
      // Check if column exists
      const [columns] = await connection.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
        [connection.config.database, col.name]
      );
      
      if (columns.length === 0) {
        await connection.execute(col.sql);
        console.log(`   ✓ Added column: ${col.name}`);
      } else {
        console.log(`   ✓ Column exists: ${col.name}`);
      }
    } catch (err) {
      console.warn(`   ⚠️  ${col.name}: ${err.message}`);
    }
  }

  // Add indexes
  const indexesToAdd = [
    { name: 'idx_email', sql: 'CREATE INDEX idx_email ON users(email)' },
    { name: 'idx_employee_id', sql: 'CREATE INDEX idx_employee_id ON users(employee_id)' },
    { name: 'idx_is_active', sql: 'CREATE INDEX idx_is_active ON users(is_active)' }
  ];

  for (const idx of indexesToAdd) {
    try {
      // Check if index exists
      const [indexes] = await connection.execute(
        `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND INDEX_NAME = ?`,
        [connection.config.database, idx.name]
      );
      
      if (indexes.length === 0) {
        await connection.execute(idx.sql);
        console.log(`   ✓ Added index: ${idx.name}`);
      } else {
        console.log(`   ✓ Index exists: ${idx.name}`);
      }
    } catch (err) {
      console.warn(`   ⚠️  ${idx.name}: ${err.message}`);
    }
  }
}

async function updateExistingUsers(connection, employees) {
  const updates = [
    { username: 'wendra', employee_id: '12001' },
    { username: 'iman', employee_id: '20033' },
    { username: 'rizky', employee_id: '25137' },
    { username: 'taufik', employee_id: '25126' },
    { username: 'taufan', employee_id: '20047' }
  ];

  for (const update of updates) {
    const employee = employees.find(e => e.employee_id === update.employee_id);
    if (!employee) {
      console.warn(`   ⚠️  Employee ${update.employee_id} not found for ${update.username}`);
      continue;
    }

    await connection.execute(`
      UPDATE users SET 
        employee_id = ?,
        full_name = ?,
        email = ?,
        job_position = ?,
        organization = ?,
        avatar = ?,
        is_active = 1
      WHERE username = ?
    `, [
      employee.employee_id,
      employee.name,
      employee.email,
      employee.job_position,
      employee.organization,
      employee.avatar_path,
      update.username
    ]);

    console.log(`   ✓ Updated ${update.username} (${employee.name})`);
  }
}

async function createNewUsers(connection, employees, hashedPassword) {
  let created = 0;
  const existingEmployeeIds = Object.values(EXISTING_USERS);
  const usernameCount = {};

  for (const employee of employees) {
    // Skip existing users
    if (existingEmployeeIds.includes(employee.employee_id)) {
      continue;
    }

    // Generate username from first name
    let username = employee.name.split(' ')[0].toLowerCase();
    username = username.replace(/[^a-z0-9]/g, ''); // Remove special chars

    // Handle duplicate usernames
    if (usernameCount[username]) {
      usernameCount[username]++;
      username = `${username}${usernameCount[username]}`;
    } else {
      usernameCount[username] = 1;
    }

    try {
      await connection.execute(`
        INSERT INTO users (
          username, password, full_name, employee_id, email, 
          job_position, organization, avatar, role, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user', 1)
        ON DUPLICATE KEY UPDATE
          full_name = VALUES(full_name),
          employee_id = VALUES(employee_id),
          email = VALUES(email),
          job_position = VALUES(job_position),
          organization = VALUES(organization),
          avatar = VALUES(avatar),
          is_active = VALUES(is_active)
      `, [
        username,
        hashedPassword,
        employee.name,
        employee.employee_id,
        employee.email,
        employee.job_position,
        employee.organization,
        employee.avatar_path
      ]);

      created++;
      
      // Show progress every 10 users
      if (created % 10 === 0) {
        console.log(`   ✓ Created ${created} users...`);
      }
    } catch (err) {
      console.error(`   ❌ Failed to create user for ${employee.name}: ${err.message}`);
    }
  }

  return created;
}

async function verifyMigration(connection) {
  // Total users
  const [totalResult] = await connection.execute('SELECT COUNT(*) as count FROM users');
  console.log(`   ✓ Total users: ${totalResult[0].count}`);

  // Existing team members
  const [teamMembers] = await connection.execute(`
    SELECT username, full_name, email, job_position 
    FROM users 
    WHERE username IN ('wendra', 'iman', 'rizky', 'taufan', 'taufik')
    ORDER BY username
  `);
  console.log(`   ✓ Team members verified: ${teamMembers.length}/5`);
  teamMembers.forEach(member => {
    const displayName = member.full_name.split(' ').slice(0, 2).join(' ');
    console.log(`      - ${member.username}: ${displayName}`);
  });

  // Users without email
  const [noEmail] = await connection.execute(
    'SELECT COUNT(*) as count FROM users WHERE email IS NULL OR email = ""'
  );
  if (noEmail[0].count > 0) {
    console.warn(`   ⚠️  ${noEmail[0].count} users without email`);
  }

  // Duplicate emails
  const [dupEmails] = await connection.execute(`
    SELECT email, COUNT(*) as count 
    FROM users 
    WHERE email IS NOT NULL AND email != ''
    GROUP BY email 
    HAVING count > 1
  `);
  if (dupEmails.length > 0) {
    console.warn(`   ⚠️  ${dupEmails.length} duplicate emails found`);
  }
}

// Run the script
main();
