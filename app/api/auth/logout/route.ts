import { NextRequest, NextResponse } from 'next/server';
import { AuthModel } from '@/models/AuthModel';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value;

    if (token) {
      await AuthModel.logout(token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('session_token');

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
