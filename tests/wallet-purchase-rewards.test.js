/**
 * Regression tests — Wallet purchase reward issuance
 *
 * Verifies that:
 *   1. Wallet gift-card checkout credits purchase rewards exactly once.
 *   2. Wallet cart checkout credits purchase rewards exactly once.
 *   3. Rewards are NOT double-credited on retry / re-call.
 *
 * Test framework: Jest + node-fetch (already in devDependencies).
 * Tests are integration-style and run against a Supabase test project.
 * Set env vars NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before
 * running:
 *
 *   npx jest tests/wallet-purchase-rewards.test.js --testTimeout=30000
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Helpers ──────────────────────────────────────────────────────────────────

function adminClient() {
    if (!SUPABASE_URL || !SERVICE_KEY) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    return createClient(SUPABASE_URL, SERVICE_KEY);
}

/** Count reward_transactions rows for a given reference. */
async function countRewards(supabase, referenceId, referenceType) {
    const { count, error } = await supabase
        .from('reward_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('reference_id', referenceId)
        .eq('reference_type', referenceType);

    if (error) throw new Error(`countRewards error: ${error.message}`);
    return count ?? 0;
}

/** Fetch the current wallet balance for a user. */
async function walletBalance(supabase, userId) {
    const { data, error } = await supabase
        .from('customer_wallets')
        .select('balance_paise')
        .eq('user_id', userId)
        .single();
    if (error) throw new Error(`walletBalance error: ${error.message}`);
    return data.balance_paise;
}

/** Create a minimal test user + wallet + KYC record. */
async function seedTestUser(supabase, { balancePaise = 50000 } = {}) {
    // Create auth user
    const { data: { user }, error } = await supabase.auth.admin.createUser({
        email: `test-wallet-rewards-${Date.now()}@example.com`,
        password: 'Test1234!',
        email_confirm: true,
    });
    if (error) throw new Error(`seedTestUser createUser: ${error.message}`);

    // Ensure profile exists with kyc_status = verified
    await supabase.from('user_profiles').upsert({
        id: user.id,
        full_name: 'Rewards Test User',
        kyc_status: 'verified',
        address: '123 Test St, City, State, 110001',
        phone: '+919999000000',
    });

    // Ensure wallet with enough balance
    await supabase.from('customer_wallets').upsert({
        user_id: user.id,
        balance_paise: balancePaise,
    });

    return user;
}

/** Delete the test user and all related rows. */
async function teardownTestUser(supabase, userId) {
    await supabase.auth.admin.deleteUser(userId);
}

// ── Gift-card wallet checkout tests ───────────────────────────────────────

describe('Wallet gift-card checkout — reward issuance', () => {
    let supabase;
    let testUser;
    let couponId;

    beforeAll(async () => {
        supabase = adminClient();
        testUser = await seedTestUser(supabase, { balancePaise: 200_00 }); // ₹200

        // Find or create an 'available' coupon priced at ≤ ₹200
        const { data: availableCoupon } = await supabase
            .from('coupons')
            .select('id, selling_price_paise, face_value_paise')
            .eq('status', 'available')
            .lte('selling_price_paise', 200_00)
            .limit(1)
            .maybeSingle();

        if (availableCoupon) {
            couponId = availableCoupon.id;
        } else {
            // Seed a minimal coupon (requires a valid merchant_id in the test project)
            const { data: merchant } = await supabase
                .from('merchants')
                .select('id')
                .limit(1)
                .single();

            const { data: seeded, error: seedErr } = await supabase
                .from('coupons')
                .insert({
                    merchant_id: merchant.id,
                    status: 'available',
                    selling_price_paise: 100_00, // ₹100
                    face_value_paise: 100_00,
                    title: 'Test Reward Gift Card',
                })
                .select('id')
                .single();

            if (seedErr) throw new Error(`Seed coupon error: ${seedErr.message}`);
            couponId = seeded.id;
        }
    });

    afterAll(async () => {
        await teardownTestUser(supabase, testUser.id);
    });

    it('credits purchase rewards exactly once after wallet gift-card buy', async () => {
        // Pre-condition
        const rewardsBefore = await countRewards(supabase, couponId, 'gift_card_purchase');

        // Exercise the atomic RPC directly (mirrors what the API route does)
        const { data: rpcResult, error: rpcError } = await supabase.rpc('wallet_buy_gift_card', {
            p_user_id: testUser.id,
            p_coupon_id: couponId,
        });

        expect(rpcError).toBeNull();
        expect(rpcResult.success).toBe(true);

        const purchaseAmountPaise = rpcResult.purchase_amount_paise;

        // Distribute rewards (mirrors what the API route does post-commit)
        const { error: rewardError } = await supabase.rpc('calculate_and_distribute_rewards', {
            p_event_type: 'purchase',
            p_source_user_id: testUser.id,
            p_reference_id: couponId,
            p_reference_type: 'gift_card_purchase',
            p_amount_paise: purchaseAmountPaise,
        });

        expect(rewardError).toBeNull();

        // Verify exactly one reward row was added
        const rewardsAfter = await countRewards(supabase, couponId, 'gift_card_purchase');
        expect(rewardsAfter - rewardsBefore).toBe(1);
    });

    it('does NOT double-credit rewards on a second call with the same reference', async () => {
        // The coupon is already 'sold' from the previous test, so the RPC
        // will return success=false.  We just verify that calling the reward
        // RPC a second time with the same reference_id does not add another row
        // (idempotency guard in calculate_and_distribute_rewards).
        const rewardsBefore = await countRewards(supabase, couponId, 'gift_card_purchase');

        await supabase.rpc('calculate_and_distribute_rewards', {
            p_event_type: 'purchase',
            p_source_user_id: testUser.id,
            p_reference_id: couponId,
            p_reference_type: 'gift_card_purchase',
            p_amount_paise: 100_00,
        });

        const rewardsAfter = await countRewards(supabase, couponId, 'gift_card_purchase');
        expect(rewardsAfter).toBe(rewardsBefore); // no new row
    });
});

// ── Wallet cart checkout tests ─────────────────────────────────────────────

describe('Wallet cart checkout — reward issuance', () => {
    let supabase;
    let testUser;
    let groupId;

    beforeAll(async () => {
        supabase = adminClient();
        testUser = await seedTestUser(supabase, { balancePaise: 500_00 }); // ₹500

        // Seed a single platform product into the user's cart
        const { data: product } = await supabase
            .from('shopping_products')
            .select('id, suggested_retail_price_paise')
            .gt('admin_stock', 0)
            .lte('suggested_retail_price_paise', 300_00)
            .limit(1)
            .maybeSingle();

        if (!product) {
            throw new Error('No suitable platform product found for cart checkout test');
        }

        await supabase.from('shopping_cart').insert({
            customer_id: testUser.id,
            product_id: product.id,
            quantity: 1,
            is_platform_item: true,
        });
    });

    afterAll(async () => {
        await teardownTestUser(supabase, testUser.id);
    });

    it('credits purchase rewards exactly once after wallet cart checkout', async () => {
        // Exercise checkout RPC (atomic)
        const { data: checkoutResult, error: checkoutError } = await supabase.rpc(
            'customer_checkout_v4',
            { p_customer_id: testUser.id }
        );

        expect(checkoutError).toBeNull();
        expect(checkoutResult?.success).toBe(true);

        groupId = checkoutResult.group_id;

        const rewardsBefore = await countRewards(supabase, groupId, 'shopping_order');

        // Retrieve total for reward amount (mirrors wallet-checkout route)
        const { data: orderGroup } = await supabase
            .from('shopping_order_groups')
            .select('total_amount_paise')
            .eq('id', groupId)
            .single();

        const { error: rewardError } = await supabase.rpc('calculate_and_distribute_rewards', {
            p_event_type: 'purchase',
            p_source_user_id: testUser.id,
            p_reference_id: groupId,
            p_reference_type: 'shopping_order',
            p_amount_paise: orderGroup.total_amount_paise,
        });

        expect(rewardError).toBeNull();

        const rewardsAfter = await countRewards(supabase, groupId, 'shopping_order');
        expect(rewardsAfter - rewardsBefore).toBe(1);
    });

    it('does NOT double-credit rewards on a second call with the same group_id', async () => {
        const rewardsBefore = await countRewards(supabase, groupId, 'shopping_order');

        await supabase.rpc('calculate_and_distribute_rewards', {
            p_event_type: 'purchase',
            p_source_user_id: testUser.id,
            p_reference_id: groupId,
            p_reference_type: 'shopping_order',
            p_amount_paise: 100_00,
        });

        const rewardsAfter = await countRewards(supabase, groupId, 'shopping_order');
        expect(rewardsAfter).toBe(rewardsBefore); // idempotent — no new row
    });
});

// ── Concurrency regression — wallet top-up during failed gift-card purchase ─

describe('Concurrency — wallet top-up does not get erased during gift-card purchase failure', () => {
    let supabase;
    let testUser;

    beforeAll(async () => {
        supabase = adminClient();
        testUser = await seedTestUser(supabase, { balancePaise: 100_00 }); // ₹100
    });

    afterAll(async () => {
        await teardownTestUser(supabase, testUser.id);
    });

    it('a concurrent top-up during purchase failure is preserved by the atomic RPC', async () => {
        // Attempt to buy a coupon that doesn't exist (forces RPC failure)
        const nonExistentCouponId = '00000000-0000-0000-0000-000000000000';

        // Simulate concurrent top-up: credit ₹50 directly before the (failed) purchase
        const balanceBefore = await walletBalance(supabase, testUser.id);

        const topUpAmount = 50_00;
        await supabase.from('customer_wallets').update({
            balance_paise: balanceBefore + topUpAmount
        }).eq('user_id', testUser.id);

        const balanceAfterTopUp = await walletBalance(supabase, testUser.id);
        expect(balanceAfterTopUp).toBe(balanceBefore + topUpAmount);

        // Now attempt the failing purchase (coupon not found)
        const { data: rpcResult } = await supabase.rpc('wallet_buy_gift_card', {
            p_user_id: testUser.id,
            p_coupon_id: nonExistentCouponId,
        });

        // RPC returns success=false; the DB transaction was rolled back entirely
        expect(rpcResult.success).toBe(false);

        // CRITICAL: the concurrent top-up must still be intact
        const balanceAfterFailure = await walletBalance(supabase, testUser.id);
        expect(balanceAfterFailure).toBe(balanceAfterTopUp);
    });
});
