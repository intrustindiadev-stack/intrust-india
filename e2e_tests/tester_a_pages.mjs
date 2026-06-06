import './load_env.mjs';
import { createClient } from '@supabase/supabase-js';
import { authHeaders } from './auth_cookie.mjs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_EMAIL = 'tester_pages@intrustindia.com';
const TEST_PASSWORD = 'SecurePassPages123!';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

async function getTestUserId() {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    return users?.users?.find(u => u.email === TEST_EMAIL)?.id;
}

async function cleanupData() {
    const uid = await getTestUserId();
    if (uid) {
        // Delete merchant row first
        await supabaseAdmin.from('merchants').delete().eq('user_id', uid);
        // Delete user profile
        await supabaseAdmin.from('user_profiles').delete().eq('id', uid);
        // Delete auth user
        await supabaseAdmin.auth.admin.deleteUser(uid);
    }
}

async function run() {
    console.log('\n--- Running TEST MODULE: Page Route Guards ---');
    await cleanupData();

    // 1. PUBLIC PAGES (Verify 200 Status)
    const publicPages = [
        '/',
        '/about',
        '/contact',
        '/coming-soon',
        '/legal',
        '/search'
    ];

    for (const page of publicPages) {
        console.log(`\n🧪 Verify public page: ${page}`);
        try {
            const res = await fetch(`${APP_URL}${page}`);
            if (res.status === 200) {
                pass(`Public page ${page} returned 200 OK`);
            } else {
                fail(`Public page ${page} returned status ${res.status}`);
            }
        } catch (err) {
            fail(`Fetch error for public page ${page}`, err.message);
        }
    }

    // 2. PROTECTED CUSTOMER PAGES (Verify unauthenticated redirect to /login)
    const protectedPages = [
        '/dashboard',
        '/orders',
        '/orders/test-order-123',
        '/orders/test-order-123/invoice',
        '/profile',
        '/profile/kyc',
        '/wallet',
        '/transactions',
        '/wishlist',
        '/refer',
        '/rewards',
        '/rewards/history',
        '/rewards/leaderboard',
        '/rewards/transactions',
        '/rewards/tree',
        '/my-giftcards'
    ];

    for (const page of protectedPages) {
        console.log(`\n🧪 Verify unauthenticated redirect to /login: ${page}`);
        try {
            const res = await fetch(`${APP_URL}${page}`, { redirect: 'manual' });
            const loc = res.headers.get('location') || '';
            const status = res.status;
            
            // Check redirect status code and location header pointing to /login
            if ((status === 307 || status === 308 || status === 302) && loc.includes('/login')) {
                const body = await res.text();
                const bodyLower = body.toLowerCase();
                
                // Assert no page component layout/content leaks in the response body.
                // We define a list of keywords that exist exclusively in the protected page bodies.
                const contentKeywords = [
                    'welcome back', 
                    'recent activity', 
                    'quick services',
                    'gold subscription', 
                    'total savings',
                    'referral code',
                    'aadhaar and pan', 
                    'kyc-popup',
                    'active balance', 
                    'saved items', 
                    'move to cart', 
                    'gift to friend', 
                    'copy card code', 
                    'convert to wallet', 
                    'points earning', 
                    'ranking list', 
                    'fulfill order', 
                    'invoice calculations'
                ];
                
                const leakedKeywords = contentKeywords.filter(kw => bodyLower.includes(kw));
                const hasLeak = leakedKeywords.length > 0;
                
                if (hasLeak) {
                    fail(`Redirect target is /login for ${page} but response body contains potential page content leak (matches: ${leakedKeywords.join(', ')})`);
                } else {
                    pass(`Unauthenticated request to ${page} correctly redirected to /login (status ${status}) with no content leak`);
                }
            } else {
                fail(`Expected redirect to /login for ${page}. Got status ${status}, location ${loc}`);
            }
        } catch (err) {
            fail(`Fetch error for protected page ${page}`, err.message);
        }
    }

    // Create the test user in Auth
    let uid = await getTestUserId();
    if (!uid) {
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            email_confirm: true
        });
        if (authErr) {
            console.error('❌ Failed to create test user:', authErr.message);
            return { passed, failed };
        }
        uid = authUser.user.id;
    }

    // Sign in to get session tokens
    const { data: authSession, error: signInErr } = await supabaseUser.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
    });

    if (signInErr || !authSession.session) {
        console.error('❌ Failed to sign in test user:', signInErr?.message);
        await cleanupData();
        return { passed, failed };
    }

    const customerHeaders = authHeaders(authSession.session, SUPABASE_URL);

    // 3. AUTHENTICATED CUSTOMER -> WRONG ROLE / NO MERCHANT ROW (Verify redirects on /merchant/*)
    
    // Test Case 3a: User has role 'customer' (wrong role)
    console.log(`\n🧪 TC-A-Pages-RoleCustomer: Authenticated customer on /merchant/dashboard redirects to /`);
    await supabaseAdmin.from('user_profiles').upsert({
        id: uid,
        full_name: 'Tester A Pages',
        email: TEST_EMAIL,
        role: 'user'
    });
    // Ensure no merchant row
    await supabaseAdmin.from('merchants').delete().eq('user_id', uid);

    try {
        const res = await fetch(`${APP_URL}/merchant/dashboard`, {
            headers: customerHeaders,
            redirect: 'manual'
        });
        const status = res.status;
        const loc = res.headers.get('location') || '';

        // Should redirect to /
        if ((status === 307 || status === 308 || status === 302) && (loc === '/' || loc.endsWith('/'))) {
            pass('Customer trying to access /merchant/* correctly redirected to /');
        } else {
            fail(`Expected redirect to / for customer on /merchant/*. Got status ${status}, location ${loc}`);
        }
    } catch (err) {
        fail('Fetch error for customer accessing /merchant/*', err.message);
    }

    // Test Case 3b: User has role 'merchant' but NO merchant row (redirects to /merchant-apply)
    console.log(`\n🧪 TC-A-Pages-RoleMerchantNoRow: Authenticated merchant with no DB row on /merchant/dashboard redirects to /merchant-apply`);
    await supabaseAdmin.from('user_profiles').update({ role: 'merchant' }).eq('id', uid);

    try {
        const res = await fetch(`${APP_URL}/merchant/dashboard`, {
            headers: customerHeaders,
            redirect: 'manual'
        });
        const status = res.status;
        const loc = res.headers.get('location') || '';

        if ((status === 307 || status === 308 || status === 302) && loc.includes('/merchant-apply')) {
            pass('Merchant with no DB row accessing /merchant/* correctly redirected to /merchant-apply');
        } else {
            fail(`Expected redirect to /merchant-apply for merchant with no row on /merchant/*. Got status ${status}, location ${loc}`);
        }
    } catch (err) {
        fail('Fetch error for merchant with no DB row accessing /merchant/*', err.message);
    }

    // 4. MERCHANT STATUS REDIRECTS (pending, rejected, suspended)
    const statuses = ['pending', 'rejected', 'suspended'];
    for (const st of statuses) {
        console.log(`\n🧪 TC-A-Pages-MerchantStatus-${st}: Merchant with status ${st} on /merchant/dashboard redirects to /merchant-status/${st}`);
        
        // Upsert merchant row with status
        await supabaseAdmin.from('merchants').upsert({
            user_id: uid,
            business_name: 'Tester Merchant Shop',
            business_email: TEST_EMAIL,
            business_phone: '+919999999999',
            status: st,
            subscription_status: 'active',
            subscription_expires_at: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days active
            wallet_balance_paise: 0,
            slug: `tester-merchant-shop-${st}`,
            pan_verified: false,
            fulfillment_failure_count: 0,
            referral_reward_paid: false
        }, { onConflict: 'user_id' });

        try {
            const res = await fetch(`${APP_URL}/merchant/dashboard`, {
                headers: customerHeaders,
                redirect: 'manual'
            });
            const status = res.status;
            const loc = res.headers.get('location') || '';

            if ((status === 307 || status === 308 || status === 302) && loc.includes(`/merchant-status/${st}`)) {
                pass(`Merchant with status ${st} correctly redirected to /merchant-status/${st}`);
            } else {
                fail(`Expected redirect to /merchant-status/${st}. Got status ${status}, location ${loc}`);
            }
        } catch (err) {
            fail(`Fetch error for merchant with status ${st} accessing /merchant/*`, err.message);
        }
    }
    // 5. SESSION EXPIRY / EXPIRED TOKEN REDIRECT (AUTH-03)
    console.log('\n🧪 TC-A-Pages-ExpiredToken: Expired session token on protected route redirects to /login?returnUrl=...');
    try {
        const expiredSession = {
            access_token: 'expired-access-token-12345',
            refresh_token: 'expired-refresh-token-12345',
            expires_at: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        };
        const expiredHeaders = authHeaders(expiredSession, SUPABASE_URL);

        const res = await fetch(`${APP_URL}/dashboard`, {
            headers: expiredHeaders,
            redirect: 'manual'
        });
        const status = res.status;
        const loc = res.headers.get('location') || '';

        // Check redirect to login with returnUrl
        if ((status === 307 || status === 308 || status === 302) && loc.includes('/login') && (loc.includes('returnUrl=') || loc.includes('redirect='))) {
            const urlObj = new URL(loc, APP_URL);
            const returnUrl = urlObj.searchParams.get('returnUrl') || urlObj.searchParams.get('redirect');
            if (returnUrl === '/dashboard') {
                pass('Expired session token correctly redirected to /login with returnUrl=/dashboard');
            } else {
                fail(`Expected returnUrl=/dashboard, got returnUrl=${returnUrl}`);
            }
        } else {
            fail(`Expected redirect to /login with returnUrl for expired token. Got status ${status}, location ${loc}`);
        }
    } catch (err) {
        fail('Fetch error for expired token redirect', err.message);
    }

    await cleanupData();
    return { passed, failed };
}

if (true) {
    run().then(({ passed, failed }) => {
        console.log(`\n${'─'.repeat(50)}`);
        console.log(`Module Page Route Guards: ${passed} passed, ${failed} failed`);
        process.exit(failed > 0 ? 1 : 0);
    }).catch(console.error);
}

export { run };
