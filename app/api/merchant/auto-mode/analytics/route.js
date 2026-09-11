import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { getPeriodBoundary, isValidOrder, isSettledOrder } from '@/lib/merchant/orderMetrics';

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

        // ── Use admin client to bypass RLS safely ────────────────────────────
        const supabase = createAdminClient();

        // Resolve merchant record strictly for authenticated user
        const { data: merchant, error: merchantError } = await supabase
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (merchantError || !merchant) {
            return NextResponse.json({ error: 'Merchant account not found.' }, { status: 404 });
        }

        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        // ── Fetch orders with full status and financial tracking ─────────────
        const { data: orders, error: ordersError } = await supabase
            .from('shopping_order_groups')
            .select('id, created_at, status, delivery_status, payment_status, payment_method, settlement_status, total_amount_paise, merchant_profit_paise, platform_cut_paise, customer_name, customer_phone, delivery_address')
            .eq('merchant_id', merchant.id)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(200);

        if (ordersError) {
            console.error('[API] Auto Mode Analytics orders error:', ordersError);
            return NextResponse.json({ error: 'Failed to fetch orders.' }, { status: 500 });
        }

        const safeOrders = orders || [];

        // ── Authoritative IST Date Boundaries ────────────────────────────────
        const now = new Date();
        const todayStart = getPeriodBoundary('today', now);
        const weekStart = getPeriodBoundary('7d', now);
        const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Filter valid orders (excludes cancelled, failed, and abandoned drafts)
        const validOrders = safeOrders.filter(isValidOrder);
        const deliveredOrders = validOrders.filter(o => o.delivery_status === 'delivered');
        const settledOrders = validOrders.filter(isSettledOrder);
        const pendingOrders = validOrders.filter(o => ['pending', 'packed', 'shipped'].includes(o.delivery_status));
        const cancelledOrders = safeOrders.filter(o => o.delivery_status === 'cancelled' || o.status === 'cancelled');

        // Revenue and profit figures
        const totalGrossRevenue = validOrders.reduce((s, o) => s + (o.total_amount_paise || 0), 0);
        const settledProfit = settledOrders.reduce((s, o) => s + (o.merchant_profit_paise || 0), 0);
        const contingentProfit = validOrders.filter(o => !isSettledOrder(o)).reduce((s, o) => s + (o.merchant_profit_paise || 0), 0);
        const totalPlatformCut = settledOrders.reduce((s, o) => s + (o.platform_cut_paise || 0), 0);

        // Current week vs previous week settled profit for growth
        const currentWeekProfit = settledOrders
            .filter(o => new Date(o.created_at) >= weekStart)
            .reduce((s, o) => s + (o.merchant_profit_paise || 0), 0);

        const prevWeekProfit = settledOrders
            .filter(o => {
                const d = new Date(o.created_at);
                return d >= prevWeekStart && d < weekStart;
            })
            .reduce((s, o) => s + (o.merchant_profit_paise || 0), 0);

        const growth = prevWeekProfit > 0
            ? ((currentWeekProfit - prevWeekProfit) / prevWeekProfit) * 100
            : currentWeekProfit > 0 ? 100 : 0;

        const todayCount = validOrders.filter(o => new Date(o.created_at) >= todayStart).length;
        const weekCount = validOrders.filter(o => new Date(o.created_at) >= weekStart).length;

        // Terminal orders for honest success rate (delivered vs delivered + cancelled/failed)
        const terminalOrders = safeOrders.filter(o => ['delivered', 'cancelled', 'failed'].includes(o.delivery_status) || o.status === 'cancelled');
        const successRate = terminalOrders.length > 0
            ? Math.round((deliveredOrders.length / terminalOrders.length) * 100)
            : (validOrders.length > 0 ? 100 : 0);

        const summary = {
            totalOrders: validOrders.length,
            allRowsCount: safeOrders.length,
            deliveredCount: deliveredOrders.length,
            pendingCount: pendingOrders.length,
            cancelledCount: cancelledOrders.length,
            settledCount: settledOrders.length,
            todayCount,
            weekCount,
            totalGrossRevenue,
            settledProfit,
            contingentProfit,
            totalProfit: settledProfit, // Authoritative settled profit
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

