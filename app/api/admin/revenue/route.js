import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

export async function GET(request) {
    try {
        const supabase = await createServerSupabaseClient()

        // Verify user is authenticated and is admin
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Fetch revenue summary from view
        const { data, error } = await supabase
            .from('admin_revenue_summary')
            .select('*')
            .single()

        if (error) {
            console.error('Error fetching revenue summary:', error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json(data, { status: 200 })
    } catch (error) {
        console.error('Unexpected error in revenue API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
