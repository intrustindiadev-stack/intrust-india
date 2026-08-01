import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { CANONICAL_LEAVE_TYPES } from '@/lib/hrm/validation';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user, admin } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const policyYear = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);

    // Fetch canonical leave balances from employee_leave_balances
    const { data: balances, error: balError } = await admin
      .from('employee_leave_balances')
      .select('*')
      .eq('employee_id', user.id)
      .eq('policy_year', policyYear);

    if (balError) {
      console.error('[API] Leave Summary Balance Fetch Error:', balError);
      throw balError;
    }

    // Seed default balances if missing for active employee
    let effectiveBalances = balances || [];
    if (effectiveBalances.length === 0) {
      const defaultTypes = ['casual', 'sick', 'earned'];
      const defaultEntitlements = { casual: 12, sick: 8, earned: 21 };

      const rowsToInsert = defaultTypes.map(lt => ({
        employee_id: user.id,
        policy_year: policyYear,
        leave_type: lt,
        entitled_days: defaultEntitlements[lt] || 0
      }));

      const { data: seeded, error: seedError } = await admin
        .from('employee_leave_balances')
        .insert(rowsToInsert)
        .select('*');

      if (!seedError && seeded) {
        effectiveBalances = seeded;
      }
    }

    // Map balances by leave_type
    const balancesByType = {};
    CANONICAL_LEAVE_TYPES.forEach(type => {
      const found = effectiveBalances.find(b => b.leave_type === type);
      if (found) {
        const entitled = Number(found.entitled_days) || 0;
        const carried = Number(found.carried_forward_days) || 0;
        const accrued = Number(found.accrued_days) || 0;
        const adjustment = Number(found.adjustment_days) || 0;
        const used = Number(found.used_days) || 0;
        const reserved = Number(found.reserved_days) || 0;
        const available = Math.max(0, (entitled + carried + accrued + adjustment) - (used + reserved));

        balancesByType[type] = {
          ...found,
          available_days: available
        };
      } else {
        balancesByType[type] = null; // Signal "Balance unavailable" in UI
      }
    });

    // Fetch upcoming holidays
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
