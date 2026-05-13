import { NextRequest, NextResponse } from 'next/server';
import { BrainModel } from '@/models/BrainModel';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/api-auth';
import { hasWorkspaceAdminAccess, isPlatformSuperAdminUser } from '@/lib/workspace-permissions';
import { getRequestWorkspaceContext, buildWorkspaceEntityScope } from '@/lib/workspace-context';

const configCache: Record<string, { ts: number; data: any }> = {};
const CONFIG_CACHE_TTL = 30_000;

function buildSafeConfigFallback(user: any, workspaceName?: string | null) {
  const scopeLabel = workspaceName || 'Workspace';
  return {
    team: [{
      value: user.username,
      username: user.username,
      full_name: user.full_name,
      
      avatar: user.avatar || null,
      organization: scopeLabel,
      unit_name: user.job_position || scopeLabel,
      shared_units: [],
      team_role: 'owner'
    }],
    status: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
    priority: ['Low', 'Normal', 'High', 'Urgent', 'Recurring'],
    progress: ['0%', '25%', '50%', '75%', '100%'],
    categories: [
      { value: 'Development', tag: 'Produk' },
      { value: 'Design', tag: 'Produk' },
      { value: 'Marketing', tag: 'Brand' },
      { value: 'Infrastructure', tag: 'Perusahaan' },
      { value: 'Internal', tag: 'Lainnya' }
    ],
    projects: [],
    projectOptions: [],
    defaults: {
      default_status: 'Backlog',
      default_priority: 'Normal',
      default_progress: '0%',
      default_category: 'Development'
    }
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if ('response' in auth) return auth.response;
    const user = auth.user;
    let workspaceContext: {
      user: any;
      activeWorkspace: any;
      memberUsernames: string[];
    } = {
      user,
      activeWorkspace: null as any,
      memberUsernames: [user.username]
    };
    try {
      workspaceContext = await getRequestWorkspaceContext(request);
    } catch (workspaceError) {
      console.warn('[CONFIG API] Workspace context fallback:', workspaceError);
    }

    // Check if nocache parameter is set
    const { searchParams } = new URL(request.url);
    const noCache = searchParams.get('nocache') === '1';
    const activeWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || 'none';
    const cacheKey = `${user.username}:${activeWorkspaceId}:config`;

    if (!noCache) {
      const cached = configCache[cacheKey];
      if (cached && Date.now() - cached.ts < CONFIG_CACHE_TTL) {
        return NextResponse.json({
          success: true,
          data: cached.data
        }, {
          headers: {
            'Cache-Control': 'private, max-age=15, stale-while-revalidate=45'
          }
        });
      }
    }

    // For non-admin users, filter team members by their organizational assignments
    const username = isPlatformSuperAdminUser(user as any) ? undefined : user.username;

    const [configsRaw, defaultsRaw, projectRows] = await Promise.all([
      BrainModel.getAllConfigs(username).catch(err => {
        console.error('Error loading configs:', err);
        return buildSafeConfigFallback(user, workspaceContext.activeWorkspace?.name || null);
      }),
      BrainModel.getDefaults().catch(err => {
        console.error('Error loading defaults:', err);
        return {};
      }),
      (() => {
        const scope = buildWorkspaceEntityScope(
          'p',
          workspaceContext.activeWorkspace?.workspace_id,
          workspaceContext.memberUsernames.length > 0 ? workspaceContext.memberUsernames : [user.username]
        );
        return query<any[]>(`SELECT project_id, project_name FROM projects p WHERE ${scope.sql} ORDER BY p.created_at DESC`, scope.params);
      })().catch(err => {
        console.error('Error loading projects:', err);
        return [];
      })
    ]);

    const scopedWorkspaceId = workspaceContext.activeWorkspace?.workspace_id || null;
    let configs: any = configsRaw || {};
    let defaults: any = defaultsRaw || {};

    if (scopedWorkspaceId) {
        const workspaceTeam = await query<any[]>(`
        SELECT
          wm.username AS value,
          wm.username,
          u.full_name,
          u.job_position,
          u.avatar,
          u.organization,
          COALESCE(
            (
              SELECT ou.unit_name
              FROM org_unit_staff ous2
              JOIN organizational_units ou ON ou.id = ous2.org_unit_id
              WHERE ous2.username = wm.username AND ou.is_active = 1 AND ou.workspace_id = ?
              ORDER BY ous2.is_primary DESC, ous2.assigned_at ASC, ous2.id ASC
              LIMIT 1
            ),
            ?,
            'Workspace'
          ) AS unit_name,
          COALESCE(
            (
              SELECT GROUP_CONCAT(DISTINCT ou.unit_name ORDER BY ou.unit_name SEPARATOR ', ')
              FROM org_unit_staff ous3
              JOIN organizational_units ou ON ou.id = ous3.org_unit_id
              WHERE ous3.username = wm.username AND ou.is_active = 1 AND ou.workspace_id = ?
            ),
            ''
          ) AS shared_units,
          wm.role AS team_role
        FROM workspace_members wm
        JOIN users u ON u.username = wm.username
        WHERE wm.workspace_id = ? AND u.is_active = 1
        ORDER BY wm.is_primary DESC, u.full_name ASC, wm.username ASC
      `, [scopedWorkspaceId, workspaceContext.activeWorkspace?.name || 'Workspace', scopedWorkspaceId, scopedWorkspaceId]);

      configs.team = workspaceTeam.length > 0 ? workspaceTeam : [{
        value: user.username,
        username: user.username,
        full_name: user.full_name,
        
        avatar: user.avatar,
        organization: workspaceContext.activeWorkspace?.name || 'Workspace',
        unit_name: user.job_position || workspaceContext.activeWorkspace?.name || 'Workspace',
        shared_units: [],
        team_role: 'owner'
      }];
    }

    if (!configs || !Array.isArray(configs.status) || !Array.isArray(configs.priority) || !Array.isArray(configs.progress) || !Array.isArray(configs.categories)) {
      const fallback = buildSafeConfigFallback(user, workspaceContext.activeWorkspace?.name || null);
      configs = {
        team: Array.isArray(configs?.team) && configs.team.length > 0 ? configs.team : fallback.team,
        status: Array.isArray(configs?.status) && configs.status.length > 0 ? configs.status : fallback.status,
        priority: Array.isArray(configs?.priority) && configs.priority.length > 0 ? configs.priority : fallback.priority,
        progress: Array.isArray(configs?.progress) && configs.progress.length > 0 ? configs.progress : fallback.progress,
        categories: Array.isArray(configs?.categories) && configs.categories.length > 0 ? configs.categories : fallback.categories,
      };
    }

    defaults = {
      default_status: defaults.default_status || 'Backlog',
      default_priority: defaults.default_priority || 'Normal',
      default_progress: defaults.default_progress || '0%',
      default_category: defaults.default_category || 'Development'
    };

    const responseData = {
      ...configs,
      projects: projectRows.map(p => p.project_id),
      projectOptions: projectRows,
      defaults
    };

    configCache[cacheKey] = {
      ts: Date.now(),
      data: responseData
    };

    return NextResponse.json({
      success: true,
      data: responseData
    }, {
      headers: { 
        'Cache-Control': noCache ? 'no-store, no-cache, must-revalidate' : 'private, max-age=15, stale-while-revalidate=45',
        'Pragma': noCache ? 'no-cache' : 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('Config API Error:', error);
    return NextResponse.json({ 
      success: true,
      data: {
        team: [],
        status: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
        priority: ['Low', 'Normal', 'High', 'Urgent', 'Recurring'],
        progress: ['0%', '25%', '50%', '75%', '100%'],
        categories: [
          { value: 'Development', tag: 'Produk' },
          { value: 'Design', tag: 'Produk' },
          { value: 'Marketing', tag: 'Brand' },
          { value: 'Infrastructure', tag: 'Perusahaan' },
          { value: 'Internal', tag: 'Lainnya' }
        ],
        projects: [],
        projectOptions: [],
        defaults: {
          default_status: 'Backlog',
          default_priority: 'Normal',
          default_progress: '0%',
          default_category: 'Development'
        }
      }
    }, { status: 200 });
  }
}
