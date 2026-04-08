import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const adminSupabase = createAdminClient();

        // 1. Verify Authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in.' },
                { status: 401 }
            );
        }

        // 2. Verify Admin Role
        const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !['admin', 'super_admin'].includes(userProfile?.role)) {
            return NextResponse.json(
                { error: 'Forbidden. Admin access required.' },
                { status: 403 }
            );
        }

        // 3. Get Request Data
        const body = await request.json();
        const { applicationId, userId } = body;

        if (!applicationId && !userId) {
            return NextResponse.json(
                { error: 'Missing applicationId or userId.' },
                { status: 400 }
            );
        }

        // 4. Fetch existing Merchant to verify its status
        let fetchQuery = adminSupabase.from('merchants').select('*');

        if (applicationId) {
            fetchQuery = fetchQuery.eq('id', applicationId);
        } else {
            fetchQuery = fetchQuery.eq('user_id', userId);
        }

        const { data: existingMerchant, error: fetchError } = await fetchQuery.single();

        if (fetchError || !existingMerchant) {
            return NextResponse.json(
                { error: 'Merchant not found.' },
                { status: 404 }
            );
        }

        if (existingMerchant.status !== 'pending') {
            return NextResponse.json(
                { error: 'Merchant is not in pending status.' },
                { status: 409 }
            );
        }

        const targetUserId = userId || existingMerchant.user_id;

        // 5. Update Merchant Status to 'approved' and subscription_status to 'unpaid'
        const { data: merchantData, error: merchantError } = await adminSupabase
            .from('merchants')
            .update({ status: 'approved', subscription_status: 'unpaid' })
            .eq('id', existingMerchant.id)
            .select()
            .single();

        if (merchantError) {
            console.error('Error updating merchant status:', merchantError);
            return NextResponse.json(
                { error: 'Failed to update merchant status.' },
                { status: 500 }
            );
        }

        // 6. Assign 'merchant' role in user_profiles
        const { error: roleError } = await adminSupabase
            .from('user_profiles')
            .update({ role: 'merchant' })
            .eq('id', targetUserId);

        if (roleError) {
            console.error('Error assigning merchant role:', roleError);
            // Rollback merchant status
            await adminSupabase
                .from('merchants')
                .update({ status: existingMerchant.status, subscription_status: existingMerchant.subscription_status })
                .eq('id', existingMerchant.id);

            return NextResponse.json(
                { error: 'Failed to assign merchant role.' },
                { status: 500 }
            );
        }

        // 7. Notify User to complete subscription
        await adminSupabase.from('notifications').insert({
            user_id: targetUserId,
            title: 'Merchant Application Approved 🎉',
            body: `Congratulations! Your merchant application for ${existingMerchant.business_name} has been approved. Please pay the one-time subscription fee of ₹149 to activate your panel.`,
            type: 'success',
            reference_type: 'merchant_approved',
            read: false
        });

        // 8. Log Action
        const { error: auditError } = await adminSupabase.from('audit_logs').insert([
            {
                actor_id: user.id,
                actor_role: 'admin',
                action: 'admin_action',
                entity_type: 'merchant',
                entity_id: merchantData.id,
                description: `Approved merchant application for user ${targetUserId} (awaiting subscription)`,
                metadata: {
                    sub_action: 'approved_merchant',
                    previous_status: existingMerchant.status,
                    new_status: 'approved',
                    subscription_status: 'unpaid',
                    target_user_id: targetUserId,
                    role_assigned: 'merchant'
                }
            }
        ]);

        if (auditError) {
            console.error('Error logging audit:', auditError);
            // Rollback merchant status
            await adminSupabase
                .from('merchants')
                .update({ status: existingMerchant.status, subscription_status: 'unpaid' })
                .eq('id', existingMerchant.id);

            return NextResponse.json(
                { error: 'Failed to log action. Merchant approval reverted.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Merchant approved. User notified to complete subscription payment.'
        });

    } catch (error) {
        console.error('Unexpected error in approve-merchant:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred.' },
            { status: 500 }
        );
    }
}
