import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const correlationId = crypto.randomUUID();
    let userId;

    try {
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
        userId = user.id;

        const reqBody = await request.json();
        const { 
            cardHolderName, 
            phone, 
            deliveryAddress, 
            salePricePaise, 
            paymentMethod = 'online',
            companyName,
            position
        } = reqBody;

        if (!cardHolderName || !phone || !deliveryAddress || !salePricePaise) {
            return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 });
        }

        // 1. Handle Wallet Payment Logic
        if (paymentMethod === 'wallet') {
            // Fetch User Profile for KYC check + role detection
            const { data: userProfile } = await supabaseAdmin
                .from('user_profiles')
                .select('kyc_status, role')
                .eq('id', userId)
                .single();

            if (userProfile?.kyc_status !== 'verified') {
                return NextResponse.json({ error: 'KYC Verification is required to pay via wallet.' }, { status: 403 });
            }

            const isMerchant = userProfile?.role === 'merchant';
            let walletId, walletBalancePaise, walletTable, walletIdField, balanceField;

            if (isMerchant) {
                // Merchant wallet lives in `merchants` table
                const { data: merchant, error: mErr } = await supabaseAdmin
                    .from('merchants')
                    .select('id, wallet_balance_paise')
                    .eq('user_id', userId)
                    .single();

                if (mErr || !merchant) {
                    return NextResponse.json({ error: 'Merchant wallet not found' }, { status: 404 });
                }
                walletId = merchant.id;
                walletBalancePaise = merchant.wallet_balance_paise || 0;
                walletTable = 'merchants';
                walletIdField = 'id';
                balanceField = 'wallet_balance_paise';
            } else {
                // Customer wallet lives in `customer_wallets` table
                const { data: wallet, error: walletError } = await supabaseAdmin
                    .from('customer_wallets')
                    .select('id, balance_paise')
                    .eq('user_id', userId)
                    .single();

                if (walletError || !wallet) {
                    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
                }
                walletId = wallet.id;
                walletBalancePaise = wallet.balance_paise || 0;
                walletTable = 'customer_wallets';
                walletIdField = 'id';
                balanceField = 'balance_paise';
            }

            if (walletBalancePaise < salePricePaise) {
                return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
            }

            // A. Deduct Balance
            const newBalancePaise = walletBalancePaise - salePricePaise;
            const { error: deductError } = await supabaseAdmin
                .from(walletTable)
                .update({ [balanceField]: newBalancePaise })
                .eq(walletIdField, walletId)
                .eq(balanceField, walletBalancePaise); // Optimistic locking

            if (deductError) {
                return NextResponse.json({ error: 'Failed to deduct wallet balance. Please try again.' }, { status: 409 });
            }

            // B. Create Order (Status: paid)
            const { data: order, error: orderError } = await supabaseAdmin
                .from('nfc_orders')
                .insert({
                    user_id: userId,
                    card_holder_name: cardHolderName,
                    phone: phone,
                    delivery_address: deliveryAddress,
                    sale_price_paise: salePricePaise,
                    payment_status: 'paid',
                    payment_method: 'wallet',
                    status: 'pending'
                })
                .select()
                .single();

            if (orderError) {
                // Rollback wallet
                await supabaseAdmin.from(walletTable).update({ [balanceField]: walletBalancePaise }).eq(walletIdField, walletId);
                return NextResponse.json({ error: 'Failed to create order record' }, { status: 500 });
            }

            // C. Create Transaction Record
            if (!isMerchant) {
                // Customer wallet transaction
                await supabaseAdmin.from('customer_wallet_transactions').insert({
                    wallet_id: walletId,
                    user_id: userId,
                    type: 'DEBIT',
                    amount_paise: salePricePaise,
                    balance_before_paise: walletBalancePaise,
                    balance_after_paise: newBalancePaise,
                    description: `Purchase: InTrust Premium NFC Card`,
                    reference_id: order.id,
                    reference_type: 'NFC_ORDER'
                });
            } else {
                // Merchant transaction — log to merchant_transactions (no FK conflict)
                const { error: txError } = await supabaseAdmin.from('merchant_transactions').insert({
                    merchant_id: walletId,
                    transaction_type: 'purchase',
                    amount_paise: -salePricePaise,
                    balance_after_paise: newBalancePaise,
                    description: `NFC Card Purchase (Order: ${order.id})`
                });

                if (txError) {
                    console.error('[NFC] Error inserting merchant transaction:', txError);
                    // Rollback if transaction insert fails
                    await supabaseAdmin.from(walletTable).update({ [balanceField]: walletBalancePaise }).eq(walletIdField, walletId);
                    await supabaseAdmin.from('nfc_orders').delete().eq('id', order.id);
                    return NextResponse.json({ error: 'Failed to log transaction' }, { status: 500 });
                }
            }

            return NextResponse.json({ success: true, orderId: order.id, message: 'Order placed successfully using wallet balance' });
        } 
        
        // 2. Handle Online Payment Logic (Initialization)
        else {
            // Simply create a pending order record
            const { data: order, error: orderError } = await supabaseAdmin
                .from('nfc_orders')
                .insert({
                    user_id: userId,
                    card_holder_name: cardHolderName,
                    phone: phone,
                    delivery_address: deliveryAddress,
                    sale_price_paise: salePricePaise,
                    payment_status: 'pending',
                    payment_method: 'online',
                    status: 'pending'
                })
                .select()
                .single();

            if (orderError) {
                return NextResponse.json({ error: 'Failed to initialize online order' }, { status: 500 });
            }

            // Return order info for client-side gateway trigger if needed
            return NextResponse.json({ 
                success: true, 
                orderId: order.id, 
                message: 'Order initialized. Please complete online payment.',
                gatewayRequired: true 
            });
        }

    } catch (error) {
        console.error('NFC Order Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
