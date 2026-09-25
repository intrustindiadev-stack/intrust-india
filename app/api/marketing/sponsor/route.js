import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';

export async function POST(req) {
    try {
        const userClient = await createServerSupabaseClient();
        const {
            data: { user },
            error: authError
        } = await userClient.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { sponsorDate, productIds = [], campaignMessage = '', paymentMethod = 'wallet', clientTxnId } = body;

        if (!sponsorDate) {
            return NextResponse.json({ success: false, error: 'Sponsor date is required' }, { status: 400 });
        }

        const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        if (sponsorDate <= todayIST) {
            return NextResponse.json({ 
                success: false, 
                error: 'Sponsorship date must be in the future. Slots roll over at 12:00 AM IST midnight.' 
            }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // 1. Verify date availability
        const { data: existing } = await adminClient
            .from('daily_challenge_sponsorships')
            .select('id, status')
            .eq('sponsor_date', sponsorDate)
            .in('status', ['live', 'booked', 'confirmed'])
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ success: false, error: 'This date is already sponsored. Please choose another date.' }, { status: 400 });
        }

        // 2. Resolve Dynamic Fee from marketing_settings
        let baseFeePaise = 99900;
        try {
            const { data: settingsRow } = await adminClient
                .from('marketing_settings')
                .select('value')
                .eq('key', 'rewards_config')
                .maybeSingle();
            if (settingsRow?.value?.sponsorship_fee_paise) {
                baseFeePaise = Number(settingsRow.value.sponsorship_fee_paise);
            }
        } catch (e) {}

        const cgstPaise = Math.round(baseFeePaise * 0.09);
        const sgstPaise = Math.round(baseFeePaise * 0.09);
        const totalWithGstPaise = baseFeePaise + cgstPaise + sgstPaise;

        // 3. Resolve Merchant Profile (Strict Ownership Check)
        let merchantRow = null;
        if (body.merchantId) {
            const { data: mById } = await adminClient
                .from('merchants')
                .select('id, user_id, business_name, store_name, wallet_balance_paise, status, subscription_status, subscription_expires_at')
                .eq('id', body.merchantId)
                .eq('user_id', user.id)
                .maybeSingle();
            merchantRow = mById;
        }

        if (!merchantRow) {
            const { data: mByUser } = await adminClient
                .from('merchants')
                .select('id, user_id, business_name, store_name, wallet_balance_paise, status, subscription_status, subscription_expires_at')
                .eq('user_id', user.id)
                .maybeSingle();
            merchantRow = mByUser;
        }

        if (!merchantRow) {
            return NextResponse.json({ success: false, error: 'Unauthorized: You do not own a verified merchant account' }, { status: 403 });
        }

        // 4. Resolve Products Information — product_ids are merchant_inventory.id values
        let validProductIds = [];
        if (Array.isArray(productIds) && productIds.length > 0) {
            // Verify these IDs exist in merchant_inventory for this merchant
            const { data: invProds } = await adminClient
                .from('merchant_inventory')
                .select('id')
                .eq('merchant_id', merchantRow.id)
                .in('id', productIds);

            if (invProds && invProds.length > 0) {
                validProductIds = invProds.map(p => p.id);
            } else {
                // Fallback: try shopping_products
                const { data: shopProds } = await adminClient
                    .from('shopping_products')
                    .select('id')
                    .in('id', productIds);
                validProductIds = (shopProds || []).map(p => p.id);
            }
        }

        let bookingId = null;
        let newBalancePaise = Number(merchantRow.wallet_balance_paise || 0);

        // 5. Handle InTrust Wallet Booking via Hardened RPC
        if (paymentMethod === 'wallet') {
            const { data: rpcRes, error: rpcErr } = await adminClient.rpc('book_daily_challenge_sponsorship', {
                p_sponsor_date: sponsorDate,
                p_product_ids: validProductIds,
                p_campaign_message: campaignMessage?.trim() || '',
                p_payment_method: 'wallet',
                p_client_txn_id: null,
                p_merchant_id: merchantRow.id,
                p_user_id: user.id
            });

            if (rpcErr || !rpcRes?.success) {
                return NextResponse.json({ 
                    success: false, 
                    error: rpcErr?.message || rpcRes?.message || 'Failed to book sponsorship via wallet' 
                }, { status: 400 });
            }

            bookingId = rpcRes.booking_id;
            newBalancePaise = rpcRes.new_balance_paise;
        } else if (paymentMethod === 'sabpaisa') {
            // 6. Handle SabPaisa Payment: Verify Transaction Gateway Success
            const clientTxnId = body.clientTxnId;
            if (!clientTxnId || typeof clientTxnId !== 'string') {
                return NextResponse.json({ 
                    success: false, 
                    error: 'A valid transaction reference (clientTxnId) is required for gateway booking' 
                }, { status: 400 });
            }

            const { data: txn, error: txnErr } = await adminClient
                .from('transactions')
                .select('id, client_txn_id, status, user_id, amount, expected_amount_paise, udf1, udf2')
                .eq('client_txn_id', clientTxnId)
                .eq('user_id', user.id)
                .eq('udf1', 'DAILY_CHALLENGE_SPONSORSHIP')
                .maybeSingle();

            if (txnErr || !txn) {
                return NextResponse.json({ 
                    success: false, 
                    error: 'Payment transaction record not found or does not belong to your account' 
                }, { status: 404 });
            }

            if (txn.status !== 'gateway_success') {
                return NextResponse.json({ 
                    success: false, 
                    error: `Payment is not confirmed (gateway status: ${txn.status}). Cannot register sponsorship.` 
                }, { status: 400 });
            }

            // Insert confirmed booking record
            const { data: bookingRecord, error: bookErr } = await adminClient
                .from('daily_challenge_sponsorships')
                .insert({
                    merchant_id: merchantRow.id,
                    sponsor_date: sponsorDate,
                    product_ids: validProductIds,
                    campaign_message: campaignMessage?.trim() || '',
                    fee_paise: totalWithGstPaise,
                    status: 'booked'
                })
                .select('id')
                .single();

            if (bookErr) {
                if (bookErr.code === '23505') {
                    return NextResponse.json({ 
                        success: false, 
                        error: 'This date has already been booked by another merchant. Please contact support.' 
                    }, { status: 409 });
                }
                console.error('Error inserting sponsorship booking:', bookErr);
                return NextResponse.json({ success: false, error: bookErr.message || 'Failed to persist sponsorship booking' }, { status: 500 });
            }

            bookingId = bookingRecord.id;

            // Record transaction ledger entry
            try {
                await adminClient.from('merchant_transactions').insert({
                    merchant_id: merchantRow.id,
                    transaction_type: 'sponsorship',
                    amount_paise: totalWithGstPaise,
                    balance_after_paise: newBalancePaise,
                    description: `Daily Challenge Sponsorship for ${sponsorDate} via SabPaisa`,
                    metadata: {
                        booking_id: bookingId,
                        sponsor_date: sponsorDate,
                        client_txn_id: clientTxnId,
                        payment_method: 'sabpaisa'
                    }
                });
            } catch (mTxErr) {
                console.warn('Could not write merchant_transactions for gateway sponsorship:', mTxErr);
            }
        } else {
            return NextResponse.json({ success: false, error: 'Invalid payment method' }, { status: 400 });
        }

        const invoiceNumber = `INV-MKT-${sponsorDate.replace(/-/g, '')}-${bookingId.slice(0, 6).toUpperCase()}`;

        const invoice = {
            invoiceNumber,
            invoiceDate: new Date().toISOString(),
            serviceDate: sponsorDate,
            sacCode: '998365',
            serviceDescription: 'Daily Trivia Challenge Prime Placement & Catalog Showcase (24 Hours)',
            merchantName: merchantRow.business_name || merchantRow.store_name || 'Verified Merchant',
            baseFeePaise,
            cgstPaise,
            sgstPaise,
            totalWithGstPaise,
            baseFeeRupees: baseFeePaise / 100,
            cgstRupees: cgstPaise / 100,
            sgstRupees: sgstPaise / 100,
            totalRupees: totalWithGstPaise / 100,
            paymentMethod,
            status: 'PAID'
        };

        return NextResponse.json({
            success: true,
            bookingId,
            feePaidPaise: baseFeePaise,
            totalPaidPaise: totalWithGstPaise,
            newBalancePaise,
            sponsorDate,
            merchantName: merchantRow.business_name || merchantRow.store_name,
            invoice
        });
    } catch (err) {
        console.error('Error booking sponsorship:', err);
        return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
    }
}
