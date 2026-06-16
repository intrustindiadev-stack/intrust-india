import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { logAuthEvent } from '@/lib/authHelpers';

export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { scope } = body;

        if (scope === 'global') {
            const authHeader = request.headers.get('authorization') ?? '';
            const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
            
            if (token) {
                const admin = createAdminClient();
                const { data: { user } } = await admin.auth.getUser(token);
                await admin.auth.admin.signOut(token, 'global');
                
                if (user) {
                    await logAuthEvent({
                        supabaseAdmin: admin,
                        action: 'logout',
                        actorId: user?.id,
                        ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
                        userAgent: request.headers.get('user-agent'),
                        metadata: { note: 'Global sign out performed.' }
                    });
                }
            }
        }

        const supabase = await createServerSupabaseClient();
        await supabase.auth.signOut();
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Logout Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
