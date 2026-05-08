import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        // 1. Authenticate the caller
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { referral_code_entered } = body;

        if (!referral_code_entered) {
            return NextResponse.json({ error: 'Referral code is required' }, { status: 400 });
        }

        // 2. Resolve the current merchant
        const { data: currentMerchant, error: merchantError } = await supabase
            .from('merchants')
            .select('id, referred_by_merchant_id, business_name, status')
            .eq('user_id', user.id)
            .single();

        if (merchantError || !currentMerchant) {
            return NextResponse.json({ error: 'Merchant profile not found' }, { status: 403 });
        }

        if (currentMerchant.status !== 'approved') {
            return NextResponse.json({ error: 'Merchant is not approved' }, { status: 403 });
        }

        // 3. Guard: already has a referrer
        if (currentMerchant.referred_by_merchant_id) {
            return NextResponse.json({ error: 'You have already used a referral code' }, { status: 400 });
        }

        // 4. Validate the entered code
        const codeToFind = referral_code_entered.toUpperCase().trim();

        const { data: referrer, error: referrerError } = await supabase
            .from('merchants')
            .select('id, user_id, business_name')
            .eq('referral_code', codeToFind)
            .eq('status', 'approved')
            .single();

        if (referrerError || !referrer) {
            return NextResponse.json({ error: 'Invalid or inactive merchant referral code' }, { status: 400 });
        }

        // 5. Self-referral guard
        if (referrer.id === currentMerchant.id) {
            return NextResponse.json({ error: 'You cannot refer yourself' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // 6. Link the merchant
        const { error: updateError } = await adminClient
            .from('merchants')
            .update({
                referred_by_merchant_id: referrer.id
            })
            .eq('id', currentMerchant.id);

        if (updateError) {
            console.error('Error updating merchant referral:', updateError);
            return NextResponse.json({ error: 'Failed to apply referral' }, { status: 500 });
        }

        try {
            // 7. Build the tree path
            const { error: treeError } = await adminClient.rpc('build_merchant_tree_path', {
                p_new_merchant_id: currentMerchant.id,
                p_parent_merchant_id: referrer.id
            });
            if (treeError) throw treeError;

            // 8. Distribute reward
            const { error: rewardError } = await adminClient.rpc('distribute_merchant_referral_reward', {
                p_new_merchant_id: currentMerchant.id
            });
            if (rewardError) throw rewardError;

            // 9. Send notifications
            await adminClient.from('notifications').insert([
                {
                    user_id: user.id,
                    title: "You've joined a network! 🌱",
                    body: `You've joined ${referrer.business_name}'s referral network.`,
                    type: 'success',
                    reference_type: 'merchant_referral_joined',
                },
                {
                    user_id: referrer.user_id,
                    title: "New merchant referral! 🤝",
                    body: `${currentMerchant.business_name} joined using your referral code.`,
                    type: 'success',
                    reference_type: 'merchant_referral_new_member',
                },
            ]);

        } catch (sequenceError) {
            console.error('Error in merchant referral sequence (non-fatal for the link itself):', sequenceError);
            // We return success anyway because the primary link (referred_by_merchant_id) is already updated
        }

        return NextResponse.json({ success: true, referralApplied: true });

    } catch (error) {
        console.error('Merchant Referral Apply API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
