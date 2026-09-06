import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const merchantSlug = searchParams.get('merchantSlug');
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const limit = parseInt(searchParams.get('limit') || '24', 10);
        const search = searchParams.get('search') || '';
        const category = searchParams.get('category') || '';
        const subCategory = searchParams.get('sub_category') || null;
        const minPrice = searchParams.get('min_price') ? parseInt(searchParams.get('min_price'), 10) : null;
        const maxPrice = searchParams.get('max_price') ? parseInt(searchParams.get('max_price'), 10) : null;
        const brand = searchParams.get('brand') || '';
        const size = searchParams.get('size') || '';
        const color = searchParams.get('color') || '';
        const lastId = searchParams.get('lastId') || null;

        if (!merchantSlug) {
            return NextResponse.json({ error: 'merchantSlug is required' }, { status: 400 });
        }

        const supabase = await createServerSupabaseClient();
        
        // Fetch products via the optimized unified pagination RPC
        const { data, error } = await supabase.rpc('get_storefront_page', {
            p_merchant_slug: merchantSlug,
            p_offset: offset,
            p_limit: limit,
            p_search: search,
            p_category: category,
            p_last_id: lastId || null,
            p_price_min: minPrice,
            p_price_max: maxPrice,
            p_brand: brand,
            p_size: size,
            p_color: color,
            p_sub_category: subCategory
        });

        if (error) {
            console.error('Error fetching storefront page via RPC:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (data && data.error) {
            return NextResponse.json({ error: data.error }, { status: 404 });
        }

        return NextResponse.json({
            items:      data?.items      || [],
            hasMore:    data?.hasMore    || false,
            totalCount: data?.totalCount ?? 0,
        });
    } catch (error) {
        console.error('Storefront paged products API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

