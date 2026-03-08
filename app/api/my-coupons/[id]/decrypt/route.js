import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { decryptCouponCode } from '@/lib/encryption'

export async function GET(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params

        // Use getUser() instead of getSession() for a cryptographically verified
        // server-side identity check (getSession() only reads the local cookie and
        // can be spoofed).
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Call the get_my_coupon_code RPC.
        // The function enforces ownership by checking auth.uid() internally via
        // RLS on the coupons table (purchased_by = auth.uid()), so the session-
        // scoped client is the correct one to use here.
        const { data: couponCode, error } = await supabase.rpc('get_my_coupon_code', {
            p_coupon_id: id,
        })

        if (error) {
            console.error('Error fetching coupon code:', error)
            return NextResponse.json(
                { error: error.message || 'Failed to fetch coupon code' },
                { status: 400 }
            )
        }

        if (couponCode === null || couponCode === undefined) {
            return NextResponse.json(
                { error: 'Coupon not found or access denied' },
                { status: 404 }
            )
        }

        const decryptedCode = decryptCouponCode(couponCode)

        // Return the coupon code under the key `code` (not `encrypted_code`).
        // The column is named `encrypted_code` in the DB and we decrypt it here.
        // The client must never see the raw DB column name to avoid leaking implementation details.
        return NextResponse.json(
            { code: decryptedCode },
            { status: 200 }
        )
    } catch (error) {
        console.error('Unexpected error in decrypt API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
