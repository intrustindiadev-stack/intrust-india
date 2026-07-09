import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { notifyCustomerWinback } from '@/lib/notifications/marketingWhatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Up to 5 min — large user lists may take time

/**
 * GET /api/cron/winback
 * Trigger frequency : Weekly on Mondays at 10:00 IST (04:30 UTC)
 * Purpose           : Broadcast a win-back message to customers inactive for 30+ days
 *                     who have explicitly consented to marketing messages.
 *
 * Trigger via system cron:
 *   30 4 * * 1 curl -s -X GET https://intrustindia.com/api/cron/winback \
 *     -H "Authorization: Bearer $CRON_SECRET" >> /var/log/intrust-cron.log 2>&1
 */
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminClient = createAdminClient();

    // 1. Fetch opted-in customer bindings (both flags)
    const { data: bindings, error: bindError } = await adminClient
      .from('user_channel_bindings')
      .select('user_id')
      .eq('audience', 'customer')
      .eq('whatsapp_opt_in', true)
      .eq('whatsapp_marketing_opt_in', true);

    if (bindError) {
      throw new Error(`[winback-cron] Failed to fetch bindings: ${bindError.message}`);
    }

    if (!bindings || bindings.length === 0) {
      return NextResponse.json({ success: true, sent: 0, skipped: 0, failed: 0, total: 0 });
    }

    const userIds = bindings.map(b => b.user_id).filter(Boolean);

    // 2. Fetch inactive users with their current balances
    // Inactive signal: reward_points_balance.last_calculated_at < now() - 30 days
    const inactivityCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: balances, error: balanceError } = await adminClient
      .from('reward_points_balance')
      .select('user_id, current_balance')
      .in('user_id', userIds)
      .lt('last_calculated_at', inactivityCutoff);

    if (balanceError) {
      throw new Error(`[winback-cron] Failed to fetch balances: ${balanceError.message}`);
    }

    if (!balances || balances.length === 0) {
      return NextResponse.json({ success: true, sent: 0, skipped: 0, failed: 0, total: 0 });
    }

    const inactiveUserIds = balances.map(b => b.user_id);
    const balanceMap = {};
    for (const b of balances) {
      balanceMap[b.user_id] = b.current_balance;
    }

    // 3. Batch-fetch first names from user_profiles
    const { data: profiles, error: profileError } = await adminClient
      .from('user_profiles')
      .select('id, full_name')
      .in('id', inactiveUserIds);

    let nameMap = {};
    if (!profileError && profiles) {
      for (const p of profiles) {
        const firstName = (p.full_name || '').split(' ')[0]?.trim() || 'there';
        nameMap[p.id] = firstName;
      }
    }

    // 4. Send the win-back campaign
    let sent = 0, skipped = 0, failed = 0;
    
    // Deduplicate on a weekly basis
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((now.getDay() + 1 + days) / 7);
    const weekISO = `${now.getFullYear()}-W${weekNumber}`;

    for (const userId of inactiveUserIds) {
      const firstName = nameMap[userId] || 'there';
      const rewardBalance = balanceMap[userId] || 0;

      try {
        const result = await notifyCustomerWinback({
          userId,
          firstName,
          rewardBalance
        });
        
        if (result?.sent) sent++;
        else if (result?.skipped) skipped++;
        else sent++;
      } catch (err) {
        failed++;
      }
      
      // Small delay between sends to avoid rate-limit spikes
      await new Promise(r => setTimeout(r, 120));
    }
    
    // 5. Audit row
    try {
      await adminClient.from('whatsapp_message_logs').insert({
        user_id: null,
        direction: 'outbound',
        message_type: 'template',
        channel: 'whatsapp',
        audience: 'customer',
        status: 'sent',
        content_preview: `[winback-run:${weekISO}] done — sent:${sent} skipped:${skipped} failed:${failed} total:${inactiveUserIds.length}`,
      });
    } catch {
      // audit write failure — swallow so it never blocks
    }

    const resultStats = { sent, skipped, failed, total: inactiveUserIds.length };
    console.log('[Win-back Cron] Broadcast complete:', resultStats);
    return NextResponse.json({ success: true, ...resultStats });
  } catch (error) {
    console.error('[Win-back Cron Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
