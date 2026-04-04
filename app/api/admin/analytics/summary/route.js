import { NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Verify the caller is an authenticated admin
        const authSupabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await authSupabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminClient = createAdminClient();

        // Verify admin role
        const { data: profile } = await adminClient
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Parallel fetch all data with admin client (bypasses RLS)
        const [
            usersRes,
            transactionsRes,
            merchantsRes,
            shoppingOrdersRes,
            shoppingItemsRes,
            shoppingProductsRes,
        ] = await Promise.all([
            adminClient.from('user_profiles').select('id, role'),
            adminClient.from('transactions').select('id, status, total_paid_paise, coupon_id, created_at'),
            adminClient.from('merchants').select('id, status'),
            adminClient.from('shopping_order_groups').select('id, total_amount_paise, delivery_status, is_platform_order, created_at'),
            adminClient.from('shopping_order_items').select('group_id, product_id, quantity, unit_price_paise, profit_paise'),
            adminClient.from('shopping_products').select('id, title, is_active'),
        ]);

        const users = usersRes.data || [];
        const transactions = transactionsRes.data || [];
        const merchants = merchantsRes.data || [];
        const shoppingOrders = shoppingOrdersRes.data || [];
        const shoppingItems = shoppingItemsRes.data || [];
        const shoppingProducts = shoppingProductsRes.data || [];

        // ── Pie chart data ──
        const nonAdmin = users.filter(u => !['admin', 'super_admin'].includes(u.role));
        const mCount = nonAdmin.filter(u => u.role === 'merchant').length;
        const cCount = nonAdmin.filter(u => u.role !== 'merchant').length;
        const userRoleData = [
            { name: 'Customers', value: cCount || 1 },
            { name: 'Merchants', value: mCount || 1 },
        ];

        const successTx = transactions.filter(t => t.status === 'completed' || t.status === 'SUCCESS').length;
        const failedTx = transactions.filter(t => ['failed', 'FAILED', 'ABORTED'].includes(t.status)).length;
        const pendingTx = transactions.filter(t => !['completed', 'SUCCESS', 'failed', 'FAILED', 'ABORTED'].includes(t.status)).length;
        const orderStatusData = [
            { name: 'Success', value: successTx || 1 },
            { name: 'Failed', value: failedTx || 1 },
            { name: 'Pending', value: pendingTx || 1 },
        ];

        const approvedM = merchants.filter(m => m.status === 'approved' || m.status === 'verified').length;
        const pendingM = merchants.filter(m => m.status === 'pending').length;
        const rejectedM = merchants.filter(m => m.status === 'rejected').length;
        const suspendedM = merchants.filter(m => m.status === 'suspended').length;
        const merchantStatusData = [
            { name: 'Approved', value: approvedM || 1 },
            { name: 'Pending', value: pendingM || 1 },
            { name: 'Rejected', value: rejectedM || 1 },
            { name: 'Suspended', value: suspendedM || 1 },
        ];

        // ── Shopping stats ──
        const totalRevenue = shoppingOrders.reduce((acc, o) => acc + (Number(o.total_amount_paise) || 0), 0);
        const totalOrders = shoppingOrders.length;
        const pendingDispatch = shoppingOrders.filter(o => o.delivery_status === 'pending').length;
        const totalProducts = shoppingProducts.length;
        const activeProducts = shoppingProducts.filter(p => p.is_active).length;
        const platformRevenue = shoppingOrders.filter(o => o.is_platform_order).reduce((acc, o) => acc + (Number(o.total_amount_paise) || 0), 0);
        const merchantCommissionRevenue = shoppingItems.reduce((acc, i) => acc + (Number(i.profit_paise) || 0), 0);

        // Shopping orders trend (last 14 days)
        const last14Days = [...Array(14)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (13 - i));
            return {
                dateStr: d.toISOString().split('T')[0],
                display: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
            };
        });

        const shoppingOrdersChartData = last14Days.map(day => ({
            date: day.display,
            orders: shoppingOrders.filter(o => o.created_at?.startsWith(day.dateStr)).length,
        }));

        // Top 5 Products by Revenue
        const productRevenueMap = {};
        for (const item of shoppingItems) {
            if (!item.product_id) continue;
            if (!productRevenueMap[item.product_id]) productRevenueMap[item.product_id] = 0;
            productRevenueMap[item.product_id] += (Number(item.unit_price_paise) || 0) * (Number(item.quantity) || 1);
        }
        const productMap = shoppingProducts.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        const top5Products = Object.entries(productRevenueMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([pid, rev]) => ({
                name: productMap[pid]?.title || `Product ${pid.slice(0, 6)}`,
                revenue: Math.round(rev / 100),
            }));

        return NextResponse.json({
            userRoleData,
            orderStatusData,
            merchantStatusData,
            shoppingStats: {
                totalRevenue,
                totalOrders,
                pendingDispatch,
                totalProducts,
                activeProducts,
                platformRevenue,
                merchantCommissionRevenue,
            },
            top5Products,
            shoppingOrdersChartData,
        });
    } catch (err) {
        console.error('[/api/admin/analytics/summary] error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
