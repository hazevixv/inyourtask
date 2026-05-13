import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getRequestWorkspaceContext, buildWorkspaceEntityScope } from '@/lib/workspace-context';

export async function GET(request: NextRequest) {
  try {
    const { user, activeWorkspace, memberUsernames } = await getRequestWorkspaceContext(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const activeWorkspaceId = activeWorkspace?.workspace_id || null;
    const scopeUsernames = memberUsernames.length > 0 ? memberUsernames : [user.username];
    const projectScope = buildWorkspaceEntityScope('p', activeWorkspaceId, scopeUsernames);
    const taskScope = buildWorkspaceEntityScope('t', activeWorkspaceId, scopeUsernames, {
      ownerColumn: 'assignee',
      assigneeColumn: 'assignees'
    });

    const safeQuery = async <T>(promise: Promise<T>, fallback: T): Promise<T> => {
      try {
        return await promise;
      } catch (error) {
        console.error('[Dashboard API] Query failed:', error);
        return fallback;
      }
    };

    const [projects, tasks, statsRows, byStatus, byPriority, byCategory, myTasks, weeklyProgress, logs] = await Promise.all([
      safeQuery(query(`
        SELECT
          p.*,
          (
            SELECT COUNT(*)
            FROM tasks t
            WHERE t.project_id = p.project_id
          ) AS task_count
        FROM projects p
        WHERE ${projectScope.sql}
        ORDER BY p.created_at DESC
      `, projectScope.params), []),

      safeQuery(query(`
        SELECT *
        FROM tasks t
        WHERE ${taskScope.sql}
        ORDER BY t.updated_at DESC
      `, taskScope.params), []),

      safeQuery((async () => {
        const rows = await Promise.all([
          query(`SELECT COUNT(*) AS totalProjects FROM projects p WHERE ${projectScope.sql}`, projectScope.params),
          query(`SELECT COUNT(*) AS activeProjects FROM projects p WHERE ${projectScope.sql} AND p.status = 'Active'`, projectScope.params),
          query(`SELECT COUNT(*) AS totalTasks FROM tasks t WHERE ${taskScope.sql}`, taskScope.params),
          query(`SELECT COUNT(*) AS activeTasks FROM tasks t WHERE ${taskScope.sql} AND t.status NOT IN ('Done', 'Backlog', 'Closed')`, taskScope.params),
          query(`SELECT COUNT(*) AS doneTasks FROM tasks t WHERE ${taskScope.sql} AND t.status = 'Done'`, taskScope.params),
          query(`SELECT COUNT(*) AS urgent FROM tasks t WHERE ${taskScope.sql} AND t.priority = 'Urgent' AND t.status NOT IN ('Done','Closed')`, taskScope.params),
          query(`SELECT COUNT(*) AS overdue FROM tasks t WHERE ${taskScope.sql} AND t.due_date < CURDATE() AND t.status NOT IN ('Done','Closed')`, taskScope.params),
          query(`SELECT COALESCE(ROUND(AVG(progress), 1), 0) AS avgProgress FROM projects p WHERE ${projectScope.sql}`, projectScope.params),
          query(`SELECT COUNT(*) AS dueToday FROM tasks t WHERE ${taskScope.sql} AND t.due_date = CURDATE() AND t.status NOT IN ('Done','Closed')`, taskScope.params),
          query(`SELECT COUNT(*) AS dueThisWeek FROM tasks t WHERE ${taskScope.sql} AND t.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND t.status NOT IN ('Done','Closed')`, taskScope.params)
        ]);
        return rows.map(row => (Array.isArray(row) ? row[0] || {} : {}));
      })(), [] as any[]),

      safeQuery(query(`SELECT status, COUNT(*) as cnt FROM tasks t WHERE ${taskScope.sql} GROUP BY status ORDER BY cnt DESC`, taskScope.params), []),
      safeQuery(query(`SELECT priority, COUNT(*) as cnt FROM tasks t WHERE ${taskScope.sql} GROUP BY priority ORDER BY cnt DESC`, taskScope.params), []),
      safeQuery(query(`SELECT category, COUNT(*) as cnt FROM projects p WHERE ${projectScope.sql} GROUP BY category ORDER BY cnt DESC`, projectScope.params), []),
      safeQuery(query(`
        SELECT t.*, p.project_name
        FROM tasks t
        LEFT JOIN projects p ON p.project_id = t.project_id
        WHERE ${taskScope.sql} AND t.status NOT IN ('Done','Closed')
        ORDER BY
          CASE t.priority WHEN 'Urgent' THEN 1 WHEN 'High' THEN 2 WHEN 'Normal' THEN 3 ELSE 4 END,
          CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,
          t.due_date ASC
        LIMIT 10
      `, taskScope.params), []),
      safeQuery(query(`
        SELECT
          DATE(created_at) as day,
          COUNT(*) as created,
          SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as done
        FROM tasks t
        WHERE ${taskScope.sql} AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY day ASC
      `, taskScope.params), []),
      safeQuery(query(`
        SELECT
          id, timestamp as changed_at, item_type, item_id, item_name, project_name,
          change_type, from_version, to_version, from_value, to_value, changed_by, notes
        FROM weekly_snapshot
        WHERE changed_by IN (${scopeUsernames.map(() => '?').join(',')})
        ORDER BY timestamp DESC
        LIMIT 200
      `, scopeUsernames), [])
    ]);

    const byStatusObj: Record<string, number> = {};
    const byPriorityObj: Record<string, number> = {};
    const byCategoryObj: Record<string, number> = {};
    (byStatus as any[]).forEach(r => { byStatusObj[r.status] = Number(r.cnt); });
    (byPriority as any[]).forEach(r => { byPriorityObj[r.priority] = Number(r.cnt); });
    (byCategory as any[]).forEach(r => { byCategoryObj[r.category] = Number(r.cnt); });

    const stats = Array.isArray(statsRows) ? statsRows : [];
    const s = {
      totalProjects: (stats[0] as any)?.totalProjects,
      activeProjects: (stats[1] as any)?.activeProjects,
      totalTasks: (stats[2] as any)?.totalTasks,
      activeTasks: (stats[3] as any)?.activeTasks,
      doneTasks: (stats[4] as any)?.doneTasks,
      urgent: (stats[5] as any)?.urgent,
      overdue: (stats[6] as any)?.overdue,
      avgProgress: (stats[7] as any)?.avgProgress,
      dueToday: (stats[8] as any)?.dueToday,
      dueThisWeek: (stats[9] as any)?.dueThisWeek,
    } as Record<string, any>;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalProjects: Number(s.totalProjects) || 0,
          activeProjects: Number(s.activeProjects) || 0,
          totalTasks: Number(s.totalTasks) || 0,
          activeTasks: Number(s.activeTasks) || 0,
          doneTasks: Number(s.doneTasks) || 0,
          urgent: Number(s.urgent) || 0,
          overdue: Number(s.overdue) || 0,
          avgProgress: s.avgProgress || '0',
          dueToday: Number(s.dueToday) || 0,
          dueThisWeek: Number(s.dueThisWeek) || 0,
        },
        projects,
        tasks,
        logs,
        myTasks,
        recentActivity: (tasks as any[]).slice(0, 8),
        weeklyProgress,
        byStatus: byStatusObj,
        byPriority: byPriorityObj,
        byCategory: byCategoryObj,
        activeWorkspace
      }
    }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    console.error('[Dashboard API] Error:', error);
    return NextResponse.json({
      success: true,
      warnings: [error.message || 'Internal server error'],
      data: {
        stats: {
          totalProjects: 0, activeProjects: 0, totalTasks: 0, activeTasks: 0,
          doneTasks: 0, urgent: 0, overdue: 0, avgProgress: '0', dueToday: 0, dueThisWeek: 0,
        },
        projects: [], tasks: [], logs: [], myTasks: [], recentActivity: [],
        weeklyProgress: [], byStatus: {}, byPriority: {}, byCategory: {}
      }
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}
