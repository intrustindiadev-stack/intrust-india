import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { userId, couponId } = await request.json();

        if (!userId || !couponId) {
            return NextResponse.json({ error: 'Missing userId or couponId' }, { status: 400 });
        }

        // 1. Verify user role is merchant or admin
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (profileError || !['merchant', 'admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // 2. Get merchant record
        // For admin, we might need to handle differently or mock
        // But the requirement says "Merchant Purchase", so we assume a merchant record exists 
        // or we are simulating for a merchant.
        // If admin is "buying", they are acting as a merchant? 
        // Or if admin, maybe we just don't set merchant_id if they don't have one? 
        // But the goal is to TEST the flow.

        let merchantId = null;
        if (profile.role === 'merchant') {
            const { data: merchant, error: merchantError } = await supabase
                .from('merchants')
                .select('id, wallet_balance_paise')
                .eq('user_id', userId)
                .single();

            if (merchantError || !merchant) {
                return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 });
            }
            merchantId = merchant.id;

            // TODO: check balance and deduct? 
            // The requirement didn't explicitly ask for wallet logic in backend for this step, 
            // but implied "Merchant Purchase".
            // Step 3 says: "Update coupon: merchant_id = merchant.id".
            // It doesn't explicitly mention wallet deduction in backend instructions, 
            // but Step 4 in previous prompt mentioned "Buy button... show success message".
            // I will stick to assigning ownership for now to satisfy the "Inventory ownership" requirement.
        }

        // 3. Update coupon
        const { error: updateError } = await supabase
            .from('coupons')
            .update({
                merchant_id: merchantId, // Will be null for admin acting as admin without merchant profile
                purchased_by_merchant_at: new Date().toISOString()
            })
            .eq('id', couponId)
            .eq('merchant_id', null) // Ensure it wasn't already bought
            .select();

        if (updateError) {
            return NextResponse.json({ error: 'Failed to purchase coupon. It might be unavailable.' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Coupon purchased successfully' });

    } catch (error) {
        console.error('Purchase API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
