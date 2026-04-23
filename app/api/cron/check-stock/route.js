import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/check-stock
 * Trigger frequency: Daily or Every 12 hours
 * Purpose: Scans merchant_inventory and shopping_products for low stock levels and notifies owners.
 */
export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const adminSupabase = createAdminClient();
        const LOW_STOCK_THRESHOLD = 10;
        let notificationsSent = 0;

        // 1. Check Merchant Inventory (notify merchants)
        const { data: lowMerchantStock, error: merchantInvError } = await adminSupabase
            .from('merchant_inventory')
            .select(`
                id,
                stock_quantity,
                custom_title,
                merchant_id,
                merchants (user_id, business_name)
            `)
            .lt('stock_quantity', LOW_STOCK_THRESHOLD)
            .eq('is_active', true);

        if (merchantInvError) throw merchantInvError;

        if (lowMerchantStock && lowMerchantStock.length > 0) {
            const merchantNotifications = lowMerchantStock
                .filter(item => item.merchants?.user_id)
                .map(item => ({
                    user_id: item.merchants.user_id,
                    title: 'Low Stock Warning ⚠️',
                    body: `Your stock for "${item.custom_title}" is low (${item.stock_quantity} units remaining). Please restock soon.`,
                    type: 'warning',
                    reference_type: 'merchant_inventory',
                    reference_id: item.id,
                    read: false
                }));

            if (merchantNotifications.length > 0) {
                const { error: notifyError } = await adminSupabase
                    .from('notifications')
                    .insert(merchantNotifications);
                if (!notifyError) notificationsSent += merchantNotifications.length;
            }
        }

        // 2. Check Platform Stock (notify admins)
        const { data: lowPlatformStock, error: platformStockError } = await adminSupabase
            .from('shopping_products')
            .select('id, title, admin_stock')
            .lt('admin_stock', LOW_STOCK_THRESHOLD)
            .eq('is_active', true);

        if (platformStockError) throw platformStockError;

        if (lowPlatformStock && lowPlatformStock.length > 0) {
            // Get all admins
            const { data: admins } = await adminSupabase
                .from('user_profiles')
                .select('id')
                .in('role', ['admin', 'super_admin']);

            if (admins && admins.length > 0) {
                const adminNotifications = [];
                lowPlatformStock.forEach(product => {
                    admins.forEach(admin => {
                        adminNotifications.push({
                            user_id: admin.id,
                            title: 'Platform Low Stock 📦',
                            body: `Platform stock for "${product.title}" is low (${product.admin_stock} units remaining).`,
                            type: 'warning',
                            reference_type: 'platform_product',
                            reference_id: product.id,
                            read: false
                        });
                    });
                });

                if (adminNotifications.length > 0) {
                    const { error: adminNotifyError } = await adminSupabase
                        .from('notifications')
                        .insert(adminNotifications);
                    if (!adminNotifyError) notificationsSent += adminNotifications.length;
                }
            }
        }

        return NextResponse.json({
            success: true,
            notifications_sent: notificationsSent,
            message: 'Stock check completed successfully.'
        });

    } catch (error) {
        console.error('[Stock Check Cron Error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
