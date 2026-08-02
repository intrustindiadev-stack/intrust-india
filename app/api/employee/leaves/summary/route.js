import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user, admin } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const policyYear = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);

    // 1. Fetch published policy year
    const { data: policyYearData } = await admin
      .from('leave_policy_years')
      .select('*')
      .eq('policy_year', policyYear)
      .eq('status', 'published')
      .maybeSingle();

    if (!policyYearData) {
      // Non-configured state
      const response = NextResponse.json({
        success: true,
        policy_year: policyYear,
        is_policy_configured: false,
        message: 'Leave policy has not yet been configured or published for this year.',
        active_policies: [],
        balances: {},
        holidays: []
      }, { status: 200 });

      response.headers.set('Cache-Control', 'no-store, max-age=0');
      return response;
    }

    // 2. Fetch active policies for the published year
    const { data: activePolicies, error: polError } = await admin
      .from('leave_policies')
      .select('*')
      .eq('policy_year_id', policyYearData.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (polError) {
      console.error('[API] Leave Summary Policies Fetch Error:', polError);
      throw polError;
    }

    // 3. Fetch existing employee balances (NO INSERTS!)
    const { data: balances, error: balError } = await admin
      .from('employee_leave_balances')
      .select('*, policy:policy_id(*)')
      .eq('employee_id', user.id)
      .eq('policy_year', policyYear);

    if (balError) {
      console.error('[API] Leave Summary Balances Fetch Error:', balError);
      throw balError;
    }

    const existingBalances = balances || [];

    // Map balances by leave_type key for active policies
    const balancesByType = {};
    (activePolicies || []).forEach(pol => {
      const found = existingBalances.find(b => b.leave_type === pol.leave_type_key);
      if (found) {
        const entitled = Number(found.entitled_days) || 0;
        const carried = Number(found.carried_forward_days) || 0;
        const accrued = Number(found.accrued_days) || 0;
        const adjustment = Number(found.adjustment_days) || 0;
        const used = Number(found.used_days) || 0;
        const reserved = Number(found.reserved_days) || 0;
        const available = pol.allow_negative_balance
          ? (entitled + carried + accrued + adjustment) - (used + reserved)
          : Math.max(0, (entitled + carried + accrued + adjustment) - (used + reserved));

        balancesByType[pol.leave_type_key] = {
          ...found,
          available_days: Math.round(available * 100) / 100,
          policy: pol
        };
      } else {
        // Balance not initialized yet for this employee (e.g. newly added policy)
        balancesByType[pol.leave_type_key] = {
          id: null,
          employee_id: user.id,
          policy_year: policyYear,
          leave_type: pol.leave_type_key,
          entitled_days: pol.annual_entitlement,
          carried_forward_days: 0,
          accrued_days: 0,
          used_days: 0,
          reserved_days: 0,
          adjustment_days: 0,
          available_days: pol.annual_entitlement,
          policy: pol
        };
      }
    });

    // 4. Fetch upcoming holidays
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: holidays } = await admin
      .from('holidays')
      .select('*')
      .gte('holiday_date', todayStr)
      .order('holiday_date', { ascending: true })
      .limit(10);

    const response = NextResponse.json({
      success: true,
      policy_year: policyYear,
      is_policy_configured: true,
      policy_year_data: policyYearData,
      active_policies: activePolicies || [],
      balances: balancesByType,
      holidays: holidays || []
    }, { status: 200 });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (err) {
    console.error('[API] Leave Summary Error:', err);
    return NextResponse.json({
      error: 'Failed to fetch leave summary',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
