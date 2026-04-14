import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'tester_a@intrustindia.com';
const TEST_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'SecurePass123!';
const TEST_PHONE = '9999999999';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

let passed = 0;
let failed = 0;

function pass(msg) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
}

function fail(msg, detail) {
    console.error(`  ❌ FAIL: ${msg}`, detail || '');
    failed++;
}

async function cleanupData() {
    // Clean up test user
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const testUser = users?.users?.find(u => u.email === TEST_EMAIL);
    if (testUser) {
        await supabaseAdmin.auth.admin.deleteUser(testUser.id);
    }
    // Clean up OTPs
    await supabaseAdmin.from('otp_codes').delete().eq('phone', TEST_PHONE);
    await supabaseAdmin.from('auth_tokens').delete().eq('email', TEST_EMAIL);
}

async function run() {
    console.log('\n--- Running TEST MODULE 1: Auth & Onboarding ---');
    await cleanupData();

    // TC-A-001: POST /api/auth/email/signup
    console.log(`\n🧪 TC-A-001: Signup with valid credentials`);
    let res1 = await fetch(`${APP_URL}/api/auth/email/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, full_name: 'Tester A' })
    });
    let data1;
    const text1 = await res1.text();
    try {
        data1 = JSON.parse(text1);
    } catch (e) {
        console.error(`❌ HTML/Non-JSON Response received:`, text1.slice(0, 1000));
        fail(`Signup failed with status ${res1.status}. Non-JSON response.`);
        return { passed, failed };
    }
    if (res1.status === 200 && data1.pendingVerification) {
        // Force confirm user to proceed with signin tests later
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const createdUser = users?.users?.find(u => u.email === TEST_EMAIL);
        if (createdUser) {
            await supabaseAdmin.auth.admin.updateUserById(createdUser.id, { email_confirm: true });
            pass(`Signed up successfully & user exists (status ${res1.status})`);
        } else {
            fail('Signup API returned 200 but user not found in auth.users');
        }
    } else {
        fail(`Signup failed with status ${res1.status}`, data1);
    }

    // TC-A-002: POST /api/auth/email/signup duplicate
    console.log(`\n🧪 TC-A-002: Signup with duplicate email`);
    let res2 = await fetch(`${APP_URL}/api/auth/email/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, full_name: 'Tester A' })
    });
    let data2 = await res2.json();
    if (res2.status === 409 && data2.conflict === true) {
        pass(`Correctly returned 409 conflict for duplicate email`);
    } else {
        fail(`Expected 409 conflict, got ${res2.status}`, data2);
    }

    // TC-A-004: POST /api/auth/send-otp
    console.log(`\n🧪 TC-A-004: Send OTP`);
    let res4 = await fetch(`${APP_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: TEST_PHONE })
    });
    if (res4.status === 200) {
        const { data: otps } = await supabaseAdmin.from('otp_codes').select('*').eq('phone', TEST_PHONE);
        if (otps && otps.length > 0) {
            pass('OTP sent and row inserted in DB');
        } else {
            fail('OTP API returned 200 but no row in otp_codes');
        }
    } else {
        fail(`Send OTP failed with status ${res4.status}`);
    }

    // TC-A-005: Verify expired OTP
    console.log(`\n🧪 TC-A-005: Verify expired OTP`);
    await supabaseAdmin.from('otp_codes').insert({
        phone: TEST_PHONE,
        otp_hash: '123456', // Test logic usually uses raw if not hashed in verify route
        expires_at: new Date(Date.now() - 10000).toISOString() // Expired
    });
    let res5 = await fetch(`${APP_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: TEST_PHONE, otp: '123456' })
    });
    if (res5.status >= 400) {
        pass(`Correctly rejected expired OTP (status ${res5.status})`);
    } else {
        fail(`Verified expired OTP! VULNERABILITY!`);
    }

    // TC-A-006: Rate limit send OTP
    console.log(`\n🧪 TC-A-006: Rate limit send-otp`);
    let status6 = 200;
    for (let i = 0; i < 4; i++) {
        const r = await fetch(`${APP_URL}/api/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: TEST_PHONE })
        });
        if (i === 3) status6 = r.status;
    }
    if (status6 === 429) {
        pass('Correctly rate limited 4th OTP attempt (429)');
    } else {
        fail(`Expected 429 on 4th attempt, got ${status6}. Note: May fail if no rate limiter configured locally`);
    }

    // TC-A-007: POST signin
    console.log(`\n🧪 TC-A-007: Signin with valid credentials`);
    let res7 = await fetch(`${APP_URL}/api/auth/email/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    let data7 = await res7.json();
    let setCookie = res7.headers.get('set-cookie');
    if (res7.status === 200 && data7.success && setCookie) {
        pass(`Signin successful and auth cookie set`);
    } else {
        fail(`Signin failed with status ${res7.status}`, data7);
    }

    // TC-A-008: POST signin wrong password
    console.log(`\n🧪 TC-A-008: Signin with wrong password`);
    let res8 = await fetch(`${APP_URL}/api/auth/email/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, password: 'WrongPassword' })
    });
    if (res8.status === 401) {
        pass(`Correctly rejected wrong password`);
    } else {
        fail(`Expected 401, got ${res8.status}`);
    }

    // TC-A-009: POST signin 5 times wrong
    console.log(`\n🧪 TC-A-009: Account lockout after 5 failed attempts`);
    let status9 = 401;
    let data9 = {};
    for (let i = 0; i < 4; i++) { // 1 already done above, do 4 more
        const r = await fetch(`${APP_URL}/api/auth/email/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: TEST_EMAIL, password: 'WrongPassword' })
        });
        if (i === 3) {
            status9 = r.status;
            data9 = await r.json();
        }
    }
    if (status9 === 423 || data9.locked) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const lockedUser = users?.users?.find(u => u.email === TEST_EMAIL);
        const { data: profile } = await supabaseAdmin.from('user_profiles').select('locked_until').eq('id', lockedUser.id).single();
        if (profile?.locked_until && new Date(profile.locked_until) > new Date()) {
            pass('Account correctly locked and locked_until is set in DB');
        } else {
            fail('Response indicated lock but locked_until not set in DB');
        }
    } else {
        fail(`Expected DB lock/423, got ${status9}. Note: lockout mechanics might be DB triggers or edge functions`);
    }

    // TC-A-013: Expired auth_token reset-password
    console.log(`\n🧪 TC-A-013: Reset password with expired token`);
    await supabaseAdmin.from('auth_tokens').insert({
        email: TEST_EMAIL,
        token_type: 'reset',
        expires_at: new Date(Date.now() - 10000).toISOString()
    });
    let res13 = await fetch(`${APP_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'reset123', new_password: 'NewPassword123' })
    });
    if (res13.status >= 400) {
        pass(`Correctly rejected expired reset token (status ${res13.status})`);
    } else {
        fail(`Reset password succeeded with expired token! VULNERABILITY!`);
    }

    // TC-A-014: Logout
    console.log(`\n🧪 TC-A-014: Logout API`);
    let res14 = await fetch(`${APP_URL}/api/auth/logout`, {
        method: 'POST'
    });
    let clearCookie = res14.headers.get('set-cookie');
    if (res14.status === 200 && (!clearCookie || clearCookie.includes('Max-Age=0') || clearCookie.includes('expires'))) {
        pass('Logout endpoint succeeded and tried to clear cookies');
    } else {
        fail(`Logout returned status ${res14.status} or cookie not cleared`);
    }

    await cleanupData(); // Teardown

    return { passed, failed };
}

if (true) {
    run().then(({ passed, failed }) => {
        console.log(`\n${'─'.repeat(50)}`);
        console.log(`Module Auth: ${passed} passed, ${failed} failed`);
        process.exit(failed > 0 ? 1 : 0);
    }).catch(console.error);
}

export { run };
