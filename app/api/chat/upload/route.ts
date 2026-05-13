import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files provided' }, { status: 400 });
    }

    // Validate total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 100 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Total file size exceeds 100MB' }, { status: 400 });
    }

    // Create uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'files');
    const thumbnailsDir = path.join(process.cwd(), 'public', 'uploads', 'thumbnails');
    
    try {
      await mkdir(uploadsDir, { recursive: true });
      await mkdir(thumbnailsDir, { recursive: true });
    } catch (err) {
      // Directories might already exist
    }

    const uploadedFiles = [];

    for (const file of files) {
      // Validate individual file size
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ 
          success: false, 
          error: `File ${file.name} exceeds 50MB limit` 
        }, { status: 400 });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const ext = path.extname(file.name);
      const filename = `file-${user.username}-${timestamp}-${randomStr}${ext}`;
      const filepath = path.join(uploadsDir, filename);

      // Save file
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filepath, buffer);

      const fileData: any = {
        fileUrl: `/uploads/files/${filename}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      };

      // Generate thumbnail for images
      if (file.type.startsWith('image/')) {
        try {
          const thumbnailFilename = `thumb-${filename}`;
          const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);
          
          await sharp(buffer)
            .resize(200, 200, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);
          
          fileData.thumbnail = `/uploads/thumbnails/${thumbnailFilename}`;
        } catch (err) {
          console.error('Failed to generate thumbnail:', err);
          // Continue without thumbnail
        }
      }

      uploadedFiles.push(fileData);
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles
    });

  } catch (error: any) {
    console.error('[File Upload] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to upload files'
    }, { status: 500 });
  }
}
