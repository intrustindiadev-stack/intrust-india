import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';

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

        if (body.merchant_id) {
            const { createAdminClient } = await import('@/lib/supabaseServer');
            const adminClient = createAdminClient();
            
            const { data: prodData, error: prodError } = await adminClient.from('shopping_products').insert({
                title,
                description,
                category,
                category_id,
                wholesale_price_paise,
                suggested_retail_price_paise,
                mrp_paise: body.mrp_paise || suggested_retail_price_paise,
                admin_stock,
                product_images: product_images || [],
                is_active,
                gst_percentage: gst_percentage || 0,
                hsn_code: hsn_code || '9971',
                platform_listed: true,
                approval_status: 'live',
                submitted_by_merchant_id: body.merchant_id
            }).select('*').single();

            if (prodError) throw prodError;

            const { error: invError } = await adminClient.from('merchant_inventory').insert({
                product_id: prodData.id,
                merchant_id: body.merchant_id,
                retail_price_paise: suggested_retail_price_paise,
                stock_quantity: admin_stock,
                is_active: true,
                is_platform_product: false
            });
            
            if (invError) throw invError;
            
            return NextResponse.json({ product: prodData }, { status: 201 });
        }

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
            .update({ deleted_at: new Date().toISOString(), is_active: false })
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

// GET /api/admin/shopping/products — list products with pagination and filters
export async function GET(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in.' },
                { status: 401 }
            );
        }

        // Verify Admin Role
        const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !['admin', 'super_admin'].includes(userProfile?.role)) {
            return NextResponse.json(
                { error: 'Forbidden. Admin access required.' },
                { status: 403 }
            );
        }

        const adminSupabase = createAdminClient();
        const { searchParams } = new URL(request.url);

        const tab = searchParams.get('tab') || 'platform';
        const search = searchParams.get('search') || '';
        const category = searchParams.get('category') || '';
        const oosOnly = searchParams.get('oosOnly') === 'true';
        const merchantId = searchParams.get('merchantId') || '';
        const page = parseInt(searchParams.get('page')) || 1;
        const pageSize = parseInt(searchParams.get('pageSize')) || 20;

        const from = (page - 1) * pageSize;
        const to = page * pageSize - 1;

        let query = adminSupabase
            .from('admin_shopping_products_v')
            .select(`
                *,
                shopping_categories (name),
                merchant_inventory (
                    id,
                    is_active,
                    stock_quantity,
                    is_platform_product,
                    merchant_id,
                    retail_price_paise,
                    merchants (id, business_name)
                )
            `, { count: 'exact' });

        // Filter out deleted products
        query = query.is('deleted_at', null);

        // Filter by tab
        if (tab === 'custom') {
            query = query.eq('is_custom', true);
        } else {
            query = query.eq('is_custom', false);
        }

        // Filter by search (title or merchant business name)
        if (search) {
            query = query.or(`title.ilike.%${search}%,custom_merchant_name.ilike.%${search}%`);
        }

        // Filter by category_id (UUID sent from client dropdown)
        // Using the FK instead of the denormalized text column makes this rename-safe
        if (category && category !== 'all') {
            query = query.eq('category_id', category);
        }

        // Filter by out-of-stock
        if (oosOnly) {
            query = query.eq('is_oos', true);
        }

        // Filter by merchantId (custom products only)
        if (tab === 'custom' && merchantId && merchantId !== 'all') {
            query = query.eq('custom_merchant_id', merchantId);
        }

        // Order by created_at desc, then id desc for stable pagination
        query = query.order('created_at', { ascending: false });
        query = query.order('id', { ascending: false });

        // Pagination
        query = query.range(from, to);

        const { data: products, count: totalCount, error: queryError } = await query;

        if (queryError) {
            console.error('Error fetching admin products:', queryError);
            throw queryError;
        }

        return NextResponse.json({
            products: products || [],
            totalCount: totalCount || 0,
            page,
            pageSize
        }, { status: 200 });
    } catch (error) {
        console.error('Admin products fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
