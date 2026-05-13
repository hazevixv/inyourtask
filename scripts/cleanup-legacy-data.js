const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  console.log('🔍 Scanning database for cleanup...\n');

  // Get all users
  const [allUsers] = await conn.execute('SELECT id, username, full_name, role FROM users ORDER BY created_at ASC');
  
  const KEEP = ['hazevixv-admin'];
  const DELETE = [];

  for (const u of allUsers) {
    if (KEEP.includes(u.username)) continue;
    
    const [p] = await conn.execute('SELECT COUNT(*) as c FROM projects WHERE created_by = ?', [u.id]);
    const [t] = await conn.execute('SELECT COUNT(*) as c FROM tasks WHERE created_by = ?', [u.id]);
    const [m] = await conn.execute('SELECT COUNT(*) as c FROM chat_messages WHERE sender = ?', [u.username]);
    const [l] = await conn.execute('SELECT COUNT(*) as c FROM logs WHERE changed_by = ?', [u.username]);
    const [w] = await conn.execute('SELECT COUNT(*) as c FROM workspace_members WHERE username = ?', [u.username]);
    
    const total = p[0].c + t[0].c + m[0].c + l[0].c;
    if (total > 0) {
      KEEP.push(u.username);
      console.log('📊 KEEP ' + u.username + ' (' + (u.full_name || '?') + ') — has data');
    } else {
      DELETE.push(u.username);
    }
  }

  console.log('\n📊 Summary:');
  console.log('   Total users: ' + allUsers.length);
  console.log('   To KEEP: ' + KEEP.length + ' (' + KEEP.join(', ') + ')');
  console.log('   To DELETE: ' + DELETE.length + ' legacy users\n');

  console.log('Users to remove:');
  DELETE.forEach(function(u) { 
    const user = allUsers.find(function(x) { return x.username === u; });
    console.log('   - ' + u + ' (' + (user ? user.full_name || 'no name' : '?') + ')');
  });

  if (DELETE.length === 0) {
    console.log('\n✅ No legacy users to delete.');
  } else {
    console.log('\n⚠️  This will DELETE ' + DELETE.length + ' users and legacy organizational data.');
    console.log('   Starting cleanup...\n');

    for (const username of DELETE) {
      try {
        const [urows] = await conn.execute('SELECT id FROM users WHERE username = ?', [username]);
        if (urows.length === 0) continue;
        const uid = urows[0].id;
        
        await conn.execute('DELETE FROM workspace_members WHERE username = ?', [username]);
        await conn.execute('DELETE FROM chat_members WHERE username = ?', [username]);
        await conn.execute('DELETE FROM org_unit_staff WHERE username = ?', [username]);
        await conn.execute('DELETE FROM team_members WHERE username = ?', [username]);
        await conn.execute('DELETE FROM notifications WHERE username = ?', [username]);
        await conn.execute('DELETE FROM sessions WHERE user_id = ?', [uid]);
        await conn.execute('DELETE FROM users WHERE id = ?', [uid]);
        console.log('   ✅ Deleted: ' + username);
      } catch (err) {
        console.log('   ❌ Failed: ' + username + ' — ' + err.message);
      }
    }
  }

  // Clean org structure
  console.log('\n🧹 Cleaning organizational structure...');
  try {
    await conn.execute('DELETE FROM org_unit_staff');
    await conn.execute('DELETE FROM organizational_units');
    console.log('   ✅ Cleaned organizational_units and org_unit_staff');
  } catch (err) {
    console.log('   ❌ ' + err.message);
  }

  try {
    await conn.execute('DROP TABLE IF EXISTS employees');
    console.log('   ✅ Dropped employees table');
  } catch (err) {
    console.log('   - employees table: ' + err.message);
  }
  
  try {
    await conn.execute('DROP TABLE IF EXISTS divisions');
    console.log('   ✅ Dropped divisions table');
  } catch (err) {
    console.log('   - divisions table: ' + err.message);
  }

  // Final state
  const [finalUsers] = await conn.execute('SELECT COUNT(*) as c FROM users');
  const [remaining] = await conn.execute('SELECT username, full_name, role FROM users ORDER BY created_at ASC');
  
  console.log('\n📊 Final state:');
  console.log('   Users remaining: ' + finalUsers[0].c);
  remaining.forEach(function(u) {
    console.log('   ✅ ' + u.username + ' (' + (u.full_name || '?') + ') [' + u.role + ']');
  });

  await conn.end();
  console.log('\n✅ Cleanup complete!');
}

main().catch(function(e) { console.error('Fatal:', e.message); process.exit(1); });
