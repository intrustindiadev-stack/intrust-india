import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { rupeesToPaise } from '@/lib/hrm/incentives';

const HR_ROLES = ['hr_manager', 'admin', 'super_admin'];

export async function GET(request, { params }) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ success: false, code: 'UNAUTHORIZED', error: 'Authentication required' }, { status: 401 });
        }

        if (!HR_ROLES.includes(profile?.role)) {
            return NextResponse.json({ success: false, code: 'FORBIDDEN', error: 'Forbidden. HR Access required.' }, { status: 403 });
        }

        const { id } = await params;
        const { searchParams } = new URL(request.url);

        const allocationMode = searchParams.get('allocation_mode') || 'per_person';
        const rawAmount = parseFloat(searchParams.get('amount') || '0');
        const includeLead = searchParams.get('include_lead') !== 'false';

        if (isNaN(rawAmount) || rawAmount <= 0) {
            return NextResponse.json({ success: false, code: 'INVALID_AMOUNT', error: 'Amount must be greater than zero' }, { status: 400 });
        }

        const amountPaise = rupeesToPaise(rawAmount);

        const { data: previewRes, error: previewErr } = await admin.rpc('preview_team_incentive', {
            p_team_id: id,
            p_allocation_mode: allocationMode,
            p_input_amount_paise: amountPaise,
            p_include_lead: includeLead
        });

        if (previewErr) throw previewErr;

        if (!previewRes.success) {
            const statusMap = {
                'TEAM_NOT_FOUND': 404,
                'TEAM_INACTIVE': 422,
                'NO_ELIGIBLE_MEMBERS': 422,
                'INVALID_ALLOCATION_MODE': 400
            };
            return NextResponse.json(previewRes, { status: statusMap[previewRes.code] || 400 });
        }

        const response = NextResponse.json(previewRes);
        response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        return response;

    } catch (err) {
        console.error('[API] Preview Team Incentive Error:', err);
        return NextResponse.json({ success: false, code: 'INTERNAL_ERROR', error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
