import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();

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
        const { applicationId, userId } = body;

        if (!applicationId && !userId) {
            return NextResponse.json(
                { error: 'Missing applicationId or userId.' },
                { status: 400 }
            );
        }

        // 4. Update Merchant Status to 'approved'
        // We handle cases where we identify by ID (merchant table id) or user_id
        let merchantQuery = supabase.from('merchants').update({ status: 'approved' });

        if (applicationId) {
            merchantQuery = merchantQuery.eq('id', applicationId);
        } else {
            merchantQuery = merchantQuery.eq('user_id', userId);
        }

        const { data: merchantData, error: merchantError } = await merchantQuery.select().single();

        if (merchantError) {
            console.error('Error updating merchant status:', merchantError);
            return NextResponse.json(
                { error: 'Failed to update merchant status.' },
                { status: 500 }
            );
        }

        // 5. Update User Role to 'merchant'
        // We need the user_id from the merchant record if it wasn't provided
        const targetUserId = userId || merchantData.user_id;

        const { error: roleError } = await supabase
            .from('user_profiles')
            .update({ role: 'merchant' })
            .eq('id', targetUserId);

        if (roleError) {
            console.error('Error updating user role:', roleError);
            // Verify if we should rollback merchant status? 
            // For now, allow manual fix or retry.
            return NextResponse.json(
                { error: 'Merchant approved but failed to update user role.' },
                { status: 500 }
            );
        }

        // 6. Log Action (Optional but good practice)
        await supabase.from('audit_logs').insert([
            {
                user_id: user.id, // Admin ID
                action: 'approved_merchant',
                entity_type: 'merchant',
                entity_id: merchantData.id,
                changes: {
                    previous_status: 'pending',
                    new_status: 'approved',
                    target_user_id: targetUserId
                }
            }
        ]);

        return NextResponse.json({
            success: true,
            message: 'Merchant approved and role updated successfully.'
        });

    } catch (error) {
        console.error('Unexpected error in approve-merchant:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred.' },
            { status: 500 }
        );
    }
}
