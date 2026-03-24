import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

// POST /api/admin/shopping/products — create a new platform product
export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            title,
            description,
            category,
            category_id,
            wholesale_price_paise,
            suggested_retail_price_paise,
            admin_stock,
            image_url,
            is_active,
        } = body;

        // Use RPC to bypass RLS safely without service role key
        const { data, error } = await supabase.rpc('admin_insert_shopping_product', {
            p_title: title,
            p_description: description,
            p_category: category,
            p_category_id: category_id,
            p_wholesale_price: wholesale_price_paise,
            p_retail_price: suggested_retail_price_paise,
            p_admin_stock: admin_stock,
            p_image_url: image_url,
            p_is_active: is_active
        });

        if (error) {
            console.error('RPC Error:', error);
            throw error;
        }

        return NextResponse.json({ product: data }, { status: 201 });
    } catch (error) {
        console.error('Admin product create error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH /api/admin/shopping/products — update an existing platform product
export async function PATCH(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...payload } = body;

        if (!id) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
        }

        // Use RPC to bypass RLS safely
        const { data, error } = await supabase.rpc('admin_update_shopping_product', {
            p_id: id,
            p_title: payload.title,
            p_description: payload.description,
            p_category: payload.category,
            p_category_id: payload.category_id,
            p_wholesale_price: payload.wholesale_price_paise,
            p_retail_price: payload.suggested_retail_price_paise,
            p_admin_stock: payload.admin_stock,
            p_image_url: payload.image_url,
            p_is_active: payload.is_active
        });

        if (error) {
            console.error('RPC Error:', error);
            throw error;
        }

        return NextResponse.json({ product: data }, { status: 200 });
    } catch (error) {
        console.error('Admin product update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
