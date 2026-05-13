import { query } from '@/lib/db';

function splitCsv(value?: string | null) {
  if (!value) return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export async function getWorkspaceAudit() {
  const [users, orgAssignments, legacyTeamConfig, projects, tasks] = await Promise.all([
    query<any[]>('SELECT username, full_name FROM users WHERE is_active = 1 ORDER BY username ASC'),
    query<any[]>('SELECT username, org_unit_id FROM org_unit_staff'),
    query<any[]>("SELECT config_value FROM brain_config WHERE config_type = 'team' ORDER BY display_order ASC"),
    query<any[]>('SELECT project_id, project_name, owner, assignees FROM projects ORDER BY project_id ASC'),
    query<any[]>('SELECT task_id, task_name, project_id, assignees FROM tasks ORDER BY task_id ASC')
  ]);

  const activeUsernames = new Set(users.map((user) => String(user.username).trim()).filter(Boolean));
  const projectIssues = projects.flatMap((project) => {
    const issues: Array<{ field: string; value: string }> = [];
    if (project.owner && !activeUsernames.has(project.owner)) {
      issues.push({ field: 'owner', value: project.owner });
    }
    for (const assignee of splitCsv(project.assignees)) {
      if (!activeUsernames.has(assignee)) {
        issues.push({ field: 'assignee', value: assignee });
      }
    }
    return issues.length > 0 ? [{ project_id: project.project_id, project_name: project.project_name, issues }] : [];
  });

  const taskIssues = tasks.flatMap((task) => {
    const issues = splitCsv(task.assignees)
      .filter((assignee) => !activeUsernames.has(assignee))
      .map((assignee) => ({ field: 'assignee', value: assignee }));
    return issues.length > 0 ? [{ task_id: task.task_id, task_name: task.task_name, project_id: task.project_id, issues }] : [];
  });

  return {
    summary: {
      active_users: users.length,
      org_assignments: orgAssignments.length,
      legacy_team_config_rows: legacyTeamConfig.length,
      projects_with_invalid_people: projectIssues.length,
      tasks_with_invalid_people: taskIssues.length
    },
    legacy_team_config: legacyTeamConfig.map((row) => row.config_value),
    invalid_project_people: projectIssues,
    invalid_task_people: taskIssues
  };
}
