import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { hasWorkspaceAdminAccess, isPlatformSuperAdminUser } from '@/lib/workspace-permissions';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

async function ensureWorkspaceRootUnit(workspaceId: string, workspaceName: string, createdBy: string) {
  const normalizedCode = String(workspaceId)
    .replace(/^WS[-_]?/i, '')
    .replace(/[^A-Z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  const unitCode = `WS_${normalizedCode || 'WORKSPACE'}`;
  const expectedName = workspaceName || 'Workspace';

const existing = await query<any[]>(`
    SELECT id, workspace_id, unit_code, unit_name
    FROM organizational_units
    WHERE is_active = 1
      AND workspace_id = ?
      AND unit_code = ?
    LIMIT 1
`, [workspaceId, unitCode]);

  if (existing.length > 0) {
    const root = existing[0];
    if (
      root.workspace_id !== workspaceId ||
      root.unit_code !== unitCode ||
      root.unit_name !== expectedName
    ) {
      await query(`
        UPDATE organizational_units
        SET workspace_id = ?, unit_code = ?, unit_name = ?, unit_type = 'company', office_type = 'none',
            parent_id = NULL, level = 0, path = ?, sort_order = 0,
            owner_username = ?, direksi_username = NULL, manager_username = NULL,
            description = ?, color = '#7c3aed', icon = 'building', is_active = 1, updated_at = NOW()
        WHERE id = ?
      `, [
        workspaceId,
        unitCode,
        expectedName,
        `/${unitCode}`,
        createdBy,
        `Workspace root for ${expectedName}`,
        root.id
      ]);
    }
    return Number(root.id);
  }

  try {
    const result = await query<any>(`
      INSERT INTO organizational_units
        (workspace_id, unit_code, unit_name, unit_type, office_type, parent_id, level, path, sort_order,
         owner_username, direksi_username, manager_username, description, color, icon, is_active, created_by)
      VALUES
        (?, ?, ?, 'company', 'none', NULL, 0, ?, 0, ?, NULL, NULL, ?, '#7c3aed', 'building', 1, ?)
    `, [
      workspaceId,
      unitCode,
      expectedName,
      `/${unitCode}`,
      createdBy,
      `Workspace root for ${expectedName}`,
      createdBy
    ]);

    return Number(result.insertId);
  } catch (error: any) {
    if (String(error?.message || '').toLowerCase().includes('duplicate entry')) {
      const fallback = await query<any[]>(`
        SELECT id
        FROM organizational_units
        WHERE is_active = 1
          AND workspace_id = ?
          AND unit_code = ?
        LIMIT 1
      `, [workspaceId, unitCode]);
      if (fallback.length > 0) return Number(fallback[0].id);
    }
    throw error;
  }
}

function buildTree(units: any[], parentId: number | null = null): any[] {
  return units
    .filter(unit => unit.parent_id === parentId)
    .map(unit => ({
      ...unit,
      children: buildTree(units, unit.id)
    }));
}

async function updateChildrenPaths(parentId: number, parentPath: string, parentLevel: number, workspaceId?: string | null) {
  const children = await query<any[]>(workspaceId
    ? 'SELECT id, unit_code FROM organizational_units WHERE parent_id = ? AND workspace_id = ?'
    : 'SELECT id, unit_code FROM organizational_units WHERE parent_id = ?',
    workspaceId ? [parentId, workspaceId] : [parentId]
  );

  for (const child of children) {
    const newPath = `${parentPath}/${child.unit_code}`;
    const newLevel = parentLevel + 1;
    await query(
      'UPDATE organizational_units SET path = ?, level = ? WHERE id = ?',
      [newPath, newLevel, child.id]
    );
    await updateChildrenPaths(child.id, newPath, newLevel, workspaceId);
  }
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const workspaceContext = await getRequestWorkspaceContext(req);
  const { searchParams } = new URL(req.url);
  const scopeMode = searchParams.get('scope');
  const isSuperAdmin = isPlatformSuperAdminUser(user as any);
  const canAccess = isSuperAdmin || hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace);
  if (!canAccess) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const action = searchParams.get('action');
    const unitId = searchParams.get('unit_id');
    const workspaceId = workspaceContext.activeWorkspace?.workspace_id || null;
    const useGlobalLegacyView = isSuperAdmin && scopeMode === 'global';

    if (!useGlobalLegacyView && workspaceId) {
      await ensureWorkspaceRootUnit(workspaceId, workspaceContext.activeWorkspace?.name || 'Workspace', user.username);
    }

    if (action === 'get_staff' && unitId) {
      const staff = await query<any[]>(useGlobalLegacyView ? `
        SELECT 
          s.username,
          s.role,
          s.assigned_at,
          u.full_name,
          u.avatar,
          u.job_position,
          u.email
        FROM org_unit_staff s
        JOIN users u ON s.username = u.username
        JOIN organizational_units ou ON ou.id = s.org_unit_id
        WHERE s.org_unit_id = ? AND u.is_active = 1
        ORDER BY u.full_name ASC
      ` : `
        SELECT 
          s.username,
          s.role,
          s.assigned_at,
          u.full_name,
          u.avatar,
          u.job_position,
          u.email
        FROM org_unit_staff s
        JOIN users u ON s.username = u.username
        JOIN organizational_units ou ON ou.id = s.org_unit_id
        WHERE s.org_unit_id = ? AND u.is_active = 1 AND ou.workspace_id = ?
        ORDER BY u.full_name ASC
      `, useGlobalLegacyView ? [unitId] : [unitId, workspaceId]);

      return NextResponse.json({ success: true, staff });
    }

    if (action === 'all_members') {
      const members = useGlobalLegacyView
        ? await query<any[]>(`
            SELECT 
              ous.org_unit_id as unit_id,
              ous.username,
              ous.role as team_role,
              ous.assigned_at,
              ous.assigned_by,
              u.full_name,
              u.avatar,
              u.job_position,
              u.email,
              u.employee_id,
              u.organization as primary_organization
            FROM org_unit_staff ous
            JOIN users u ON ous.username = u.username
            WHERE u.is_active = 1
            ORDER BY ous.org_unit_id, u.full_name ASC
          `)
        : workspaceId
          ? await query<any[]>(`
              SELECT 
                ous.org_unit_id as unit_id,
                ous.username,
                ous.role as team_role,
                ous.assigned_at,
                ous.assigned_by,
                u.full_name,
                u.avatar,
                u.job_position,
                u.email,
                u.employee_id,
                u.organization as primary_organization
              FROM org_unit_staff ous
              JOIN users u ON ous.username = u.username
              JOIN organizational_units ou ON ou.id = ous.org_unit_id
              WHERE u.is_active = 1 AND ou.workspace_id = ?
              ORDER BY ous.org_unit_id, u.full_name ASC
            `, [workspaceId])
          : [];

      return NextResponse.json({ success: true, members });
    }

    const units = useGlobalLegacyView
      ? await query<any[]>(`
          SELECT * FROM v_org_hierarchy
          WHERE is_active = 1
          ORDER BY level ASC, sort_order ASC, unit_name ASC
        `)
      : workspaceId
        ? await query<any[]>(`
            SELECT *
            FROM organizational_units
            WHERE workspace_id = ? AND is_active = 1
            ORDER BY level ASC, sort_order ASC, unit_name ASC
          `, [workspaceId])
        : [];

    return NextResponse.json({ success: true, tree: buildTree(units), flatList: units });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const workspaceContext = await getRequestWorkspaceContext(req);
  const { searchParams } = new URL(req.url);
  const scopeMode = searchParams.get('scope');
  const isSuperAdmin = isPlatformSuperAdminUser(user as any);
  const useGlobalLegacyView = isSuperAdmin && scopeMode === 'global';
  const canAccess = isSuperAdmin || hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace);
  if (!canAccess) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action } = body;
    const workspaceId = workspaceContext.activeWorkspace?.workspace_id || null;

    if (action === 'assign_staff') {
      const { unit_id, username, role = 'staff' } = body;
      if (!unit_id || !username) {
        return NextResponse.json({ success: false, error: 'unit_id and username required' }, { status: 400 });
      }

      if (!useGlobalLegacyView && workspaceId) {
        const unitCheck = await query<any[]>(
          'SELECT id FROM organizational_units WHERE id = ? AND workspace_id = ? AND is_active = 1 LIMIT 1',
          [unit_id, workspaceId]
        );
        if (unitCheck.length === 0) {
          return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 });
        }
      }

      const existing = await query<any[]>(
        'SELECT id FROM org_unit_staff WHERE org_unit_id = ? AND username = ?',
        [unit_id, username]
      );
      if (existing.length > 0) {
        return NextResponse.json({ success: false, error: 'Staff already assigned to this unit' }, { status: 400 });
      }

      await query(
        'INSERT INTO org_unit_staff (org_unit_id, username, role, assigned_by) VALUES (?, ?, ?, ?)',
        [unit_id, username, role, user.username]
      );

      return NextResponse.json({ success: true, message: 'Staff assigned successfully' });
    }

    const {
      unit_code,
      unit_name,
      unit_type,
      parent_id,
      owner_username,
      direksi_username,
      manager_username,
      description,
      color,
      icon,
      office_type
    } = body;

    if (!unit_code || !unit_name || !unit_type) {
      return NextResponse.json({ success: false, error: 'unit_code, unit_name, and unit_type required' }, { status: 400 });
    }

    if (!useGlobalLegacyView && !workspaceId) {
      return NextResponse.json({ success: false, error: 'Workspace not found' }, { status: 400 });
    }

    let level = 0;
    let path = `/${unit_code}`;
    let sort_order = 0;

    if (parent_id) {
      const parent = await query<any[]>(useGlobalLegacyView
        ? 'SELECT id, level, path, (SELECT MAX(sort_order) FROM organizational_units WHERE parent_id = ?) as max_sort FROM organizational_units WHERE id = ?'
        : 'SELECT id, level, path, (SELECT MAX(sort_order) FROM organizational_units WHERE parent_id = ? AND workspace_id = ?) as max_sort FROM organizational_units WHERE id = ? AND workspace_id = ?',
        useGlobalLegacyView ? [parent_id, parent_id] : [parent_id, workspaceId, parent_id, workspaceId]
      );

      if (parent.length > 0) {
        level = parent[0].level + 1;
        path = `${parent[0].path}/${unit_code}`;
        sort_order = (parent[0].max_sort || 0) + 1;
      }
    }

    const result = await query<any>(`
      INSERT INTO organizational_units
        (workspace_id, unit_code, unit_name, unit_type, parent_id, level, path, sort_order,
         owner_username, direksi_username, manager_username, description, color, icon, office_type, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      useGlobalLegacyView ? null : workspaceId,
      unit_code, unit_name, unit_type, parent_id || null, level, path, sort_order,
      owner_username || null, direksi_username || null, manager_username || null,
      description || null, color || '#7c3aed', icon || 'building', office_type || 'none', user.username
    ]);

    return NextResponse.json({ success: true, message: 'Organizational unit created', id: Number(result.insertId) });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const workspaceContext = await getRequestWorkspaceContext(req);
  const { searchParams } = new URL(req.url);
  const scopeMode = searchParams.get('scope');
  const isSuperAdmin = isPlatformSuperAdminUser(user as any);
  const useGlobalLegacyView = isSuperAdmin && scopeMode === 'global';
  const canAccess = isSuperAdmin || hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace);
  if (!canAccess) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const workspaceId = workspaceContext.activeWorkspace?.workspace_id || null;
    const { action, ...data } = await req.json();

    if (action === 'reorder') {
      const { id, new_parent_id, new_sort_order } = data;
      if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

      const current = await query<any[]>(useGlobalLegacyView
        ? 'SELECT * FROM organizational_units WHERE id = ?'
        : 'SELECT * FROM organizational_units WHERE id = ? AND workspace_id = ?',
        useGlobalLegacyView ? [id] : [id, workspaceId]
      );

      if (current.length === 0) {
        return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 });
      }

      let new_level = 0;
      let new_path = `/${current[0].unit_code}`;
      if (new_parent_id) {
        const parent = await query<any[]>(useGlobalLegacyView
          ? 'SELECT level, path FROM organizational_units WHERE id = ?'
          : 'SELECT level, path FROM organizational_units WHERE id = ? AND workspace_id = ?',
          useGlobalLegacyView ? [new_parent_id] : [new_parent_id, workspaceId]
        );
        if (parent.length > 0) {
          new_level = parent[0].level + 1;
          new_path = `${parent[0].path}/${current[0].unit_code}`;
        }
      }

      await query(
        useGlobalLegacyView
          ? `UPDATE organizational_units SET parent_id = ?, level = ?, path = ?, sort_order = ? WHERE id = ?`
          : `UPDATE organizational_units SET parent_id = ?, level = ?, path = ?, sort_order = ? WHERE id = ? AND workspace_id = ?`,
        useGlobalLegacyView
          ? [new_parent_id || null, new_level, new_path, new_sort_order || 0, id]
          : [new_parent_id || null, new_level, new_path, new_sort_order || 0, id, workspaceId]
      );

      await updateChildrenPaths(Number(id), new_path, new_level, useGlobalLegacyView ? null : workspaceId);
      return NextResponse.json({ success: true, message: 'Unit reordered successfully' });
    }

    const { id, unit_name, unit_type, office_type, description, color, icon, is_active } = data;
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const current = await query<any[]>(useGlobalLegacyView
      ? 'SELECT * FROM organizational_units WHERE id = ?'
      : 'SELECT * FROM organizational_units WHERE id = ? AND workspace_id = ?',
      useGlobalLegacyView ? [id] : [id, workspaceId]
    );
    if (current.length === 0) {
      return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];
    if (unit_name !== undefined) { updates.push('unit_name = ?'); values.push(unit_name); }
    if (unit_type !== undefined) { updates.push('unit_type = ?'); values.push(unit_type); }
    if (office_type !== undefined) { updates.push('office_type = ?'); values.push(office_type); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description || null); }
    if (color !== undefined) { updates.push('color = ?'); values.push(color); }
    if (icon !== undefined) { updates.push('icon = ?'); values.push(icon); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active); }
    updates.push('updated_at = NOW()');
    values.push(id);
    if (updates.length <= 1) return NextResponse.json({ success: true, message: 'Nothing to update' });

    await query(
      useGlobalLegacyView
        ? `UPDATE organizational_units SET ${updates.join(', ')} WHERE id = ?`
        : `UPDATE organizational_units SET ${updates.join(', ')} WHERE id = ? AND workspace_id = ?`,
      useGlobalLegacyView ? values : [...values, workspaceId]
    );

    return NextResponse.json({ success: true, message: 'Unit updated successfully' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const workspaceContext = await getRequestWorkspaceContext(req);
  const { searchParams } = new URL(req.url);
  const scopeMode = searchParams.get('scope');
  const isSuperAdmin = isPlatformSuperAdminUser(user as any);
  const useGlobalLegacyView = isSuperAdmin && scopeMode === 'global';
  const canAccess = isSuperAdmin || hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace);
  if (!canAccess) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }

  const workspaceId = workspaceContext.activeWorkspace?.workspace_id || null;
  const action = searchParams.get('action');
  const id = searchParams.get('id');

  try {
    if (action === 'remove_staff') {
      const body = await req.json();
      const { unit_id, username } = body;
      if (!unit_id || !username) {
        return NextResponse.json({ success: false, error: 'unit_id and username required' }, { status: 400 });
      }

      if (!useGlobalLegacyView && workspaceId) {
        const unitCheck = await query<any[]>(
          'SELECT id FROM organizational_units WHERE id = ? AND workspace_id = ? LIMIT 1',
          [unit_id, workspaceId]
        );
        if (unitCheck.length === 0) {
          return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 });
        }
      }

      await query('DELETE FROM org_unit_staff WHERE org_unit_id = ? AND username = ?', [unit_id, username]);
      return NextResponse.json({ success: true, message: 'Staff removed successfully' });
    }

    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const current = await query<any[]>(useGlobalLegacyView
      ? 'SELECT * FROM organizational_units WHERE id = ?'
      : 'SELECT * FROM organizational_units WHERE id = ? AND workspace_id = ?',
      useGlobalLegacyView ? [id] : [id, workspaceId]
    );
    if (current.length === 0) {
      return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 });
    }

    const children = await query<any[]>(
      useGlobalLegacyView
        ? 'SELECT COUNT(*) as count FROM organizational_units WHERE parent_id = ?'
        : 'SELECT COUNT(*) as count FROM organizational_units WHERE parent_id = ? AND workspace_id = ?',
      useGlobalLegacyView ? [id] : [id, workspaceId]
    );
    if (children[0].count > 0) {
      return NextResponse.json({ success: false, error: 'Cannot delete unit with children. Delete children first or move them to another parent.' }, { status: 400 });
    }

    await query(
      useGlobalLegacyView
        ? 'DELETE FROM organizational_units WHERE id = ?'
        : 'DELETE FROM organizational_units WHERE id = ? AND workspace_id = ?',
      useGlobalLegacyView ? [id] : [id, workspaceId]
    );

    return NextResponse.json({ success: true, message: 'Unit deleted successfully' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
