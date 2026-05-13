/**
 * Migration: Add category_tag column to brain_config table
 * This allows each category to have a tag: Perusahaan, Unit Bisnis, Brand, Produk, Lainnya
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('🔄 Adding category_tag column to brain_config...');

    // Check if column exists first
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'brain_config' AND COLUMN_NAME = 'category_tag'
    `, [process.env.DB_NAME]);

    if (columns.length === 0) {
      // Add category_tag column
      await connection.execute(`
        ALTER TABLE brain_config 
        ADD COLUMN category_tag VARCHAR(50) NULL 
        COMMENT 'Tag for categories: Perusahaan, Unit Bisnis, Brand, Produk, Lainnya'
      `);
      console.log('✅ Column category_tag added successfully!');
    } else {
      console.log('ℹ️  Column category_tag already exists, skipping...');
    }

    console.log('✅ Migration completed successfully!');
    console.log('📝 Category tags available: Perusahaan, Unit Bisnis, Brand, Produk, Lainnya');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch(console.error);
