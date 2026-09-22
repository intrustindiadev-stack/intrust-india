/**
 * teardown_helper.mjs
 *
 * Helper to clean up test users and all their dependent database entities
 * (orders, order items, coupons, merchants, leads, wallets, rewards, auth tokens, profiles)
 * after test runs so that test accounts do not linger in the database.
 *
 * Explicitly guards and protects the designated HR test account (e2e.hr2@intrust-test.com).
 */

export async function teardownTestAccount(supabaseAdmin, { userId, email } = {}) {
    if (!userId && !email) return;

    let uid = userId;
    if (!uid && email) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        uid = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())?.id;
    }
    if (!uid) return;

    // Strict safety guard: NEVER delete HR test account or production users
    if (uid === 'e6188dcf-3241-4ab8-8c18-59510d876586' || email === 'e2e.hr2@intrust-test.com') {
        console.warn('⚠️ Safety guard: Preserving HR test account e2e.hr2@intrust-test.com');
        return;
    }

    try {
        // 1. Orders, Cart, Shopping Order Items
        const { data: groups } = await supabaseAdmin.from('shopping_order_groups').select('id').eq('customer_id', uid);
        if (groups && groups.length > 0) {
            const gids = groups.map(g => g.id);
            await supabaseAdmin.from('shopping_order_items').delete().in('group_id', gids);
            await supabaseAdmin.from('shopping_order_groups').delete().in('id', gids);
        }
        await supabaseAdmin.from('orders').delete().eq('user_id', uid);
        await supabaseAdmin.from('shopping_cart').delete().eq('customer_id', uid);
        await supabaseAdmin.from('nfc_orders').delete().eq('user_id', uid);
        await supabaseAdmin.from('notifications').delete().eq('user_id', uid);
        await supabaseAdmin.from('udhari_requests').delete().eq('customer_id', uid);

        // 2. Merchants & merchant inventory if test user created a merchant
        const { data: testMerchants } = await supabaseAdmin.from('merchants').select('id').eq('user_id', uid);
        if (testMerchants && testMerchants.length > 0) {
            const mIds = testMerchants.map(m => m.id);
            await supabaseAdmin.from('shopping_order_items').delete().in('seller_id', mIds);
            await supabaseAdmin.from('merchant_inventory').delete().in('merchant_id', mIds);
            await supabaseAdmin.from('coupons').delete().in('merchant_id', mIds);
            await supabaseAdmin.from('orders').delete().in('merchant_id', mIds);
            await supabaseAdmin.from('merchants').delete().in('id', mIds);
        }

        // 3. Coupons
        await supabaseAdmin.from('coupons').delete().eq('purchased_by', uid);

        // 4. Rewards
        await supabaseAdmin.from('reward_distribution_log').delete().eq('source_user_id', uid);
        await supabaseAdmin.from('reward_transactions').delete().or(`user_id.eq.${uid},source_user_id.eq.${uid}`);
        await supabaseAdmin.from('reward_points_balance').delete().eq('user_id', uid);
        await supabaseAdmin.from('reward_daily_caps').delete().eq('user_id', uid);

        // 5. Wallets & Transactions
        await supabaseAdmin.from('customer_wallet_transactions').delete().eq('user_id', uid);
        await supabaseAdmin.from('customer_wallets').delete().eq('user_id', uid);
        await supabaseAdmin.from('transactions').delete().eq('user_id', uid);

        // 6. CRM Leads & Routing logs
        const { data: userLeads } = await supabaseAdmin.from('crm_leads').select('id').or(`created_by.eq.${uid},assigned_to.eq.${uid}`);
        if (userLeads && userLeads.length > 0) {
            const leadIds = userLeads.map(l => l.id);
            await supabaseAdmin.from('crm_lead_routing_log').delete().in('lead_id', leadIds);
            await supabaseAdmin.from('crm_leads').delete().in('id', leadIds);
        }

        // 7. KYC Records
        await supabaseAdmin.from('kyc_records').delete().eq('user_id', uid);

        // 8. Auth tokens & OTPs
        if (email) {
            await supabaseAdmin.from('auth_tokens').delete().eq('email', email);
        }

        // 9. User profile
        await supabaseAdmin.from('user_profiles').delete().eq('id', uid);

        // 10. Auth user
        await supabaseAdmin.auth.admin.deleteUser(uid);
    } catch (err) {
        console.error(`teardownTestAccount failed for ${uid}:`, err?.message || err);
    }
}
