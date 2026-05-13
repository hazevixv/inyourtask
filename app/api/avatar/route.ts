import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { hasWorkspaceAdminAccess } from '@/lib/workspace-permissions';
import { getRequestWorkspaceContext } from '@/lib/workspace-context';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

/**
 * POST /api/avatar
 * Upload avatar for user or AI agent
 * Body: FormData with `file` (image) and optional `targetUsername` or `agentId` (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const workspaceContext = await getRequestWorkspaceContext(req);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const targetUsername = formData.get('targetUsername') as string | null;
    const agentId = formData.get('agentId') as string | null;

    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Only image files allowed (jpg, png, webp, gif)' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File size must be under 5MB' }, { status: 400 });
    }

    // Admin check for updating other users
    if (targetUsername && targetUsername !== user.username) {
      if (!hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
        return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }
    }
    if (agentId && !hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
      return NextResponse.json({ success: false, error: 'Admin access required to update agent avatar' }, { status: 403 });
    }

    // Create upload directory
    const avatarDir = path.join(process.cwd(), 'public', 'uploads', 'avatar');
    await mkdir(avatarDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const ext = '.jpg'; // Always save as jpg for consistency
    let filename: string;

    if (agentId) {
      filename = `agent-${agentId}-${timestamp}${ext}`;
    } else {
      const uname = targetUsername || user.username;
      filename = `user-${uname}-${timestamp}${ext}`;
    }

    const filepath = path.join(avatarDir, filename);

    // Process image with sharp: resize to 200x200, crop to square
    const buffer = Buffer.from(await file.arrayBuffer());
    await sharp(buffer)
      .resize(200, 200, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toFile(filepath);

    // Also generate thumbnail (60x60)
    const thumbFilename = `thumb-${filename}`;
    const thumbPath = path.join(avatarDir, thumbFilename);
    await sharp(buffer)
      .resize(60, 60, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);

    const avatarPath = `avatar/${filename}`;
    const thumbAvatarPath = `avatar/${thumbFilename}`;

    // Update database
    if (agentId) {
      await query(
        'UPDATE ai_agents SET avatar = ?, updated_at = NOW() WHERE agent_id = ?',
        [avatarPath, agentId]
      );
    } else {
      const uname = targetUsername || user.username;
      await query(
        'UPDATE users SET avatar = ?, updated_at = NOW() WHERE username = ?',
        [avatarPath, uname]
      );
    }

    return NextResponse.json({
      success: true,
      avatarPath,
      avatarUrl: `/uploads/${avatarPath}`,
      thumbUrl: `/uploads/${thumbAvatarPath}`,
      message: 'Avatar updated successfully'
    });

  } catch (e: any) {
    console.error('[Avatar POST] Error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * DELETE /api/avatar
 * Remove avatar (reset to default)
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const workspaceContext = await getRequestWorkspaceContext(req);

    const { searchParams } = new URL(req.url);
    const targetUsername = searchParams.get('username');
    const agentId = searchParams.get('agentId');

    if (targetUsername && targetUsername !== user.username && !hasWorkspaceAdminAccess(user as any, workspaceContext.activeWorkspace)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    if (agentId) {
      await query('UPDATE ai_agents SET avatar = NULL, updated_at = NOW() WHERE agent_id = ?', [agentId]);
    } else {
      const uname = targetUsername || user.username;
      await query('UPDATE users SET avatar = NULL, updated_at = NOW() WHERE username = ?', [uname]);
    }

    return NextResponse.json({ success: true, message: 'Avatar removed' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
