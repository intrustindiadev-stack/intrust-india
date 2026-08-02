import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { LeavePolicyYearSchema, LeavePolicySchema } from '@/lib/hrm/validation';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user, profile, admin } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (!['admin', 'super_admin'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin privilege required', code: 'FORBIDDEN' }, { status: 403 });
    }

    const { data: years, error: yearError } = await admin
      .from('leave_policy_years')
      .select('*, leave_policies(*)')
      .order('policy_year', { ascending: false });

    if (yearError) {
      console.error('[API] GET Leave Policies Error:', yearError);
      throw yearError;
    }

    const response = NextResponse.json({
      success: true,
      data: years || []
    }, { status: 200 });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (err) {
    console.error('[API] Admin Leave Policies GET Error:', err);
    return NextResponse.json({
      error: 'Failed to fetch leave policies',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user, profile, admin } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (!['admin', 'super_admin'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin privilege required', code: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));

    // Handle policy year creation or update
    if ('policy_year' in body) {
      const parseResult = LeavePolicyYearSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json({
          error: 'Validation failed',
          code: 'INVALID_INPUT',
          details: parseResult.error.errors
        }, { status: 400 });
      }

      const { policy_year, name, status, effective_from, effective_to } = parseResult.data;

      const { data: yearData, error: yearError } = await admin
        .from('leave_policy_years')
        .upsert({
          policy_year,
          name,
          status,
          effective_from,
          effective_to,
          created_by: user.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'policy_year' })
        .select('*')
        .single();

      if (yearError) {
        console.error('[API] Policy Year Upsert Error:', yearError);
        return NextResponse.json({ error: yearError.message, code: 'UPSERT_FAILED' }, { status: 400 });
      }

      return NextResponse.json({ success: true, policy_year: yearData }, { status: 200 });
    }

    // Handle leave policy row creation or update
    if ('leave_type_key' in body) {
      const parseResult = LeavePolicySchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json({
          error: 'Validation failed',
          code: 'INVALID_INPUT',
          details: parseResult.error.errors
        }, { status: 400 });
      }

      const policyData = parseResult.data;

      const { data: polRow, error: polError } = await admin
        .from('leave_policies')
        .upsert({
          ...policyData,
          created_by: user.id,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'policy_year_id, leave_type_key' })
        .select('*')
        .single();

      if (polError) {
        console.error('[API] Leave Policy Upsert Error:', polError);
        return NextResponse.json({ error: polError.message, code: 'UPSERT_FAILED' }, { status: 400 });
      }

      // Synchronize entitled_days and policy_id for all existing employee leave balances
      const { data: polYear } = await admin
        .from('leave_policy_years')
        .select('policy_year')
        .eq('id', polRow.policy_year_id)
        .maybeSingle();

      if (polYear?.policy_year) {
        const { error: syncError } = await admin
          .from('employee_leave_balances')
          .update({
            entitled_days: polRow.annual_entitlement,
            policy_id: polRow.id,
            updated_at: new Date().toISOString()
          })
          .eq('policy_year', polYear.policy_year)
          .eq('leave_type', polRow.leave_type_key);

        if (syncError) {
          console.error('[API] Leave Balances Sync Error:', syncError);
        }
      }

      return NextResponse.json({ success: true, policy: polRow }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid payload: Specify policy_year or leave_type_key', code: 'INVALID_INPUT' }, { status: 400 });

  } catch (err) {
    console.error('[API] Admin Leave Policies POST Error:', err);
    return NextResponse.json({
      error: 'An unexpected error occurred while saving leave policy',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
