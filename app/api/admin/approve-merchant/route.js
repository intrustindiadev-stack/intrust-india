import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { sendTemplateMessage, KYC_UPDATE_TEMPLATE } from '@/lib/omniflow';
import crypto from 'crypto';

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

        // 5.5 Build Merchant Tree Path if referred
        if (existingMerchant.referred_by_merchant_id) {
            try {
                const { error: rpcError } = await adminSupabase.rpc('build_merchant_tree_path', {
                    p_new_merchant_id: existingMerchant.id,
                    p_parent_merchant_id: existingMerchant.referred_by_merchant_id
                });
                if (rpcError) {
                    console.error('Error building merchant tree path:', rpcError);
                }
            } catch (err) {
                console.error('Unexpected error building merchant tree path:', err);
            }
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
            body: `Congratulations! Your merchant application for ${existingMerchant.business_name} has been approved. Choose a subscription plan (starting ₹499/month) to activate your merchant panel.`,
            type: 'success',
            reference_type: 'merchant_approved',
            read: false
        });

        // 7.5 WhatsApp KYC Update alert
        try {
            const { data: binding } = await adminSupabase
                .from('user_channel_bindings')
                .select('phone')
                .eq('user_id', targetUserId)
                .eq('whatsapp_opt_in', true)
                .maybeSingle();

            if (binding?.phone) {
                // Deduplication guard: 24-hour window, tagged with merchant ID.
                const alertTag = `[template:intrust_kyc_update:${existingMerchant.id}]`;
                const dedupeWindow = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const { data: alreadySent } = await adminSupabase
                    .from('whatsapp_message_logs')
                    .select('id')
                    .eq('user_id', targetUserId)
                    .eq('content_preview', alertTag)
                    .gte('created_at', dedupeWindow)
                    .limit(1)
                    .maybeSingle();

                if (alreadySent) {
                    console.log(`[approve-merchant] Skipping duplicate KYC alert for merchant ${existingMerchant.id}`);
                } else {
                    await sendTemplateMessage(
                        binding.phone,
                        KYC_UPDATE_TEMPLATE.name,
                        KYC_UPDATE_TEMPLATE.language,
                        KYC_UPDATE_TEMPLATE.buildComponents(
                            'Verified ✅',
                            `Your merchant application for ${existingMerchant.business_name} has been approved. You are now fully verified. Complete your subscription to activate your merchant panel.`
                        )
                    );
                    console.log(`[approve-merchant] WhatsApp KYC update sent to user ${targetUserId}`);
                    const phoneHash = crypto.createHash('sha256').update(binding.phone).digest('hex');
                    await adminSupabase.from('whatsapp_message_logs').insert({
                        user_id: targetUserId,
                        phone_hash: phoneHash,
                        direction: 'outbound',
                        message_type: 'template',
                        channel: 'web',
                        status: 'delivered',
                        content_preview: alertTag,
                    }).then(({ error }) => {
                        if (error) console.warn('[approve-merchant] Failed to log KYC alert:', error.message);
                    });
                }
            }
        } catch (waErr) {
            console.error('[approve-merchant] WhatsApp KYC alert failed (non-blocking):', waErr.message);
        }

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
