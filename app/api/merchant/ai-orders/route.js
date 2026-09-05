import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    get(name) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch PENDING orders for all, and orders accepted/completed by THIS merchant
        const { data, error } = await supabase
            .from('ai_orders')
            .select('*')
            .or(`status.eq.PENDING,merchant_id.eq.${user.id}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ orders: data });
    } catch (error) {
        console.error('Error fetching AI orders for merchant:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
