import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const supabase = await createServerSupabaseClient();
        await supabase.auth.signOut();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Logout Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
