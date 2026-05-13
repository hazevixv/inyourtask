import { NextRequest, NextResponse } from 'next/server';
import { TaskModel } from '@/models/TaskModel';
import { ProjectModel } from '@/models/ProjectModel';
import { getAuditActor, requireUser } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireUser(request);
    if ('response' in auth) return auth.response;

    const task = await TaskModel.getById(params.id);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: task });
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
    
    // Get old task to know which project to sync
    const oldTask = await TaskModel.getById(params.id);
    if (!oldTask) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const result = await TaskModel.update(params.id, body, getAuditActor(auth.user));
    
    if (result.success) {
      // Sync project due_date if due_date or project_id changed
      if (body.due_date !== undefined || body.project_id !== undefined) {
        await ProjectModel.syncDueDate(oldTask.project_id);
        if (body.project_id && body.project_id !== oldTask.project_id) {
          await ProjectModel.syncDueDate(body.project_id);
        }
      }
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

    // Get task before deleting to know which project to sync
    const task = await TaskModel.getById(params.id);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const result = await TaskModel.delete(params.id, getAuditActor(auth.user));
    
    if (result.success) {
      // Sync project due_date after deleting task
      await ProjectModel.syncDueDate(task.project_id);
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
