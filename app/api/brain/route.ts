import { NextRequest, NextResponse } from 'next/server';
import { BrainModel } from '@/models/BrainModel';
import { requireUser } from '@/lib/api-auth';
import { hasWorkspaceAdminAccess } from '@/lib/workspace-permissions';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if ('response' in auth) return auth.response;
    const user = auth.user;
    const workspaceContext = await getRequestWorkspaceContext(request);

    const { action, type, value, oldValue, newValue, key, tag } = await request.json();

    // Admin-only operations: categories, team, status, priority, progress, defaults
    const adminOnlyTypes = ['category', 'team', 'status', 'priority', 'progress'];
    if (adminOnlyTypes.includes(type) || action === 'default') {
      if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
        return NextResponse.json(
          { success: false, error: 'Admin access required to modify system configuration' },
          { status: 403 }
        );
      }
    }

    let result;

    switch (action) {
      case 'add':
        result = await BrainModel.addConfig(type, value, tag);
        break;
      case 'update':
        result = await BrainModel.updateConfig(type, oldValue, newValue, tag);
        break;
      case 'delete':
        result = await BrainModel.deleteConfig(type, value);
        break;
      case 'default':
        result = await BrainModel.updateDefault(key, value);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
