import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { IncentiveTransitionSchema } from '@/lib/hrm/validation';

const HR_ROLES = ['hr_manager', 'admin', 'super_admin'];

export async function POST(request, { params }) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ success: false, code: 'UNAUTHORIZED', error: 'Authentication required' }, { status: 401 });
        }

        if (!HR_ROLES.includes(profile?.role)) {
            return NextResponse.json({ success: false, code: 'FORBIDDEN', error: 'Forbidden. Privileged access required.' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();

        const parsed = IncentiveTransitionSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                code: 'INVALID_PAYLOAD',
                error: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
            }, { status: 400 });
        }

        const { action, expectedStatus, expectedVersion, reason } = parsed.data;

        const { data: rpcRes, error: rpcErr } = await admin.rpc('transition_incentive_batch', {
            p_batch_id: id,
            p_target_action: action,
            p_expected_status: expectedStatus,
            p_expected_version: expectedVersion,
            p_reason: reason || null,
            p_caller_id: user.id
        });

        if (rpcErr) throw rpcErr;

        if (!rpcRes.success) {
            const statusMap = {
                'STATUS_CONFLICT': 409,
                'VERSION_CONFLICT': 409,
                'MAKER_CHECKER_VIOLATION': 403,
                'INVALID_TRANSITION': 400,
                'REASON_REQUIRED': 400,
                'BATCH_NOT_FOUND': 404,
                'FORBIDDEN': 403
            };
            return NextResponse.json(rpcRes, { status: statusMap[rpcRes.code] || 400 });
        }

        return NextResponse.json(rpcRes, { status: 200 });

    } catch (err) {
        console.error('[API] Transition Incentive Error:', err);
        return NextResponse.json({ success: false, code: 'INTERNAL_ERROR', error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
