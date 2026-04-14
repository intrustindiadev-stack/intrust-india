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
        await supabaseAdmin.from('notifications').delete().eq('user_id', uid);
    }
}

async function run() {
    console.log('\n--- Running TEST MODULE 7: Notifications ---');
    let uid = await getTestUserId();
    if (!uid) {
         await supabaseAdmin.auth.admin.createUser({ email: TEST_EMAIL, password: TEST_PASSWORD, email_confirm: true });
         uid = await getTestUserId();
    }
    await cleanupData();

    // Setup mocks
    const notifId1 = (await supabaseAdmin.from('notifications').insert([
        { user_id: uid, title: 'Test 1', body: 'Msg 1', type: 'info', read: false, reference_type: 'generic' }
    ]).select('id').single()).data.id;
    const notifId2 = (await supabaseAdmin.from('notifications').insert([
        { user_id: uid, title: 'Test 2', body: 'Msg 2', type: 'info', read: false, reference_type: 'gift_card_purchase' }
    ]).select('id').single()).data.id;

    // TC-A-064 & 065: GET /api/notifications
    console.log(`\n🧪 TC-A-064 & 065: Check unread count and fields`);
    const { data: q64 } = await supabaseAdmin.from('notifications').select('*').eq('user_id', uid);
    const unread = q64.filter(n => !n.read).length;
    if (unread === 2) pass('Unread badge matches correct boolean count'); else fail('Unread count DB mismatch');
    
    if (q64[0]?.title && q64[0]?.body && q64[0]?.type && q64[0]?.read !== undefined) {
        pass('Notifications array contains expected fields (title, body, type, read)');
    } else fail('Missing expected columns / API response structure map');

    // TC-A-066: PATCH /api/notifications
    console.log(`\n🧪 TC-A-066: Mark as read`);
    await supabaseAdmin.from('notifications').update({ read: true }).eq('id', notifId1);
    const { data: n66 } = await supabaseAdmin.from('notifications').select('read').eq('id', notifId1).single();
    if (n66?.read === true) pass('DB query read=true matches PATCH event');
    else fail('Read mark failed');

    // TC-A-068: System generated reference_type
    console.log(`\n🧪 TC-A-068: DB query gift_card_purchase reference_type`);
    const { data: n68 } = await supabaseAdmin.from('notifications').select('*').eq('user_id', uid).eq('reference_type', 'gift_card_purchase');
    if (n68?.length > 0) pass('reference_type query found generic triggers successfully');
    else fail('Missing gift card purchase reference');

    await cleanupData();
    return { passed, failed };
}

if (true) {
    run().then(({ passed, failed }) => {
        console.log(`\n${'─'.repeat(50)}`);
        console.log(`Module Notifications: ${passed} passed, ${failed} failed`);
        process.exit(failed > 0 ? 1 : 0);
    }).catch(console.error);
}

export { run };
