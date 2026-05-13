// Script untuk list semua job positions dari database
const mysql = require('mysql2/promise');
require('dotenv').config();

async function listJobPositions() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  try {
    console.log('\n=== JOB POSITIONS IN DATABASE ===\n');
    
    // Get all unique job positions with count
    const [positions] = await connection.execute(`
      SELECT 
        job_position, 
        COUNT(*) as employee_count,
        GROUP_CONCAT(full_name SEPARATOR ', ') as employees
      FROM users 
      WHERE job_position IS NOT NULL 
        AND job_position != '' 
        AND is_active = 1
      GROUP BY job_position 
      ORDER BY job_position
    `);

    console.log(`Total unique job positions: ${positions.length}\n`);
    
    positions.forEach((pos, index) => {
      console.log(`${index + 1}. ${pos.job_position}`);
      console.log(`   Employees: ${pos.employee_count}`);
      console.log(`   Names: ${pos.employees.substring(0, 100)}${pos.employees.length > 100 ? '...' : ''}`);
      console.log('');
    });

    // Get organizational units
    console.log('\n=== ORGANIZATIONAL UNITS ===\n');
    const [units] = await connection.execute(`
      SELECT 
        id, unit_code, unit_name, unit_type, level, 
        (SELECT COUNT(*) FROM users WHERE org_unit_id = organizational_units.id AND is_active = 1) as member_count
      FROM organizational_units 
      WHERE is_active = 1
      ORDER BY level, sort_order, unit_name
    `);

    console.log(`Total organizational units: ${units.length}\n`);
    
    units.forEach((unit) => {
      const indent = '  '.repeat(unit.level);
      console.log(`${indent}[${unit.unit_type.toUpperCase()}] ${unit.unit_name} (${unit.unit_code})`);
      console.log(`${indent}   Members: ${unit.member_count} | Level: ${unit.level}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

listJobPositions();
