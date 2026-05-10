/**
 * Reward Notifications
 *
 * NOTE: The 'reward' notification type was rejected by the database's `notification_type_check` 
 * constraint (`type IN ('info','success','warning','error')`), confirmed via Supabase MCP on 2026-05-10. 
 * We deliberately use type='success' and `reference_type='reward_scratch_card'` so the bell 
 * can still icon/route this distinctly without DB schema changes.
 */

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

      if (!error && data) {
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
  } catch (err) {
    console.error('[rewardNotifications] notifyRewardEarned failed:', err);
  }
}
