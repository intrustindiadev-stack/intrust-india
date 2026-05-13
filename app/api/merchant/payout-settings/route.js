import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// GET /api/merchant/payout-settings
// Returns payout velocity-limit settings for the merchant UI
export async function GET(request) {
    try {
        const { user } = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const admin = createAdminClient();
        const { data, error } = await admin
            .from('platform_settings')
            .select('key, value')
            .in('key', [
                'payout_min_amount_paise',
                'payout_max_amount_paise',
                'payout_max_per_day_paise',
                'payout_max_per_month_paise',
                'payout_max_pending_count',
            ]);

        if (error) throw error;

        const settings = Object.fromEntries(
            (data || []).map(row => [row.key, row.value === null ? null : Number(row.value)])
        );

        return NextResponse.json({
            payout_min_amount_paise:    settings.payout_min_amount_paise    ?? 10000,
            payout_max_amount_paise:    settings.payout_max_amount_paise    ?? null,
            payout_max_per_day_paise:   settings.payout_max_per_day_paise   ?? null,
            payout_max_per_month_paise: settings.payout_max_per_month_paise ?? null,
            payout_max_pending_count:   settings.payout_max_pending_count   ?? null,
        });
    } catch (error) {
        console.error('[API] Payout Settings GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
