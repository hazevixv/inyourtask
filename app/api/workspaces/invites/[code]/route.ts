import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { WorkspaceModel } from '@/models/WorkspaceModel';

export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const code = String(params.code || '').trim();
    if (!code) {
      return NextResponse.json({ success: false, error: 'code is required' }, { status: 400 });
    }

    const invite = await WorkspaceModel.getInviteByCode(code);
    if (!invite) {
      return NextResponse.json({ success: false, error: 'Invite not found' }, { status: 404 });
    }

    const workspace = await WorkspaceModel.getWorkspaceById(invite.workspace_id);
    return NextResponse.json({
      success: true,
      invite: {
        invite_code: invite.invite_code,
        role: invite.role,
        email: invite.email,
        expires_at: invite.expires_at,
        is_active: invite.is_active,
        accepted_at: invite.accepted_at,
        workspace: workspace
          ? {
              workspace_id: workspace.workspace_id,
              slug: workspace.slug,
              name: workspace.name,
              type: workspace.type,
              description: workspace.description
            }
          : null
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const code = String(params.code || '').trim();
    if (!code) {
      return NextResponse.json({ success: false, error: 'code is required' }, { status: 400 });
    }

    const invite = await WorkspaceModel.getInviteByCode(code);
    if (!invite) {
      return NextResponse.json({ success: false, error: 'Invite not found' }, { status: 404 });
    }

    if (invite.email && (!user.email || invite.email.toLowerCase() !== String(user.email).toLowerCase())) {
      return NextResponse.json({ success: false, error: 'This invite is for a different email address' }, { status: 403 });
    }

    const accepted = await WorkspaceModel.acceptInvite({
      inviteCode: code,
      username: user.username,
      acceptedBy: user.username
    });

    if (!accepted.success || !accepted.workspace) {
      return NextResponse.json({ success: false, error: accepted.error || 'Failed to join workspace' }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      workspace: accepted.workspace
    });

    response.cookies.set('active_workspace_id', accepted.workspace.workspace_id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
