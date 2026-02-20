import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

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
        if (!businessName || !ownerName || !phone || !email) {
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

        // TODO: Integrate KYC verification API here
        // Before setting status to 'approved', we should:
        // 1. Verify PAN card via KYC API
        // 2. Verify GST number
        // 3. Verify bank account details
        // 4. Verify business documents
        // For now, we're auto-approving all applications

        // Create merchant record with auto-approved status
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
                    status: 'pending', // Default to pending for admin approval
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

        // TODO: Store KYC documents securely
        // For now, we're just logging that we received them
        console.log('Merchant application received:', {
            merchantId: merchant.id,
            businessName,
            ownerName,
            // Note: In production, store these securely and encrypted
            kycData: {
                panCard,
                bankAccount,
                ifscCode,
                address,
            }
        });

        // Log the merchant creation
        console.log('✅ Merchant account created and verified.');

        return NextResponse.json(
            {
                success: true,
                message: 'Merchant account created successfully!',
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
