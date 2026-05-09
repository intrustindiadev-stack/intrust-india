import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { createAdminClient } from '@/lib/supabaseServer';
import crypto from 'crypto';
import {
  sendTemplateMessage,
  MERCHANT_WELCOME_LINKED_TEMPLATE,
  MERCHANT_NEW_ORDER_TEMPLATE,
  MERCHANT_ORDER_CANCELLED_TEMPLATE,
  MERCHANT_PAYOUT_STATUS_TEMPLATE,
  MERCHANT_STORE_CREDIT_REQUEST_TEMPLATE,
  MERCHANT_STORE_CREDIT_PAID_TEMPLATE,
  MERCHANT_GIFT_CARD_SOLD_TEMPLATE,
  MERCHANT_BANK_VERIFIED_TEMPLATE,
  MERCHANT_APPROVED_TEMPLATE,
  MERCHANT_SUBSCRIPTION_STATUS_TEMPLATE,
  MERCHANT_PRODUCT_APPROVED_TEMPLATE,
} from '@/lib/omniflow';

/**
 * POST /api/admin/whatsapp-test-merchant
 * Admin-only diagnostic endpoint to send a WhatsApp template directly to a
 * merchant's linked phone, bypassing toggle/dedup checks.
 *
 * Requires: admin or super_admin role (pass Supabase session JWT as Bearer).
 *
 * Body:
 *   { merchantUserId: string, templateName: string, args?: string[] }
 *
 * Example:
 *   curl -X POST https://intrustindia.com/api/admin/whatsapp-test-merchant \
 *     -H "Authorization: Bearer <YOUR_ADMIN_JWT>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"merchantUserId":"<UUID>","templateName":"intrust_merchant_new_order","args":["TESTORDER","99.00","1"]}'
 */

const TEMPLATE_MAP = {
  intrust_merchant_welcome_linked: MERCHANT_WELCOME_LINKED_TEMPLATE,
  intrust_merchant_new_order: MERCHANT_NEW_ORDER_TEMPLATE,
  intrust_merchant_order_cancelled: MERCHANT_ORDER_CANCELLED_TEMPLATE,
  intrust_merchant_payout_status: MERCHANT_PAYOUT_STATUS_TEMPLATE,
  intrust_merchant_store_credit_request: MERCHANT_STORE_CREDIT_REQUEST_TEMPLATE,
  intrust_merchant_store_credit_paid: MERCHANT_STORE_CREDIT_PAID_TEMPLATE,
  intrust_merchant_gift_card_sold: MERCHANT_GIFT_CARD_SOLD_TEMPLATE,
  intrust_merchant_bank_verified: MERCHANT_BANK_VERIFIED_TEMPLATE,
  intrust_merchant_approved: MERCHANT_APPROVED_TEMPLATE,
  intrust_merchant_subscription_status: MERCHANT_SUBSCRIPTION_STATUS_TEMPLATE,
  intrust_merchant_product_approved: MERCHANT_PRODUCT_APPROVED_TEMPLATE,
};

export async function POST(request) {
  // 1. Auth check
  const { user, profile } = await getAuthUser(request);
  if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Parse and validate body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { merchantUserId, templateName, args = [] } = body;

  if (!merchantUserId || typeof merchantUserId !== 'string' || !merchantUserId.trim()) {
    return NextResponse.json({ error: 'merchantUserId is required.' }, { status: 400 });
  }

  if (!templateName || !TEMPLATE_MAP[templateName]) {
    return NextResponse.json(
      { error: `templateName must be one of: ${Object.keys(TEMPLATE_MAP).join(', ')}` },
      { status: 400 }
    );
  }

  const template = TEMPLATE_MAP[templateName];
  const admin = createAdminClient();

  // 3. Binding lookup
  const { data: binding } = await admin
    .from('user_channel_bindings')
    .select('phone')
    .eq('user_id', merchantUserId)
    .eq('audience', 'merchant')
    .eq('whatsapp_opt_in', true)
    .maybeSingle();

  if (!binding?.phone) {
    return NextResponse.json({ error: 'Merchant has not linked WhatsApp' }, { status: 404 });
  }

  const phoneHash = crypto.createHash('sha256').update(binding.phone).digest('hex');

  // 4. Send template (no toggle/dedup checks — intentional for diagnostic tool)
  try {
    await sendTemplateMessage(
      binding.phone,
      template.name,
      template.language,
      template.buildComponents(...args)
    );

    // 5. Log success
    await admin.from('whatsapp_message_logs').insert({
      user_id: merchantUserId,
      phone_hash: phoneHash,
      direction: 'outbound',
      message_type: 'template',
      channel: 'whatsapp',
      audience: 'merchant',
      status: 'delivered',
      content_preview: `[ADMIN_TEST:${templateName}]`,
    });

    return NextResponse.json({
      success: true,
      phone: binding.phone,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    // 6. Log failure
    try {
      await admin.from('whatsapp_message_logs').insert({
        user_id: merchantUserId,
        phone_hash: phoneHash,
        direction: 'outbound',
        message_type: 'template',
        channel: 'whatsapp',
        audience: 'merchant',
        status: 'failed',
        content_preview: `[ADMIN_TEST_FAILED:${templateName}] ` + error.message.slice(0, 150),
      });
    } catch (logErr) {
      console.error('[whatsapp-test-merchant] Failed to write failure log:', logErr);
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 502 });
  }
}
