import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient()

        // Verify user is authenticated
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session) {
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
