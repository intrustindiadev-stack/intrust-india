import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { sprintVerify } from '@/lib/sprintVerify';

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
        let finalStatus = 'approved';

        // 1. Verify PAN
        const panResult = await sprintVerify.verifyPAN(panCard);
        if (panResult.valid === true) {
            panVerified = true;
        } else if (panResult.valid === 'manual_review') {
            finalStatus = 'pending';
        } else {
            return NextResponse.json(
                { error: `PAN Verification Failed: ${panResult.message}` },
                { status: 400 }
            );
        }

        // 2. Verify Bank Account
        const bankResult = await sprintVerify.verifyBank(bankAccount, ifscCode);
        if (bankResult.valid === true) {
            bankVerified = true;
        } else if (bankResult.valid === 'manual_review') {
            finalStatus = 'pending';
        } else {
            return NextResponse.json(
                { error: `Bank Verification Failed: ${bankResult.message}` },
                { status: 400 }
            );
        }

        // 3. Verify GSTIN (if provided)
        let gstResult = null;
        if (gstNumber) {
            gstResult = await sprintVerify.verifyGSTIN(gstNumber);
            if (gstResult.valid === true) {
                gstVerified = true;
            } else if (gstResult.valid === 'manual_review') {
                finalStatus = 'pending';
            } else {
                return NextResponse.json(
                    { error: `GSTIN Verification Failed: ${gstResult.message}` },
                    { status: 400 }
                );
            }
        }

        // Create merchant record with approved status since API checks passed
        const { data: merchant, error: merchantError } = await supabase
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
                    pan_data: panResult.data || null,
                    bank_data: bankResult.data || null,
                    gstin_data: gstResult?.data || null,
                }
            ])
            .select()
            .single();

        if (merchantError) {
            console.error('Error creating merchant:', merchantError);
            return NextResponse.json(
                { error: 'Failed to create merchant account. Please try again.' },
                { status: 500 }
            );
        }

        // Notify admins about the new application
        try {
            const adminSupabase = createAdminClient();
            const { data: admins } = await adminSupabase
                .from('user_profiles')
                .select('id')
                .eq('role', 'admin');
                
            if (admins && admins.length > 0) {
                const notifications = admins.map(admin => ({
                    user_id: admin.id,
                    title: 'New Merchant Application 🏪',
                    body: `${businessName} has applied to become a merchant. Status: ${finalStatus}`,
                    type: 'info',
                    reference_type: 'merchant_application',
                    reference_id: merchant.id,
                    read: false
                }));
                const { error: notifInsertError } = await adminSupabase.from('notifications').insert(notifications);
                if (notifInsertError) console.error('Error inserting admin notifications:', notifInsertError);
            }
            
            
            // If they are auto-approved by KYC, give them a notification to pay
            if (finalStatus === 'approved') {
                await adminSupabase.from('notifications').insert({
                    user_id: user.id,
                    title: 'KYC Verified - Action Required 🎉',
                    body: `Your merchant application for ${businessName} was automatically verified! Please pay the ₹149 subscription fee to activate your panel.`,
                    type: 'success',
                    reference_type: 'merchant_approved',
                    read: false
                });
            }
        } catch (notifError) {
            console.error('Error sending notifications:', notifError);
        }

        // Log the merchant creation
        console.log('✅ Merchant account created and verified via SprintVerify.');

        // Create descriptive response
        const message = finalStatus === 'approved'
            ? 'Merchant account created and verified successfully!'
            : 'Merchant application submitted. Some details are under manual review.';

        return NextResponse.json(
            {
                success: true,
                message: message,
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
