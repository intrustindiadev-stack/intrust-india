import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { broadcastMorningGreeting } from '@/lib/notifications/userWhatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Up to 5 min — large user lists may take time

/**
 * GET /api/cron/morning-greeting
 * Trigger frequency : Daily at 08:00 IST (02:30 UTC)
 * Purpose           : Broadcast a personalised good morning WhatsApp message to
 *                     every opted-in customer user. Alternates between a greeting
 *                     template (GM_GREET_TEMPLATE) and a financial tip template
 *                     (GM_TIP_TEMPLATE) on alternate days for variety.
 *
 * Trigger via system cron:
 *   30 2 * * * curl -s -X GET https://intrustindia.com/api/cron/morning-greeting \
 *     -H "Authorization: Bearer $CRON_SECRET" >> /var/log/intrust-cron.log 2>&1
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
