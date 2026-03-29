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
            product_images,
            is_active,
            gst_percentage,
            hsn_code
        } = body;

        // Use RPC to bypass RLS safely without service role key
        const { data, error } = await supabase.rpc('admin_insert_shopping_product', {
            p_title: title,
            p_description: description,
            p_category: category,
            p_category_id: category_id,
            p_wholesale_price: wholesale_price_paise,
            p_retail_price: suggested_retail_price_paise,
            p_mrp_paise: body.mrp_paise || suggested_retail_price_paise,
            p_admin_stock: admin_stock,
            p_image_url: image_url,
            p_product_images: product_images || [],
            p_is_active: is_active,
            p_gst_percentage: gst_percentage || 0,
            p_hsn_code: hsn_code || null
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

        const payloadKeys = Object.keys(payload);
        if (payloadKeys.length === 1 && payloadKeys[0] === 'admin_stock') {
            const { data, error } = await supabase.rpc('admin_update_product_stock', {
                p_id: id,
                p_admin_stock: payload.admin_stock
            });

            if (error) {
                console.error('RPC Error:', error);
                throw error;
            }

            return NextResponse.json({ product: data }, { status: 200 });
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
            p_mrp_paise: payload.mrp_paise,
            p_admin_stock: payload.admin_stock,
            p_image_url: payload.image_url,
            p_product_images: payload.product_images || [],
            p_is_active: payload.is_active,
            p_gst_percentage: payload.gst_percentage || 0,
            p_hsn_code: payload.hsn_code || null
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
