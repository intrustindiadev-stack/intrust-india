import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { broadcastMorningGreeting } from '@/lib/notifications/userWhatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Up to 5 min — large user lists may take time

/**
 * GET /api/cron/morning-greeting
 * Trigger frequency : Daily at 05:00 IST (23:30 UTC previous day)
 * Purpose           : Broadcast a personalised good morning WhatsApp message to
 *                     every opted-in user using GM_QUOTE_TEMPLATE (intrust_gm_quote_v1).
 *                     Picks today's admin-scheduled quote from daily_quotes if present,
 *                     or falls back to an approved neutral inspirational quote pool.
 *
 * Trigger via system cron:
 *   30 23 * * * curl -s -X GET https://intrustindia.com/api/cron/morning-greeting \
 *     -H "Authorization: Bearer $CRON_SECRET" >> /home/intrustindia/logs/cron.log 2>&1
 */
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await broadcastMorningGreeting();

    console.log('[Morning Greeting Cron] Broadcast complete:', result);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Morning Greeting Cron Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
