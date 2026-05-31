import 'server-only';

import { createAdminClient } from '@/lib/supabaseServer';
import { normalisePhone } from '@/lib/omniflow';

const MERCHANT_ROLES = ['merchant', 'admin', 'super_admin'];

/**
 * Ensure a WhatsApp channel binding exists for the given user.
 *
 * - Looks up the user's role and phone from user_profiles.
 * - For merchant roles, prefers merchants.business_phone over profile phone.
 * - Upserts user_channel_bindings with whatsapp_opt_in = true.
 * - For merchant roles, also upserts merchant_notification_settings with all
 *   alert flags enabled (mirrors verify-otp/route.js lines 143–153).
 *
 * This function NEVER throws — all errors are caught and logged so it is safe
 * to call as a fire-and-forget side-effect or with await in a try/catch block.
 *
 * @param {{ userId: string }} options
 * @returns {Promise<{ linked: boolean, phone: string|null, audience: string|null }>}
 */
export async function ensureWhatsAppBinding({ userId }) {
  let audience = null;
  try {
    const admin = createAdminClient();

    // 1. Fetch role and phone from user_profiles
    const { data: profileRow, error: profileErr } = await admin
      .from('user_profiles')
      .select('role, phone')
      .eq('id', userId)
      .single();

    if (profileErr || !profileRow) {
      console.warn('[ensureWhatsAppBinding] Could not fetch user_profiles for user:', userId, profileErr?.message);
      return { linked: false, phone: null, audience: null };
    }

    // 2. Determine audience
    audience = MERCHANT_ROLES.includes(profileRow.role) ? 'merchant' : 'customer';

    // 3. Determine raw phone
    let rawPhone = profileRow.phone;
    if (audience === 'merchant') {
      const { data: merchantRow } = await admin
        .from('merchants')
        .select('id, business_phone')
        .eq('user_id', userId)
        .maybeSingle();

      // Prefer business_phone; fall back to profile phone
      rawPhone = merchantRow?.business_phone || profileRow.phone;
    }

    // 4. No phone — nothing to bind
    if (!rawPhone) {
      return { linked: false, phone: null, audience };
    }

    // 5. Normalise to E.164
    const normalisedPhone = normalisePhone(rawPhone);

    // 6. Upsert user_channel_bindings
    const now = new Date().toISOString();
    const { error: bindErr } = await admin
      .from('user_channel_bindings')
      .upsert(
        {
          user_id: userId,
          phone: normalisedPhone,
          audience,
          whatsapp_opt_in: true,
          linked_at: now,
          updated_at: now,
        },
        { onConflict: 'user_id,audience' }
      );

    if (bindErr) {
      console.warn('[ensureWhatsAppBinding] Binding upsert failed (non-fatal):', bindErr.message);
      return { linked: false, phone: normalisedPhone, audience };
    }

    // 7. For merchant audience, upsert merchant_notification_settings
    if (audience === 'merchant') {
      try {
        const { data: merchantData } = await admin
          .from('merchants')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (merchantData?.id) {
          await admin
            .from('merchant_notification_settings')
            .upsert(
              {
                merchant_id: merchantData.id,
                whatsapp_order_alerts: true,
                whatsapp_payout_alerts: true,
                whatsapp_store_credit_alerts: true,
                whatsapp_kyc_alerts: true,
                whatsapp_subscription_alerts: true,
                whatsapp_product_alerts: true,
                whatsapp_marketing: false,
                updated_at: now,
              },
              { onConflict: 'merchant_id' }
            );
        }
      } catch (settingsErr) {
        console.warn('[ensureWhatsAppBinding] merchant_notification_settings upsert failed (non-fatal):', settingsErr.message);
      }
    }

    // 8. Return success
    return { linked: true, phone: normalisedPhone, audience };
  } catch (err) {
    console.error('[ensureWhatsAppBinding] Unexpected error (non-fatal):', err.message);
    return { linked: false, phone: null, audience };
  }
}
