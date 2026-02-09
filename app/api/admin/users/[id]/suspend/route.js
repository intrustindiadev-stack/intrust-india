import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

export async function POST(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params

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
        const { reason } = body

        if (!reason) {
            return NextResponse.json({ error: 'Missing suspension reason' }, { status: 400 })
        }

        // Call suspend user function
        const { data, error } = await supabase.rpc('admin_suspend_user', {
            p_user_id: id,
            p_reason: reason,
        })

        if (error) {
            console.error('Error suspending user:', error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json(data, { status: 200 })
    } catch (error) {
        console.error('Unexpected error in suspend user API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
