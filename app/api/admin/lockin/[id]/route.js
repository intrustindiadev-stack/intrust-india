import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const supabase = createAdminClient();

        // 1. Auth & Admin Check
        const { data: { user } } = await supabase.auth.getUser(request.headers.get('authorization')?.replace('Bearer ', ''));
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Fetch specific Lockin details bypassing RLS
        const { data, error } = await supabase
            .from('merchant_lockin_balances')
            .select(`
                *,
                merchant:merchants(id, business_name, user_id, user_profiles(full_name, email))
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Fetch lockin error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: 'Lockin not found' }, { status: 404 });
        }

        return NextResponse.json({ data });
    } catch (err) {
        console.error('Lockin API error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
