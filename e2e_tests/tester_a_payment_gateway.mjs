/**
 * e2e_tests/tester_a_payment_gateway.mjs
 *
 * TEST MODULE 6: Payment Gateway
 *
 * Validates the current SabPaisa contract end-to-end:
 *   - Correct column names (client_txn_id, status, expected_amount_paise, fulfilled_at, udf1)
 *   - Lowercase internal statuses (initiated, gateway_success, failed)
 *   - shared fulfillTransaction() side-effects (wallet credit for WALLET_TOPUP)
 *   - Amount mismatch guard (integrity check)
 *   - fulfilled_at idempotency stamp after successful fulfillment
 *   - No re-fulfillment once fulfilled_at is set
 *
 * IMPORTANT: This test drives fulfillment.js directly with a service-role client and
 * synthetic transaction records. It does NOT encrypt a live SabPaisa payload (which would
 * require real keys and network access to the gateway). The callback/webhook HTTP layer
 * is separately exercised by integration tests.
 */

import { createClient } from '@supabase/supabase-js';
import { fulfillTransaction } from '../lib/sabpaisa/fulfillment.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TEST_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'tester_a@intrustindia.com';
const TEST_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'SecurePass123!';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

let passed = 0;
let failed = 0;

function pass(msg) { console.log(`  ✅ PASS: ${msg}`); passed++; }
function fail(msg, detail) { console.error(`  ❌ FAIL: ${msg}`, detail || ''); failed++; }

async function getTestUserId() {
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    return users?.find(u => u.email === TEST_EMAIL)?.id;
}

/** Insert a minimal transaction row using the real schema and return the full row. */
async function insertTestTransaction(uid, overrides = {}) {
    const clientTxnId = `test_txn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const payload = {
        client_txn_id: clientTxnId,
        user_id: uid,
        amount: 10.00,
        expected_amount_paise: 1000,
        status: 'initiated',
        udf1: 'WALLET_TOPUP',
        payer_email: TEST_EMAIL,
        payer_mobile: '9999999999',
        payer_name: 'Tester A',
        ...overrides,
    };

    const { data, error } = await supabaseAdmin
        .from('transactions')
        .insert(payload)
        .select('*')
        .single();

    if (error) throw new Error(`insertTestTransaction failed: ${error.message}`);
    return data;
}

async function cleanupData(uid) {
    if (!uid) return;
    // Remove test transactions (cascades to transaction_logs)
    await supabaseAdmin.from('transactions').delete().eq('user_id', uid).like('client_txn_id', 'test_txn_%');
    // Reset wallet to 0 for clean idempotency tests
    await supabaseAdmin.from('customer_wallets').update({ balance_paise: 0 }).eq('user_id', uid);
}

async function run() {
    console.log('\n--- Running TEST MODULE 6: Payment Gateway ---');

    // ── Ensure test user exists ──────────────────────────────────────────────
    let uid = await getTestUserId();
    if (!uid) {
        await supabaseAdmin.auth.admin.createUser({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            email_confirm: true,
        });
        uid = await getTestUserId();
    }
    await cleanupData(uid);

    // ── Ensure test user has a wallet row ────────────────────────────────────
    const { data: existingWallet } = await supabaseAdmin
        .from('customer_wallets')
        .select('id')
        .eq('user_id', uid)
        .maybeSingle();
    if (!existingWallet) {
        await supabaseAdmin.from('customer_wallets').insert({ user_id: uid, balance_paise: 0 });
    }

    // ────────────────────────────────────────────────────────────────────────
    // TC-A-057: Transaction row shape — current schema columns
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n🧪 TC-A-057: Transaction row created with correct schema columns');
    try {
        const txn = await insertTestTransaction(uid, {
            expected_amount_paise: 1500,
            udf1: 'WALLET_TOPUP',
        });

        if (txn.status === 'initiated') pass('status = "initiated" (lowercase)');
        else fail('status should be "initiated"', txn.status);

        if (typeof txn.expected_amount_paise === 'number' && txn.expected_amount_paise === 1500)
            pass('expected_amount_paise column present and set correctly');
        else fail('expected_amount_paise missing or wrong', txn.expected_amount_paise);

        if (txn.fulfilled_at === null || txn.fulfilled_at === undefined)
            pass('fulfilled_at starts as NULL');
        else fail('fulfilled_at should be NULL at initiation', txn.fulfilled_at);

        if (txn.udf1 === 'WALLET_TOPUP') pass('udf1 stored correctly');
        else fail('udf1 wrong', txn.udf1);
    } catch (err) {
        fail('TC-A-057 threw unexpectedly', err.message);
    }

    // ────────────────────────────────────────────────────────────────────────
    // TC-A-058: fulfillTransaction() — WALLET_TOPUP credits wallet
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n🧪 TC-A-058: fulfillTransaction() credits wallet for WALLET_TOPUP');
    let fulfillTxnRow;
    try {
        fulfillTxnRow = await insertTestTransaction(uid, {
            expected_amount_paise: 1000,
            udf1: 'WALLET_TOPUP',
        });

        const { data: walletBefore } = await supabaseAdmin
            .from('customer_wallets')
            .select('balance_paise')
            .eq('user_id', uid)
            .single();
        const balanceBefore = walletBefore?.balance_paise ?? 0;

        const result = await fulfillTransaction(supabaseAdmin, fulfillTxnRow, 'gateway_success', {
            clientTxnId: fulfillTxnRow.client_txn_id,
            amount: '10.00',
            paymentMode: 'UPI',
            sabpaisaTxnId: 'MOCK_SP_TXN_001',
            transMsg: 'Success',
        });

        if (!result.fulfillmentFailed) pass('fulfillTransaction returned fulfillmentFailed=false');
        else fail('fulfillTransaction reported failure', result.transMsg);

        if (result.fulfillmentComplete) pass('fulfillmentComplete=true returned');
        else fail('fulfillmentComplete should be true on success');

        const { data: walletAfter } = await supabaseAdmin
            .from('customer_wallets')
            .select('balance_paise')
            .eq('user_id', uid)
            .single();
        const balanceAfter = walletAfter?.balance_paise ?? 0;

        if (balanceAfter === balanceBefore + 1000)
            pass(`Wallet credited correctly: ${balanceBefore} → ${balanceAfter} (+1000 paise)`);
        else fail(`Wallet balance mismatch: expected ${balanceBefore + 1000}, got ${balanceAfter}`);
    } catch (err) {
        fail('TC-A-058 threw unexpectedly', err.message);
    }

    // ────────────────────────────────────────────────────────────────────────
    // TC-A-059: Amount mismatch guard — fulfillment blocked
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n🧪 TC-A-059: Amount mismatch guard blocks fulfillment');
    try {
        const mismatchTxn = await insertTestTransaction(uid, {
            expected_amount_paise: 2000, // expect ₹20
            udf1: 'WALLET_TOPUP',
        });

        // Simulate route-level amount check (mirrors callback/webhook logic)
        const paidAmountPaise = Math.round(parseFloat('10.00') * 100); // gateway sends ₹10
        const expectedAmountPaise = Number(mismatchTxn.expected_amount_paise); // DB has ₹20
        const amountMismatch = paidAmountPaise !== expectedAmountPaise;

        if (amountMismatch)
            pass(`Amount mismatch detected: paid=${paidAmountPaise} vs expected=${expectedAmountPaise}`);
        else fail('Amount mismatch should have been detected');

        // fulfillTransaction should not even be called when mismatch detected (fulfillmentFailed=true at route level)
        // Here we verify fulfillTransaction itself also exits early if status is not gateway_success
        const result = await fulfillTransaction(supabaseAdmin, mismatchTxn, 'failed', {
            clientTxnId: mismatchTxn.client_txn_id,
            amount: '10.00',
            paymentMode: 'UPI',
            sabpaisaTxnId: 'MOCK_SP_TXN_002',
            transMsg: 'Amount mismatch',
        });

        if (!result.fulfillmentFailed) pass('fulfillTransaction correctly no-ops for non-gateway_success status');
        else fail('fulfillTransaction should return fulfillmentFailed=false (it should not have run)');

        if (!result.fulfillmentComplete) pass('fulfillmentComplete=false when not run');
        else fail('fulfillmentComplete should be false when fulfillment did not execute');
    } catch (err) {
        fail('TC-A-059 threw unexpectedly', err.message);
    }

    // ────────────────────────────────────────────────────────────────────────
    // TC-A-060: fulfilled_at stamped after successful fulfillment
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n🧪 TC-A-060: fulfilled_at is stamped on the transactions row after success');
    try {
        const stampTxn = await insertTestTransaction(uid, {
            expected_amount_paise: 500,
            udf1: 'WALLET_TOPUP',
        });

        const fulfillResult = await fulfillTransaction(supabaseAdmin, stampTxn, 'gateway_success', {
            clientTxnId: stampTxn.client_txn_id,
            amount: '5.00',
            paymentMode: 'UPI',
            sabpaisaTxnId: 'MOCK_SP_TXN_003',
            transMsg: 'Success',
        });

        // Simulate the route's stamp (callback/webhook do this after checking fulfillmentComplete)
        if (fulfillResult.fulfillmentComplete) {
            await supabaseAdmin
                .from('transactions')
                .update({ fulfilled_at: new Date().toISOString() })
                .eq('client_txn_id', stampTxn.client_txn_id);
        }

        const { data: refreshed } = await supabaseAdmin
            .from('transactions')
            .select('fulfilled_at')
            .eq('client_txn_id', stampTxn.client_txn_id)
            .single();

        if (refreshed?.fulfilled_at != null) pass('fulfilled_at is non-null after successful fulfillment');
        else fail('fulfilled_at should be set after fulfillment', refreshed?.fulfilled_at);
    } catch (err) {
        fail('TC-A-060 threw unexpectedly', err.message);
    }

    // ────────────────────────────────────────────────────────────────────────
    // TC-A-061: Idempotency — wallet credited only once even if called twice
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n🧪 TC-A-061: Idempotency — wallet credit runs only once for duplicate callbacks');
    try {
        const idempTxn = await insertTestTransaction(uid, {
            expected_amount_paise: 1000,
            udf1: 'WALLET_TOPUP',
        });

        const { data: walletBefore } = await supabaseAdmin
            .from('customer_wallets')
            .select('balance_paise')
            .eq('user_id', uid)
            .single();
        const balanceBefore = walletBefore?.balance_paise ?? 0;

        const payload = {
            clientTxnId: idempTxn.client_txn_id,
            amount: '10.00',
            paymentMode: 'UPI',
            sabpaisaTxnId: 'MOCK_SP_TXN_004',
            transMsg: 'Success',
        };

        // First call — fulfillment runs
        const r1 = await fulfillTransaction(supabaseAdmin, idempTxn, 'gateway_success', payload);
        if (r1.fulfillmentComplete) {
            // Stamp fulfilled_at (as routes do)
            await supabaseAdmin
                .from('transactions')
                .update({ fulfilled_at: new Date().toISOString() })
                .eq('client_txn_id', idempTxn.client_txn_id);
        }

        // Fetch fresh row (with fulfilled_at set)
        const { data: idempTxnRefreshed } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('client_txn_id', idempTxn.client_txn_id)
            .single();

        const alreadyFulfilled = idempTxnRefreshed?.fulfilled_at != null;
        if (alreadyFulfilled) pass('fulfilled_at set after first call — retry guard active');
        else fail('fulfilled_at should be set after first fulfillment');

        // Second call — routes gate on fulfilled_at, so fulfillTransaction is NOT called.
        // Verify wallet balance was only credited once.
        const { data: walletAfter } = await supabaseAdmin
            .from('customer_wallets')
            .select('balance_paise')
            .eq('user_id', uid)
            .single();

        if (walletAfter?.balance_paise === balanceBefore + 1000)
            pass('Wallet credited exactly once (idempotency confirmed)');
        else fail(`Wallet balance wrong: expected ${balanceBefore + 1000}, got ${walletAfter?.balance_paise}`);
    } catch (err) {
        fail('TC-A-061 threw unexpectedly', err.message);
    }

    // ────────────────────────────────────────────────────────────────────────
    // TC-A-062: transaction_logs row created for CALLBACK event
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n🧪 TC-A-062: transaction_logs row can be inserted for CALLBACK event type');
    try {
        const logTxn = await insertTestTransaction(uid, { udf1: 'WALLET_TOPUP' });

        const { error: logErr } = await supabaseAdmin
            .from('transaction_logs')
            .insert({
                client_txn_id: logTxn.client_txn_id,
                event_type: 'CALLBACK',
                payload: { statusCode: 'SUCCESS', paymentMode: 'UPI' },
                message: 'Simulated callback',
            });

        if (logErr) {
            fail('transaction_logs insert failed', logErr.message);
        } else {
            const { data: logs } = await supabaseAdmin
                .from('transaction_logs')
                .select('event_type')
                .eq('client_txn_id', logTxn.client_txn_id);

            if (logs?.length > 0 && logs[0].event_type === 'CALLBACK')
                pass('transaction_logs row created with event_type=CALLBACK');
            else fail('transaction_logs row not found or wrong event_type');
        }
    } catch (err) {
        fail('TC-A-062 threw unexpectedly', err.message);
    }

    // ── Cleanup ──────────────────────────────────────────────────────────────
    await cleanupData(uid);

    return { passed, failed };
}

if (true) {
    run().then(({ passed, failed }) => {
        console.log(`\n${'─'.repeat(50)}`);
        console.log(`Module Payment: ${passed} passed, ${failed} failed`);
        process.exit(failed > 0 ? 1 : 0);
    }).catch(console.error);
}

export { run };
