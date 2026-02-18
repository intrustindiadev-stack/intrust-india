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
                    status: 'pending', // Default to pending for admin approval
                    commission_rate: 3.00, // Default commission rate
                    wholesale_balance: 0.00,
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

        // Log the merchant creation in audit logs
        await supabase.from('audit_logs').insert([
            {
                user_id: user.id,
                action: 'merchant_application_submitted',
                entity_type: 'merchant',
                entity_id: merchant.id,
                changes: {
                    business_name: businessName,
                    status: 'approved', // TODO: Update when KYC is implemented
                    auto_approved: true, // Flag to indicate this was auto-approved
                }
            }
        ]);

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
