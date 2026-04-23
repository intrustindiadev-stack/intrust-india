import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
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
        const { id } = await params;
        const body = await request.json();
        const { suspend, reason } = body;

        if (typeof suspend !== 'boolean') {
            return NextResponse.json(
                { error: 'Missing or invalid "suspend" field. Must be a boolean.' },
                { status: 400 }
            );
        }

        // 4. Fetch existing Merchant
        const { data: existingMerchant, error: fetchError } = await adminSupabase
            .from('merchants')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingMerchant) {
            return NextResponse.json(
                { error: 'Merchant not found.' },
                { status: 404 }
            );
        }

        // 5. Validate current status for the requested action
        if (suspend && existingMerchant.status !== 'approved') {
            return NextResponse.json(
                { error: 'Only approved merchants can be suspended.' },
                { status: 409 }
            );
        }

        if (!suspend && existingMerchant.status !== 'suspended') {
            return NextResponse.json(
                { error: 'Only suspended merchants can be unsuspended.' },
                { status: 409 }
            );
        }

        // 6. Perform the update
        const updateData = suspend
            ? { status: 'suspended', suspension_reason: reason || null }
            : { status: 'approved', suspension_reason: null };

        const { data: merchantData, error: merchantError } = await adminSupabase
            .from('merchants')
            .update(updateData)
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

        // 7. Log Action to audit_logs
        const description = suspend
            ? `Suspended merchant "${existingMerchant.business_name || existingMerchant.id}"${reason ? `: ${reason}` : ''}`
            : `Unsuspended merchant "${existingMerchant.business_name || existingMerchant.id}"`;
        const { error: auditError } = await adminSupabase.from('audit_logs').insert([
            {
                actor_id: user.id,
                actor_role: 'admin',
                action: 'admin_action',
                entity_type: 'merchant',
                entity_id: merchantData.id,
                description,
                metadata: {
                    sub_action: suspend ? 'suspended_merchant' : 'unsuspended_merchant',
                    previous_status: existingMerchant.status,
                    new_status: updateData.status,
                    reason: reason || null,
                    target_user_id: existingMerchant.user_id
                }
            }
        ]);

        // 7.1 ADDED: Notify Merchant
        await adminSupabase.from('notifications').insert([{
            user_id: existingMerchant.user_id,
            title: suspend ? 'Account Suspended ⚠️' : 'Account Reinstated ✅',
            body: suspend
                ? `Your merchant account has been suspended.${reason ? ` Reason: ${reason}` : ''} Please contact support for more details.`
                : 'Your merchant account has been reinstated. You can now resume your operations.',
            type: suspend ? 'warning' : 'success',
            reference_type: suspend ? 'merchant_suspended' : 'merchant_unsuspended',
            reference_id: merchantData.id
        }]);

        if (auditError) {
            console.error('Error logging audit:', auditError);
            // Rollback merchant status
            await adminSupabase
                .from('merchants')
                .update({
                    status: existingMerchant.status,
                    suspension_reason: existingMerchant.suspension_reason || null
                })
                .eq('id', existingMerchant.id);

            return NextResponse.json(
                { error: 'Failed to log action. Status change reverted.' },
                { status: 500 }
            );
        }

        const message = suspend
            ? 'Merchant suspended successfully.'
            : 'Merchant unsuspended successfully.';

        return NextResponse.json({ success: true, message });

    } catch (error) {
        console.error('Unexpected error in toggle-suspend:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred.' },
            { status: 500 }
        );
    }
}
