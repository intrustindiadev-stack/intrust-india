import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request) {
    try {
        // Auth check via SSR client
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll() { return cookieStore.getAll(); },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            try { cookieStore.set(name, value, options); } catch (e) {}
                        });
                    },
                },
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use service role to fetch orders for this user
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: orders, error } = await adminSupabase
            .from('nfc_orders')
            .select('id, card_holder_name, phone, delivery_address, status, sale_price_paise, payment_status, payment_method, created_at, updated_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching NFC orders:', error);
            return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
        }

        return NextResponse.json({ orders: orders || [] });

    } catch (err) {
        console.error('NFC orders API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
