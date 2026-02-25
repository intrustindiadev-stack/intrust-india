
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();

        // Check if user is logged in (optional, but good for logging)
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            await supabase.auth.signOut();
        }

        const requestUrl = new URL(request.url);
        const origin = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;

        // Force redirect to login page with a hard reload by returning a 303 (See Other)
        // preventing any form resubmission and clearing client state
        return NextResponse.redirect(new URL('/login', origin), {
            status: 303,
        });

    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.redirect(new URL('/login', request.url));
    }
}
