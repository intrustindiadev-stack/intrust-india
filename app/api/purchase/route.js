import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient()

        // Verify user is authenticated
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in.' },
                { status: 401 }
            )
        }

        // Parse request body
        const body = await request.json()
        const { coupon_id, payment_reference } = body

        if (!coupon_id) {
            return NextResponse.json(
                { error: 'Missing coupon_id' },
                { status: 400 }
            )
        }

        if (!payment_reference) {
            return NextResponse.json(
                { error: 'Missing payment_reference. Please provide UPI transaction ID.' },
                { status: 400 }
            )
        }

        // Call the secure purchase function
        // This function handles all business logic, fee calculation, and atomicity
        const { data, error } = await supabase.rpc('purchase_coupon', {
            p_coupon_id: coupon_id,
            p_payment_reference: payment_reference,
        })

        if (error) {
            console.error('Purchase error:', error)
            return NextResponse.json(
                { error: error.message || 'Purchase failed' },
                { status: 400 }
            )
        }

        // Distribute purchase rewards to upline
        try {
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            // Get coupon price for reward calculation
            const { data: coupon } = await supabaseAdmin
                .from('coupons')
                .select('selling_price_paise')
                .eq('id', coupon_id)
                .single();

            if (coupon?.selling_price_paise) {
                await supabaseAdmin.rpc('calculate_and_distribute_rewards', {
                    p_event_type: 'purchase',
                    p_source_user_id: user.id,
                    p_reference_id: coupon_id,
                    p_reference_type: 'coupon_purchase',
                    p_amount_paise: coupon.selling_price_paise
                });
            }
        } catch (rewardErr) {
            console.error('[Purchase] Reward distribution error:', rewardErr);
            // Don't fail purchase if rewards fail
        }

        // Return success response
        return NextResponse.json(data, { status: 200 })
    } catch (error) {
        console.error('Unexpected error in purchase API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
