import { NextResponse } from 'next/server';
import { broadcastEveningGreeting } from '@/lib/notifications/userWhatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Up to 5 min — large user lists may take time

/**
 * GET /api/cron/evening-greeting
 * Trigger frequency : Daily at 20:00 IST (14:30 UTC)
 * Purpose           : Broadcast a personalised good evening WhatsApp message to
 *                     every opted-in customer user with marketing consent.
 *                     Uses GE_GREET_TEMPLATE (intrust_ge_greet_v1) — personalised
 *                     with the user's first name.
 *
 * Trigger via system cron:
 *   30 14 * * * curl -s -X GET https://intrustindia.com/api/cron/evening-greeting \
 *     -H "Authorization: Bearer $CRON_SECRET" >> /var/log/intrust-cron.log 2>&1
 */
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await broadcastEveningGreeting();

    console.log('[Evening Greeting Cron] Broadcast complete:', result);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Evening Greeting Cron Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
