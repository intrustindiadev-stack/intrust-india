import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';

export async function POST(request) {
    try {
        const authHeader = request.headers.get('authorization') ?? '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!token) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }

        const admin = createAdminClient();
        const { data: { user }, error: sessionError } = await admin.auth.getUser(token);

        if (sessionError || !user) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }

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
