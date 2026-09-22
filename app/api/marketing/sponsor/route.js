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

        // 3. Resolve Merchant Profile
        let merchantRow = null;
        if (body.merchantId) {
            const { data: mById } = await adminClient
                .from('merchants')
                .select('id, business_name, store_name, wallet_balance_paise')
                .eq('id', body.merchantId)
                .maybeSingle();
            merchantRow = mById;
        }

        if (!merchantRow) {
            const { data: mByUser } = await adminClient
                .from('merchants')
                .select('id, business_name, store_name, wallet_balance_paise')
                .eq('user_id', user.id)
                .maybeSingle();
            merchantRow = mByUser;
        }

        if (!merchantRow) {
            // Fallback for admin or merchant profile
            const { data: fallbackM } = await adminClient
                .from('merchants')
                .select('id, business_name, store_name, wallet_balance_paise')
                .limit(1)
                .maybeSingle();
            merchantRow = fallbackM;
        }

        if (!merchantRow) {
            return NextResponse.json({ success: false, error: 'Merchant profile not found or unauthorized' }, { status: 400 });
        }

        // 4. Resolve Products Information
        let cleanProducts = [];
        if (Array.isArray(productIds) && productIds.length > 0) {
            const { data: prods } = await adminClient
                .from('shopping_products')
                .select('id, title, slug, product_images, suggested_retail_price_paise, selling_price_paise')
                .in('id', productIds);

            cleanProducts = (prods || []).map(p => ({
                id: p.id,
                product_name: p.title,
                price: Math.round((p.selling_price_paise || p.suggested_retail_price_paise || 24900) / 100),
                image_url: (Array.isArray(p.product_images) && p.product_images[0]) || '/icons/intrustLogo.png',
                slug: p.slug
            }));
        }

        let newBalancePaise = 0;

        // 5. Handle InTrust Wallet Deduction
        if (paymentMethod === 'wallet') {
            const merchantPaise = Number(merchantRow?.wallet_balance_paise || 0);

            // Also check customer_wallets
            const { data: custWallet } = await adminClient
                .from('customer_wallets')
                .select('id, balance_paise')
                .eq('user_id', user.id)
                .maybeSingle();

            const customerPaise = Number(custWallet?.balance_paise || 0);
            const totalAvailablePaise = Math.max(merchantPaise, customerPaise);

            if (totalAvailablePaise < totalWithGstPaise) {
                return NextResponse.json({ 
                    success: false, 
                    error: `Insufficient InTrust wallet balance (Available: ₹${(totalAvailablePaise / 100).toFixed(2)}). Please choose SabPaisa Gateway or top up your wallet.` 
                }, { status: 400 });
            }

            // Deduct from merchant wallet if funded, otherwise deduct from customer wallet
            if (merchantPaise >= totalWithGstPaise) {
                newBalancePaise = merchantPaise - totalWithGstPaise;
                await adminClient
                    .from('merchants')
                    .update({ wallet_balance_paise: newBalancePaise })
                    .eq('id', merchantRow.id);

                try {
                    await adminClient.from('merchant_transactions').insert({
                        merchant_id: merchantRow.id,
                        transaction_type: 'sponsorship_fee',
                        amount_paise: -totalWithGstPaise,
                        balance_after_paise: newBalancePaise,
                        description: `Daily Challenge Sponsorship for ${sponsorDate}`,
                        metadata: { sponsor_date: sponsorDate, payment_method: 'wallet' }
                    });
                } catch (e) {}
            } else if (custWallet && customerPaise >= totalWithGstPaise) {
                newBalancePaise = customerPaise - totalWithGstPaise;
                await adminClient
                    .from('customer_wallets')
                    .update({ 
                        balance_paise: newBalancePaise, 
                        updated_at: new Date().toISOString() 
                    })
                    .eq('id', custWallet.id);

                try {
                    await adminClient.from('customer_wallet_transactions').insert({
                        wallet_id: custWallet.id,
                        user_id: user.id,
                        type: 'DEBIT',
                        amount_paise: totalWithGstPaise,
                        balance_before_paise: customerPaise,
                        balance_after_paise: newBalancePaise,
                        description: `Daily Challenge Sponsorship for ${sponsorDate}`,
                        reference_type: 'sponsorship'
                    });
                } catch (e) {}
            }
        }

        // 6. Insert Sponsorship Record
        const { data: bookingRecord, error: bookErr } = await adminClient
            .from('daily_challenge_sponsorships')
            .insert({
                merchant_id: merchantRow.id,
                sponsor_date: sponsorDate,
                products: cleanProducts,
                campaign_message: campaignMessage || '',
                fee_paid_paise: baseFeePaise,
                payment_method: paymentMethod,
                payment_status: 'completed',
                status: 'confirmed'
            })
            .select('id')
            .single();

        if (bookErr) {
            console.error('Error inserting sponsorship booking:', bookErr);
            return NextResponse.json({ success: false, error: bookErr.message || 'Failed to persist sponsorship booking' }, { status: 500 });
        }

        const bookingId = bookingRecord.id;
        const invoiceNumber = `INV-MKT-${sponsorDate.replace(/-/g, '')}-${bookingId.slice(0, 6).toUpperCase()}`;

        // 7. Write audit log into user's wallet_transactions if paid via wallet
        if (paymentMethod === 'wallet') {
            try {
                await adminClient.from('wallet_transactions').insert({
                    user_id: user.id,
                    amount: totalWithGstPaise / 100,
                    transaction_type: 'DEBIT',
                    reference_type: 'sponsorship',
                    reference_id: bookingId,
                    description: `Daily Challenge Prime Sponsorship - ${sponsorDate}`,
                    metadata: {
                        booking_id: bookingId,
                        sponsor_date: sponsorDate,
                        invoice_number: invoiceNumber,
                        payment_method: 'wallet',
                        total_paise: totalWithGstPaise,
                        base_fee_paise: baseFeePaise,
                        cgst_paise: cgstPaise,
                        sgst_paise: sgstPaise
                    }
                });
            } catch (wErr) {
                console.warn('Could not write wallet_transactions log for sponsorship:', wErr);
            }
        }

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
