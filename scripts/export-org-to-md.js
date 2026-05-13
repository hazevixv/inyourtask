// Script untuk export struktur organisasi ke MD
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function exportOrgToMd() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  try {
    console.log('\n📝 Exporting organizational structure to MD...\n');

    // Get all units with member details
    const [units] = await connection.execute(`
      SELECT 
        ou.id,
        ou.unit_code,
        ou.unit_name,
        ou.unit_type,
        ou.office_type,
        ou.level,
        ou.parent_id,
        ou.color,
        ou.icon,
        ou.description,
        ou.sort_order,
        (SELECT unit_name FROM organizational_units WHERE id = ou.parent_id) as parent_name,
        GROUP_CONCAT(u.full_name ORDER BY u.full_name SEPARATOR '|') as members,
        COUNT(u.username) as member_count
      FROM organizational_units ou
      LEFT JOIN users u ON u.org_unit_id = ou.id AND u.is_active = 1
      WHERE ou.is_active = 1
      GROUP BY ou.id
      ORDER BY ou.level, ou.sort_order, ou.unit_name
    `);

    // Build MD content
    let md = `# 🏢 STRUKTUR ORGANISASI - WORKSPACE\n\n`;
    md += `> **Generated:** ${new Date().toLocaleString('id-ID')}\n`;
    md += `> **Total Units:** ${units.length}\n`;
    md += `> **Total Employees:** ${units.reduce((sum, u) => sum + u.member_count, 0)}\n\n`;
    md += `---\n\n`;

    md += `## 📋 INSTRUKSI EDITING\n\n`;
    md += `1. **Jangan ubah format** \`[ID:xxx]\` - ini digunakan untuk update database\n`;
    md += `2. **Boleh ubah:** unit_name, unit_type, office_type, parent, color, icon, description\n`;
    md += `3. **Unit types:** company, division, department, team, product, unit\n`;
    md += `4. **Office types:** none, office, manufacturing, both\n`;
    md += `5. **Setelah edit, save file ini dan jalankan:** \`node scripts/import-org-from-md.js\`\n\n`;
    md += `---\n\n`;

    // Group by level
    const byLevel = {};
    units.forEach(u => {
      if (!byLevel[u.level]) byLevel[u.level] = [];
      byLevel[u.level].push(u);
    });

    // Generate MD for each level
    Object.keys(byLevel).sort().forEach(level => {
      md += `## Level ${level} ${level === '0' ? '- OWNER' : level === '1' ? '- DIREKTUR' : '- DEPARTMENTS/DIVISIONS'}\n\n`;

      byLevel[level].forEach(unit => {
        md += `### [ID:${unit.id}] ${unit.unit_name}\n\n`;
        md += `- **Code:** \`${unit.unit_code}\`\n`;
        md += `- **Type:** \`${unit.unit_type}\`\n`;
        md += `- **Office Type:** \`${unit.office_type || 'none'}\`\n`;
        md += `- **Parent:** ${unit.parent_name || 'None (Root)'}\n`;
        md += `- **Color:** \`${unit.color}\`\n`;
        md += `- **Icon:** \`${unit.icon}\`\n`;
        md += `- **Level:** ${unit.level}\n`;
        md += `- **Sort Order:** ${unit.sort_order}\n`;
        
        if (unit.description) {
          md += `- **Description:** ${unit.description}\n`;
        }
        
        md += `- **Members (${unit.member_count}):**\n`;
        if (unit.members) {
          const memberList = unit.members.split('|');
          memberList.forEach(m => {
            md += `  - ${m}\n`;
          });
        } else {
          md += `  - *(No members)*\n`;
        }
        
        md += `\n`;
      });

      md += `---\n\n`;
    });

    // Add summary table
    md += `## 📊 SUMMARY TABLE\n\n`;
    md += `| ID | Unit Name | Type | Level | Parent | Members |\n`;
    md += `|----|-----------|------|-------|--------|----------|\n`;
    
    units.forEach(u => {
      md += `| ${u.id} | ${u.unit_name} | ${u.unit_type} | ${u.level} | ${u.parent_name || 'Root'} | ${u.member_count} |\n`;
    });

    md += `\n---\n\n`;

    // Add tree view
    md += `## 🌳 TREE VIEW\n\n`;
    md += `\`\`\`\n`;
    
    function buildTree(units, parentId = null, indent = '') {
      const children = units.filter(u => u.parent_id === parentId);
      children.forEach((unit, index) => {
        const isLast = index === children.length - 1;
        const prefix = isLast ? '└── ' : '├── ';
        const childIndent = indent + (isLast ? '    ' : '│   ');
        
        const typeEmoji = {
          company: '🏢',
          division: '📁',
          department: '📂',
          team: '👥',
          product: '📦',
          unit: '⚙️'
        }[unit.unit_type] || '📌';
        
        md += `${indent}${prefix}${typeEmoji} ${unit.unit_name} (${unit.member_count})\n`;
        buildTree(units, unit.id, childIndent);
      });
    }

    buildTree(units);
    md += `\`\`\`\n\n`;

    // Add quick stats
    md += `## 📈 QUICK STATS\n\n`;
    
    const stats = {
      byType: {},
      byLevel: {},
      byOfficeType: {}
    };

    units.forEach(u => {
      stats.byType[u.unit_type] = (stats.byType[u.unit_type] || 0) + 1;
      stats.byLevel[u.level] = (stats.byLevel[u.level] || 0) + 1;
      stats.byOfficeType[u.office_type || 'none'] = (stats.byOfficeType[u.office_type || 'none'] || 0) + 1;
    });

    md += `### By Type\n\n`;
    Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      md += `- **${type}:** ${count} units\n`;
    });

    md += `\n### By Level\n\n`;
    Object.entries(stats.byLevel).sort((a, b) => a[0] - b[0]).forEach(([level, count]) => {
      md += `- **Level ${level}:** ${count} units\n`;
    });

    md += `\n### By Office Type\n\n`;
    Object.entries(stats.byOfficeType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      md += `- **${type}:** ${count} units\n`;
    });

    md += `\n---\n\n`;
    md += `*End of export. Edit this file and run \`node scripts/import-org-from-md.js\` to apply changes.*\n`;

    // Write to file
    fs.writeFileSync('ORGANIZATIONAL_STRUCTURE_EDITABLE.md', md);
    
    console.log('✅ Export complete!');
    console.log('📄 File: ORGANIZATIONAL_STRUCTURE_EDITABLE.md');
    console.log('\n📝 Next steps:');
    console.log('   1. Edit ORGANIZATIONAL_STRUCTURE_EDITABLE.md');
    console.log('   2. Run: node scripts/import-org-from-md.js');
    console.log('   3. Verify: node scripts/verify-structure.js\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

exportOrgToMd();
