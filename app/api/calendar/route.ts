import { NextRequest, NextResponse } from 'next/server';
import { CalendarModel } from '@/models/CalendarModel';
import { getSessionUser } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const to = searchParams.get('to') || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59).toISOString();
    const events = await CalendarModel.getAllEventsWithTasks(user.username, from, to);
    return NextResponse.json({ success: true, events });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const data = await req.json();
    if (!data.title || !data.start_at || !data.end_at) {
      return NextResponse.json({ success: false, error: 'title, start_at, end_at required' }, { status: 400 });
    }
    const event = await CalendarModel.createEvent(data, user.username);
    return NextResponse.json({ success: true, event });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
