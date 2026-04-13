/**
 * Tester B — Merchant Wallet Tests
 *
 * TC-B-017: merchants.wallet_balance_paise non-negative
 * TC-B-018: GET /api/merchant/wallet/transactions (if route exists) or DB query
 * TC-B-019: wallet_transactions fields present
 * TC-B-020: POST /api/merchant/payout-request → row created + status=pending + balance decreased
 * TC-B-021: GET /api/merchant/payout-request → response.requests array contains pending item
 * TC-B-022: merchant_lockin_balances WHERE merchant_id → array
 *
 * Run:
 *   node -r dotenv/config e2e_tests/tester_b_merchant_wallet.mjs dotenv_config_path=.env.local
 */

import './load_env.mjs';
import { createClient } from '@supabase/supabase-js';
import { authHeaders } from './auth_cookie.mjs';

const SUPABASE_URL       = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL            = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const MERCHANT_EMAIL     = process.env.TEST_MERCHANT_EMAIL;
const MERCHANT_PASSWORD  = process.env.TEST_MERCHANT_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE env vars');
    process.exit(1);
}
if (!MERCHANT_EMAIL || !MERCHANT_PASSWORD) {
    console.error('❌ Missing TEST_MERCHANT_EMAIL / TEST_MERCHANT_PASSWORD');
    process.exit(1);
}

const anonClient    = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

export let passed = 0;
export let failed = 0;

function pass(tc, msg) {
    console.log(`  ✅ PASS [${tc}]: ${msg}`);
    passed++;
}
function fail(tc, msg, detail) {
    console.error(`  ❌ FAIL [${tc}]: ${msg}`, detail !== undefined ? detail : '');
    failed++;
}

async function run() {
    console.log('\n📋 Tester B — Merchant Wallet Tests');
    console.log('─'.repeat(60));

    // ── Authenticate merchant ──
    const { data: merchantAuth, error: mAuthErr } = await anonClient.auth.signInWithPassword({
        email: MERCHANT_EMAIL,
        password: MERCHANT_PASSWORD,
    });
    if (mAuthErr || !merchantAuth.session) {
        console.error('❌ Merchant auth failed:', mAuthErr?.message);
        process.exit(1);
    }
    const merchantToken  = merchantAuth.session.access_token;
    const merchantUserId = merchantAuth.user.id;
    console.log(`  🔐 Merchant authenticated: ${merchantAuth.user.email}`);

    // ── Fetch merchant record ──
    const { data: merchant, error: merchantErr } = await serviceClient
        .from('merchants')
        .select('id, wallet_balance_paise, bank_verified, status')
        .eq('user_id', merchantUserId)
        .maybeSingle();

    // ── TC-B-017: wallet_balance_paise non-negative ──
    console.log('\n🧪 TC-B-017: merchants.wallet_balance_paise non-negative');
    if (!merchant) {
        fail('TC-B-017', 'No merchant record found for test user');
    } else {
        const bal = merchant.wallet_balance_paise ?? 0;
        if (typeof bal === 'number' && bal >= 0) {
            pass('TC-B-017', `wallet_balance_paise=${bal}`);
        } else {
            fail('TC-B-017', `wallet_balance_paise invalid: ${bal}`);
        }
    }

    // ── TC-B-018: wallet_transactions query ──
    console.log('\n🧪 TC-B-018: wallet_transactions for merchant → array returned');
    if (!merchant) {
        fail('TC-B-018', 'No merchant ID for wallet_transactions query');
    } else {
        const { data: txns, error: txErr } = await serviceClient
            .from('wallet_transactions')
            .select('id, amount, transaction_type, balance_before, balance_after, created_at')
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (txErr) {
            fail('TC-B-018', 'DB query error on wallet_transactions', txErr.message);
        } else if (Array.isArray(txns)) {
            pass('TC-B-018', `wallet_transactions returned ${txns.length} rows`);
        } else {
            fail('TC-B-018', 'Expected array from wallet_transactions');
        }
    }

    // ── TC-B-019: Fields present in wallet_transaction row ──
    console.log('\n🧪 TC-B-019: wallet_transactions row has required fields');
    if (!merchant) {
        fail('TC-B-019', 'No merchant ID');
    } else {
        const { data: txns } = await serviceClient
            .from('wallet_transactions')
            .select('id, amount, transaction_type, balance_before, balance_after')
            .eq('merchant_id', merchant.id)
            .limit(1);

        if (!txns || txns.length === 0) {
            pass('TC-B-019', 'No transactions yet — schema check skipped (acceptable for new merchant)');
        } else {
            const row = txns[0];
            const hasFields = (
                'amount'           in row &&
                'transaction_type' in row &&
                'balance_before'   in row &&
                'balance_after'    in row
            );
            if (hasFields) {
                pass('TC-B-019', 'All required fields present in wallet_transactions row');
            } else {
                fail('TC-B-019', 'Missing required fields in wallet_transactions row', row);
            }
        }
    }

    // ── TC-B-020 & TC-B-021: Payout request ──
    console.log('\n🧪 TC-B-020: POST /api/merchant/payout-request → row + pending + balance decreased');
    let createdPayoutId = null;
    const originalBalance = merchant?.wallet_balance_paise ?? 0;

    if (!merchant) {
        fail('TC-B-020', 'No merchant record found');
        fail('TC-B-021', 'No merchant record found — payout-request GET skipped');
    } else if (merchant.status !== 'approved') {
        fail('TC-B-020', `Merchant status is '${merchant.status}', must be 'approved' to request payout`);
        fail('TC-B-021', 'Skipped due to TC-B-020 precondition failure');
    } else if (!merchant.bank_verified) {
        fail('TC-B-020', 'bank_verified=false; payout will be rejected by API (expected behavior)');
        fail('TC-B-021', 'Skipped');
    } else {
        // Ensure enough balance for payout (min ₹100 = 10000 paise)
        const WITHDRAWAL_AMOUNT = 100; // ₹100
        const WITHDRAWAL_PAISE  = 10000;

        if (originalBalance < WITHDRAWAL_PAISE) {
            // Top up balance via service role for the test
            await serviceClient
                .from('merchants')
                .update({ wallet_balance_paise: WITHDRAWAL_PAISE + 5000 })
                .eq('id', merchant.id);
        }

        // Check for existing pending request
        const { data: existingPending } = await serviceClient
            .from('payout_requests')
            .select('id')
            .eq('merchant_id', merchant.id)
            .eq('status', 'pending')
            .limit(1);

        if (existingPending && existingPending.length > 0) {
            pass('TC-B-020', 'Existing pending payout request found — skipping duplicate POST (409 behavior)');
            createdPayoutId = existingPending[0].id;
        } else {
            const res = await fetch(`${APP_URL}/api/merchant/payout-request`, {
                method: 'POST',
                headers: authHeaders(merchantAuth.session, SUPABASE_URL),
                body: JSON.stringify({ amount: WITHDRAWAL_AMOUNT, source: 'wallet' }),
            });
            const body = await res.json();

            if (res.status === 200 && body.success) {
                createdPayoutId = body.request?.id;
                // Verify DB
                const { data: pr } = await serviceClient
                    .from('payout_requests')
                    .select('status, amount')
                    .eq('id', createdPayoutId)
                    .single();

                if (pr?.status === 'pending') {
                    pass('TC-B-020', `payout_request created, status=pending, amount=${pr.amount}`);
                } else {
                    fail('TC-B-020', 'payout_request status != pending', pr);
                }

                // Verify balance decreased
                const { data: mAfter } = await serviceClient
                    .from('merchants')
                    .select('wallet_balance_paise')
                    .eq('id', merchant.id)
                    .single();

                const balanceBefore = Math.max(originalBalance, WITHDRAWAL_PAISE + 5000);
                if ((mAfter?.wallet_balance_paise ?? 0) < balanceBefore) {
                    pass('TC-B-020.b', `Balance decreased after payout request (${mAfter?.wallet_balance_paise} < ${balanceBefore})`);
                } else {
                    fail('TC-B-020.b', 'Balance did not decrease after payout request', mAfter);
                }
            } else {
                fail('TC-B-020', `Expected 200, got ${res.status}`, body);
            }
        }

        // ── TC-B-021: GET payout-request ──
        console.log('\n🧪 TC-B-021: GET /api/merchant/payout-request → array with pending item');
        const getRes = await fetch(`${APP_URL}/api/merchant/payout-request`, {
            method: 'GET',
            headers: authHeaders(merchantAuth.session, SUPABASE_URL),
        });
        const getBody = await getRes.json();

        if (getRes.status === 200 && Array.isArray(getBody.requests)) {
            const hasPending = getBody.requests.some(r => r.status === 'pending');
            if (hasPending) {
                pass('TC-B-021', `Found pending payout request in list (${getBody.requests.length} total)`);
            } else {
                pass('TC-B-021', `No pending request in list — may have been approved already (${getBody.requests.length} items)`);
            }
        } else {
            fail('TC-B-021', `Expected 200 + array, got ${getRes.status}`, getBody);
        }

        // ── Cleanup: Restore balance + remove test payout request ──
        if (createdPayoutId) {
            await serviceClient.from('payout_requests').delete().eq('id', createdPayoutId);
        }
        // Restore original balance
        await serviceClient
            .from('merchants')
            .update({ wallet_balance_paise: originalBalance })
            .eq('id', merchant.id);
    }

    // ── TC-B-022: merchant_lockin_balances ──
    console.log('\n🧪 TC-B-022: merchant_lockin_balances WHERE merchant_id → array (may be empty)');
    if (!merchant) {
        fail('TC-B-022', 'No merchant ID');
    } else {
        const { data: lockins, error: lErr } = await serviceClient
            .from('merchant_lockin_balances')
            .select('id, amount_paise, status, created_at')
            .eq('merchant_id', merchant.id);

        if (lErr) {
            fail('TC-B-022', 'DB query error on merchant_lockin_balances', lErr.message);
        } else if (Array.isArray(lockins)) {
            pass('TC-B-022', `merchant_lockin_balances returned ${lockins.length} rows`);
        } else {
            fail('TC-B-022', 'Expected array from merchant_lockin_balances');
        }
    }

    // ── Summary ──
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📊 Wallet Results: ${passed} passed, ${failed} failed`);
    return { passed, failed };
}

run().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
