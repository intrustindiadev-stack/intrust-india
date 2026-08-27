import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';

// POST /api/admin/shopping/fashion-data
export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { product_id, category_id, variants } = body;

        if (!product_id || !category_id || !variants || !Array.isArray(variants)) {
            return NextResponse.json({ error: 'Missing required fashion data' }, { status: 400 });
        }

        const adminSupabase = createAdminClient();
        
        // This is safe because only admin and the submit-product API route can call this,
        // but we should ideally ensure the caller has permission to edit this product.
        // For merchants, they use /api/merchant/shopping/submit-product which does the RLS check
        // and calls this using the admin role.
        // If this is called directly by a client, we should ensure the user owns the product or is an admin.
        const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
        const isAdmin = ['admin', 'super_admin'].includes(profile?.role);
        
        if (!isAdmin) {
             // If not admin, verify ownership
             const { data: product } = await supabase.from('shopping_products')
                 .select('submitted_by_merchant_id')
                 .eq('id', product_id)
                 .single();
                 
             const { data: merchant } = await supabase.from('merchants')
                 .select('user_id')
                 .eq('id', product?.submitted_by_merchant_id)
                 .single();
                 
             if (!merchant || merchant.user_id !== user.id) {
                 return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
             }
        }

        const { data, error } = await adminSupabase.rpc('upsert_fashion_product_data', {
            p_product_id: product_id,
            p_category_id: category_id,
            p_variants: variants
        });

        if (error || (data && data.success === false)) {
            console.error('Fashion upsert error:', error || data.error);
            return NextResponse.json({ error: error?.message || data?.error || 'Failed to save fashion data' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Fashion data API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/admin/shopping/fashion-data
export async function DELETE(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const product_id = searchParams.get('product_id');

        if (!product_id) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
        }

        const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
        const isAdmin = ['admin', 'super_admin'].includes(profile?.role);
        
        if (!isAdmin) {
             const { data: product } = await supabase.from('shopping_products')
                 .select('submitted_by_merchant_id')
                 .eq('id', product_id)
                 .single();
                 
             const { data: merchant } = await supabase.from('merchants')
                 .select('user_id')
                 .eq('id', product?.submitted_by_merchant_id)
                 .single();
                 
             if (!merchant || merchant.user_id !== user.id) {
                 return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
             }
        }

        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase.rpc('delete_fashion_product_data', {
            p_product_id: product_id
        });

        if (error || (data && data.success === false)) {
            return NextResponse.json({ error: error?.message || data?.error || 'Failed to delete' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
