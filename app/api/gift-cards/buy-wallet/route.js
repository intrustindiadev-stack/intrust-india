import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        // Setup admin client to bypass RLS for wallet deductions and coupon updates securely
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid token or user not found' }, { status: 401 });
        }

        const { couponId } = await request.json();

        if (!couponId) {
            return NextResponse.json({ error: 'Missing couponId' }, { status: 400 });
        }

        // 1. Fetch coupon details
        const { data: coupon, error: couponError } = await supabaseAdmin
            .from('coupons')
            .select('*')
            .eq('id', couponId)
            .single();

        if (couponError || !coupon) {
            return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
        }

        if (coupon.status !== 'available') {
            return NextResponse.json({ error: 'Gift card is no longer available' }, { status: 400 });
        }

        const purchaseAmount = parseFloat(coupon.sellingPrice || coupon.value);

        // 2. Fetch User Wallet
        const { data: wallet, error: walletError } = await supabaseAdmin
            .from('customer_wallets')
            .select('id, balance_paise')
            .eq('user_id', user.id)
            .single();

        if (walletError || !wallet) {
            return NextResponse.json({ error: 'Wallet not found for this user' }, { status: 404 });
        }

        const purchaseAmountPaise = Math.round(purchaseAmount * 100);

        if (wallet.balance_paise < purchaseAmountPaise) {
            return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
        }

        // 3. Deduct Balance
        const newBalancePaise = wallet.balance_paise - purchaseAmountPaise;
        const { error: deductError } = await supabaseAdmin
            .from('customer_wallets')
            .update({ balance_paise: newBalancePaise })
            .eq('id', wallet.id)
            .eq('balance_paise', wallet.balance_paise); // Optimistic locking

        if (deductError) {
            return NextResponse.json({ error: 'Failed to deduct wallet balance. Please try again.' }, { status: 500 });
        }

        // 4. Mark Coupon as Sold & Assign to User
        const { error: updateCouponError } = await supabaseAdmin
            .from('coupons')
            .update({
                status: 'sold',
                purchased_by: user.id,
                purchased_at: new Date().toISOString()
            })
            .eq('id', couponId);

        if (updateCouponError) {
            // Rollback wallet deduction conceptually, but for simplicity here we assume it succeeds.
            console.error('Failed to update coupon status:', updateCouponError);
            // Ideally we'd refund the wallet here if this fails.
            await supabaseAdmin.from('customer_wallets').update({ balance_paise: wallet.balance_paise }).eq('id', wallet.id);
            return NextResponse.json({ error: 'Failed to issue gift card' }, { status: 500 });
        }

        // 5. Create transaction record (Optional but good for history)
        await supabaseAdmin.from('transactions').insert({
            user_id: user.id,
            amount: purchaseAmount,
            type: 'debit',
            status: 'success',
            description: `Purchased Gift Card: ${coupon.title || 'Gift Card'}`,
            reference_id: couponId
        }).catch(err => console.error("Could not insert transaction history:", err));

        return NextResponse.json({ success: true, message: 'Gift card purchased successfully', newBalance });

    } catch (error) {
        console.error('Wallet Purchase API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
