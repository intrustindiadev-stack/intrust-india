import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { getIncentiveCapabilities } from '@/lib/hrm/incentives';

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

        const { data: batch, error: batchErr } = await admin
            .from('incentive_batches')
            .select(`
                *,
                allocations:incentive_allocations (
                    id, employee_id, employee_name_snapshot, employee_code_snapshot,
                    team_id_snapshot, team_name_snapshot, amount_paise, status, salary_record_id, paid_at, created_at
                )
            `)
            .eq('id', id)
            .single();

        if (batchErr || !batch) {
            return NextResponse.json({ success: false, code: 'NOT_FOUND', error: 'Incentive batch not found' }, { status: 404 });
        }

        // Fetch Audit Timeline
        const { data: auditLogs } = await admin
            .from('audit_logs_hrm')
            .select('id, actor_id, actor_name, action, old_data, new_data, created_at')
            .eq('record_id', id)
            .order('created_at', { ascending: true });

        // Compute Capabilities for calling user
        const capabilities = getIncentiveCapabilities(
            batch.status,
            profile.role,
            batch.created_by,
            user.id,
            batch.total_amount_paise
        );

        const response = NextResponse.json({
            success: true,
            data: {
                batch,
                audit_logs: auditLogs || [],
                capabilities
            }
        });

        response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        return response;

    } catch (err) {
        console.error('[API] Fetch Incentive Batch Details Error:', err);
        return NextResponse.json({ success: false, code: 'INTERNAL_ERROR', error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
