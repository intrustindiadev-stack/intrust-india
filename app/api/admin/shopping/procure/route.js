import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { getPlatformConfig } from '@/lib/config/platform-server';
import { notifyMerchantProcurementSale } from '@/lib/notifications/merchantWhatsapp';

export async function POST(request) {
    try {
        // ── Step 1: Auth ────────────────────────────────────────────────
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in.' },
                { status: 401 }
            );
        }

        // ── Step 2: Role check ──────────────────────────────────────────
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

        // ── Step 3: Parse body ──────────────────────────────────────────
        const body = await request.json();
        const { merchantId, items, idempotencyKey } = body;

        if (!merchantId || !Array.isArray(items) || items.length === 0 || !idempotencyKey) {
            return NextResponse.json(
                { error: 'Invalid request. merchantId, items[], and idempotencyKey are required.' },
                { status: 400 }
            );
        }

        // Validate each item
        for (const item of items) {
            if (!item.product_id || !item.merchant_inventory_id || !item.quantity || !item.platform_price_paise) {
                return NextResponse.json(
                    { error: 'Each item must have product_id, merchant_inventory_id, quantity, and platform_price_paise.' },
                    { status: 400 }
                );
            }
            if (item.quantity <= 0) {
                return NextResponse.json(
                    { error: 'Item quantity must be greater than zero.' },
                    { status: 400 }
                );
            }
            if (item.platform_price_paise <= 0) {
                return NextResponse.json(
                    { error: 'Platform price must be greater than zero.' },
                    { status: 400 }
                );
            }
        }

        // ── Step 4: Call RPC ────────────────────────────────────────────
        const adminSupabase = createAdminClient();

        const { data: rpcResult, error: rpcError } = await adminSupabase.rpc('procure_from_merchant', {
            p_merchant_id: merchantId,
            p_items: items,
            p_idempotency_key: idempotencyKey,
            p_admin_id: user.id,  // service_role has no JWT so auth.uid() is NULL inside the RPC
        });

        // ── Step 5: Map RPC errors ──────────────────────────────────────
        if (rpcError) {
            const msg = rpcError.message || '';
            console.error('[procure/route] RPC error:', msg);

            if (msg.includes('Unauthorized')) {
                return NextResponse.json({ error: msg }, { status: 403 });
            }
            if (msg.includes('not found') || msg.includes('Not Found')) {
                return NextResponse.json({ error: msg }, { status: 404 });
            }
            if (msg.includes('not approved') || msg.includes('Insufficient') || msg.includes('not live')) {
                return NextResponse.json({ error: msg }, { status: 409 });
            }
            return NextResponse.json({ error: msg || 'Procurement failed.' }, { status: 500 });
        }

        const { procurement_id, total_amount_paise, total_gst_paise, idempotent, invoice_number: invoiceNumber } = rpcResult;

        // ── Step 6: invoice_number is now generated atomically inside the RPC ──
        // The route no longer needs to compute or write it post-commit.
        // Both fresh procurements and idempotent replays include it in rpcResult.
        try {
            if (idempotent) {
                return NextResponse.json({
                    success: true,
                    procurement_id,
                    total_amount_paise,
                    total_gst_paise,
                    invoice_number: invoiceNumber || null,
                });
            }

            // ── Step 6.5: Fire WhatsApp Notification ─────────────────────
            try {
                // Fetch merchant user_id
                const { data: merchantData } = await adminSupabase
                    .from('merchants')
                    .select('user_id')
                    .eq('id', merchantId)
                    .single();

                if (merchantData?.user_id) {
                    const amountRs = (total_amount_paise / 100).toFixed(2);
                    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

                    // fire-and-forget (non-fatal)
                    notifyMerchantProcurementSale({
                        merchantUserId: merchantData.user_id,
                        amountRs,
                        itemCount,
                        procurementId: procurement_id
                    }).catch(err => console.error('[procure/route] WhatsApp notification failed:', err));
                }
            } catch (notifyErr) {
                console.error('[procure/route] WhatsApp notification wrapper failed:', notifyErr);
            }

            // ── Step 7: Return success ──────────────────────────────────
            return NextResponse.json({
                success: true,
                procurement_id,
                total_amount_paise,
                total_gst_paise,
                invoice_number: invoiceNumber || null,
            });

        } catch (invoiceErr) {
            // Invoice number generation is non-critical — procurement already succeeded
            console.warn('[procure/route] Invoice number generation failed (non-fatal):', invoiceErr.message);

            return NextResponse.json({
                success: true,
                procurement_id,
                total_amount_paise,
                total_gst_paise,
            });
        }

    } catch (error) {
        console.error('[procure/route] Unexpected error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred.' },
            { status: 500 }
        );
    }
}
