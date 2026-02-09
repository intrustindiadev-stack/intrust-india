import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

export async function GET(request) {
    try {
        const supabase = await createServerSupabaseClient()
        const { searchParams } = new URL(request.url)

        const category = searchParams.get('category')
        const brand = searchParams.get('brand')
        const search = searchParams.get('search')

        // Build query for available coupons
        let query = supabase
            .from('coupons')
            .select('id, brand, title, description, category, face_value_paise, selling_price_paise, masked_code, status, valid_from, valid_until, image_url, tags')
            .eq('status', 'available')
            .gte('valid_until', new Date().toISOString())
            .order('selling_price_paise', { ascending: true })

        if (category) {
            query = query.eq('category', category)
        }

        if (brand) {
            query = query.ilike('brand', `%${brand}%`)
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching coupons:', error)
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            )
        }

        return NextResponse.json(data || [], { status: 200 })
    } catch (error) {
        console.error('Unexpected error in coupons API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
