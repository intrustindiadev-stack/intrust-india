
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

        // Return a direct 200 OK so that the client-side fetch doesn't
        // trigger a 303 Redirect, which causes iOS Safari to drop the Set-Cookie headers.
        // Navigation is handled by the client.
        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
