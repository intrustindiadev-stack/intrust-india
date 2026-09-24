import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireMerchantSubscription } from '@/lib/merchant/requireSubscription';

export const runtime = 'nodejs';

/**
 * POST /api/merchant/shopping/wholesale/checkout
 *
 * Decoupled server-owned wholesale wallet checkout endpoint.
 *
 * Security & Financial Contract:
 *   • Client sends ONLY { items: [{ product_id, quantity }] }.
 *   • Server authenticates user via Bearer token.
 *   • Server validates merchant identity and subscription status.
 *   • Server executes atomic stock deduction, wallet debit, inventory upsert,
 *     and transaction logging inside purchase_platform_products_bulk RPC.
 *   • Client never directly calls database purchase RPCs or updates wallet balance.
 */
export async function POST(request) {
    try {
        // 1. Subscription & Auth guard
        const subResult = await requireMerchantSubscription(request);
        if (!subResult.ok) return subResult.response;
        const { user, merchant } = subResult;

        const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid authorization header.' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1].trim();

        const body = await request.json().catch(() => ({}));
        const { items } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
        }

        // Validate items payload
        for (const item of items) {
            if (!item.product_id || typeof item.product_id !== 'string') {
                return NextResponse.json({ error: 'Invalid product_id in items' }, { status: 400 });
            }
            const qty = Number(item.quantity);
            if (!Number.isInteger(qty) || qty <= 0) {
                return NextResponse.json({ error: 'Item quantity must be a positive integer' }, { status: 400 });
            }
        }

        // 2. User context client: passes the authenticated Bearer token so auth.uid() matches user.id
        const supabaseContextClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );

        // 3. Execute atomic purchase in Postgres
        const { data, error } = await supabaseContextClient.rpc('purchase_platform_products_bulk', {
            p_items: items,
            p_merchant_id: merchant.id,
        });

        if (error) {
            console.error('[Wholesale Wallet Checkout RPC Error]', error);
            if (error.code === '23514' && error.message?.includes('admin_stock_non_negative')) {
                return NextResponse.json({ error: 'Insufficient stock to complete this purchase' }, { status: 400 });
            }
            return NextResponse.json({ error: error.message || 'Wholesale purchase failed' }, { status: 500 });
        }

        if (data && !data.success) {
            return NextResponse.json({ error: data.message || 'Wholesale purchase failed' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            batch_id: data?.batch_id,
            total_paise: data?.total_paise,
            message: data?.message || 'Bulk purchase successful',
        });

    } catch (error) {
        console.error('[Wholesale Wallet Checkout Catch]', error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
    }
}
