import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function POST(request) {
    try {
        // Validate the caller is authenticated
        const serverClient = await createServerSupabaseClient();
        const { data: { user }, error: sessionError } = await serverClient.auth.getUser();

        if (sessionError || !user) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }

        const admin = createAdminClient();

        // Sign out all OTHER sessions for this user (keep the current one)
        const { error: signOutError } = await admin.auth.admin.signOut(user.id, 'others');

        if (signOutError) {
            console.error('[INVALIDATE-SESSIONS] signOut error:', signOutError);
            return NextResponse.json({ error: 'Failed to invalidate sessions.' }, { status: 500 });
        }

        // Audit log
        try {
            await admin.from('audit_logs').insert({
                user_id: user.id,
                action: 'password_reset_completed',
                metadata: { note: 'All other sessions invalidated after password reset.' }
            });
        } catch (e) { /* non-fatal */ }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error('[INVALIDATE-SESSIONS] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
