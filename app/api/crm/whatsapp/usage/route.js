import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const todayStr = new Date().toISOString().split('T')[0];

        // RLS ensures the user can only read their own usage
        const { data: usage, error: usageError } = await supabase
            .from('crm_message_usage')
            .select('message_count')
            .eq('crm_user_id', user.id)
            .eq('usage_date', todayStr)
            .maybeSingle();

        if (usageError) {
            console.error('[usage API] DB Error:', usageError);
            return NextResponse.json({ error: 'Database error fetching usage' }, { status: 500 });
        }

        return NextResponse.json({
            usage: usage?.message_count || 0,
            limit: 100
        }, { status: 200 });
    } catch (err) {
        console.error('[usage API] Internal server error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
