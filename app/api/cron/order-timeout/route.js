import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/order-timeout
 * Trigger frequency: Every 15 minutes
 * Purpose: Scan for pending merchant orders older than 2 hours and transfer to admin with reduced commission.
 */
export async function GET(request) {
    try {
        const supabaseAdmin = createAdminClient();
        
        // Call the RPC
        const { data, error } = await supabaseAdmin.rpc('admin_takeover_stale_orders');

        if (error) {
            console.error('[Order Timeout Cron Error calling RPC]:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        console.log('[Order Timeout Cron Success]:', data);
        return NextResponse.json({ success: true, ...data });

    } catch (error) {
        console.error('[Order Timeout Cron Exception]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
