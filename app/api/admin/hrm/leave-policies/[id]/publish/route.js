import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const { user, profile, admin } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (!['admin', 'super_admin'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin privilege required', code: 'FORBIDDEN' }, { status: 403 });
    }

    const resolvedParams = await params;
    const policyYearId = resolvedParams?.id;
    if (!policyYearId) {
      return NextResponse.json({ error: 'Policy Year ID is required', code: 'INVALID_INPUT' }, { status: 400 });
    }

    // Execute atomic publish RPC
    const { data, error } = await admin.rpc('publish_leave_policy_year', {
      p_policy_year_id: policyYearId,
      p_actor_id: user.id
    });

    if (error) {
      console.error('[API] Publish Leave Policy Year RPC Error:', error);
      return NextResponse.json({
        error: error.message || 'Failed to publish leave policy year',
        code: 'PUBLISH_FAILED'
      }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      data
    }, { status: 200 });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (err) {
    console.error('[API] Publish Leave Policy Year Error:', err);
    return NextResponse.json({
      error: 'An unexpected server error occurred during policy publishing',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
