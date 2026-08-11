import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/apiAuth'
import { createAdminClient } from '@/lib/supabaseServer'

export async function POST(request, { params }) {
    try {
        const { id } = await params

        // Verify user is authenticated and is admin
        const { user, profile, error: authError, status } = await getAuthUser(request)

        if (authError || !user) {
            return NextResponse.json({ error: authError || 'Unauthorized' }, { status: status || 401 })
        }

        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const adminSupabase = createAdminClient();

        // Call unsuspend user function
        const { data, error } = await adminSupabase.rpc('admin_unsuspend_user', {
            p_user_id: id,
        })

        if (error) {
            console.error('Error unsuspending user:', error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        // Sync metadata and remove ban to restore access immediately
        await adminSupabase.auth.admin.updateUserById(id, {
            user_metadata: { is_suspended: false },
            ban_duration: 'none'
        });

        return NextResponse.json(data, { status: 200 })
    } catch (error) {
        console.error('Unexpected error in unsuspend user API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
