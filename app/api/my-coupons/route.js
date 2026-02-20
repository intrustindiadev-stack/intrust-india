import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

export async function GET(request) {
    try {
        const supabase = await createServerSupabaseClient()

        // Verify user is authenticated
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Fetch user's purchased coupons
        const { data: coupons, error: couponsError } = await supabase
            .from('coupons')
            .select('id, brand, title, description, category, face_value_paise, selling_price_paise, masked_code, status, valid_from, valid_until, image_url, purchased_at')
            .eq('purchased_by', session.user.id)
            .eq('status', 'sold')
            .order('purchased_at', { ascending: false })

        if (couponsError) {
            console.error('Error fetching my coupons:', couponsError)
            return NextResponse.json(
                { error: couponsError.message },
                { status: 400 }
            )
        }

        // Fetch user's transactions
        const { data: transactions, error: transactionsError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })

        if (transactionsError) {
            console.error('Error fetching transactions:', transactionsError)
        }

        return NextResponse.json(
            {
                coupons: coupons || [],
                transactions: transactions || [],
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('Unexpected error in my-coupons API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
