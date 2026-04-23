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
            product_images,
            is_active,
            gst_percentage,
            hsn_code
        } = body;

        const { data, error } = await supabase.rpc('admin_insert_shopping_product', {
            p_title: title,
            p_description: description,
            p_category: category,
            p_category_id: category_id,
            p_wholesale_price: wholesale_price_paise,
            p_retail_price: suggested_retail_price_paise,
            p_mrp_paise: body.mrp_paise || suggested_retail_price_paise,
            p_admin_stock: admin_stock,
            p_product_images: product_images || [],
            p_is_active: is_active,
            p_gst_percentage: gst_percentage || 0,
            p_hsn_code: hsn_code || '9971'
        });

        if (error) {
            if (error.code === '23514') {
                return NextResponse.json({ error: 'Data constraint violation.' }, { status: 400 });
            }
            if (error.code === '23502') {
                return NextResponse.json({ error: 'Missing required system field.' }, { status: 400 });
            }
            if (error.code === '23503') {
                return NextResponse.json({ error: 'Foreign key violation. A linked record is missing.' }, { status: 400 });
            }
            console.error('RPC Error:', error);
            throw error;
        }

        // Notify all merchants about the new product
        try {
            const { createAdminClient } = await import('@/lib/supabaseServer');
            const supabaseAdmin = createAdminClient();
            const { data: merchants } = await supabaseAdmin
                .from('merchants')
                .select('user_id')
                .eq('status', 'approved');

            if (merchants && merchants.length > 0) {
                const notifications = merchants.map(m => ({
                    user_id: m.user_id,
                    title: 'New Product Available 🛍️',
                    body: `A new product "${title}" has been added to the wholesale catalog. Check it out now!`,
                    type: 'info',
                    reference_type: 'wholesale_product',
                    reference_id: data.id,
                    read: false
                }));
                await supabaseAdmin.from('notifications').insert(notifications);
            }
        } catch (notifError) {
            console.error('Error notifying merchants about new product:', notifError);
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
                if (error.code === '23514') {
                    if (error.message?.includes('admin_stock_non_negative')) {
                        return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
                    }
                    return NextResponse.json({ error: 'Data constraint violation.' }, { status: 400 });
                }
                if (error.code === '23502') {
                    return NextResponse.json({ error: 'Missing required system field.' }, { status: 400 });
                }
                if (error.code === '23503') {
                    return NextResponse.json({ error: 'Foreign key violation. A linked record is missing.' }, { status: 400 });
                }
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
            p_product_images: payload.product_images || [],
            p_is_active: payload.is_active,
            p_gst_percentage: payload.gst_percentage || 0,
            p_hsn_code: payload.hsn_code || '9971'
        });

        if (error) {
            if (error.code === '23514') {
                return NextResponse.json({ error: 'Data constraint violation.' }, { status: 400 });
            }
            if (error.code === '23502') {
                return NextResponse.json({ error: 'Missing required system field.' }, { status: 400 });
            }
            if (error.code === '23503') {
                return NextResponse.json({ error: 'Foreign key violation. A linked record is missing.' }, { status: 400 });
            }
            console.error('RPC Error:', error);
            throw error;
        }

        return NextResponse.json({ product: data }, { status: 200 });
    } catch (error) {
        console.error('Admin product update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/admin/shopping/products?id=<productId> — delete a product
export async function DELETE(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('shopping_products')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('Delete error:', error);
            throw error;
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Admin product delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
