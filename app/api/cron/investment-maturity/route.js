import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { notifyMerchantInvestmentMaturity } from '@/lib/notifications/merchantWhatsapp';

export const maxDuration = 300;

export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = createAdminClient();
        const now = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(now.getDate() + 7);

        let sent = 0, skipped = 0, failed = 0;

        // 1. Check merchant_lockin_balances
        const { data: lockins, error: lockinError } = await supabase
            .from('merchant_lockin_balances')
            .select('*, merchants!inner(user_id)')
            .eq('status', 'active')
            .gte('end_date', now.toISOString())
            .lte('end_date', sevenDaysFromNow.toISOString());

        if (lockinError) throw lockinError;

        for (const lockin of lockins || []) {
            try {
                const amountRs = (lockin.amount_paise / 100).toFixed(2);
                const maturityDate = new Date(lockin.end_date).toLocaleDateString();
                const res = await notifyMerchantInvestmentMaturity({
                    merchantUserId: lockin.merchants.user_id,
                    investmentType: 'Lock-in Balance',
                    amountRs,
                    maturityDate
                });
                if (res.sent) sent++;
                if (res.skipped) skipped++;
                await new Promise(r => setTimeout(r, 100));
            } catch (err) {
                console.error(`[Investment Cron] failed for lockin ${lockin.id}`, err);
                failed++;
            }
        }

        // 2. Check merchant_investments (AI Growth Plan)
        const { data: investments, error: invError } = await supabase
            .from('merchant_investments')
            .select('*, merchants!inner(user_id)')
            .eq('status', 'active')
            .not('approved_at', 'is', null);

        if (invError) throw invError;

        for (const inv of investments || []) {
            const approvedAt = new Date(inv.approved_at);
            const durationDays = inv.duration_days || 365;
            const maturity = new Date(approvedAt);
            maturity.setDate(maturity.getDate() + durationDays);

            if (maturity >= now && maturity <= sevenDaysFromNow) {
                try {
                    const amountRs = (inv.amount_paise / 100).toFixed(2);
                    const res = await notifyMerchantInvestmentMaturity({
                        merchantUserId: inv.merchants.user_id,
                        investmentType: 'AI Growth Plan',
                        amountRs,
                        maturityDate: maturity.toLocaleDateString()
                    });
                    if (res.sent) sent++;
                    if (res.skipped) skipped++;
                    await new Promise(r => setTimeout(r, 100));
                } catch (err) {
                    console.error(`[Investment Cron] failed for inv ${inv.id}`, err);
                    failed++;
                }
            }
        }

        return NextResponse.json({ success: true, sent, skipped, failed });
    } catch (error) {
        console.error('[Investment Cron] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
