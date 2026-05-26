import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        // ── Auth: Bearer token or cookie ──────────────────────────────────────
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        let user = null;

        if (token) {
            const admin = createAdminClient();
            const { data: { user: tokenUser }, error: tokenError } = await admin.auth.getUser(token);
            if (!tokenError) user = tokenUser;
        }

        if (!user) {
            const supabaseAuth = await createServerSupabaseClient();
            const { data: { user: cookieUser } } = await supabaseAuth.auth.getUser();
            user = cookieUser;
        }

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ── Parse query params ────────────────────────────────────────────────
        const { searchParams } = new URL(request.url);
        const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10), 1), 90);

        // ── Use admin client to bypass RLS ────────────────────────────────────
        const supabase = createAdminClient();

        // Resolve merchant record
        const { data: merchant, error: merchantError } = await supabase
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (merchantError || !merchant) {
            return NextResponse.json({ error: 'Merchant account not found.' }, { status: 404 });
        }

        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        // ── Fetch orders ──────────────────────────────────────────────────────
        const { data: orders, error: ordersError } = await supabase
            .from('shopping_order_groups')
            .select('id, created_at, delivery_status, payment_method, total_amount_paise, merchant_profit_paise, platform_cut_paise, customer_name, customer_phone')
            .eq('merchant_id', merchant.id)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(200);

        if (ordersError) {
            console.error('[API] Auto Mode Analytics orders error:', ordersError);
            return NextResponse.json({ error: 'Failed to fetch orders.' }, { status: 500 });
        }

        const safeOrders = orders || [];

        // ── Compute summary stats ─────────────────────────────────────────────
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);

        const prevWeekStart = new Date(now);
        prevWeekStart.setDate(prevWeekStart.getDate() - 14);

        const delivered = safeOrders.filter(o => o.delivery_status === 'delivered');

        const totalRevenue = delivered.reduce((s, o) => s + (o.total_amount_paise || 0), 0);
        const totalProfit  = delivered.reduce((s, o) => s + (o.merchant_profit_paise || 0), 0);
        const totalPlatformCut = delivered.reduce((s, o) => s + (o.platform_cut_paise || 0), 0);

        const currentWeekProfit = delivered
            .filter(o => new Date(o.created_at) >= weekStart)
            .reduce((s, o) => s + (o.merchant_profit_paise || 0), 0);

        const prevWeekProfit = delivered
            .filter(o => {
                const d = new Date(o.created_at);
                return d >= prevWeekStart && d < weekStart;
            })
            .reduce((s, o) => s + (o.merchant_profit_paise || 0), 0);

        const growth = prevWeekProfit > 0
            ? ((currentWeekProfit - prevWeekProfit) / prevWeekProfit) * 100
            : currentWeekProfit > 0 ? 100 : 0;

        const todayCount = safeOrders.filter(o => new Date(o.created_at) >= todayStart).length;
        const weekCount  = safeOrders.filter(o => new Date(o.created_at) >= weekStart).length;

        const successRate = safeOrders.length > 0
            ? Math.round((delivered.length / safeOrders.length) * 100)
            : 0;

        const summary = {
            totalOrders: safeOrders.length,
            deliveredCount: delivered.length,
            todayCount,
            weekCount,
            totalRevenue,
            totalProfit,
            totalPlatformCut,
            successRate,
            growth,
        };

        return NextResponse.json({ orders: safeOrders, summary });

    } catch (error) {
        console.error('[API] Auto Mode Analytics Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
