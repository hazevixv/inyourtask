import { query } from '@/lib/db';

type UnitRow = {
  id: number;
  unit_code: string;
  unit_name: string;
  unit_type: string;
  level: number;
};

type UserRow = {
  username: string;
  full_name: string;
  job_position: string | null;
  organization: string | null;
};

function normalize(value?: string | null) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value?: string | null) {
  return normalize(value).split(' ').filter(Boolean);
}

function scoreMatch(user: UserRow, unit: UnitRow) {
  const job = normalize(user.job_position);
  const org = normalize(user.organization);
  const unitName = normalize(unit.unit_name);
  const unitCode = normalize(unit.unit_code);
  const unitTokens = tokenize(unit.unit_name);
  const codeTokens = tokenize(unit.unit_code);
  let score = 0;
  let reason = '';

  if (job && job === unitName) {
    return { score: 100, reason: 'Exact job position match' };
  }

  if (job && unitCode && job === unitCode) {
    return { score: 100, reason: 'Exact unit code match' };
  }

  if (org && org === unitName) {
    return { score: 95, reason: 'Exact organization match' };
  }

  if (job && unitName && job.includes(unitName) && unitName.length >= 4) {
    score = Math.max(score, unit.unit_type === 'product' ? 88 : 78);
    reason = 'Job position contains unit name';
  }

  if (org && unitName && org.includes(unitName) && unitName.length >= 4) {
    score = Math.max(score, unit.unit_type === 'company' ? 84 : 72);
    reason = reason || 'Organization contains unit name';
  }

  if (job && unitCode && job.includes(unitCode) && unitCode.length >= 4) {
    score = Math.max(score, unit.unit_type === 'product' ? 96 : unit.level >= 2 ? 94 : 80);
    reason = reason || 'Job position contains unit code';
  }

  if (unitCode && job && unitCode.includes(job) && job.length >= 4) {
    score = Math.max(score, unit.unit_type === 'product' ? 97 : unit.level >= 2 ? 93 : 78);
    reason = reason || 'Unit code contains job position';
  }

  const overlapJob = unitTokens.filter((token) => token.length >= 4 && job.includes(token)).length;
  const overlapOrg = unitTokens.filter((token) => token.length >= 4 && org.includes(token)).length;
  const overlapCode = codeTokens.filter((token) => token.length >= 4 && (job.includes(token) || org.includes(token))).length;
  const overlap = Math.max(overlapJob, overlapOrg, overlapCode);
  if (overlap >= 2) {
    score = Math.max(score, 72 + overlap * 6 + (unit.level >= 2 ? 4 : 0));
    reason = reason || 'Multiple token overlap';
  } else if (overlap >= 1 && !reason) {
    score = Math.max(score, unit.level >= 2 ? 74 : 62);
    reason = 'Single token overlap';
  }

  if (unit.level === 0) {
    score = Math.min(score, 70);
  } else if (unit.level === 1) {
    score = Math.min(score, Math.max(score, 78));
  }

  return { score, reason };
}

export async function buildAssignmentSuggestions(params?: {
  workspaceId?: string | null;
  usernames?: string[];
  workspaceName?: string | null;
}) {
  const workspaceId = String(params?.workspaceId || '').trim();
  const usernames = Array.from(new Set((params?.usernames || []).map((item) => String(item || '').trim()).filter(Boolean)));

  if (!workspaceId) {
    return {
      summary: {
        total_users: 0,
        already_assigned_users: 0,
        users_with_suggestions: 0,
        high_confidence_suggestions: 0
      },
      suggestions: []
    };
  }

  const [users, units, existingAssignments] = await Promise.all([
    usernames.length > 0
      ? query<UserRow[]>(`
          SELECT u.username, u.full_name, u.job_position, u.organization
          FROM users u
          JOIN workspace_members wm ON wm.username = u.username AND wm.workspace_id = ?
          WHERE u.is_active = 1
          ORDER BY u.full_name ASC
        `, [workspaceId])
      : query<UserRow[]>('SELECT username, full_name, job_position, organization FROM users WHERE is_active = 1 ORDER BY full_name ASC'),
    query<UnitRow[]>(`
      SELECT id, unit_code, unit_name, unit_type, level
      FROM organizational_units
      WHERE is_active = 1 AND workspace_id = ?
      ORDER BY level ASC, unit_name ASC
    `, [workspaceId]),
    query<any[]>(`
      SELECT ous.username, ous.org_unit_id, ous.is_primary
      FROM org_unit_staff ous
      JOIN organizational_units ou ON ou.id = ous.org_unit_id
      WHERE ou.workspace_id = ?
    `, [workspaceId])
  ]);

  const assignedUsers = new Set(existingAssignments.map((row) => String(row.username)));
  const suggestions = users.map((user) => {
    const ranked = units
      .map((unit) => ({ unit, ...scoreMatch(user, unit) }))
      .filter((item) => item.score >= 75)
      .sort((a, b) => b.score - a.score || a.unit.level - b.unit.level || a.unit.unit_name.localeCompare(b.unit.unit_name))
      .slice(0, 5)
      .map((item) => ({
        org_unit_id: item.unit.id,
        unit_code: item.unit.unit_code,
        unit_name: item.unit.unit_name,
        unit_type: item.unit.unit_type,
        level: item.unit.level,
        confidence: item.score >= 90 ? 'high' : item.score >= 80 ? 'medium' : 'low',
        score: item.score,
        reason: item.reason
      }));

    return {
      username: user.username,
      full_name: user.full_name,
      job_position: user.job_position,
      organization: params?.workspaceName || user.organization,
      already_assigned: assignedUsers.has(user.username),
      suggestions: ranked
    };
  });

  return {
    summary: {
      total_users: users.length,
      already_assigned_users: assignedUsers.size,
      users_with_suggestions: suggestions.filter((item) => item.suggestions.length > 0).length,
      high_confidence_suggestions: suggestions.filter((item) => item.suggestions[0]?.confidence === 'high').length
    },
    suggestions
  };
}
