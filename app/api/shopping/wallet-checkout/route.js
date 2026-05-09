import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { logRewardRpcResult, logRewardRpcFailure } from '@/lib/rewardRpcResult';

/**
 * POST /api/shopping/wallet-checkout
 *
 * Server-owned wallet cart checkout.  Replaces the client-side RPC call in
 * CartClient.jsx so that reward distribution runs server-side (with the
 * service role) immediately after the atomic checkout commit — no client
 * trust required and no race window between checkout and reward credit.
 *
 * Flow:
 *   1. Authenticate the caller (JWT → user_id)
 *   2. Call customer_checkout_v4(p_customer_id) — atomic wallet debit +
 *      order group creation inside one DB transaction
 *   3. Call calculate_and_distribute_rewards with the returned group_id
 *      and reference_type='shopping_order'  (same contract as the gateway
 *      CART_CHECKOUT branch in sabpaisa/callback/route.js)
 *   4. Dispatch a non-blocking order-notification request
 *   5. Return { success, group_id } to the client
 */
export async function POST(request) {
    const correlationId = crypto.randomUUID();
    let userId;

    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // ── 1. Authenticate ─────────────────────────────────────────────────────
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid token or user not found' }, { status: 401 });
        }
        userId = user.id;

        // ── 2. Atomic wallet checkout ────────────────────────────────────────────
        // customer_checkout_v4 debits the wallet, creates the order group and
        // items, clears the cart — all inside a single PG transaction.
        const { data: checkoutResult, error: checkoutError } = await supabaseAdmin.rpc(
            'customer_checkout_v4',
            { p_customer_id: userId }
        );

        if (checkoutError) {
            console.error(JSON.stringify({ correlationId, stage: 'checkout_rpc', userId, error: checkoutError }));
            return NextResponse.json(
                { error: checkoutError.message || 'Checkout failed. Please try again.' },
                { status: 500 }
            );
        }

        if (!checkoutResult || checkoutResult.success === false) {
            return NextResponse.json(
                { error: checkoutResult?.message || 'Checkout could not be completed' },
                { status: 400 }
            );
        }

        const groupId = checkoutResult.group_id;

        // ── 3. Purchase reward distribution ─────────────────────────────────────
        // Non-blocking: a reward failure must never fail the checkout itself.
        // Contract mirrors the gateway CART_CHECKOUT branch in
        // app/api/sabpaisa/callback/route.js lines 607-626:
        //   p_reference_id   = groupId
        //   p_reference_type = 'shopping_order'
        try {
            // Retrieve the total amount for reward calculation
            const { data: orderGroup } = await supabaseAdmin
                .from('shopping_order_groups')
                .select('total_amount_paise')
                .eq('id', groupId)
                .single();

            const amountPaise = orderGroup?.total_amount_paise ?? 0;

            const { data: rewardData, error: rewardError } = await supabaseAdmin.rpc(
                'calculate_and_distribute_rewards',
                {
                    p_event_type: 'purchase',
                    p_source_user_id: userId,
                    p_reference_id: groupId,
                    p_reference_type: 'shopping_order',
                    p_amount_paise: amountPaise
                }
            );

            if (rewardError) {
                console.error(JSON.stringify({ correlationId, stage: 'reward_rpc_error', userId, groupId, error: rewardError }));
                logRewardRpcFailure({
                    event_type: 'purchase',
                    source_user_id: userId,
                    reference_id: groupId,
                    reference_type: 'shopping_order',
                }, rewardError, { correlationId, amountPaise });
            } else {
                logRewardRpcResult({
                    event_type: 'purchase',
                    source_user_id: userId,
                    reference_id: groupId,
                    reference_type: 'shopping_order',
                }, rewardData, { correlationId, amountPaise });
            }
        } catch (rewardErr) {
            console.error(JSON.stringify({ correlationId, stage: 'reward_distribution_error', userId, groupId, error: rewardErr?.message }));
        }

        // ── 4. Fire-and-forget order notification ───────────────────────────────
        // Uses the base URL derived from the incoming request so it works in all
        // environments (local, staging, production).
        try {
            const { data: orderGroup } = await supabaseAdmin
                .from('shopping_order_groups')
                .select('total_amount_paise')
                .eq('id', groupId)
                .maybeSingle();

            const protocol = request.headers.get('x-forwarded-proto') || (request.url.startsWith('https') ? 'https' : 'http');
            const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
            const notifyUrl = `${protocol}://${host}/api/shopping/notify-order`;

            fetch(notifyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Token': process.env.INTERNAL_API_TOKEN ?? ''
                },
                body: JSON.stringify({
                    group_id: groupId,
                    amount_paise: orderGroup?.total_amount_paise ?? 0
                })
            }).catch((notifyErr) =>
                console.error('[WalletCheckout] notify-order failed:', notifyErr?.message)
            );
        } catch (notifyBuildErr) {
            console.error('[WalletCheckout] Could not build notify URL:', notifyBuildErr?.message);
        }

        return NextResponse.json({ success: true, group_id: groupId });

    } catch (error) {
        console.error(JSON.stringify({
            correlationId,
            stage: 'unexpected_error',
            userId,
            error: error?.message || String(error),
            stack: error?.stack
        }));
        return NextResponse.json(
            { error: 'An unexpected internal error occurred.', correlationId },
            { status: 500 }
        );
    }
}
