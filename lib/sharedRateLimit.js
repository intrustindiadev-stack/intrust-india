export async function checkLayeredRateLimit({ supabaseAdmin, phone, ip, channel }) {
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const now = new Date();
  
  const bucketKey = Math.floor(now.getTime() / windowMs);

  // Per-channel phone key: WhatsApp uses a separate bucket from SMS
  const phoneKey = channel === 'whatsapp'
    ? `otp:phone:wa:${phone}`
    : `otp:phone:${phone}`;

  // The limits
  const limits = [
    { key: phoneKey, max: 5, windowSec: 900 },
    { key: `otp:ip:${ip}`, max: 30, windowSec: 900 },
    { key: `otp:global:${bucketKey}`, max: 500, windowSec: 900 }
  ];

  const consumedKeys = [];
  let maxRetryAfter = 0;
  let rejectedReason = '';

  for (const { key, max, windowSec } of limits) {
    const { data: result, error } = await supabaseAdmin.rpc('check_rate_limit', {
        p_key: key,
        p_max_requests: max,
        p_window_seconds: windowSec
    });

    if (error) {
      console.error(`[checkLayeredRateLimit] RPC Error for ${key}:`, error);
      // Rollback previously consumed keys
      for (const cKey of consumedKeys) {
          await supabaseAdmin.rpc('rollback_rate_limit', { p_key: cKey });
      }
      return { allowed: false, reason: `Internal error checking rate limit` };
    }

    if (!result.allowed) {
      rejectedReason = `Rate limit exceeded for ${key}`;
      maxRetryAfter = Math.max(maxRetryAfter, result.retry_after || 0);
      
      // Rollback previously consumed keys
      for (const cKey of consumedKeys) {
          await supabaseAdmin.rpc('rollback_rate_limit', { p_key: cKey });
      }
      break;
    }

    consumedKeys.push(key);
  }

  if (rejectedReason) {
      return { allowed: false, reason: rejectedReason, retryAfter: maxRetryAfter, consumedKeys: [] };
  }

  return { allowed: true, consumedKeys };
}
