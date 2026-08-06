import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data, error } = await supabase.rpc('crm_reroute_leads');

        if (error) {
            if (error.message.includes('Unauthorized')) {
                return NextResponse.json({ error: 'Only managers or admins can mass re-route leads.' }, { status: 403 });
            }
            throw error;
        }

        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
