// Script untuk generate struktur lengkap perusahaan
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function generateCompleteStructure() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ray-task_management',
  });

  try {
    console.log('\n📝 Generating complete organizational structure...\n');

    // Get all units with members
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
        GROUP_CONCAT(
          CONCAT(u.full_name, '|', u.job_position, '|', u.email) 
          ORDER BY u.full_name 
          SEPARATOR '||'
        ) as members_detail,
        COUNT(DISTINCT ous.username) as member_count
      FROM organizational_units ou
      LEFT JOIN org_unit_staff ous ON ous.org_unit_id = ou.id
      LEFT JOIN users u ON u.username = ous.username AND u.is_active = 1
      WHERE ou.is_active = 1
      GROUP BY ou.id
      ORDER BY ou.level, ou.sort_order, ou.unit_name
    `);

    // Build MD content
    let md = `# 🏢 STRUKTUR LENGKAP WORKSPACE\n\n`;
    md += `> **Last Updated:** ${new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}\n`;
    md += `> **Total Units:** ${units.length}\n`;
    md += `> **Total Employees:** ${units.reduce((sum, u) => sum + u.member_count, 0)}\n`;
    md += `> **Status:** ✅ Production Ready\n\n`;
    md += `---\n\n`;

    // Executive Summary
    md += `## 📊 Executive Summary\n\n`;
    
    const officeUnits = units.filter(u => u.parent_name === 'Primary Office Director');
    const mfgUnits = units.filter(u => u.parent_name === 'Manufacturing Director');
    
    const officeEmployees = officeUnits.reduce((sum, u) => sum + u.member_count, 0);
    const mfgEmployees = mfgUnits.reduce((sum, u) => sum + u.member_count, 0);

    md += `### Office Operations\n`;
    md += `- **Departments:** ${officeUnits.length}\n`;
    md += `- **Employees:** ${officeEmployees}\n`;
    md += `- **Director:** Primary Office Director\n\n`;

    md += `### Manufacturing Operations\n`;
    md += `- **Departments:** ${mfgUnits.length}\n`;
    md += `- **Employees:** ${mfgEmployees}\n`;
    md += `- **Director:** Manufacturing Director\n\n`;

    md += `---\n\n`;

    // Complete Hierarchy
    md += `## 🌳 COMPLETE ORGANIZATIONAL HIERARCHY\n\n`;

    function buildDetailedTree(units, parentId = null, indent = '', isLast = true) {
      const children = units.filter(u => u.parent_id === parentId);
      
      children.forEach((unit, index) => {
        const isLastChild = index === children.length - 1;
        const prefix = isLastChild ? '└── ' : '├── ';
        const childIndent = indent + (isLastChild ? '    ' : '│   ');
        
        const typeEmoji = {
          company: '🏢',
          division: '📁',
          department: '📂',
          team: '👥',
          product: '📦',
          unit: '⚙️'
        }[unit.unit_type] || '📌';
        
        const officeIcon = {
          office: ' 🏢',
          manufacturing: ' 🏭',
          both: ' 🏢🏭'
        }[unit.office_type] || '';
        
        md += `${indent}${prefix}${typeEmoji} **${unit.unit_name}**${officeIcon}\n`;
        md += `${indent}${isLastChild ? '    ' : '│   '}├─ Code: \`${unit.unit_code}\`\n`;
        md += `${indent}${isLastChild ? '    ' : '│   '}├─ Type: ${unit.unit_type}\n`;
        md += `${indent}${isLastChild ? '    ' : '│   '}├─ Members: ${unit.member_count}\n`;
        
        if (unit.members_detail) {
          const members = unit.members_detail.split('||').map(m => {
            const [name, job, email] = m.split('|');
            return { name, job, email };
          });
          
          md += `${indent}${isLastChild ? '    ' : '│   '}└─ Staff:\n`;
          members.forEach((member, mIdx) => {
            const isLastMember = mIdx === members.length - 1;
            const memberPrefix = isLastMember ? '└─' : '├─';
            md += `${indent}${isLastChild ? '    ' : '│   '}   ${memberPrefix} ${member.name}\n`;
            md += `${indent}${isLastChild ? '    ' : '│   '}   ${isLastMember ? ' ' : '│'}  ├─ Position: ${member.job}\n`;
            md += `${indent}${isLastChild ? '    ' : '│   '}   ${isLastMember ? ' ' : '│'}  └─ Email: ${member.email}\n`;
          });
        } else {
          md += `${indent}${isLastChild ? '    ' : '│   '}└─ Staff: *(No members)*\n`;
        }
        
        md += `\n`;
        
        buildDetailedTree(units, unit.id, childIndent, isLastChild);
      });
    }

    buildDetailedTree(units);

    md += `---\n\n`;

    // Department Details
    md += `## 📋 DEPARTMENT DETAILS\n\n`;

    // Group by parent
    const byParent = {};
    units.forEach(u => {
      if (u.level === 2) {
        const parent = u.parent_name || 'Root';
        if (!byParent[parent]) byParent[parent] = [];
        byParent[parent].push(u);
      }
    });

    Object.entries(byParent).forEach(([parent, depts]) => {
      const isOffice = parent.includes('Office');
      md += `### ${isOffice ? '🏢' : '🏭'} ${parent}\n\n`;
      
      depts.forEach(dept => {
        md += `#### ${dept.unit_name} (${dept.member_count} employees)\n\n`;
        md += `- **Code:** \`${dept.unit_code}\`\n`;
        md += `- **Type:** ${dept.unit_type}\n`;
        md += `- **Color:** ${dept.color}\n`;
        if (dept.description) md += `- **Description:** ${dept.description}\n`;
        
        if (dept.members_detail) {
          md += `\n**Team Members:**\n\n`;
          md += `| No | Name | Position | Email |\n`;
          md += `|----|------|----------|-------|\n`;
          
          const members = dept.members_detail.split('||').map(m => {
            const [name, job, email] = m.split('|');
            return { name, job, email };
          });
          
          members.forEach((member, idx) => {
            md += `| ${idx + 1} | ${member.name} | ${member.job} | ${member.email} |\n`;
          });
        }
        
        md += `\n`;
      });
    });

    md += `---\n\n`;

    // Statistics
    md += `## 📈 STATISTICS\n\n`;

    md += `### By Department Size\n\n`;
    const bySize = units.filter(u => u.level === 2 && u.member_count > 0)
      .sort((a, b) => b.member_count - a.member_count);
    
    md += `| Rank | Department | Employees | Percentage |\n`;
    md += `|------|------------|-----------|------------|\n`;
    
    const totalEmployees = units.reduce((sum, u) => sum + u.member_count, 0);
    bySize.forEach((dept, idx) => {
      const pct = ((dept.member_count / totalEmployees) * 100).toFixed(1);
      md += `| ${idx + 1} | ${dept.unit_name} | ${dept.member_count} | ${pct}% |\n`;
    });

    md += `\n### By Division\n\n`;
    md += `| Division | Departments | Employees |\n`;
    md += `|----------|-------------|------------|\n`;
    md += `| Office | ${officeUnits.length} | ${officeEmployees} |\n`;
    md += `| Manufacturing | ${mfgUnits.length} | ${mfgEmployees} |\n`;
    md += `| **Total** | **${officeUnits.length + mfgUnits.length}** | **${totalEmployees}** |\n`;

    md += `\n---\n\n`;

    // Contact Directory
    md += `## 📞 CONTACT DIRECTORY\n\n`;

    const allMembers = [];
    units.forEach(u => {
      if (u.members_detail) {
        const members = u.members_detail.split('||').map(m => {
          const [name, job, email] = m.split('|');
          return { name, job, email, dept: u.unit_name };
        });
        allMembers.push(...members);
      }
    });

    allMembers.sort((a, b) => a.name.localeCompare(b.name));

    md += `| Name | Position | Department | Email |\n`;
    md += `|------|----------|------------|-------|\n`;
    
    allMembers.forEach(member => {
      md += `| ${member.name} | ${member.job} | ${member.dept} | ${member.email} |\n`;
    });

    md += `\n---\n\n`;
    md += `*Generated automatically from database. Last sync: ${new Date().toLocaleString('id-ID')}*\n`;

    // Write to file
    fs.writeFileSync('00-documentation/struktur lengkap perusahaan.md', md);
    
    console.log('✅ Complete structure generated!');
    console.log('📄 File: 00-documentation/struktur lengkap perusahaan.md');
    console.log(`\n📊 Summary:`);
    console.log(`   - Total Units: ${units.length}`);
    console.log(`   - Total Employees: ${totalEmployees}`);
    console.log(`   - Office: ${officeUnits.length} depts, ${officeEmployees} employees`);
    console.log(`   - Manufacturing: ${mfgUnits.length} depts, ${mfgEmployees} employees\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

generateCompleteStructure();
