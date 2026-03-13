import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CustomerWalletService } from '@/lib/wallet/customerWalletService';

// We need a service account client to bypass RLS and update profiles & wallets safely
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const runtime = 'nodejs';

export async function POST(req) {
    try {
        const body = await req.json();
        const { userId, services, occupation, referral_source, referral_code_entered } = body;

        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/i;
        if (!userId || !uuidRegex.test(userId)) {
            return NextResponse.json({ error: 'Valid User ID (UUID) is required' }, { status: 400 });
        }

        // 1. Process Referral Logic BEFORE marking onboarding as complete
        let referredById = null;
        let referralApplied = false;

        if (referral_code_entered) {
            // Normalize entered code
            const codeToFind = referral_code_entered.toUpperCase().trim();

            // Find the referrer by code
            const { data: referrer, error: referrerError } = await supabaseAdmin
                .from('user_profiles')
                .select('id, referral_code')
                .eq('referral_code', codeToFind)
                .single();

            if (referrerError || !referrer) {
                // If invalid code, we still let them proceed but don't apply referral bonus
                console.warn(`Invalid referral code entered: ${codeToFind}`);
            } else if (referrer.id === userId) {
                console.warn(`User tried to use their own referral code: ${codeToFind}`);
            } else {
                referredById = referrer.id;

                // Only credit wallets if they haven't already been referred (prevent double-dipping)
                const { data: existingProfile } = await supabaseAdmin
                    .from('user_profiles')
                    .select('referred_by')
                    .eq('id', userId)
                    .single();

                if (existingProfile && !existingProfile.referred_by) {
                    referralApplied = true;
                    try {
                        // Credit Referrer
                        await CustomerWalletService.creditWallet(
                            referrer.id,
                            100, // ₹100
                            'CASHBACK',
                            'Referral Bonus (Referred User)'
                        );

                        // Credit New User
                        await CustomerWalletService.creditWallet(
                            userId,
                            100, // ₹100
                            'CASHBACK',
                            'Referral Bonus (Joined via Referral)'
                        );
                    } catch (walletError) {
                        console.error('Error applying referral wallet credits:', walletError);
                        // We swallow the error so onboarding succeeds even if wallet fails, 
                        // but ideally we'd have a retry mechanism.
                    }
                }
            }
        }

        // 2. Update the User's Profile
        const updatePayload = {
            completed_onboarding: true,
            services: Array.isArray(services) ? services : [],
            occupation: occupation || null,
            referral_source: referral_source || null,
            updated_at: new Date()
        };

        // Only update referred_by if we successfully looked it up
        if (referredById) {
            updatePayload.referred_by = referredById;
        }

        const { error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update(updatePayload)
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating user profile:', updateError);
            return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            referralApplied: referralApplied,
            message: referralApplied ? 'Onboarding complete. Referral bonus applied!' : 'Onboarding complete.'
        });

    } catch (error) {
        console.error('Onboarding API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
