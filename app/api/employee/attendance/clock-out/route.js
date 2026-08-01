import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { ClockOutSchema } from '@/lib/hrm/validation';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { user, admin } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = ClockOutSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({
        error: 'Invalid request parameters',
        code: 'INVALID_INPUT',
        details: parseResult.error.errors
      }, { status: 400 });
    }

    const { lat, lng } = parseResult.data;

    // Invoke atomic clock-out RPC
    const { data, error } = await admin.rpc('clock_out_attendance', {
      p_lat: lat ?? null,
      p_lng: lng ?? null,
      p_employee_id: user.id
    });

    if (error) {
      console.error('[API] Clock-Out RPC Error:', error);
      const isDomainError = error.message && !error.message.includes('fatal');
      return NextResponse.json({
        error: error.message || 'Clock-out failed',
        code: 'CLOCK_OUT_FAILED'
      }, { status: isDomainError ? 400 : 500 });
    }

    const response = NextResponse.json({ success: true, record: data?.record }, { status: 200 });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (err) {
    console.error('[API] Clock-Out Server Error:', err);
    return NextResponse.json({
      error: 'An unexpected server error occurred',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
