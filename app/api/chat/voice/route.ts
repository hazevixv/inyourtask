import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const duration = parseInt(formData.get('duration') as string) || 0;

    if (!audioFile) {
      return NextResponse.json({ success: false, error: 'No audio file provided' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'voice');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (err) {
      // Directory might already exist, ignore error
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `voice-${user.username}-${timestamp}.webm`;
    const filepath = path.join(uploadsDir, filename);

    // Save file
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    await writeFile(filepath, buffer);

    const voiceData = {
      audioUrl: `/uploads/voice/${filename}`,
      duration: duration,
      fileSize: audioFile.size
    };

    return NextResponse.json({
      success: true,
      voiceData
    });

  } catch (error: any) {
    console.error('[Voice Upload] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to upload voice message'
    }, { status: 500 });
  }
}
