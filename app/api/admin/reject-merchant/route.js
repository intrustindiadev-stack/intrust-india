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

        if (profileError || userProfile?.role !== 'admin') {
            return NextResponse.json(
                { error: 'Forbidden. Admin access required.' },
                { status: 403 }
            );
        }

        // 3. Get Request Data
        const body = await request.json();
        const { applicationId, userId, reason } = body;

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

        // Check current role before reverting just in case they are admin etc.
        const { data: targetProfile } = await adminSupabase
            .from('user_profiles')
            .select('role')
            .eq('id', targetUserId)
            .single();
        const prevRole = targetProfile?.role;

        // 5. Update Merchant Status to 'rejected'
        const { data: merchantData, error: merchantError } = await adminSupabase
            .from('merchants')
            .update({
                status: 'rejected',
                ...(reason ? { rejection_reason: reason } : {})
            })
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

        // 6. Revert User Role to 'customer' if they were a merchant
        if (prevRole === 'merchant') {
            const { error: roleError } = await adminSupabase
                .from('user_profiles')
                .update({ role: 'customer' })
                .eq('id', targetUserId);

            if (roleError) {
                console.error('Error reverting user role:', roleError);
                // Rollback merchant status
                await adminSupabase
                    .from('merchants')
                    .update({
                        status: existingMerchant.status,
                        rejection_reason: existingMerchant.rejection_reason || null
                    })
                    .eq('id', existingMerchant.id);

                return NextResponse.json(
                    { error: 'Failed to revert user role. Merchant rejection reverted.' },
                    { status: 500 }
                );
            }
        }

        // 7. Log Action
        const { error: auditError } = await adminSupabase.from('audit_logs').insert([
            {
                user_id: user.id, // Admin ID
                action: 'rejected_merchant',
                entity_type: 'merchant',
                entity_id: merchantData.id,
                changes: {
                    previous_status: existingMerchant.status,
                    new_status: 'rejected',
                    target_user_id: targetUserId,
                    reason: reason || null
                }
            }
        ]);

        if (auditError) {
            console.error('Error logging audit:', auditError);
            // Rollback user role and merchant status
            if (prevRole === 'merchant') {
                await adminSupabase
                    .from('user_profiles')
                    .update({ role: 'merchant' })
                    .eq('id', targetUserId);
            }

            await adminSupabase
                .from('merchants')
                .update({
                    status: existingMerchant.status,
                    rejection_reason: existingMerchant.rejection_reason || null
                })
                .eq('id', existingMerchant.id);

            return NextResponse.json(
                { error: 'Failed to log action. Merchant rejection reverted.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Merchant application rejected successfully.'
        });

    } catch (error) {
        console.error('Unexpected error in reject-merchant:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred.' },
            { status: 500 }
        );
    }
}
