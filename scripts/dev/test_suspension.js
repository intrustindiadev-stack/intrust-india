const { createClient } = require('@supabase/supabase-js');






const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const API_BASE = 'http://localhost:3000';

async function runTests() {
    console.log("Starting Suspension Tests...\n");
    const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const testEmail = `test_suspension_${Date.now()}@example.com`;
    const password = 'Password123!';

    // Create a test user directly via Admin API
    const { data: userRecord, error: createErr } = await adminSupabase.auth.admin.createUser({
        email: testEmail,
        password: password,
        email_confirm: true,
        user_metadata: { role: 'employee' }
    });

    if (createErr) {
        console.error("Failed to create test user:", createErr.message);
        return;
    }
    const userId = userRecord.user.id;
    console.log(`Created test user: ${userId}`);

    // Add profile
    await adminSupabase.from('user_profiles').update({
        role: 'employee',
        first_name: 'Test',
        last_name: 'Suspension'
    }).eq('id', userId);

    // Login to get JWT
    const authSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        auth: { persistSession: false }
    });
    
    const { data: loginData, error: loginErr } = await authSupabase.auth.signInWithPassword({
        email: testEmail,
        password: password
    });

    if (loginErr) {
        console.error("Failed to login test user:", loginErr.message);
        return;
    }
    const token = loginData.session.access_token;
    console.log("TEST 1 (Active employee): Logged in successfully. Token obtained.");

    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1].split('.')[0];
    const cookieString = `sb-${projectRef}-auth-token=${encodeURIComponent(JSON.stringify({ access_token: token, refresh_token: loginData.session.refresh_token }))}`;

    // Make API request to a bypass route to test normal access
    const resActive = await fetch(`${API_BASE}/api/employee/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`TEST 1 (API Access): Expected 200, Got ${resActive.status}`);
    if (resActive.status === 200) console.log("✅ PASS"); else console.log("❌ FAIL");

    // Suspend the user using our updated admin API
    console.log("\nSuspending user...");
    
    // We need an admin token to call the suspend API.
    // Let's create a temporary admin user.
    const adminEmail = `admin_${Date.now()}@example.com`;
    const { data: adminRecord } = await adminSupabase.auth.admin.createUser({
        email: adminEmail, password: password, email_confirm: true, user_metadata: { role: 'super_admin' }
    });
    const { error: adminUpdateErr } = await adminSupabase.from('user_profiles').update({
        role: 'super_admin'
    }).eq('id', adminRecord.user.id);
    if (adminUpdateErr) console.error("Failed to make admin:", adminUpdateErr.message);
    const { data: adminLogin } = await authSupabase.auth.signInWithPassword({ email: adminEmail, password });
    const adminToken = adminLogin.session.access_token;

    const resSuspend = await fetch(`${API_BASE}/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Testing suspension mechanism' })
    });
    console.log(`Suspension API returned: ${resSuspend.status}`);

    // TEST 5 & 8: Active sessions invalidated / Direct API calls fail
    console.log("\nTEST 5 & 8 (Suspended employee uses existing token on bypass route)");
    const resSuspended = await fetch(`${API_BASE}/api/employee/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`Expected 401/403, Got ${resSuspended.status}`);
    if (resSuspended.status === 401 || resSuspended.status === 403) console.log("✅ PASS"); else console.log("❌ FAIL");

    // TEST 2: Suspended employee - email login
    console.log("\nTEST 2 (Suspended employee - email login)");
    const { error: reloginErr } = await authSupabase.auth.signInWithPassword({
        email: testEmail, password: password
    });
    console.log(`Expected login failure due to ban.`);
    if (reloginErr) {
        console.log(`Login Error: ${reloginErr.message}`);
        console.log("✅ PASS");
    } else {
        console.log("❌ FAIL");
    }

    // TEST 10: Unsuspend employee
    console.log("\nTEST 10 (Unsuspend employee)");
    const resUnsuspend = await fetch(`${API_BASE}/api/admin/users/${userId}/unsuspend`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
        }
    });
    const unsuspendData = await resUnsuspend.text();
    console.log(`Unsuspend API returned: ${resUnsuspend.status} - ${unsuspendData}`);
    
    // Check if access is restored
    // Must login again because the old token might be expired or we just need a new one
    const { data: restoreLogin, error: restoreErr } = await authSupabase.auth.signInWithPassword({
        email: testEmail, password: password
    });
    if (!restoreErr) {
         console.log("✅ PASS - Re-login successful");
         
         const restoreToken = restoreLogin.session.access_token;
         const resRestored = await fetch(`${API_BASE}/api/employee/notifications`, {
             headers: { 'Authorization': `Bearer ${restoreToken}` }
         });
         console.log(`Expected 200 on API, Got ${resRestored.status}`);
         if (resRestored.status === 200) console.log("✅ PASS - API access restored"); else console.log("❌ FAIL - API access still blocked");
    } else {
         console.log("❌ FAIL - Re-login failed", restoreErr.message);
    }

    // Cleanup
    await adminSupabase.auth.admin.deleteUser(userId);
    await adminSupabase.auth.admin.deleteUser(adminRecord.user.id);
    console.log("\nTests complete and users cleaned up.");
}

runTests();
