import { NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';

export async function POST(request) {
    try {
        // Auth check
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        const authSupabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = token
            ? await authSupabase.auth.getUser(token)
            : await authSupabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { merchantId, products } = body;

        if (!merchantId || !Array.isArray(products) || products.length === 0) {
            return NextResponse.json({ error: 'merchantId and products array are required' }, { status: 400 });
        }

        if (products.length > 100) {
            return NextResponse.json({ error: 'Maximum 100 products per bulk submission' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // Verify merchant ownership
        const { data: merchant, error: merchantErr } = await supabase
            .from('merchants')
            .select('id, user_id')
            .eq('id', merchantId)
            .single();

        if (merchantErr || !merchant || merchant.user_id !== user.id) {
            return NextResponse.json({ error: 'Merchant not found or unauthorized' }, { status: 403 });
        }

        // Process each product
        const results = await Promise.allSettled(
            products.map(async (product, index) => {
                try {
                    const {
                        title, category, product_images = [],
                        retail_price_paise, mrp_paise, wholesale_price_paise,
                        gst_percentage = 0, hsn_code = '9971', stock_quantity = 0,
                    } = product;

                    if (!title?.trim()) throw new Error('Product name is required');
                    if (!retail_price_paise || retail_price_paise <= 0) throw new Error('Invalid selling price');
                    if (!mrp_paise || mrp_paise <= 0) throw new Error('Invalid MRP');

                    // Look up category_id
                    let category_id = null;
                    if (category) {
                        const { data: catData } = await supabase
                            .from('shopping_categories')
                            .select('id')
                            .eq('name', category)
                            .maybeSingle();
                        category_id = catData?.id || null;
                    }

                    // Create the shopping_products record (custom product = merchant submitted)
                    const { data: newProduct, error: productErr } = await supabase
                        .from('shopping_products')
                        .insert({
                            title: title.trim(),
                            description: product.description || '',
                            category: category || 'General',
                            category_id,
                            product_images,
                            wholesale_price_paise: wholesale_price_paise || 0,
                            suggested_retail_price_paise: retail_price_paise,
                            mrp_paise: mrp_paise || retail_price_paise,
                            gst_percentage,
                            hsn_code,
                            approval_status: 'pending_approval',
                            is_platform_product: false,
                            submitted_by_merchant_id: merchantId,
                        })
                        .select('id')
                        .single();

                    if (productErr || !newProduct) throw new Error(productErr?.message || 'Failed to create product');

                    // Create merchant_inventory record
                    const { error: invErr } = await supabase
                        .from('merchant_inventory')
                        .insert({
                            merchant_id: merchantId,
                            product_id: newProduct.id,
                            is_platform_product: false,
                            retail_price_paise,
                            stock_quantity,
                            is_active: false, // inactive until approved
                            custom_title: title.trim(),
                            custom_description: product.description || '',
                        });

                    if (invErr) throw new Error(invErr?.message || 'Failed to add to inventory');

                    return { index, title: title.trim(), success: true };
                } catch (err) {
                    return { index, title: product.title || `Product ${index + 1}`, success: false, error: err.message };
                }
            })
        );

        const finalResults = results.map(r => r.status === 'fulfilled' ? r.value : { ...r.reason, success: false });

        return NextResponse.json({ results: finalResults });
    } catch (err) {
        console.error('Bulk submit error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
