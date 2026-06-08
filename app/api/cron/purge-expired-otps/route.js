import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * GET /api/cron/purge-expired-otps
 * Trigger frequency: Every 6 hours (via GitHub Actions)
 * Purpose: Delete expired and consumed OTP rows to prevent unbounded table growth.
 */
export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabaseAdmin = createAdminClient();

        // Delete all rows that are either expired or already consumed.
        // In-flight OTPs (not expired, not used) are untouched.
        const { data, error, count } = await supabaseAdmin
            .from('otp_codes')
            .delete()
            .or('expires_at.lt.now(),is_used.eq.true')
            .select('id', { count: 'exact' });

        if (error) {
            console.error('[Purge Expired OTPs Error]:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const purged = data?.length ?? count ?? 0;
        console.log(`[Purge Expired OTPs] Deleted ${purged} rows`);
        return NextResponse.json({ success: true, purged });

    } catch (error) {
        console.error('[Purge Expired OTPs Exception]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
