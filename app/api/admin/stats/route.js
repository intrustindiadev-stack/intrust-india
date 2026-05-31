import { NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { getAmountPaise, COMPLETED_STATUSES } from '@/lib/utils/transactionHelpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function verifyAdmin(request) {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const authSupabase = await createServerSupabaseClient();
    const { data: { user }, error } = token
        ? await authSupabase.auth.getUser(token)
        : await authSupabase.auth.getUser();
    if (error || !user) return null;

    const admin = createAdminClient();
    const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).single();
    if (!['admin', 'super_admin'].includes(profile?.role)) return null;
    return user;
}

export async function GET(request) {
    const user = await verifyAdmin(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const group = url.searchParams.get('group') || 'all';
    const supabase = createAdminClient();

    try {
        let result = {};

        if (group === 'all' || group === 'revenue') {
            const today = new Date().toISOString().split('T')[0];
            const [txnsAll, groupsAll, txnsToday, groupsToday] = await Promise.all([
                supabase.from('transactions').select('total_paid_paise, amount').in('status', COMPLETED_STATUSES),
                supabase.from('shopping_order_groups').select('total_amount_paise').eq('status', 'completed'),
                supabase.from('transactions').select('id, total_paid_paise, amount').in('status', COMPLETED_STATUSES).gte('created_at', today),
                supabase.from('shopping_order_groups').select('id, total_amount_paise').eq('status', 'completed').gte('created_at', today),
            ]);
            const txnRev = (txnsAll.data || []).reduce((s, t) => s + getAmountPaise(t), 0);
            const groupRev = (groupsAll.data || []).reduce((s, g) => s + (Number(g.total_amount_paise) || 0), 0);
            const todayTxnRev = (txnsToday.data || []).reduce((s, t) => s + getAmountPaise(t), 0);
            const todayGroupRev = (groupsToday.data || []).reduce((s, g) => s + (Number(g.total_amount_paise) || 0), 0);
            result.grossRevenue = txnRev + groupRev;
            result.todayRevenue = todayTxnRev + todayGroupRev;
            result.todayOrders = (txnsToday.data?.length || 0) + (groupsToday.data?.length || 0);
        }

        if (group === 'all' || group === 'merchants') {
            const [active, pending] = await Promise.all([
                supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'merchant'),
                supabase.from('merchants').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            ]);
            result.activeMerchantsCount = active.count || 0;
            result.pendingApprovalsCount = pending.count || 0;
        }

        if (group === 'all' || group === 'shopping') {
            const { data: orders } = await supabase.from('shopping_order_groups').select('total_amount_paise, delivery_status, is_platform_order');
            const stats = (orders || []).reduce((acc, o) => {
                acc.revenue += Number(o.total_amount_paise) || 0;
                acc.sales += 1;
                if (o.delivery_status === 'pending') acc.pendingOrders += 1;
                if (o.is_platform_order) acc.platformRevenue += Number(o.total_amount_paise) || 0;
                return acc;
            }, { revenue: 0, sales: 0, pendingOrders: 0, platformRevenue: 0 });
            result.shoppingStats = stats;
        }

        if (group === 'all' || group === 'coupons') {
            const { count } = await supabase.from('coupons').select('*', { count: 'exact', head: true });
            result.totalCouponsCount = count || 0;
        }

        if (group === 'all' || group === 'crm') {
            const { count } = await supabase.from('crm_leads').select('*', { count: 'exact', head: true });
            result.totalLeadsCount = count || 0;
        }

        if (group === 'all' || group === 'employees') {
            const { count } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true })
                .in('role', ['employee', 'hr_manager', 'sales_exec', 'sales_manager']);
            result.totalEmployeesCount = count || 0;
        }

        return NextResponse.json(result);
    } catch (err) {
        console.error('Admin stats error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
