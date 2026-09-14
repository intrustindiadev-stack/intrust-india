import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { AdminLeaveReviewSchema } from '@/lib/hrm/validation';
import { fireAndForgetEmail } from '@/lib/email/dispatch';
import { sendEmployeeAlert } from '@/lib/email';

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
    const requestId = resolvedParams?.id;
    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required', code: 'INVALID_INPUT' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = AdminLeaveReviewSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        code: 'INVALID_INPUT',
        details: parseResult.error.errors
      }, { status: 400 });
    }

    const { action, note } = parseResult.data;

    // Execute atomic Admin review RPC
    const { data, error } = await admin.rpc('admin_review_leave_request', {
      p_request_id: requestId,
      p_action: action,
      p_note: note ?? null,
      p_actor_id: user.id
    });

    if (error) {
      console.error('[API] Admin Leave Review RPC Error:', error);
      const msg = error.message || '';
      const isConflict = msg.includes('Conflict') || msg.includes('already been processed');
      return NextResponse.json({
        error: msg || 'Admin leave review failed',
        code: isConflict ? 'CONCURRENCY_CONFLICT' : 'REVIEW_FAILED'
      }, { status: isConflict ? 409 : 400 });
    }

    // Fire-and-forget email alert to employee
    fireAndForgetEmail(async () => {
      const empId = data?.request?.employee_id;
      let empEmail = null;
      let empName = 'Employee';
      if (empId) {
        const { data: empProf } = await admin
          .from('user_profiles')
          .select('email, full_name')
          .eq('id', empId)
          .maybeSingle();
        empEmail = empProf?.email;
        empName = empProf?.full_name || empName;
      }
      if (empEmail) {
        await sendEmployeeAlert({
          type: 'leave_decision',
          to: empEmail,
          data: {
            employeeName: empName,
            leaveType: data?.request?.leave_type || 'Leave',
            fromDate: data?.request?.from_date,
            toDate: data?.request?.to_date,
            action: action === 'approve' ? 'approved' : 'rejected',
            note: note || undefined,
          },
          actorId: user.id,
          metadata: { leaveRequestId: requestId },
        });
      }
    }, { category: 'hrm_leave', entityId: requestId });

    const response = NextResponse.json({
      success: true,
      request: data?.request
    }, { status: 200 });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (err) {
    console.error('[API] Admin Leave Review Error:', err);
    return NextResponse.json({
      error: 'An unexpected server error occurred during admin review',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
