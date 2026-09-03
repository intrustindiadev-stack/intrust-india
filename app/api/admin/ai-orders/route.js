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
        if (!user || (user.user_metadata?.role !== 'ADMIN' && user.user_metadata?.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('ai_orders')
            .select(`
                *,
                merchant:merchant_id (id, full_name, store_name, phone_number)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Overview stats calculation
        const totalFed = data.length;
        const totalActive = data.filter(o => o.status === 'ACCEPTED').length;
        const totalProfitDistributed = data
            .filter(o => o.status === 'COMPLETED')
            .reduce((acc, curr) => acc + Number(curr.profit_margin_paise), 0);

        return NextResponse.json({
            orders: data,
            stats: { totalFed, totalActive, totalProfitDistributed }
        });
    } catch (error) {
        console.error('Error fetching AI orders:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
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
        if (!user || (user.user_metadata?.role !== 'ADMIN' && user.user_metadata?.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { product_name, wholesale_price_paise, retail_price_paise, profit_margin_paise } = body;

        if (!product_name || !wholesale_price_paise || !retail_price_paise || !profit_margin_paise) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('ai_orders')
            .insert([{
                admin_id: user.id,
                product_name,
                wholesale_price_paise,
                retail_price_paise,
                profit_margin_paise,
                status: 'PENDING'
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ order: data }, { status: 201 });
    } catch (error) {
        console.error('Error creating AI order:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
