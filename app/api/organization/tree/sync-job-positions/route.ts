import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/api-auth';
import { hasWorkspaceAdminAccess } from '@/lib/workspace-permissions';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if ('response' in auth) return auth.response;
    const workspaceContext = await getRequestWorkspaceContext(request);
    
    // Only admin can sync
    if (!hasWorkspaceAdminAccess(auth.user as any, workspaceContext.activeWorkspace)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Get all unique job positions from users
    const jobPositions = await query<any[]>(`
      SELECT DISTINCT job_position 
      FROM users 
      WHERE job_position IS NOT NULL 
        AND job_position != '' 
        AND is_active = 1
      ORDER BY job_position
    `);

    if (jobPositions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        created: 0, 
        message: 'No job positions found' 
      });
    }

    const workspaceId = workspaceContext.activeWorkspace?.workspace_id || null;
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Workspace not found' }, { status: 400 });
    }

const rootExisting = await query<any[]>(`
      SELECT id, workspace_id, unit_code, unit_name
      FROM organizational_units
      WHERE is_active = 1
        AND workspace_id = ?
      LIMIT 1
    `, [workspaceId]);

    const workspaceRootCode = `WS_${workspaceId.replace(/[^A-Z0-9_]/gi, '_').toUpperCase()}`;
    let rootId: number;
    if (rootExisting.length > 0) {
      const root = rootExisting[0];
      const expectedName = workspaceContext.activeWorkspace?.name || 'Workspace';
      if (
        root.workspace_id !== workspaceId ||
        root.unit_code !== workspaceRootCode ||
        root.unit_name !== expectedName
      ) {
        await query(`
          UPDATE organizational_units
          SET workspace_id = ?, unit_code = ?, unit_name = ?, unit_type = 'company', office_type = 'none',
              parent_id = NULL, level = 0, path = ?, sort_order = 0,
              owner_username = ?, direksi_username = NULL, manager_username = NULL,
              description = ?, color = '#6366f1', icon = 'building', is_active = 1, updated_at = NOW()
          WHERE id = ?
        `, [
          workspaceId,
          workspaceRootCode,
          expectedName,
          `/${workspaceRootCode}`,
          auth.user.username,
          `Workspace root for ${expectedName}`,
          root.id
        ]);
      }
      rootId = Number(root.id);
    } else {
      rootId = Number((await query<any>(`
          INSERT INTO organizational_units
            (workspace_id, unit_code, unit_name, unit_type, office_type, parent_id, level, path, sort_order,
             owner_username, direksi_username, manager_username, description, color, icon, is_active, created_by)
          VALUES
            (?, ?, ?, 'company', 'none', NULL, 0, ?, 0, ?, NULL, NULL, ?, '#6366f1', 'building', 1, ?)
        `, [
          workspaceId,
          workspaceRootCode,
          workspaceContext.activeWorkspace?.name || 'Workspace',
          `/${workspaceRootCode}`,
          auth.user.username,
          `Workspace root for ${workspaceContext.activeWorkspace?.name || 'Workspace'}`,
          auth.user.username
        ])).insertId);
    }
    const rootRow = await query<any[]>(`
      SELECT path
      FROM organizational_units
      WHERE id = ?
      LIMIT 1
    `, [rootId]);
    const rootPath = rootRow[0]?.path || `/${workspaceRootCode}`;
    let created = 0;

    // Create organizational units for each job position
    for (const jp of jobPositions) {
      const jobPosition = jp.job_position;
      
      // Generate unit code from job position (uppercase, replace spaces with underscores)
      const unitCode = jobPosition.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
      
      // Check if unit already exists
      const existing = await query<any[]>(
        'SELECT id FROM organizational_units WHERE unit_code = ? AND workspace_id = ?',
        [unitCode, workspaceId]
      );

      if (existing.length === 0) {
        // Create new unit
        await query(`
          INSERT INTO organizational_units 
          (workspace_id, unit_code, unit_name, unit_type, parent_id, level, path, sort_order, color, icon, description, office_type, created_by)
          VALUES (?, ?, ?, 'division', ?, 1, ?, ?, '#6366f1', 'briefcase', ?, 'none', ?)
        `, [
          workspaceId,
          unitCode,
          jobPosition,
          rootId,
          `${rootPath}/${unitCode}`,
          created + 1,
          `Division for ${jobPosition} employees`,
          auth.user.username
        ]);

        created++;

        // Update users with this job position to link to the new unit
        const newUnit = await query<any[]>(
          'SELECT id FROM organizational_units WHERE unit_code = ? AND workspace_id = ?',
          [unitCode, workspaceId]
        );

        if (newUnit.length > 0) {
          await query(`
            UPDATE users 
            SET org_unit_id = ? 
            WHERE job_position = ? AND is_active = 1
          `, [newUnit[0].id, jobPosition]);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      created,
      total: jobPositions.length,
      message: `Created ${created} new organizational units from job positions`
    });

  } catch (error: any) {
    console.error('[Sync Job Positions] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
