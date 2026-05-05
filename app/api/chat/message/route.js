import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { sendMessageToAgent } from '@/lib/omniflow';
import { sanitizeMessage } from '@/lib/piiFilter';
import { enforceIntent } from '@/lib/intentEnforcer';

/**
 * POST /api/chat/message
 * Web chatbot backend. Mirrors the WhatsApp webhook intent logic
 * but for authenticated web users. No OTP flow here.
 *
 * Request body: { message: string }
 * Response:     { reply: string }
 */
export async function POST(req) {
  try {
    // 1. Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse message
    const body = await req.json();
    const userMessage = (body?.message || '').trim().substring(0, 500);

    if (!userMessage) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 3. Fetch financial context
    const [walletRes, profileRes, txRes] = await Promise.all([
      admin
        .from('customer_wallets')
        .select('balance_paise')
        .eq('user_id', user.id)
        .maybeSingle(),

      admin
        .from('user_profiles')
        .select('kyc_status, full_name')
        .eq('id', user.id)
        .single(),

      admin
        .from('customer_wallet_transactions')
        .select('type, amount_paise, description, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    const walletBalance = walletRes.data?.balance_paise ?? 0;
    const balanceRs = (walletBalance / 100).toFixed(2);
    const kycStatus = profileRes.data?.kyc_status || 'Pending';
    const fullName = profileRes.data?.full_name || 'Customer';
    const firstName = fullName.split(' ')[0] || 'Customer';

    const txList = (txRes.data || [])
      .map(
        (t, i) =>
          `${i + 1}. ${t.type} ₹${(t.amount_paise / 100).toFixed(2)} — ${t.description || 'N/A'}`
      )
      .join(', ') || 'No recent transactions';

    const contextBlock = `User financial context for InTrust India customer (${firstName}):\n- Wallet balance: ₹${balanceRs}\n- KYC status: ${kycStatus}\n- Last 3 transactions: ${txList}`;

    // 4. Intent enforcement — fast path, no AI call needed
    const intentResponse = enforceIntent(userMessage, { walletBalance, kycStatus });

    let finalReply;

    if (intentResponse) {
      finalReply = intentResponse;
    } else {
      // 5. Fall through to AI agent
      try {
        // For web chat, we use a dummy phone (user ID based) since Omniflow AI
        // endpoint requires a phone. The phone won't receive messages — it's
        // just the AI context identifier.
        const dummyPhone = '+910000000000';

        const aiReply = await sendMessageToAgent(dummyPhone, contextBlock, userMessage);
        const sanitized = sanitizeMessage(aiReply);
        finalReply = enforceIntent(sanitized, { walletBalance, kycStatus }) || sanitized;
      } catch (aiErr) {
        console.error('[chat/message] AI call failed:', aiErr);
        finalReply = 'For further help, please visit intrustindia.com or contact our support team.';
      }
    }

    // 6. Final PII filter safety net
    finalReply = sanitizeMessage(finalReply);

    // 7. Log outbound message
    const phoneHash = crypto
      .createHash('sha256')
      .update(user.id) // Use user ID as proxy for web channel
      .digest('hex');

    await admin.from('whatsapp_message_logs').insert({
      user_id: user.id,
      phone_hash: phoneHash,
      direction: 'outbound',
      message_type: 'text',
      channel: 'web',
      status: 'delivered',
      content_preview: finalReply.substring(0, 100),
    });

    return NextResponse.json({ reply: finalReply, firstName });
  } catch (err) {
    console.error('[chat/message] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
