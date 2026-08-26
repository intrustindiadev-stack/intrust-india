import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        // --- DIAGNOSTIC LOGGING ---
        const cookies = request.cookies.getAll();
        const cookieNames = cookies.map(c => c.name);
        const supabaseAuthCookiePresent = cookieNames.some(name => name.includes('-auth-token') || name.startsWith('sb-'));
        
        console.log('[DIAGNOSTIC] SESSION_CHECK', {
            cookieHeaderPresent: request.headers.has('cookie'),
            supabaseAuthCookiePresent,
            cookieCount: cookies.length,
            cookieNames
        });
        // ---------------------------

        const supabase = await createServerSupabaseClient();
        
        // We intentionally use getUser() instead of getSession() here because
        // getUser() makes a live network call to validate the session token.
        const { data: { user }, error } = await supabase.auth.getUser();

        console.log('[DIAGNOSTIC] SESSION_CHECK_GET_USER', {
            userReturned: !!user,
            error: error?.message || null,
            errorCode: error?.code || null,
            status: error?.status || null
        });

        if (error || !user) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        return NextResponse.json({
            authenticated: true,
            role: user.user_metadata?.role || null
        }, { status: 200 });

    } catch (err) {
        console.error('[Session Check] Error verifying session:', err);
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }
}
