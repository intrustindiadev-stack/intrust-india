import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { user, admin } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Invoke atomic stale shift closure RPC
    const { data: closedCount, error } = await admin.rpc('close_stale_attendance');

    if (error) {
      console.error('[API] Force Close Stale Shift Error:', error);
      return NextResponse.json({
        error: error.message || 'Failed to close stale shifts',
        code: 'STALE_CLOSE_FAILED'
      }, { status: 500 });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Stale shifts reconciled automatically',
      closed_count: closedCount || 0
    }, { status: 200 });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (err) {
    console.error('[API] Force Close Server Error:', err);
    return NextResponse.json({
      error: 'An unexpected server error occurred',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
