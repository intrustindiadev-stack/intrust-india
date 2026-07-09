import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { notifyCustomerKycReminder } from '@/lib/notifications/userWhatsapp';

export const maxDuration = 300;

export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = createAdminClient();

        // Find users with KYC pending older than 3 days
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const { data: records, error } = await supabase
            .from('kyc_records')
            .select(`
                user_id,
                created_at,
                user_profiles!inner ( full_name )
            `)
            .eq('status', 'pending')
            .lte('created_at', threeDaysAgo.toISOString());

        if (error) throw error;

        let sent = 0;
        let skipped = 0;
        let failed = 0;

        for (const record of records || []) {
            const daysPending = Math.floor((new Date().getTime() - new Date(record.created_at).getTime()) / (1000 * 60 * 60 * 24));
            const firstName = record.user_profiles?.full_name?.split(' ')[0] || 'User';

            try {
                const res = await notifyCustomerKycReminder({
                    userId: record.user_id,
                    firstName: firstName,
                    daysPending: daysPending
                });
                if (res.sent) sent++;
                if (res.skipped) skipped++;
                
                await new Promise(r => setTimeout(r, 100)); // Rate limit
            } catch (err) {
                console.error(`[KYC Cron] failed for ${record.user_id}`, err);
                failed++;
            }
        }

        return NextResponse.json({ success: true, sent, skipped, failed, total: records?.length || 0 });
    } catch (error) {
        console.error('[KYC Cron] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
