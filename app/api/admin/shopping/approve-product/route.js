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

        // 2. Verify Admin Role
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

        // 3. Get Request Data
        const body = await request.json();
        const { productId, action, rejectionReason } = body;

        if (!productId || !['approve', 'reject'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid request. Missing productId or valid action.' },
                { status: 400 }
            );
        }

        // 4. Fetch existing Product
        const { data: existingProduct, error: fetchError } = await adminSupabase
            .from('shopping_products')
            .select(`
                *,
                merchants!shopping_products_submitted_by_merchant_id_fkey(
                    user_id
                )
            `)
            .eq('id', productId)
            .single();

        if (fetchError || !existingProduct) {
            return NextResponse.json(
                { error: 'Product not found.' },
                { status: 404 }
            );
        }

        if (existingProduct.approval_status !== 'pending_approval') {
            return NextResponse.json(
                { error: 'Product is not pending approval.' },
                { status: 409 }
            );
        }

        const targetUserId = existingProduct.merchants?.user_id;

        if (action === 'approve') {
            // Update product status
            const { error: updateProductError } = await adminSupabase
                .from('shopping_products')
                .update({ approval_status: 'live', is_active: true })
                .eq('id', productId);

            if (updateProductError) throw updateProductError;

            // Update merchant_inventory
            const { error: updateInvError } = await adminSupabase
                .from('merchant_inventory')
                .update({ is_active: true })
                .eq('product_id', productId)
                .eq('is_platform_product', false);
            
            if (updateInvError) throw updateInvError;

            // Notify user
            if (targetUserId) {
                await adminSupabase.from('notifications').insert({
                    user_id: targetUserId,
                    title: 'Product Approved ✅',
                    body: `Your product "${existingProduct.title}" has been approved and is now live!`,
                    type: 'success',
                    reference_type: 'product_approved',
                    reference_id: productId,
                    read: false
                });
            }

            // Log Action
            await adminSupabase.from('audit_logs').insert([{
                actor_id: user.id,
                actor_role: 'admin',
                action: 'admin_action',
                entity_type: 'shopping_product',
                entity_id: productId,
                description: `Approved custom product: ${existingProduct.title}`,
                metadata: {
                    sub_action: 'product_approval',
                    status: 'approved'
                }
            }]);

        } else if (action === 'reject') {
            // Update product status
            const { error: rejectError } = await adminSupabase
                .from('shopping_products')
                .update({ approval_status: 'rejected', rejection_reason: rejectionReason || null })
                .eq('id', productId);
            
            if (rejectError) throw rejectError;

            // Notify user
            if (targetUserId) {
                await adminSupabase.from('notifications').insert({
                    user_id: targetUserId,
                    title: 'Product Rejected ❌',
                    body: `Your product "${existingProduct.title}" was not approved. Reason: ${rejectionReason || 'No reason provided'}`,
                    type: 'error',
                    reference_type: 'product_rejected',
                    reference_id: productId,
                    read: false
                });
            }

            // Log Action
            await adminSupabase.from('audit_logs').insert([{
                actor_id: user.id,
                actor_role: 'admin',
                action: 'admin_action',
                entity_type: 'shopping_product',
                entity_id: productId,
                description: `Rejected custom product: ${existingProduct.title}`,
                metadata: {
                    sub_action: 'product_approval',
                    status: 'rejected',
                    reason: rejectionReason
                }
            }]);
        }

        return NextResponse.json({
            success: true,
            message: `Product successfully ${action}d.`
        });

    } catch (error) {
        console.error('Unexpected error in approve-product:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred.' },
            { status: 500 }
        );
    }
}
