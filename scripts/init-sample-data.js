/**
 * Initialize Sample Data
 * Run: node scripts/init-sample-data.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function initSampleData() {
  console.log('🚀 Initializing sample data...\n');
  
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  };

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Check if data already exists
    const [projects] = await connection.execute('SELECT COUNT(*) as count FROM projects');
    const [tasks] = await connection.execute('SELECT COUNT(*) as count FROM tasks');
    
    if (projects[0].count > 0 || tasks[0].count > 0) {
      console.log('⚠️  Data already exists:');
      console.log(`   Projects: ${projects[0].count}`);
      console.log(`   Tasks: ${tasks[0].count}`);
      console.log('\n❓ Do you want to add more sample data? (This will NOT delete existing data)');
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log('📝 Creating sample projects...');
    
    // Sample Projects
    const sampleProjects = [
      {
        project_id: 'PRJ-001',
        project_name: 'PWA Dashboard Refresh',
        category: 'Development',
        owner: 'rizky',
        assignees: 'rizky, budi',
        status: 'Active',
        notes: 'Modernisasi dashboard dengan design baru dan performa lebih baik',
        brief: 'Melakukan refresh complete pada PWA Dashboard dengan fokus pada UI/UX modern dan optimasi performa',
        url: 'https://web.dev/pwa/\nhttps://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps'
      },
      {
        project_id: 'PRJ-002',
        project_name: 'Mobile App Integration',
        category: 'Development',
        owner: 'budi',
        assignees: 'budi, siti',
        status: 'Planning',
        notes: 'Integrasi API dengan mobile app untuk sync data real-time',
        brief: 'Membangun API integration layer untuk mobile app dengan fokus pada real-time sync dan offline capability',
        url: 'https://firebase.google.com/docs/cloud-messaging'
      },
      {
        project_id: 'PRJ-003',
        project_name: 'Design System Update',
        category: 'Design',
        owner: 'siti',
        assignees: 'siti, rizky',
        status: 'Active',
        notes: 'Update design system dengan component library terbaru',
        brief: 'Refresh design system dengan Figma component library dan implementasi di codebase',
        url: 'https://www.figma.com/design-systems/'
      }
    ];

    for (const project of sampleProjects) {
      try {
        await connection.execute(
          `INSERT INTO projects (project_id, project_name, category, owner, assignees, status, notes, brief, url, version, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
           ON DUPLICATE KEY UPDATE updated_at = NOW()`,
          [
            project.project_id,
            project.project_name,
            project.category,
            project.owner,
            project.assignees,
            project.status,
            project.notes,
            project.brief,
            project.url
          ]
        );
        console.log(`   ✅ ${project.project_id}: ${project.project_name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`   ⏭️  ${project.project_id}: Already exists`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n📝 Creating sample tasks...');
    
    // Sample Tasks
    const sampleTasks = [
      {
        task_id: 'TSK-001',
        task_name: 'Setup PWA manifest and service worker',
        project_id: 'PRJ-001',
        assignees: 'rizky',
        status: 'In Progress',
        priority: 'High',
        progress: '50%',
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Configure PWA manifest dan implement service worker untuk offline capability',
        brief: 'Setup PWA infrastructure dengan manifest.json dan service worker untuk caching strategy'
      },
      {
        task_id: 'TSK-002',
        task_name: 'Design new dashboard layout',
        project_id: 'PRJ-001',
        assignees: 'siti',
        status: 'Done',
        priority: 'Normal',
        progress: '100%',
        due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Design layout baru dengan focus pada data visualization',
        brief: 'Create modern dashboard layout dengan card-based design dan responsive grid'
      },
      {
        task_id: 'TSK-003',
        task_name: 'Implement real-time sync API',
        project_id: 'PRJ-002',
        assignees: 'budi',
        status: 'Backlog',
        priority: 'Urgent',
        progress: '0%',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Build WebSocket API untuk real-time data sync',
        brief: 'Implement WebSocket server dengan Redis pub/sub untuk real-time updates'
      },
      {
        task_id: 'TSK-004',
        task_name: 'Update Figma component library',
        project_id: 'PRJ-003',
        assignees: 'siti, rizky',
        status: 'In Progress',
        priority: 'Normal',
        progress: '75%',
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Update semua component di Figma dengan design tokens baru',
        brief: 'Refresh Figma library dengan design tokens, color palette, dan typography system'
      },
      {
        task_id: 'TSK-005',
        task_name: 'Write API documentation',
        project_id: 'PRJ-002',
        assignees: 'budi',
        status: 'To Do',
        priority: 'Low',
        progress: '25%',
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Document semua API endpoints dengan Swagger/OpenAPI',
        brief: 'Create comprehensive API documentation dengan examples dan use cases'
      }
    ];

    for (const task of sampleTasks) {
      try {
        await connection.execute(
          `INSERT INTO tasks (task_id, task_name, project_id, assignees, status, priority, progress, due_date, notes, brief, version, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
           ON DUPLICATE KEY UPDATE updated_at = NOW()`,
          [
            task.task_id,
            task.task_name,
            task.project_id,
            task.assignees,
            task.status,
            task.priority,
            task.progress,
            task.due_date,
            task.notes,
            task.brief
          ]
        );
        console.log(`   ✅ ${task.task_id}: ${task.task_name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`   ⏭️  ${task.task_id}: Already exists`);
        } else {
          throw err;
        }
      }
    }

    // Update project due dates based on tasks
    console.log('\n📅 Syncing project due dates...');
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
    console.log('   ✅ Project due dates synced');

    console.log('\n✅ Sample data initialized successfully!');
    console.log('\n📊 Summary:');
    const [finalProjects] = await connection.execute('SELECT COUNT(*) as count FROM projects');
    const [finalTasks] = await connection.execute('SELECT COUNT(*) as count FROM tasks');
    console.log(`   Projects: ${finalProjects[0].count} total`);
    console.log(`   Tasks: ${finalTasks[0].count} total`);
    console.log('\n🎉 You can now use the application with sample data!\n');

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

initSampleData();
