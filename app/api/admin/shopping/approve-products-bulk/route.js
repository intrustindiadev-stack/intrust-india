import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { notifyMerchantProductDecision } from '@/lib/notifications/merchantWhatsapp';

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
        const { productIds } = body;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json(
                { error: 'Invalid request. Missing productIds.' },
                { status: 400 }
            );
        }

        // 4. Fetch existing Products that are pending
        const { data: existingProducts, error: fetchError } = await adminSupabase
            .from('shopping_products')
            .select(`
                *,
                merchants!shopping_products_submitted_by_merchant_id_fkey(
                    user_id
                )
            `)
            .in('id', productIds)
            .eq('approval_status', 'pending_approval');

        if (fetchError || !existingProducts || existingProducts.length === 0) {
            return NextResponse.json(
                { error: 'No pending products found for the given IDs.' },
                { status: 404 }
            );
        }

        const validProductIds = existingProducts.map(p => p.id);

        // Update product statuses
        const { error: updateProductError } = await adminSupabase
            .from('shopping_products')
            .update({
                approval_status: 'live',
                is_active: true,
                reviewed_at: new Date().toISOString(),
                reviewed_by: user.id
            })
            .in('id', validProductIds);

        if (updateProductError) throw updateProductError;

        // Update merchant_inventory
        const { error: updateInvError } = await adminSupabase
            .from('merchant_inventory')
            .update({ is_active: true })
            .in('product_id', validProductIds)
            .eq('is_platform_product', false);

        if (updateInvError) throw updateInvError;

        // Collect notifications
        const notifications = [];
        const auditLogs = [];

        for (const product of existingProducts) {
            const targetUserId = product.merchants?.user_id;

            if (targetUserId) {
                notifications.push({
                    user_id: targetUserId,
                    title: 'Product Approved ✅',
                    body: `Your product "${product.title}" has been approved and is now live!`,
                    type: 'success',
                    reference_type: 'product_approved',
                    reference_id: product.id,
                    read: false
                });

                // WhatsApp Notification (sent asynchronously, might want to batch if supported, but loop is okay for now)
                notifyMerchantProductDecision({
                    merchantUserId: targetUserId,
                    title: product.title,
                    decision: 'Approved ✅',
                    reason: 'Your product is now live on the platform!'
                });
            }

            auditLogs.push({
                actor_id: user.id,
                actor_role: 'admin',
                action: 'admin_action',
                entity_type: 'shopping_product',
                entity_id: product.id,
                description: `Approved custom product (Bulk): ${product.title}`,
                metadata: {
                    sub_action: 'product_approval_bulk',
                    status: 'approved'
                }
            });
        }

        if (notifications.length > 0) {
            await adminSupabase.from('notifications').insert(notifications);
        }

        if (auditLogs.length > 0) {
            await adminSupabase.from('audit_logs').insert(auditLogs);
        }

        return NextResponse.json({
            success: true,
            message: `Successfully approved ${validProductIds.length} products.`,
            approvedIds: validProductIds
        });

    } catch (error) {
        console.error('Unexpected error in approve-products-bulk:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred.' },
            { status: 500 }
        );
    }
}
