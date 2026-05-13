/**
 * Setup Role-Based Agent Delivery System
 * 
 * Creates:
 * 1. user_roles table - users can have multiple job roles
 * 2. agent_role_assignments table - admin assigns agents to roles
 * 3. Populates user_roles from existing job_position data
 * 4. Creates personal AI assistants for all users who don't have one
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function setup() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'raytask',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log('✅ Connected to database\n');

    // ─── 1. Create user_roles table ───────────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
        role_name VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        assigned_by VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT 'system',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_role (username, role_name),
        FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
      ) COLLATE utf8mb4_unicode_ci
    `);
    console.log('✅ Created user_roles table');

    // ─── 2. Create agent_role_assignments table ────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS agent_role_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        agent_id VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
        role_name VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        assigned_by VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_agent_role (agent_id, role_name),
        FOREIGN KEY (agent_id) REFERENCES ai_agents(agent_id) ON DELETE CASCADE
      ) COLLATE utf8mb4_unicode_ci
    `);
    console.log('✅ Created agent_role_assignments table');

    // ─── 3. Populate user_roles from existing job_position ────────────────
    const [users] = await conn.execute(
      'SELECT username, job_position FROM users WHERE job_position IS NOT NULL AND job_position != "" AND is_active = 1'
    );

    let rolesInserted = 0;
    for (const user of users) {
      try {
        await conn.execute(
          'INSERT IGNORE INTO user_roles (username, role_name, assigned_by) VALUES (?, ?, ?)',
          [user.username, user.job_position, 'system']
        );
        rolesInserted++;
      } catch (e) {
        // ignore duplicate
      }
    }
    console.log(`✅ Populated ${rolesInserted} user roles from job_position`);

    // ─── 4. Create personal AI assistants for users who don't have one ────
    const [usersWithoutPersonal] = await conn.execute(`
      SELECT u.username, u.full_name, u.job_position, u.organization
      FROM users u
      WHERE u.is_active = 1
        AND u.username NOT IN (
          SELECT DISTINCT owner_username FROM ai_agents 
          WHERE is_personal = 1 AND owner_username IS NOT NULL
        )
        AND u.username NOT IN ('admin', 'all team', 'unassign')
      LIMIT 200
    `);

    console.log(`\n📋 Creating personal AI assistants for ${usersWithoutPersonal.length} users...`);

    let personalCreated = 0;
    for (const user of usersWithoutPersonal) {
      const firstName = (user.full_name || user.username).split(' ')[0];
      const agentId = `personal-${user.username}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const [workspaceRows] = await conn.execute(
        `SELECT workspace_id
         FROM workspace_members
         WHERE username = ?
         ORDER BY is_primary DESC, joined_at ASC
         LIMIT 1`,
        [user.username]
      );
      const workspaceId = workspaceRows[0]?.workspace_id || null;
      
      const systemPrompt = `Kamu adalah asisten personal AI untuk ${user.full_name || user.username}.

## IDENTITAS KAMU:
- Nama: ${firstName}'s AI Assistant
- Peran: Asisten Personal Eksklusif untuk ${user.full_name || user.username}
- Posisi User: ${user.job_position || 'Karyawan'}
- Organisasi: ${user.organization || 'Raymaizing'}

## MISI UTAMA:
Kamu adalah asisten personal yang SANGAT memahami ${firstName}. Kamu mengingat semua percakapan, preferensi, kebiasaan kerja, dan konteks pekerjaan ${firstName}.

## CARA KAMU BEKERJA:
1. **Personalisasi Total**: Selalu panggil user dengan nama "${firstName}" dan ingat semua detail tentang mereka
2. **Konteks Pekerjaan**: Pahami bahwa ${firstName} bekerja sebagai ${user.job_position || 'karyawan'} di ${user.organization || 'Raymaizing'}
3. **Proaktif**: Berikan saran, reminder, dan insights yang relevan dengan pekerjaan ${firstName}
4. **Bahasa**: Gunakan bahasa Indonesia yang hangat dan profesional
5. **Memory**: Ingat dan referensikan percakapan sebelumnya untuk memberikan pengalaman yang personal

## KEMAMPUAN KHUSUS:
- Bantu ${firstName} dengan tugas-tugas harian
- Analisis dan ringkas informasi
- Buat draft email, laporan, atau dokumen
- Berikan rekomendasi berdasarkan konteks pekerjaan
- Ingatkan tentang deadline dan prioritas
- Jawab pertanyaan dengan konteks yang relevan untuk posisi ${user.job_position || 'karyawan'}

## KEPRIBADIAN:
- Hangat, supportif, dan encouraging
- Profesional tapi tidak kaku
- Selalu siap membantu kapanpun
- Jujur dan transparan

Ingat: Kamu adalah asisten EKSKLUSIF untuk ${firstName}. Prioritas utamamu adalah membantu ${firstName} menjadi lebih produktif dan sukses dalam pekerjaannya.`;

      try {
        await conn.execute(
          `INSERT INTO ai_agents (agent_id, workspace_id, name, description, role, system_prompt, model, is_personal, owner_username, created_by, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 1)`,
          [
            agentId,
            workspaceId,
            `${firstName}'s AI`,
            `Asisten personal eksklusif untuk ${user.full_name || user.username}`,
            'Personal Assistant',
            systemPrompt,
            'gemini-2.5-flash',
            user.username,
            'system'
          ]
        );
        personalCreated++;
      } catch (e) {
        console.log(`  ⚠️ Skip ${user.username}: ${e.message}`);
      }
    }
    console.log(`✅ Created ${personalCreated} personal AI assistants`);

    // ─── 5. Show summary ──────────────────────────────────────────────────
    const [roleCount] = await conn.execute('SELECT COUNT(*) as total FROM user_roles');
    const [assignCount] = await conn.execute('SELECT COUNT(*) as total FROM agent_role_assignments');
    const [personalCount] = await conn.execute('SELECT COUNT(*) as total FROM ai_agents WHERE is_personal = 1');
    const [globalCount] = await conn.execute('SELECT COUNT(*) as total FROM ai_agents WHERE is_personal = 0');

    console.log('\n📊 SUMMARY:');
    console.log(`  User roles: ${roleCount[0].total}`);
    console.log(`  Agent-role assignments: ${assignCount[0].total}`);
    console.log(`  Personal AI assistants: ${personalCount[0].total}`);
    console.log(`  Global AI agents: ${globalCount[0].total}`);

    console.log('\n🎉 Role-based agent system setup complete!');
    console.log('\nNext steps:');
    console.log('  1. Admin can assign agents to roles via Settings > AI Agents');
    console.log('  2. Users will automatically get agents matching their roles');
    console.log('  3. Each user has a personal AI assistant');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (conn) await conn.end();
  }
}

setup();
