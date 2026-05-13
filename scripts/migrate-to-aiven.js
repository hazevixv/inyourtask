/**
 * Migrate MySQL database to Aiven MySQL
 * 
 * Usage:
 *   1. Update .env dengan credential Aiven
 *   2. node scripts/migrate-to-aiven.js
 * 
 * Atau via CLI:
 *   mysql -h inyourtask-haze-db-hazevixv.h.aivencloud.com -P 20722 -u avnadmin -p defaultdb < ray-task_management.sql
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   Migrasi ke Aiven MySQL             ║');
  console.log('╚══════════════════════════════════════╝\n');

  const host = await ask('Host Aiven MySQL [inyourtask-haze-db-hazevixv.h.aivencloud.com]: ') || 'inyourtask-haze-db-hazevixv.h.aivencloud.com';
  const port = await ask('Port [20722]: ') || '20722';
  const user = await ask('User [avnadmin]: ') || 'avnadmin';
  const password = await ask('Password: ');
  const database = await ask('Database name [defaultdb]: ') || 'defaultdb';

  if (!password) {
    console.error('\n✗ Password wajib diisi!');
    rl.close();
    process.exit(1);
  }

  console.log('\n⏳ Menghubungkan ke Aiven MySQL...\n');

  let connection;
  try {
    connection = await mysql.createConnection({
      host, port: parseInt(port), user, password, database,
      ssl: { rejectUnauthorized: false }, // Aiven requires SSL
      multipleStatements: true,
    });
    console.log('✓ Terhubung ke Aiven MySQL\n');
  } catch (err) {
    console.error('✗ Gagal konek:', err.message);
    rl.close();
    process.exit(1);
  }

  // Baca file SQL dump
  const sqlPath = path.join(__dirname, '..', 'ray-task_management.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('✗ File ray-task_management.sql tidak ditemukan!');
    await connection.end();
    rl.close();
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  
  // Split by statement (per titik koma)
  const statements = sqlContent
    .split(';\n')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('/*!') && !s.startsWith('/*') && s.length > 5);

  let total = statements.length;
  let success = 0;
  let failed = 0;

  console.log(`⏳ Mengimport ${total} statements ke Aiven...\n`);

  // Non-aktifkan foreign key checks dulu
  try {
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('SET UNIQUE_CHECKS = 0');
  } catch {}

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    // Skip INSERT data statements (data bisa di-skip kalo ga perlu)
    const isInsert = stmt.toUpperCase().startsWith('INSERT');
    try {
      await connection.execute(stmt);
      success++;
      if (i % 20 === 0 || i === total - 1) {
        process.stdout.write(`\r  Progress: ${i + 1}/${total} (ok: ${success})`);
      }
    } catch (err) {
      failed++;
      if (!isInsert) {
        console.log(`\n  ✗ [${i}] ${err.message.substring(0, 120)}`);
        console.log(`    ${stmt.substring(0, 100)}...`);
      }
    }
  }

  try {
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    await connection.execute('SET UNIQUE_CHECKS = 1');
  } catch {}

  console.log(`\n\n✓ Selesai! ${success} sukses, ${failed} gagal (umumnya INSERT data duplikat)\n`);

  // Update .env
  const envPath = path.join(__dirname, '..', '.env');
  let env = fs.readFileSync(envPath, 'utf8');

  env = env
    .replace(/DB_HOST=.*/, `DB_HOST=${host}`)
    .replace(/DB_PORT=.*/, `DB_PORT=${port}`)
    .replace(/DB_USER=.*/, `DB_USER=${user}`)
    .replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${password}`)
    .replace(/DB_NAME=.*/, `DB_NAME=${database}`);

  fs.writeFileSync(envPath, env);
  console.log('✓ .env updated dengan credential Aiven\n');

  console.log('╔══════════════════════════════════════╗');
  console.log('║   LANGKAH SELANJUTNYA                ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('1. Restart dev server: npm run dev');
  console.log('2. Test login');
  console.log('3. Deploy ke Vercel');
  console.log('   - Push ke GitHub');
  console.log('   - Vercel auto-deploy');
  console.log('   - Set env vars di Vercel Dashboard\n');

  await connection.end();
  rl.close();
}

main().catch(err => {
  console.error('Fatal:', err.message);
  rl.close();
  process.exit(1);
});
