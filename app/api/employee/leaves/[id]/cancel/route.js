import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { LeaveCancelSchema } from '@/lib/hrm/validation';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const { user, admin } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const requestId = params?.id;
    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required', code: 'INVALID_INPUT' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = LeaveCancelSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        code: 'INVALID_INPUT',
        details: parseResult.error.errors
      }, { status: 400 });
    }

    const { reason } = parseResult.data;

    // Execute atomic cancellation RPC
    const { data, error } = await admin.rpc('cancel_leave_request', {
      p_request_id: requestId,
      p_reason: reason ?? null,
      p_actor_id: user.id
    });

    if (error) {
      console.error('[API] Cancel Leave RPC Error:', error);
      const isDomainError = error.message && !error.message.includes('fatal');
      return NextResponse.json({
        error: error.message || 'Failed to cancel leave request',
        code: 'CANCEL_FAILED'
      }, { status: isDomainError ? 400 : 500 });
    }

    const response = NextResponse.json({
      success: true,
      request: data?.request
    }, { status: 200 });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (err) {
    console.error('[API] Leave Cancellation Error:', err);
    return NextResponse.json({
      error: 'An unexpected server error occurred',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
