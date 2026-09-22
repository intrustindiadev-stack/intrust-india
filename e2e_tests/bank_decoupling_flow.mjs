/**
 * Bank Verification Decoupling — live end-to-end validation
 *
 * Validates the checklist for decoupling merchant ACCOUNT APPROVAL from
 * FINANCIAL (bank) VERIFICATION after bank details became optional on the
 * merchant application form:
 *
 *   T1  A pending merchant with NO bank details can still be APPROVED
 *   T2  POST /api/admin/verify-bank refuses with 400 +
 *       "Cannot verify. Merchant has not provided bank details yet."
 *   T3  The approved merchant submits bank details from the panel
 *       → columns saved, bank_verification_status = 'pending'
 *   T4  The admin can now verify → bank_verified = true, flag = 'verified'
 *   T5  The merchant CANNOT forge bank_verification_status / bank_verified
 *       from the browser (RLS allows the row write; the guard trigger raises)
 *
 * All created rows are removed in the finally block.
 *
 * Run (a dev server must be serving the local code on NEXT_PUBLIC_APP_URL):
 *   node --env-file=.env.local e2e_tests/bank_decoupling_flow.mjs
 */

import './load_env.mjs';
import { createClient } from '@supabase/supabase-js';
import { authHeaders, buildAuthCookie } from './auth_cookie.mjs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL      = process.env.E2E_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

let passed = 0;
let failed = 0;
const results = [];

function check(label, ok, detail = '') {
    if (ok) {
        passed += 1;
        results.push(`  ✅ ${label}`);
    } else {
        failed += 1;
        results.push(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
    }
    return ok;
}

const created = { userId: null, merchantId: null };


async function main() {
    console.log(`\n🎯 Bank-decoupling E2E — target: ${APP_URL}\n`);

    // ── Fixture: a PENDING merchant with NO bank details ──────────────────────
    const stamp    = Date.now();
    const email    = `bank.decouple.${stamp}@intrust-test.com`;
    const password = 'SecurePass123!';

    const { data: userRes, error: userErr } = await svc.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });
    if (userErr) throw new Error(`createUser failed: ${userErr.message}`);
    created.userId = userRes.user.id;

    // handle_new_user() already inserted the profile; make the role explicit.
    await svc.from('user_profiles').upsert(
        { id: created.userId, role: 'merchant', full_name: 'ZZ Bank Decouple Test', email },
        { onConflict: 'id' }
    );

    const { data: merchant, error: merchErr } = await svc
        .from('merchants')
        .insert({
            user_id: created.userId,
            business_name: `ZZ Bank Decouple ${stamp}`,
            owner_name: 'ZZ Bank Decouple Test',
            business_phone: `9${String(stamp).slice(-9)}`,
            business_email: email,
            business_address: 'Test Address',
            status: 'pending',
            pan_number: 'ABCDE1234F',
            referral_code: `ZZ${String(stamp).slice(-6)}`,
            // The whole point: NO bank details at all.
            bank_account_number: null,
            bank_ifsc_code: null,
            bank_account_name: null,
            bank_name: null,
            bank_data: null,
            bank_verified: false,
        })
        .select('id, bank_verification_status')
        .single();
    if (merchErr) throw new Error(`merchant insert failed: ${merchErr.message}`);
    created.merchantId = merchant.id;
    // The merchant→CRM sync trigger titles the lead "<business_name> (Merchant)"
    // and does NOT set converted_merchant_id, so keep the name for cleanup.
    created.businessName = `ZZ Bank Decouple ${stamp}`;

    check(
        'T0: fixture created with NO bank details',
        merchant.bank_verification_status === 'not_submitted',
        `bank_verification_status=${merchant.bank_verification_status}`
    );

    // ── Synthetic admin session ──────────────────────────────────────────────
    // The API routes gate on user_profiles.role IN ('admin','super_admin'), so a
    // dedicated throw-away admin avoids depending on (and touching) the real
    // super-admin account whose e2e credentials in .env.local are stale.
    const adminEmail = `bank.decouple.admin.${stamp}@intrust-test.com`;
    const { data: adminUserRes, error: adminUserErr } = await svc.auth.admin.createUser({
        email: adminEmail,
        password,
        email_confirm: true,
    });
    if (adminUserErr) throw new Error(`createUser (admin) failed: ${adminUserErr.message}`);
    created.adminUserId = adminUserRes.user.id;
    await svc.from('user_profiles').upsert(
        { id: created.adminUserId, role: 'admin', full_name: 'ZZ Bank Decouple Admin', email: adminEmail },
        { onConflict: 'id' }
    );

    const adminSession = (await createClient(SUPABASE_URL, ANON_KEY)
        .auth.signInWithPassword({ email: adminEmail, password })).data.session;
    if (!adminSession) throw new Error('admin sign-in failed (synthetic admin)');

    // Merchant session — needed for the UI guardrail checks below.
    const merchantSession = (await createClient(SUPABASE_URL, ANON_KEY)
        .auth.signInWithPassword({ email, password })).data.session;
    if (!merchantSession) throw new Error('merchant sign-in failed');

    return { email, password, adminSession, merchantSession };
}

// ── T1 + T2: admin approval decoupled from bank verification ─────────────────
async function runAdminChecks(adminSession) {
    console.log('\n── T1: approve a merchant with NO bank details ──');
    const approveRes = await fetch(`${APP_URL}/api/admin/approve-merchant`, {
        method: 'POST',
        headers: authHeaders(adminSession, SUPABASE_URL),
        body: JSON.stringify({ applicationId: created.merchantId, userId: created.userId }),
    });
    const approveBody = await approveRes.json();

    check('T1.1: approve returns 200 (not blocked by missing bank details)',
        approveRes.status === 200, `HTTP ${approveRes.status} ${JSON.stringify(approveBody)}`);

    const { data: afterApprove } = await svc
        .from('merchants')
        .select('status, subscription_status, bank_verified, bank_verification_status')
        .eq('id', created.merchantId)
        .single();

    check('T1.2: merchant status = approved', afterApprove?.status === 'approved', `status=${afterApprove?.status}`);
    check('T1.3: approval did NOT fake a bank verification',
        afterApprove?.bank_verified === false && afterApprove?.bank_verification_status === 'not_submitted',
        `bank_verified=${afterApprove?.bank_verified} flag=${afterApprove?.bank_verification_status}`);

    console.log('\n── T2: admin verify-bank must be refused safely ──');
    const verifyRes = await fetch(`${APP_URL}/api/admin/verify-bank`, {
        method: 'POST',
        headers: authHeaders(adminSession, SUPABASE_URL),
        body: JSON.stringify({ merchantId: created.merchantId }),
    });
    const verifyBody = await verifyRes.json();

    check('T2.1: verify-bank returns 400', verifyRes.status === 400, `HTTP ${verifyRes.status}`);
    check('T2.2: exact error message',
        verifyBody?.error === 'Cannot verify. Merchant has not provided bank details yet.',
        JSON.stringify(verifyBody));
    check('T2.3: machine-readable BANK_DETAILS_MISSING code',
        verifyBody?.code === 'BANK_DETAILS_MISSING', JSON.stringify(verifyBody));
}

// ── T3 + T4 + T5: merchant catch-up submission, then admin verification ──────
async function runMerchantChecks(adminSession, merchantSession) {
    console.log('\n── T3: approved merchant submits bank details from the panel ──');

    const merchantClient = createClient(SUPABASE_URL, ANON_KEY);

    // 3a — client-side contract: a malformed IFSC must be rejected before the
    // paid penny-drop call is spent.
    const badIfsc = await fetch(`${APP_URL}/api/merchant/bank-details`, {
        method: 'POST',
        headers: authHeaders(merchantSession, SUPABASE_URL),
        body: JSON.stringify({
            bank_account_name: 'ZZ Bank Decouple Test',
            bank_account_number: '123456789012',
            bank_ifsc_code: 'NOT-A-IFSC',
            bank_name: 'State Bank of India',
        }),
    });
    check('T3.1: invalid IFSC rejected with 400', badIfsc.status === 400, `HTTP ${badIfsc.status}`);

    const submitRes = await fetch(`${APP_URL}/api/merchant/bank-details`, {
        method: 'POST',
        headers: authHeaders(merchantSession, SUPABASE_URL),
        body: JSON.stringify({
            bank_account_name: 'ZZ Bank Decouple Test',
            bank_account_number: '123456789012',
            bank_ifsc_code: 'SBIN0001234',
            bank_name: 'State Bank of India',
        }),
    });
    const submitBody = await submitRes.json();
    check('T3.2: submission accepted', submitRes.status === 200, `HTTP ${submitRes.status} ${JSON.stringify(submitBody)}`);

    const { data: afterSubmit } = await svc
        .from('merchants')
        .select('bank_account_number, bank_ifsc_code, bank_account_name, bank_name, bank_verified, bank_verification_status')
        .eq('id', created.merchantId)
        .single();

    check('T3.3: account number persisted', afterSubmit?.bank_account_number === '123456789012', `got=${afterSubmit?.bank_account_number}`);
    check('T3.4: IFSC persisted', afterSubmit?.bank_ifsc_code === 'SBIN0001234', `got=${afterSubmit?.bank_ifsc_code}`);
    check('T3.5: holder name persisted', afterSubmit?.bank_account_name === 'ZZ Bank Decouple Test', `got=${afterSubmit?.bank_account_name}`);
    check('T3.6: flag moved to pending (or verified if penny-drop accepted)',
        ['pending', 'verified'].includes(afterSubmit?.bank_verification_status),
        `flag=${afterSubmit?.bank_verification_status}`);
    check('T3.7: payouts still gated by bank_verified',
        afterSubmit?.bank_verified === false || afterSubmit?.bank_verification_status === 'verified',
        `bank_verified=${afterSubmit?.bank_verified}`);
}

// ── UI guardrails: the admin detail page must render the disabled action ─────
// The page is force-dynamic, so `next build` does NOT exercise it — this is the
// check that actually proves the greyed-out button + badge render.
async function runUiChecksAdmin(adminSession) {
    console.log('\n── T0b: admin detail page renders the missing-bank guardrails ──');

    const pageRes = await fetch(`${APP_URL}/admin/merchants/${created.merchantId}`, {
        headers: {
            Authorization: `Bearer ${adminSession.access_token}`,
            Cookie: buildAuthCookie(adminSession, SUPABASE_URL),
        },
    });
    const html = await pageRes.text();

    check('T0b.1: admin merchant detail page renders 200', pageRes.status === 200, `HTTP ${pageRes.status}`);
    check('T0b.2: missing-bank badge is rendered',
        html.includes('Bank Details Missing (Pending Merchant Submission)'),
        'badge text not found in rendered HTML');
    // A <button ...disabled...> whose label is "Verify Bank Registry".
    const disabledVerify = /<button[^>]*\bdisabled\b[^>]*>(?:(?!<\/button>)[\s\S])*?Verify Bank Registry/.test(html);
    check('T0b.3: verify action is disabled (not clickable)', disabledVerify,
        'no disabled Verify Bank Registry button found');
    check('T0b.4: Approve action remains available',
        html.includes('Approve'), 'Approve button not found');
}

// ── Merchant panel catch-up surface (valid AFTER approval, BEFORE submission) ─
async function runUiChecksMerchant(merchantSession) {
    console.log('\n── T1b: approved merchant sees the catch-up surface ──');
    const settingsRes = await fetch(`${APP_URL}/merchant/settings?tab=bank`, {
        headers: {
            Authorization: `Bearer ${merchantSession.access_token}`,
            Cookie: buildAuthCookie(merchantSession, SUPABASE_URL),
        },
    });
    check('T1b.1: merchant settings bank tab reachable (200)', settingsRes.status === 200, `HTTP ${settingsRes.status}`);

    // And the dashboard catch-up banner for a merchant with no bank details.
    const dashRes = await fetch(`${APP_URL}/merchant/dashboard`, {
        headers: {
            Authorization: `Bearer ${merchantSession.access_token}`,
            Cookie: buildAuthCookie(merchantSession, SUPABASE_URL),
        },
    });
    const dashHtml = await dashRes.text();
    check('T1b.2: merchant dashboard renders 200', dashRes.status === 200, `HTTP ${dashRes.status}`);
    check('T1b.3: dashboard shows the amber catch-up banner',
        dashHtml.includes('Action Required: Add your bank details to enable payouts.'),
        'banner text not found in rendered HTML');
}

// ── Runner ───────────────────────────────────────────────────────────────────
try {
    const { adminSession, merchantSession } = await main();

    // UI guardrails first — the fixture is still a PENDING application with no
    // bank details, which is exactly the state the checklist asks to inspect.
    await runUiChecksAdmin(adminSession);

    await runAdminChecks(adminSession);

    // Now approved (still without bank details) — the merchant must be able to
    // reach the catch-up surface and see the amber banner.
    await runUiChecksMerchant(merchantSession);

    await runMerchantChecks(adminSession, merchantSession);

    console.log('\n── T4: admin can now verify the submitted bank details ──');
    const verify2Res = await fetch(`${APP_URL}/api/admin/verify-bank`, {
        method: 'POST',
        headers: authHeaders(adminSession, SUPABASE_URL),
        body: JSON.stringify({ merchantId: created.merchantId }),
    });
    const verify2Body = await verify2Res.json();

    check('T4.1: verify-bank now succeeds', verify2Res.status === 200, `HTTP ${verify2Res.status} ${JSON.stringify(verify2Body)}`);

    const { data: afterVerify } = await svc
        .from('merchants')
        .select('bank_verified, bank_verification_status')
        .eq('id', created.merchantId)
        .single();

    check('T4.2: bank_verified = true', afterVerify?.bank_verified === true, `got=${afterVerify?.bank_verified}`);
    check('T4.3: flag = verified', afterVerify?.bank_verification_status === 'verified', `got=${afterVerify?.bank_verification_status}`);

    console.log('\n── T5: merchant cannot forge verification state from the browser ──');
    // Reset to a pre-verified state so the forge attempt is a real change, not a no-op.
    await svc.from('merchants')
        .update({ bank_verified: false, bank_verification_status: 'pending' })
        .eq('id', created.merchantId);

    // Per-request authenticated client: the ANON key stays as the API key and the
    // merchant's JWT rides the Authorization header — exactly what a browser
    // session does. (Passing the JWT as the `key` argument yields a plain 401
    // from PostgREST instead of exercising RLS + the guard trigger.)
    const merchantClient = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${merchantSession.access_token}` } },
    });

    const forgeFlag = await merchantClient
        .from('merchants')
        .update({ bank_verification_status: 'verified' })
        .eq('id', created.merchantId);
    check('T5.1: forged bank_verification_status rejected by guard trigger',
        !!forgeFlag.error && /protected/i.test(forgeFlag.error.message || ''),
        forgeFlag.error?.message || 'no error raised');

    const forgeVerified = await merchantClient
        .from('merchants')
        .update({ bank_verified: true })
        .eq('id', created.merchantId);
    check('T5.2: forged bank_verified rejected by guard trigger',
        !!forgeVerified.error && /protected/i.test(forgeVerified.error.message || ''),
        forgeVerified.error?.message || 'no error raised');

} catch (err) {
    failed += 1;
    results.push(`  ❌ UNEXPECTED ERROR — ${err?.stack || err}`);
} finally {
    console.log('\n── cleanup ──');
    try {
        // Everything that can RESTRICT the auth.users delete must go first.
        // crm_leads.created_by in particular is ON DELETE NO ACTION, and the
        // merchant→CRM sync trigger writes one row per created merchant.
        for (const uid of [created.userId, created.adminUserId].filter(Boolean)) {
            const childTables = [
                ['crm_leads', 'created_by'],
                ['crm_leads', 'assigned_to'],
                ['crm_lead_activities', 'actor_id'],
                ['crm_lead_notes', 'author_id'],
                ['notifications', 'user_id'],
                ['audit_logs', 'actor_id'],
                ['audit_logs_crm', 'actor_id'],
                ['user_profiles', 'id'],
            ];
            for (const [tbl, col] of childTables) {
                const { error: childErr } = await svc.from(tbl).delete().eq(col, uid);
                if (childErr) console.error(`  ⚠️ ${tbl}.${col} cleanup error:`, childErr.message);
            }
        }
        if (created.merchantId) {
            await svc.from('crm_leads').delete().eq('converted_merchant_id', created.merchantId);
            if (created.businessName) {
                await svc.from('crm_leads').delete().ilike('title', `${created.businessName}%`);
            }
            await svc.from('notifications').delete().eq('reference_id', created.merchantId);
            await svc.from('audit_logs').delete().eq('entity_id', created.merchantId);
            const { error: delErr } = await svc.from('merchants').delete().eq('id', created.merchantId);
            console.log(`  merchant row deleted${delErr ? ` (error: ${delErr.message})` : ''}`);
        }
        for (const uid of [created.userId, created.adminUserId].filter(Boolean)) {
            const { error: userDelErr } = await svc.auth.admin.deleteUser(uid);
            console.log(`  auth user ${uid.slice(0, 8)} deleted${userDelErr ? ` (error: ${userDelErr.message})` : ''}`);
        }
    } catch (cleanupErr) {
        console.error('  ⚠️ cleanup error:', cleanupErr?.message || cleanupErr);
    }
}

console.log('\n══════════════ RESULTS ══════════════');
for (const line of results) console.log(line);
console.log('══════════════════════════════════════');
console.log(`  ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);


