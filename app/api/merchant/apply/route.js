import { createServerSupabaseClient } from '@/lib/supabaseServer';
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

        // --- KYC Verification using SprintVerify ---
        // 1. Verify PAN
        const panResult = await sprintVerify.verifyPAN(panCard);
        if (!panResult.valid) {
            return NextResponse.json(
                { error: `PAN Verification Failed: ${panResult.message}` },
                { status: 400 }
            );
        }

        // 2. Verify Bank Account
        const bankResult = await sprintVerify.verifyBank(bankAccount, ifscCode);
        if (!bankResult.valid) {
            return NextResponse.json(
                { error: `Bank Verification Failed: ${bankResult.message}` },
                { status: 400 }
            );
        }

        // 3. Verify GSTIN (if provided)
        let gstResult = null;
        if (gstNumber) {
            gstResult = await sprintVerify.verifyGSTIN(gstNumber);
            if (!gstResult.valid) {
                return NextResponse.json(
                    { error: `GSTIN Verification Failed: ${gstResult.message}` },
                    { status: 400 }
                );
            }
        }

        // If all validations pass, the status is approved
        const finalStatus = 'approved';

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

        // Update user profile role to merchant
        const { error: roleError } = await supabase
            .from('user_profiles')
            .update({ role: 'merchant' })
            .eq('id', user.id);

        if (roleError) {
            console.error('Error updating user role:', roleError);
            // We don't fail the whole request, but we log it
        }

        // Log the merchant creation
        console.log('✅ Merchant account created and verified via SprintVerify.');

        return NextResponse.json(
            {
                success: true,
                message: 'Merchant account created and verified successfully!',
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
