import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/api-auth';
import { hasWorkspaceAdminAccess } from '@/lib/workspace-permissions';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

async function canAccessProject(user: any, projectId: string, activeWorkspace?: { role?: string | null } | null, workspaceId?: string | null) {
  if (hasWorkspaceAdminAccess(user as any, activeWorkspace)) return true;
  const projects = await query<any[]>(
    workspaceId
      ? 'SELECT owner, assignees FROM projects WHERE project_id = ? AND workspace_id = ?'
      : 'SELECT owner, assignees FROM projects WHERE project_id = ?',
    workspaceId ? [projectId, workspaceId] : [projectId]
  );
  if (projects.length === 0) return false;
  const project = projects[0];
  const assignees = String(project.assignees || '');
  return project.owner === user.username || assignees.split(',').map((item: string) => item.trim()).includes(user.username);
}

/**
 * GET /api/projects/[id]/workflow
 * Get workflow for a project
 */
export async function GET(
  req: NextRequest,
  { params: routeParams }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const workspaceContext = await getRequestWorkspaceContext(req);
    const workspaceId = workspaceContext.activeWorkspace?.workspace_id || null;

    const projectId = routeParams.id;
    if (!(await canAccessProject(user, projectId, workspaceContext.activeWorkspace, workspaceId))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Get workflow stages
    const stages = await query<any[]>(
      `SELECT 
        s.*,
        ou.unit_name as assigned_unit_name,
        ou.unit_type as assigned_unit_type
      FROM project_workflow_stages s
      LEFT JOIN organizational_units ou ON s.assigned_unit_id = ou.id
      WHERE s.project_id = ?
      ORDER BY s.stage_order ASC`,
      [projectId]
    );

    // Get workflow history
    const history = await query<any[]>(
      `SELECT 
        h.*,
        u.full_name as changed_by_name
      FROM project_workflow_history h
      LEFT JOIN users u ON h.changed_by = u.username
      WHERE h.project_id = ?
      ORDER BY h.changed_at DESC
      LIMIT 50`,
      [projectId]
    );

    // Calculate overall progress
    const totalStages = stages.length;
    const completedStages = stages.filter(s => s.status === 'completed').length;
    const progress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

    return NextResponse.json({
      success: true,
      workflow: {
        stages,
        history,
        progress,
        totalStages,
        completedStages
      }
    });
  } catch (error: any) {
    console.error('[WORKFLOW GET]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/workflow
 * Create workflow from template based on project category
 */
export async function POST(
  req: NextRequest,
  { params: routeParams }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const workspaceContext = await getRequestWorkspaceContext(req);
    const workspaceId = workspaceContext.activeWorkspace?.workspace_id || null;

    const projectId = routeParams.id;
    if (!(await canAccessProject(user, projectId, workspaceContext.activeWorkspace, workspaceId))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Get project details
    const projects = await query<any[]>(
      workspaceId
        ? 'SELECT * FROM projects WHERE project_id = ? AND workspace_id = ?'
        : 'SELECT * FROM projects WHERE project_id = ?',
      workspaceId ? [projectId, workspaceId] : [projectId]
    );

    if (projects.length === 0) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const project = projects[0];
    if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace) && project.owner !== user.username && !(project.assignees || '').includes(user.username)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Check if workflow already exists
    const existing = await query<any[]>(
      workspaceId
        ? 'SELECT * FROM project_workflow_stages WHERE project_id = ? AND EXISTS (SELECT 1 FROM projects p WHERE p.project_id = ? AND p.workspace_id = ?)'
        : 'SELECT * FROM project_workflow_stages WHERE project_id = ?',
      workspaceId ? [projectId, projectId, workspaceId] : [projectId]
    );

    if (existing.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Workflow already exists for this project' 
      }, { status: 400 });
    }

    // Get template based on project category
    const templates = await query<any[]>(
      'SELECT * FROM project_workflow_templates WHERE category = ?',
      [project.category]
    );

    if (templates.length === 0) {
      // Use default template
      const defaultTemplates = await query<any[]>(
        "SELECT * FROM project_workflow_templates WHERE category = 'Lainnya'"
      );
      if (defaultTemplates.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'No workflow template found' 
        }, { status: 404 });
      }
      templates.push(defaultTemplates[0]);
    }

    const template = templates[0];
    const stages = JSON.parse(template.stages);

    // Create workflow stages
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const stageId = `stage-${projectId}-${i + 1}-${Date.now()}`;

      // Try to find organizational unit by division name
      const units = await query<any[]>(
        workspaceId
          ? 'SELECT id FROM organizational_units WHERE unit_name LIKE ? AND workspace_id = ? LIMIT 1'
          : 'SELECT id FROM organizational_units WHERE unit_name LIKE ? LIMIT 1',
        workspaceId ? [`%${stage.division}%`, workspaceId] : [`%${stage.division}%`]
      );

      const unitId = units.length > 0 ? units[0].id : null;

      await query(
        `INSERT INTO project_workflow_stages 
        (stage_id, project_id, stage_name, stage_order, assigned_division, assigned_unit_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          stageId,
          projectId,
          stage.name,
          i + 1,
          stage.division,
          unitId,
          i === 0 ? 'in_progress' : 'waiting' // First stage starts immediately
        ]
      );

      // Log initial status
      await query(
        `INSERT INTO project_workflow_history 
        (stage_id, project_id, old_status, new_status, changed_by, notes)
        VALUES (?, ?, NULL, ?, ?, ?)`,
        [
          stageId,
          projectId,
          i === 0 ? 'in_progress' : 'waiting',
          user.username,
          `Workflow created from template: ${template.template_name}`
        ]
      );
    }

    // Update project status
    await query(
      'UPDATE projects SET status = ? WHERE project_id = ?',
      ['In Progress', projectId]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Workflow created successfully',
      stagesCreated: stages.length
    });
  } catch (error: any) {
    console.error('[WORKFLOW POST]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/workflow
 * Update stage status
 */
export async function PUT(
  req: NextRequest,
  { params: routeParams }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const workspaceContext = await getRequestWorkspaceContext(req);
    const workspaceId = workspaceContext.activeWorkspace?.workspace_id || null;

    const projectId = routeParams.id;
    if (!(await canAccessProject(user, projectId, workspaceContext.activeWorkspace, workspaceId))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json();
    const { stageId, status, notes } = body;

    if (!stageId || !status) {
      return NextResponse.json({ 
        success: false, 
        error: 'stageId and status required' 
      }, { status: 400 });
    }

    // Get current stage
    const stages = await query<any[]>(
      workspaceId
        ? 'SELECT * FROM project_workflow_stages WHERE stage_id = ? AND project_id = ?'
        : 'SELECT * FROM project_workflow_stages WHERE stage_id = ?',
      workspaceId ? [stageId, projectId] : [stageId]
    );

    if (stages.length === 0) {
      return NextResponse.json({ success: false, error: 'Stage not found' }, { status: 404 });
    }

    const stage = stages[0];
    const oldStatus = stage.status;

    // Calculate duration if completing
    let durationMinutes = null;
    if (status === 'completed' && stage.started_at) {
      const startTime = new Date(stage.started_at).getTime();
      const endTime = Date.now();
      durationMinutes = Math.round((endTime - startTime) / 60000);
    }

    // Update stage
    const updates: string[] = ['status = ?', 'updated_at = NOW()'];
    const updateValues: any[] = [status];

    if (status === 'in_progress' && !stage.started_at) {
      updates.push('started_at = NOW()');
    }

    if (status === 'completed') {
      updates.push('completed_at = NOW()');
    }

    if (notes) {
      updates.push('notes = ?');
      updateValues.push(notes);
    }

    updateValues.push(stageId);

    await query(
      `UPDATE project_workflow_stages SET ${updates.join(', ')} WHERE stage_id = ?`,
      updateValues
    );

    // Log history
    await query(
      `INSERT INTO project_workflow_history 
      (stage_id, project_id, old_status, new_status, changed_by, notes, duration_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [stageId, projectId, oldStatus, status, user.username, notes || null, durationMinutes]
    );

    // If stage completed, auto-start next stage
    if (status === 'completed') {
      const nextStages = await query<any[]>(
        `SELECT * FROM project_workflow_stages 
        WHERE project_id = ? AND stage_order = ? AND status = 'waiting'`,
        [projectId, stage.stage_order + 1]
      );

      if (nextStages.length > 0) {
        const nextStage = nextStages[0];
        await query(
          `UPDATE project_workflow_stages 
          SET status = 'in_progress', started_at = NOW() 
          WHERE stage_id = ?`,
          [nextStage.stage_id]
        );

        await query(
          `INSERT INTO project_workflow_history 
          (stage_id, project_id, old_status, new_status, changed_by, notes)
          VALUES (?, ?, 'waiting', 'in_progress', ?, 'Auto-started after previous stage completed')`,
          [nextStage.stage_id, projectId, user.username]
        );
      }

      // Check if all stages completed
      const allStages = await query<any[]>(
        'SELECT * FROM project_workflow_stages WHERE project_id = ?',
        [projectId]
      );

      const allCompleted = allStages.every(s => s.status === 'completed');

      if (allCompleted) {
        await query(
          'UPDATE projects SET status = ?, progress = ? WHERE project_id = ?',
          ['Completed', '100%', projectId]
        );

        // Create notification
        await query(
          `INSERT INTO notifications (user_id, type, title, body, data, created_at)
          VALUES (?, 'project_completed', ?, ?, ?, NOW())`,
          [
            user.username,
            'Project Completed!',
            `All workflow stages completed for project ${projectId}`,
            JSON.stringify({ project_id: projectId })
          ]
        );
      }
    }

    // Create notification for status change
    await query(
      `INSERT INTO notifications (user_id, type, title, body, data, created_at)
      VALUES (?, 'workflow_update', ?, ?, ?, NOW())`,
      [
        user.username,
        `Workflow Stage Updated`,
        `${stage.stage_name}: ${oldStatus} → ${status}`,
        JSON.stringify({ project_id: projectId, stage_id: stageId, status })
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[WORKFLOW PUT]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/workflow
 * Delete workflow (reset project workflow)
 */
export async function DELETE(
  req: NextRequest,
  { params: routeParams }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = routeParams.id;

    // Delete workflow (history will cascade delete)
    await query(
      'DELETE FROM project_workflow_stages WHERE project_id = ?',
      [projectId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[WORKFLOW DELETE]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
