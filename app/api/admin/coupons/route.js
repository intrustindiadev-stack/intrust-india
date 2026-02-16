import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseServer'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

// POST /api/admin/coupons - Create single coupon
export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient()

        // Verify user is authenticated and is admin
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 })
        }

        // Parse request body
        const body = await request.json()
        const {
            brand,
            title,
            description,
            category,
            face_value_paise,
            selling_price_paise,
            coupon_code, // Plain text code (will be encrypted)
            valid_until,
            terms_and_conditions,
            usage_instructions,
            image_url,
            tags,
        } = body

        // Validate required fields
        if (!brand || !title || !description || !category || !face_value_paise || !selling_price_paise || !coupon_code || !valid_until || !terms_and_conditions) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Create masked code (first 4 chars + **** + last 4 chars)
        const masked_code = coupon_code.length > 8
            ? `${coupon_code.slice(0, 4)}****${coupon_code.slice(-4)}`
            : `****${coupon_code.slice(-4)}`

        // TODO: Encrypt the coupon code before storing
        // For now, we'll store it as-is (in production, use Supabase Vault or crypto)
        const encrypted_code = coupon_code // TEMPORARY: Replace with actual encryption

        // Use admin client to insert (bypasses RLS)
        const adminClient = createAdminClient()

        const { data, error } = await adminClient
            .from('coupons')
            .insert({
                brand,
                title,
                description,
                category,
                face_value_paise,
                selling_price_paise,
                encrypted_code,
                masked_code,
                valid_until,
                terms_and_conditions,
                usage_instructions,
                image_url,
                tags,
                created_by: session.user.id,
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating coupon:', error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json(data, { status: 201 })
    } catch (error) {
        console.error('Unexpected error in create coupon API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PUT /api/admin/coupons - Bulk insert coupons
export async function PUT(request) {
    try {
        const supabase = await createServerSupabaseClient()

        // Verify user is authenticated and is admin
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Parse request body
        const body = await request.json()
        const { coupons } = body

        if (!Array.isArray(coupons) || coupons.length === 0) {
            return NextResponse.json({ error: 'Invalid coupons array' }, { status: 400 })
        }

        // Process coupons to add encrypted_code and masked_code
        const processedCoupons = coupons.map((coupon) => {
            const masked_code = coupon.coupon_code.length > 8
                ? `${coupon.coupon_code.slice(0, 4)}****${coupon.coupon_code.slice(-4)}`
                : `****${coupon.coupon_code.slice(-4)}`

            return {
                ...coupon,
                encrypted_code: coupon.coupon_code, // TODO: Encrypt in production
                masked_code,
                coupon_code: undefined, // Remove plain code from object
            }
        })

        // Call bulk insert function
        const { data, error } = await supabase.rpc('admin_bulk_insert_coupons', {
            coupons_data: processedCoupons,
        })

        if (error) {
            console.error('Error bulk inserting coupons:', error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json(data, { status: 201 })
    } catch (error) {
        console.error('Unexpected error in bulk insert API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
