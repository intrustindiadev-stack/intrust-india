import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { CreateIndividualIncentiveSchema, CreateTeamIncentiveSchema } from '@/lib/hrm/validation';
import { rupeesToPaise } from '@/lib/hrm/incentives';

const HR_ROLES = ['hr_manager', 'admin', 'super_admin'];

export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ success: false, code: 'UNAUTHORIZED', error: 'Authentication required' }, { status: 401 });
        }

        if (!HR_ROLES.includes(profile?.role)) {
            return NextResponse.json({ success: false, code: 'FORBIDDEN', error: 'Forbidden. HR Access required.' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
        const status = searchParams.get('status');
        const type = searchParams.get('incentive_type');
        const mode = searchParams.get('recipient_mode');
        const teamId = searchParams.get('team_id');
        const search = searchParams.get('search');
        const year = searchParams.get('payroll_year');
        const month = searchParams.get('payroll_month');

        const offset = (page - 1) * limit;

        let query = admin
            .from('incentive_batches')
            .select(`
                *,
                allocations:incentive_allocations (
                    id, employee_id, employee_name_snapshot, employee_code_snapshot,
                    team_id_snapshot, team_name_snapshot, amount_paise, status, paid_at
                )
            `, { count: 'exact' });

        if (status) query = query.eq('status', status);
        if (type) query = query.eq('incentive_type', type);
        if (mode) query = query.eq('recipient_mode', mode);
        if (teamId) query = query.eq('team_id', teamId);
        if (year) query = query.eq('payroll_year', parseInt(year, 10));
        if (month) query = query.eq('payroll_month', parseInt(month, 10));
        if (search) {
            query = query.or(`description.ilike.%${search}%,team_name_snapshot.ilike.%${search}%`);
        }

        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data, count, error } = await query;

        if (error) throw error;

        const totalPages = Math.ceil((count || 0) / limit);

        const response = NextResponse.json({
            success: true,
            data: data || [],
            meta: {
                page,
                limit,
                total: count || 0,
                totalPages
            }
        });

        response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        return response;

    } catch (err) {
        console.error('[API] HRM Fetch Incentives Error:', err);
        return NextResponse.json({ success: false, code: 'INTERNAL_ERROR', error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ success: false, code: 'UNAUTHORIZED', error: 'Authentication required' }, { status: 401 });
        }

        if (!HR_ROLES.includes(profile?.role)) {
            return NextResponse.json({ success: false, code: 'FORBIDDEN', error: 'Forbidden. HR Access required.' }, { status: 403 });
        }

        const idempotencyKey = request.headers.get('Idempotency-Key') || request.headers.get('idempotency-key') || null;
        const body = await request.json();

        const recipientMode = body.recipient_mode || 'individual';

        if (recipientMode === 'individual') {
            const parsed = CreateIndividualIncentiveSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json({
                    success: false,
                    code: 'INVALID_PAYLOAD',
                    error: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
                }, { status: 400 });
            }

            const payload = parsed.data;
            const amountPaise = rupeesToPaise(payload.amount);

            const { data: rpcRes, error: rpcErr } = await admin.rpc('award_individual_incentive', {
                p_employee_id: payload.employee_id,
                p_incentive_type: payload.incentive_type,
                p_amount_paise: amountPaise,
                p_description: payload.description || null,
                p_internal_note: payload.internal_note || null,
                p_effective_date: payload.effective_date || null,
                p_payroll_month: payload.payroll_month || null,
                p_payroll_year: payload.payroll_year || null,
                p_idempotency_key: payload.idempotency_key || idempotencyKey || null,
                p_caller_id: user.id
            });

            if (rpcErr) throw rpcErr;

            if (!rpcRes.success) {
                const statusMap = {
                    'EMPLOYEE_NOT_FOUND': 404,
                    'EMPLOYEE_INACTIVE': 422,
                    'AMOUNT_OUT_OF_RANGE': 422,
                    'FORBIDDEN': 403,
                    'UNAUTHORIZED': 401
                };
                return NextResponse.json(rpcRes, { status: statusMap[rpcRes.code] || 400 });
            }

            return NextResponse.json(rpcRes, { status: 201 });

        } else if (recipientMode === 'team') {
            const parsed = CreateTeamIncentiveSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json({
                    success: false,
                    code: 'INVALID_PAYLOAD',
                    error: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
                }, { status: 400 });
            }

            const payload = parsed.data;
            const amountPaise = rupeesToPaise(payload.amount);

            const { data: rpcRes, error: rpcErr } = await admin.rpc('award_team_incentive', {
                p_team_id: payload.team_id,
                p_incentive_type: payload.incentive_type,
                p_allocation_mode: payload.allocation_mode,
                p_input_amount_paise: amountPaise,
                p_include_lead: payload.include_lead ?? true,
                p_description: payload.description || null,
                p_internal_note: payload.internal_note || null,
                p_effective_date: payload.effective_date || null,
                p_payroll_month: payload.payroll_month || null,
                p_payroll_year: payload.payroll_year || null,
                p_idempotency_key: payload.idempotency_key || idempotencyKey || null,
                p_caller_id: user.id
            });

            if (rpcErr) throw rpcErr;

            if (!rpcRes.success) {
                const statusMap = {
                    'TEAM_NOT_FOUND': 404,
                    'TEAM_INACTIVE': 422,
                    'NO_ELIGIBLE_MEMBERS': 422,
                    'AMOUNT_OUT_OF_RANGE': 422,
                    'FORBIDDEN': 403
                };
                return NextResponse.json(rpcRes, { status: statusMap[rpcRes.code] || 400 });
            }

            return NextResponse.json(rpcRes, { status: 201 });

        } else {
            return NextResponse.json({ success: false, code: 'INVALID_RECIPIENT_MODE', error: 'Invalid recipient mode' }, { status: 400 });
        }

    } catch (err) {
        console.error('[API] HRM Create Incentive Error:', err);
        return NextResponse.json({ success: false, code: 'INTERNAL_ERROR', error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
