import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const adminSupabase = createAdminClient();

        // 1. Verify Authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in.' },
                { status: 401 }
            );
        }

        // 2. Get Request Data
        const body = await request.json();
        const { merchantId, editMode, productId, formData } = body;

        // Verify that the user is the owner of this merchant account or an admin
        const { data: merchantProfile, error: merchantProfileError } = await supabase
            .from('merchants')
            .select('user_id, business_name')
            .eq('id', merchantId)
            .single();

        if (merchantProfileError || (!merchantProfile && user.id !== merchantProfile?.user_id)) {
            // Check if user is admin (emergency bypass)
            const { data: userRole } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
            if (userRole?.role !== 'admin' && userRole?.role !== 'super_admin') {
                return NextResponse.json(
                    { error: 'Forbidden. You do not own this merchant account.' },
                    { status: 403 }
                );
            }
        }

        let savedProduct;

        if (editMode && productId) {
            // UPDATE existing product
            const { data: updatedProduct, error: productUpdateError } = await adminSupabase
                .from('shopping_products')
                .update({
                    title: formData.title,
                    description: formData.description,
                    category: formData.category,
                    category_id: formData.category_id,
                    product_images: formData.product_images,
                    wholesale_price_paise: formData.wholesale_price_paise,
                    suggested_retail_price_paise: formData.retail_price_paise,
                    mrp_paise: formData.mrp_paise,
                    gst_percentage: formData.gst_percentage,
                    hsn_code: formData.hsn_code,
                    approval_status: 'pending_approval',
                    rejection_reason: null,
                    submitted_at: new Date().toISOString()
                })
                .eq('id', productId)
                .select()
                .single();

            if (productUpdateError) throw productUpdateError;
            savedProduct = updatedProduct;

            // UPDATE existing inventory
            const { error: invUpdateError } = await adminSupabase
                .from('merchant_inventory')
                .update({
                    custom_title: formData.title,
                    custom_description: formData.description,
                    retail_price_paise: formData.retail_price_paise,
                    stock_quantity: formData.stock_quantity,
                    is_active: false // Reset to inactive until re-approved
                })
                .eq('product_id', productId)
                .eq('merchant_id', merchantId)
                .eq('is_platform_product', false);

            if (invUpdateError) throw invUpdateError;

        } else {
            // INSERT new product
            const { data: newProduct, error: productError } = await adminSupabase
                .from('shopping_products')
                .insert([{
                    title: formData.title,
                    description: formData.description,
                    category: formData.category,
                    category_id: formData.category_id,
                    product_images: formData.product_images,
                    wholesale_price_paise: formData.wholesale_price_paise,
                    suggested_retail_price_paise: formData.retail_price_paise,
                    mrp_paise: formData.mrp_paise,
                    admin_stock: 0,
                    gst_percentage: formData.gst_percentage,
                    hsn_code: formData.hsn_code,
                    approval_status: 'pending_approval',
                    is_active: false,
                    submitted_by_merchant_id: merchantId,
                    submitted_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (productError) throw productError;
            savedProduct = newProduct;

            // Create entry in merchant_inventory
            const { error: invError } = await adminSupabase
                .from('merchant_inventory')
                .insert([{
                    merchant_id: merchantId,
                    product_id: newProduct.id,
                    custom_title: formData.title,
                    custom_description: formData.description,
                    retail_price_paise: formData.retail_price_paise,
                    stock_quantity: formData.stock_quantity,
                    is_platform_product: false,
                    is_active: false
                }]);

            if (invError) throw invError;
        }

        // 3. Notify Admins
        try {
            const { data: admins } = await adminSupabase
                .from('user_profiles')
                .select('id')
                .in('role', ['admin', 'super_admin']);

            if (admins && admins.length > 0) {
                const notifications = admins.map(admin => ({
                    user_id: admin.id,
                    title: 'New Product Approval Request 📦',
                    body: `Merchant "${merchantProfile?.business_name || 'A merchant'}" has submitted "${formData.title}" for approval.`,
                    type: 'info',
                    reference_type: 'custom_product_submission',
                    reference_id: savedProduct.id,
                    read: false
                }));
                await adminSupabase.from('notifications').insert(notifications);
            }
        } catch (notifError) {
            console.error('Error sending admin notifications:', notifError);
        }

        return NextResponse.json({
            success: true,
            productId: savedProduct.id,
            message: 'Product submitted for approval successfully.'
        });

    } catch (error) {
        console.error('Unexpected error in submit-product:', error);
        return NextResponse.json(
            { error: error.message || 'An unexpected error occurred.' },
            { status: 500 }
        );
    }
}
