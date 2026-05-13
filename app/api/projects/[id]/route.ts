import { NextRequest, NextResponse } from 'next/server';
import { ProjectModel } from '@/models/ProjectModel';
import { getAuditActor, requireUser } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireUser(request);
    if ('response' in auth) return auth.response;

    const project = await ProjectModel.getById(params.id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: project });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireUser(request);
    if ('response' in auth) return auth.response;

    const body = await request.json();

    // Calendar drag/resize: only start_date or due_date update
    if ((Object.keys(body).length === 1 && 'due_date' in body) || 
        (Object.keys(body).length === 1 && 'start_date' in body)) {
      if ('due_date' in body) {
        const result = await ProjectModel.updateDueDate(params.id, body.due_date, getAuditActor(auth.user));
        if (result.success) return NextResponse.json({ success: true });
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      if ('start_date' in body) {
        const result = await ProjectModel.updateStartDate(params.id, body.start_date, getAuditActor(auth.user));
        if (result.success) return NextResponse.json({ success: true });
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
    }

    const result = await ProjectModel.update(params.id, body, getAuditActor(auth.user));
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireUser(request);
    if ('response' in auth) return auth.response;

    const result = await ProjectModel.delete(params.id, getAuditActor(auth.user));
    
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
