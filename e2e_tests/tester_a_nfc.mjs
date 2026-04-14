import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'tester_a@intrustindia.com';
const TEST_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'SecurePass123!';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let passed = 0; let failed = 0;
function pass(msg) { console.log(`  ✅ PASS: ${msg}`); passed++; }
function fail(msg, detail) { console.error(`  ❌ FAIL: ${msg}`, detail || ''); failed++; }

async function getTestUserId() {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    return users?.users?.find(u => u.email === TEST_EMAIL)?.id;
}

async function cleanupData() {
    const uid = await getTestUserId();
    if (uid) {
        await supabaseAdmin.from('nfc_orders').delete().eq('user_id', uid);
    }
}

async function run() {
    console.log('\n--- Running TEST MODULE 5: NFC Card Service ---');
    let uid = await getTestUserId();
    if (!uid) {
         await supabaseAdmin.auth.admin.createUser({ email: TEST_EMAIL, password: TEST_PASSWORD, email_confirm: true });
         uid = await getTestUserId();
    }
    await cleanupData();
    const { data: authData } = await supabaseUser.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const authHeader = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authData.session.access_token}` };

    // TC-A-052: GET /api/nfc/orders
    console.log(`\n🧪 TC-A-052: GET /api/nfc/orders validity`);
    let res52 = await fetch(`${APP_URL}/api/nfc/orders`, { headers: authHeader });
    if (res52.status === 200) {
        const json52 = await res52.json();
        if (Array.isArray(json52.orders)) pass('Successfully fetched NFC orders array via API');
        else fail('API response did not contain orders array');
    } else fail(`Endpoint failed with status ${res52.status}`);

    // TC-A-053: POST /api/nfc/order
    console.log(`\n🧪 TC-A-053: POST /api/nfc/order creates row`);
    // Ensure KYC is verified and role is 'customer'
    await supabaseAdmin.from('user_profiles').update({ kyc_status: 'verified', role: 'customer' }).eq('id', uid);
    // Ensure customer wallet exists with balance
    await supabaseAdmin.from('customer_wallets').upsert({ user_id: uid, balance_paise: 100000 }, { onConflict: 'user_id' });
    
    let res53 = await fetch(`${APP_URL}/api/nfc/order`, { 
        method: 'POST', 
        headers: authHeader,
        body: JSON.stringify({
            cardHolderName: 'Tester A',
            phone: '9999999999',
            deliveryAddress: '123 Test St',
            salePricePaise: 49900,
            paymentMethod: 'wallet',
            companyName: 'Tester Co',
            position: 'QA'
        })
    });
    
    if (res53.status === 200) {
        pass('NFC Order created through API via wallet payment');
    } else {
        const err53 = await res53.json().catch(() => ({}));
        fail(`NFC Order creation failed with status ${res53.status}`, err53.error);
    }

    // TC-A-056: GET /api/nfc/orders verification of list
    console.log(`\n🧪 TC-A-056: Returns array of nfc_orders for test user`);
    let res56 = await fetch(`${APP_URL}/api/nfc/orders`, { headers: authHeader });
    const json56 = await res56.json().catch(() => ({}));
    if (json56.orders && json56.orders.length > 0) {
        pass(`API returned ${json56.orders.length} nfc orders`);
    } else fail('No nfc orders returned in API list after creation');

    await cleanupData();
    return { passed, failed };
}

if (true) {
    run().then(({ passed, failed }) => {
        console.log(`\n${'─'.repeat(50)}`);
        console.log(`Module NFC: ${passed} passed, ${failed} failed`);
        process.exit(failed > 0 ? 1 : 0);
    }).catch(console.error);
}

export { run };
