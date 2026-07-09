/**
 * Reward Notifications
 *
 * NOTE: The 'reward' notification type was rejected by the database's `notification_type_check` 
 * constraint (`type IN ('info','success','warning','error')`), confirmed via Supabase MCP on 2026-05-10. 
 * We deliberately use type='success' and `reference_type='reward_scratch_card'` so the bell 
 * can still icon/route this distinctly without DB schema changes.
 */

import { notifyCustomerRewardMilestone } from '@/lib/notifications/marketingWhatsapp';

// Milestones that trigger a WhatsApp notification when crossed.
// Hardcoded for zero-latency (no DB read on every reward event).
const REWARD_MILESTONES = [100, 500, 1000, 2500, 5000];


export async function notifyRewardEarned({
  supabaseAdmin,
  userId,
  eventType,
  totalDistributed,
  referenceId,
  referenceType,
}) {
  if (eventType === 'daily_login') return;
  if (!totalDistributed || totalDistributed <= 0) return;
  if (!supabaseAdmin || !userId) return;

  try {
    let transactionId = null;

    try {
      const { data, error } = await supabaseAdmin
        .from('reward_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('source_user_id', userId)
        .eq('event_type', eventType)
        .eq('level', 0)
        .eq('reference_id', referenceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        transactionId = data.id;
      }
    } catch (dbErr) {
      console.warn('[rewardNotifications] Failed to resolve transactionId for notification:', dbErr);
    }

    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        title: '🎁 Reward unlocked',
        body: `Tap to scratch and reveal ${totalDistributed} points.`,
        type: 'success',
        reference_type: 'reward_scratch_card',
        reference_id: transactionId,
      });

    if (insertError) {
      console.error('[rewardNotifications] Failed to insert notification:', insertError);
    }

    // ── Milestone WhatsApp notification (fire-and-forget, non-fatal) ─────────
    // Check whether this credit pushed the balance across any milestone threshold.
    // Uses current_balance from reward_points_balance (post-credit view).
    // Skipped for daily_login (already gated at the top of this function).
    if (totalDistributed > 0) {
      void (async () => {
        try {
          const { data: balanceRow } = await supabaseAdmin
            .from('reward_points_balance')
            .select('current_balance')
            .eq('user_id', userId)
            .maybeSingle();

          if (balanceRow) {
            const balanceAfter  = Number(balanceRow.current_balance);
            const balanceBefore = balanceAfter - totalDistributed;

            for (const milestone of REWARD_MILESTONES) {
              if (balanceBefore < milestone && balanceAfter >= milestone) {
                // Crossed this milestone in this event — fire WhatsApp notification
                await notifyCustomerRewardMilestone({
                  userId,
                  pointsEarned: totalDistributed,
                  totalBalance: balanceAfter,
                  milestone,
                });
                // Only notify for the highest milestone crossed per event
                break;
              }
            }
          }
        } catch (milestoneErr) {
          console.warn('[rewardNotifications] Milestone WhatsApp check failed (non-fatal):', milestoneErr);
        }
      })();
    }
  } catch (err) {
    console.error('[rewardNotifications] notifyRewardEarned failed:', err);
  }
}
