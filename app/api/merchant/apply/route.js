import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { sprintVerify } from '@/lib/sprintVerify';
import crypto from 'crypto';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();

        // Get the authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in.' },
                { status: 401 }
            );
        }

        // Get the form data from request
        const formData = await request.json();
        const {
            businessName,
            gstNumber,
            ownerName,
            phone,
            email,
            address,
            bankAccount,
            ifscCode,
            panCard,
            merchantReferralCode,
        } = formData;

        // Validate required fields
        if (!businessName || !ownerName || !phone || !email || !bankAccount || !ifscCode || !panCard) {
            return NextResponse.json(
                { error: 'Missing required fields. Please fill in all required information.' },
                { status: 400 }
            );
        }

        // Check if user already has a merchant profile
        const { data: existingMerchant, error: checkError } = await supabase
            .from('merchants')
            .select('id, status')
            .eq('user_id', user.id)
            .single();

        if (existingMerchant) {
            return NextResponse.json(
                {
                    error: 'You already have a merchant account.',
                    merchantId: existingMerchant.id,
                    status: existingMerchant.status
                },
                { status: 409 }
            );
        }

        // --- KYC Verification Logic ---
        let panVerified = false;
        let bankVerified = false;
        let gstVerified = false;
        // Status is always pending — PAN and Bank are under manual review.
        const finalStatus = 'pending';

        // 1. Verify GSTIN (if provided)
        let gstResult = null;
        if (gstNumber) {
            gstResult = await sprintVerify.verifyGSTIN(gstNumber);
            if (gstResult.valid === true) {
                gstVerified = true;
            } else if (gstResult.valid === 'manual_review') {
                // still pending — no change needed
            } else {
                return NextResponse.json(
                    { error: `GSTIN Verification Failed: ${gstResult.message}` },
                    { status: 400 }
                );
            }
        }

        let referrerMerchantId = null;
        if (merchantReferralCode) {
            const code = merchantReferralCode.trim().toUpperCase();
            const { data: referrerData, error: referrerError } = await supabase
                .from('merchants')
                .select('id, user_id')
                .eq('referral_code', code)
                .eq('status', 'approved')
                .single();

            if (!referrerData || referrerError) {
                return NextResponse.json(
                    { error: 'Invalid or inactive merchant referral code.' },
                    { status: 400 }
                );
            }

            if (referrerData.user_id === user.id) {
                return NextResponse.json(
                    { error: 'You cannot use your own referral code.' },
                    { status: 400 }
                );
            }

            referrerMerchantId = referrerData.id;
        }

        // Generate referral code — the DB has a UNIQUE constraint so we rely on
        // it as the final arbiter. We generate once and catch a collision (23505)
        // to retry exactly once before giving up.
        const adminSupabase = createAdminClient();

        const generateCode = () => crypto.randomUUID().split('-')[0].slice(0, 6).toUpperCase();

        let generatedCode = generateCode();

        // Attempt insert with idempotency loop for rare code collisions
        let merchant = null;
        let merchantError = null;

        for (let attempt = 0; attempt < 2; attempt++) {
            const insertResult = await supabase
                .from('merchants')
                .insert([
                    {
                        user_id: user.id,
                        business_name: businessName,
                        gst_number: gstNumber || null,
                        owner_name: ownerName,
                        business_phone: phone,
                        business_email: email,
                        business_address: address,
                        bank_account_number: bankAccount,
                        bank_ifsc_code: ifscCode,
                        pan_number: panCard,
                        status: finalStatus,
                        pan_verified: panVerified,
                        bank_verified: bankVerified,
                        gstin_verified: gstVerified,
                        pan_data: null,
                        bank_data: null,
                        gstin_data: gstResult?.data || null,
                        referred_by_merchant_id: referrerMerchantId,
                        referral_code: generatedCode,
                    }
                ])
                .select()
                .single();

            if (!insertResult.error) {
                merchant = insertResult.data;
                merchantError = null;
                break;
            }

            // 23505 = unique_violation — referral code collision, retry once
            if (insertResult.error.code === '23505' && attempt === 0) {
                console.warn('[MerchantApply] Referral code collision, retrying with new code...');
                generatedCode = generateCode();
                continue;
            }

            merchantError = insertResult.error;
            break;
        }

        if (merchantError || !merchant) {
            console.error('Error creating merchant:', merchantError);
            return NextResponse.json(
                { error: 'Failed to create merchant account. Please try again.' },
                { status: 500 }
            );
        }

        // Notify admins about the new application
        try {
            const { data: admins } = await adminSupabase
                .from('user_profiles')
                .select('id')
                .eq('role', 'admin');

            if (admins && admins.length > 0) {
                const notifications = admins.map(admin => ({
                    user_id: admin.id,
                    title: 'New Merchant Application 🏪',
                    body: `${businessName} has applied to become a merchant and is under manual review.`,
                    type: 'info',
                    reference_type: 'merchant_application',
                    reference_id: merchant.id,
                    read: false
                }));
                const { error: notifInsertError } = await adminSupabase.from('notifications').insert(notifications);
                if (notifInsertError) console.error('Error inserting admin notifications:', notifInsertError);
            }

            // Confirm submission — status is always pending at this stage
            await adminSupabase.from('notifications').insert({
                user_id: user.id,
                title: 'Application Received! 📝',
                body: `Your merchant application for ${businessName} has been received and is under review. We'll notify you once it's approved.`,
                type: 'info',
                reference_type: 'merchant_application',
                reference_id: merchant.id,
                read: false
            });
        } catch (notifError) {
            console.error('Error sending notifications:', notifError);
        }

        console.log('✅ Merchant application submitted and queued for manual review.');

        return NextResponse.json(
            {
                success: true,
                message: 'Merchant application submitted. Some details are under manual review.',
                merchantId: merchant.id,
                status: merchant.status,
            },
            { status: 201 }
        );

    } catch (error) {
        console.error('Unexpected error in merchant application:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred. Please try again later.' },
            { status: 500 }
        );
    }
}
