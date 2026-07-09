import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { notifyMerchantSubscriptionExpiring } from '@/lib/notifications/merchantWhatsapp';

export const maxDuration = 300;

export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = createAdminClient();

        const now = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(now.getDate() + 3);

        const { data: merchants, error } = await supabase
            .from('merchants')
            .select('user_id, business_name, subscription_expires_at')
            .gte('subscription_expires_at', now.toISOString())
            .lte('subscription_expires_at', threeDaysFromNow.toISOString())
            .eq('status', 'active');

        if (error) throw error;

        let sent = 0, skipped = 0, failed = 0;

        for (const merchant of merchants || []) {
            try {
                const expiryDate = new Date(merchant.subscription_expires_at).toLocaleDateString();
                const res = await notifyMerchantSubscriptionExpiring({
                    merchantUserId: merchant.user_id,
                    businessName: merchant.business_name || 'Merchant',
                    expiryDate: expiryDate
                });
                
                if (res.sent) sent++;
                if (res.skipped) skipped++;
                
                await new Promise(r => setTimeout(r, 100)); // Rate limit
            } catch (err) {
                console.error(`[Subscription Cron] failed for ${merchant.user_id}`, err);
                failed++;
            }
        }

        return NextResponse.json({ success: true, sent, skipped, failed, total: merchants?.length || 0 });
    } catch (error) {
        console.error('[Subscription Cron] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
