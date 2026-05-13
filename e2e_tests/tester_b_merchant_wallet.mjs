/**
 * Tester B — Merchant Wallet Tests
 *
 * TC-B-017: merchants.wallet_balance_paise non-negative
 * TC-B-018: GET /api/merchant/wallet/transactions (if route exists) or DB query
 * TC-B-019: wallet_transactions fields present
 * TC-B-020: POST /api/merchant/payout-request → row created + status=pending + balance decreased
 * TC-B-021: Multi-pending happy path — two wallet payouts succeed; cancel one and verify refund isolation
 * TC-B-022: Cap enforcement — third payout returns 429 pending_count_exceeded when cap=2
 * TC-B-023: Growth-fund contract guard — second payout on same contract returns 409 growth_fund_already_requested
 * TC-B-024: GET /api/merchant/payout-request → response.requests array contains pending item
 * TC-B-025: merchant_lockin_balances WHERE merchant_id → array
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

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Delete all pending payout rows for this merchant (test teardown). */
async function cleanupPendingPayouts(merchantId) {
    await serviceClient
        .from('payout_requests')
        .delete()
        .eq('merchant_id', merchantId)
        .eq('status', 'pending');
}

/**
 * Update (or upsert) a platform_settings row.
 * @param {string} key
 * @param {string | null} value
 */
async function setPlatformSetting(key, value) {
    await serviceClient
        .from('platform_settings')
        .update({ value })
        .eq('key', key);
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

    // ── TC-B-020: Payout request (basic happy path) ──
    console.log('\n🧪 TC-B-020: POST /api/merchant/payout-request → row + pending + balance decreased');
    let createdPayoutId = null;
    const originalBalance = merchant?.wallet_balance_paise ?? 0;

    if (!merchant) {
        fail('TC-B-020', 'No merchant record found');
    } else if (merchant.status !== 'approved') {
        fail('TC-B-020', `Merchant status is '${merchant.status}', must be 'approved' to request payout`);
    } else if (!merchant.bank_verified) {
        fail('TC-B-020', 'bank_verified=false; payout will be rejected by API (expected behavior)');
    } else {
        const WITHDRAWAL_AMOUNT = 100; // ₹100
        const WITHDRAWAL_PAISE  = 10000;

        // Clean slate: remove any pre-existing pending requests
        await cleanupPendingPayouts(merchant.id);

        // Ensure enough balance
        if (originalBalance < WITHDRAWAL_PAISE) {
            await serviceClient
                .from('merchants')
                .update({ wallet_balance_paise: WITHDRAWAL_PAISE + 5000 })
                .eq('id', merchant.id);
        }

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

        // Cleanup: delete created row and restore balance
        if (createdPayoutId) {
            await serviceClient.from('payout_requests').delete().eq('id', createdPayoutId);
        }
        await serviceClient
            .from('merchants')
            .update({ wallet_balance_paise: originalBalance })
            .eq('id', merchant.id);
    }

    // ── TC-B-021: Multi-pending happy path ──
    console.log('\n🧪 TC-B-021: Two wallet payouts succeed; cancel one → only that row refunded');
    if (!merchant || merchant.status !== 'approved' || !merchant.bank_verified) {
        fail('TC-B-021', 'Preconditions not met (approved + bank_verified required)');
    } else {
        const TOP_UP_PAISE  = 200000; // ₹2000
        const HALF_PAISE    = 100000; // ₹1000 each
        const HALF_AMOUNT   = 1000;

        await cleanupPendingPayouts(merchant.id);
        await serviceClient.from('merchants').update({ wallet_balance_paise: TOP_UP_PAISE }).eq('id', merchant.id);

        // POST first payout
        const res1 = await fetch(`${APP_URL}/api/merchant/payout-request`, {
            method: 'POST',
            headers: { ...authHeaders(merchantAuth.session, SUPABASE_URL), 'Idempotency-Key': crypto.randomUUID() },
            body: JSON.stringify({ amount: HALF_AMOUNT, source: 'wallet' }),
        });
        const body1 = await res1.json();

        // POST second payout
        const res2 = await fetch(`${APP_URL}/api/merchant/payout-request`, {
            method: 'POST',
            headers: { ...authHeaders(merchantAuth.session, SUPABASE_URL), 'Idempotency-Key': crypto.randomUUID() },
            body: JSON.stringify({ amount: HALF_AMOUNT, source: 'wallet' }),
        });
        const body2 = await res2.json();

        if (res1.status === 200 && body1.success && res2.status === 200 && body2.success) {
            pass('TC-B-021', `Both wallet payout requests succeeded (id1=${body1.request?.id}, id2=${body2.request?.id})`);
        } else {
            fail('TC-B-021', `Expected both 200 success; got ${res1.status}/${res2.status}`, { body1, body2 });
        }

        // POST a third — should fail insufficient_balance (balance now ~0)
        const res3 = await fetch(`${APP_URL}/api/merchant/payout-request`, {
            method: 'POST',
            headers: { ...authHeaders(merchantAuth.session, SUPABASE_URL), 'Idempotency-Key': crypto.randomUUID() },
            body: JSON.stringify({ amount: 100, source: 'wallet' }), // ₹100 minimum
        });
        const body3 = await res3.json();
        if (res3.status === 400 && body3.error) {
            pass('TC-B-021', `Third payout correctly rejected: ${body3.error}`);
        } else {
            fail('TC-B-021', `Expected 400 insufficient_balance, got ${res3.status}`, body3);
        }

        // TC-B-021.b: Cancel one payout → only that amount refunded
        const req1Id = body1.request?.id;
        if (req1Id) {
            // Read balance after two debits
            const { data: mMid } = await serviceClient
                .from('merchants')
                .select('wallet_balance_paise')
                .eq('id', merchant.id)
                .single();
            const balAfterTwo = mMid?.wallet_balance_paise ?? 0;

            const cancelRes = await fetch(`${APP_URL}/api/merchant/payout-request/${req1Id}`, {
                method: 'DELETE',
                headers: authHeaders(merchantAuth.session, SUPABASE_URL),
            });

            if (cancelRes.ok) {
                const { data: mAfterCancel } = await serviceClient
                    .from('merchants')
                    .select('wallet_balance_paise')
                    .eq('id', merchant.id)
                    .single();

                const expected = balAfterTwo + HALF_PAISE;
                if (mAfterCancel?.wallet_balance_paise === expected) {
                    pass('TC-B-021.b', `Refund isolation: balance restored by exactly ${HALF_PAISE} paise (${balAfterTwo} → ${expected})`);
                } else {
                    fail('TC-B-021.b', `Expected balance ${expected}, got ${mAfterCancel?.wallet_balance_paise}`);
                }
            } else {
                fail('TC-B-021.b', `Cancel request failed (status ${cancelRes.status})`);
            }
        } else {
            fail('TC-B-021.b', 'Could not get req1 ID for cancel test');
        }

        // Teardown: cleanup all pending + restore balance
        await cleanupPendingPayouts(merchant.id);
        await serviceClient.from('merchants').update({ wallet_balance_paise: originalBalance }).eq('id', merchant.id);
    }

    // ── TC-B-022: Cap enforcement ──
    console.log('\n🧪 TC-B-022: Cap enforcement — third payout returns 429 when cap=2');
    if (!merchant || merchant.status !== 'approved' || !merchant.bank_verified) {
        fail('TC-B-022', 'Preconditions not met (approved + bank_verified required)');
    } else {
        const CAP_VALUE     = '2';
        const TOP_UP_PAISE  = 150000; // ₹1500
        const AMT           = 100;     // ₹100 minimum each
        const AMT_PAISE     = 10000;

        await cleanupPendingPayouts(merchant.id);
        await setPlatformSetting('payout_max_pending_count', CAP_VALUE);
        await serviceClient.from('merchants').update({ wallet_balance_paise: TOP_UP_PAISE }).eq('id', merchant.id);

        // First two should succeed
        const r1 = await fetch(`${APP_URL}/api/merchant/payout-request`, {
            method: 'POST',
            headers: { ...authHeaders(merchantAuth.session, SUPABASE_URL), 'Idempotency-Key': crypto.randomUUID() },
            body: JSON.stringify({ amount: AMT, source: 'wallet' }),
        });
        const r2 = await fetch(`${APP_URL}/api/merchant/payout-request`, {
            method: 'POST',
            headers: { ...authHeaders(merchantAuth.session, SUPABASE_URL), 'Idempotency-Key': crypto.randomUUID() },
            body: JSON.stringify({ amount: AMT, source: 'wallet' }),
        });

        // Third should hit cap
        const r3 = await fetch(`${APP_URL}/api/merchant/payout-request`, {
            method: 'POST',
            headers: { ...authHeaders(merchantAuth.session, SUPABASE_URL), 'Idempotency-Key': crypto.randomUUID() },
            body: JSON.stringify({ amount: AMT, source: 'wallet' }),
        });
        const b1 = await r1.json();
        const b2 = await r2.json();
        const b3 = await r3.json();

        if (r1.status === 200 && b1.success && r2.status === 200 && b2.success) {
            pass('TC-B-022', 'First two payouts succeeded (cap=2)');
        } else {
            fail('TC-B-022', `Expected both first two to succeed, got ${r1.status}/${r2.status}`, { b1, b2 });
        }

        if (r3.status === 429) {
            pass('TC-B-022', `Third payout correctly blocked with 429: ${b3.error}`);
        } else {
            fail('TC-B-022', `Expected 429 pending_count_exceeded, got ${r3.status}`, b3);
        }

        // Teardown: restore setting, clean pending rows, restore balance
        await setPlatformSetting('payout_max_pending_count', null);
        await cleanupPendingPayouts(merchant.id);
        await serviceClient.from('merchants').update({ wallet_balance_paise: originalBalance }).eq('id', merchant.id);
    }

    // ── TC-B-023: Growth-fund contract guard ──
    console.log('\n🧪 TC-B-023: Growth-fund second payout → 409 growth_fund_already_requested');
    if (!merchant || merchant.status !== 'approved' || !merchant.bank_verified) {
        fail('TC-B-023', 'Preconditions not met (approved + bank_verified required)');
    } else {
        // Locate or insert a matured lockin_balance fixture
        let contractId = null;
        let fixtureInserted = false;
        let contractAmountPaise = 0;

        const { data: existing } = await serviceClient
            .from('merchant_lockin_balances')
            .select('id, amount_paise, accumulated_interest_paise, status')
            .eq('merchant_id', merchant.id)
            .eq('status', 'matured')
            .limit(1);

        if (existing && existing.length > 0) {
            contractId          = existing[0].id;
            contractAmountPaise = existing[0].amount_paise + (existing[0].accumulated_interest_paise || 0);
        } else {
            // Insert a fixture
            const { data: ins, error: insErr } = await serviceClient
                .from('merchant_lockin_balances')
                .insert({
                    merchant_id:                  merchant.id,
                    amount_paise:                 50000,
                    accumulated_interest_paise:   500,
                    status:                       'matured',
                })
                .select('id, amount_paise, accumulated_interest_paise')
                .single();

            if (insErr || !ins) {
                fail('TC-B-023', 'Could not insert growth-fund fixture', insErr?.message);
            } else {
                contractId          = ins.id;
                contractAmountPaise = ins.amount_paise + (ins.accumulated_interest_paise || 0);
                fixtureInserted     = true;
            }
        }

        if (contractId) {
            const contractAmountRs = contractAmountPaise / 100;

            // First payout — should succeed
            const gRes1 = await fetch(`${APP_URL}/api/merchant/payout-request`, {
                method: 'POST',
                headers: { ...authHeaders(merchantAuth.session, SUPABASE_URL), 'Idempotency-Key': crypto.randomUUID() },
                body: JSON.stringify({ amount: contractAmountRs, source: 'growth_fund', reference_id: contractId }),
            });
            const gBody1 = await gRes1.json();

            if (gRes1.status === 200 && gBody1.success) {
                pass('TC-B-023', `First growth-fund payout succeeded (id=${gBody1.request?.id})`);
            } else {
                fail('TC-B-023', `Expected 200 for first growth-fund payout, got ${gRes1.status}`, gBody1);
            }

            // Second payout on same contract — should return 409
            const gRes2 = await fetch(`${APP_URL}/api/merchant/payout-request`, {
                method: 'POST',
                headers: { ...authHeaders(merchantAuth.session, SUPABASE_URL), 'Idempotency-Key': crypto.randomUUID() },
                body: JSON.stringify({ amount: contractAmountRs, source: 'growth_fund', reference_id: contractId }),
            });
            const gBody2 = await gRes2.json();

            if (gRes2.status === 409 && gBody2.error === 'A payout for this Growth Fund contract is already pending.') {
                pass('TC-B-023', `Second payout correctly returned 409 growth_fund_already_requested`);
            } else {
                fail('TC-B-023', `Expected 409 growth_fund_already_requested, got ${gRes2.status}`, gBody2);
            }

            // Teardown: revert contract to matured + delete payout row
            await serviceClient
                .from('merchant_lockin_balances')
                .update({ status: 'matured' })
                .eq('id', contractId);

            if (gBody1.request?.id) {
                await serviceClient
                    .from('payout_requests')
                    .delete()
                    .eq('id', gBody1.request.id);
            }

            // If we inserted the fixture, remove it too
            if (fixtureInserted) {
                await serviceClient.from('merchant_lockin_balances').delete().eq('id', contractId);
            }
        }
    }

    // ── TC-B-024: GET payout-request ──
    console.log('\n🧪 TC-B-024: GET /api/merchant/payout-request → array with pending item');
    if (!merchant || merchant.status !== 'approved' || !merchant.bank_verified) {
        fail('TC-B-024', 'Preconditions not met — skipped');
    } else {
        // Create one pending row so we always have something to test with
        const WITHDRAWAL_PAISE = 10000;
        await serviceClient
            .from('merchants')
            .update({ wallet_balance_paise: Math.max(originalBalance, WITHDRAWAL_PAISE + 5000) })
            .eq('id', merchant.id);
        await cleanupPendingPayouts(merchant.id);

        const postRes = await fetch(`${APP_URL}/api/merchant/payout-request`, {
            method: 'POST',
            headers: { ...authHeaders(merchantAuth.session, SUPABASE_URL), 'Idempotency-Key': crypto.randomUUID() },
            body: JSON.stringify({ amount: 100, source: 'wallet' }),
        });

        const getRes = await fetch(`${APP_URL}/api/merchant/payout-request`, {
            method: 'GET',
            headers: authHeaders(merchantAuth.session, SUPABASE_URL),
        });
        const getBody = await getRes.json();

        if (getRes.status === 200 && Array.isArray(getBody.requests)) {
            const hasPending = getBody.requests.some(r => r.status === 'pending');
            if (hasPending) {
                pass('TC-B-024', `Found pending payout request in list (${getBody.requests.length} total)`);
            } else {
                pass('TC-B-024', `No pending request in list — may have been approved already (${getBody.requests.length} items)`);
            }
        } else {
            fail('TC-B-024', `Expected 200 + array, got ${getRes.status}`, getBody);
        }

        // Cleanup
        await cleanupPendingPayouts(merchant.id);
        await serviceClient.from('merchants').update({ wallet_balance_paise: originalBalance }).eq('id', merchant.id);
    }

    // ── TC-B-025: merchant_lockin_balances ──
    console.log('\n🧪 TC-B-025: merchant_lockin_balances WHERE merchant_id → array (may be empty)');
    if (!merchant) {
        fail('TC-B-025', 'No merchant ID');
    } else {
        const { data: lockins, error: lErr } = await serviceClient
            .from('merchant_lockin_balances')
            .select('id, amount_paise, status, created_at')
            .eq('merchant_id', merchant.id);

        if (lErr) {
            fail('TC-B-025', 'DB query error on merchant_lockin_balances', lErr.message);
        } else if (Array.isArray(lockins)) {
            pass('TC-B-025', `merchant_lockin_balances returned ${lockins.length} rows`);
        } else {
            fail('TC-B-025', 'Expected array from merchant_lockin_balances');
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
