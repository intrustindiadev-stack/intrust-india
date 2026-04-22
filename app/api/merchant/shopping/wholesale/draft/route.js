import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

/**
 * Creates a wholesale order draft for SabPaisa checkout.
 */
export async function POST(request) {
    const correlationId = randomUUID();

    try {
        const { items, merchantId } = await request.json();

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
        }

        if (!merchantId) {
            return NextResponse.json({ error: 'Merchant ID is required' }, { status: 400 });
        }

        // 1. Auth check
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid authorization header.' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        const supabaseContextClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );

        const { data: { user }, error: authError } = await supabaseContextClient.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 2. Identity Validation: Verify merchant belongs to user
        const { data: merchant, error: merchantErr } = await supabaseAdmin
            .from('merchants')
            .select('id')
            .eq('id', merchantId)
            .eq('user_id', user.id)
            .single();

        if (merchantErr || !merchant) {
            return NextResponse.json({ error: 'Unauthorized: Merchant identity mismatch' }, { status: 403 });
        }

        // 3. Validate Stock and Calculate Total
        let totalPaise = 0;
        const validatedItems = [];

        for (const item of items) {
            const { data: product, error: prodErr } = await supabaseAdmin
                .from('shopping_products')
                .select('id, admin_stock, wholesale_price_paise, title, gst_percentage')
                .eq('id', item.product_id)
                .single();

            if (prodErr || !product) {
                return NextResponse.json({ error: `Product not found: ${item.product_id}` }, { status: 404 });
            }

            if (product.admin_stock < item.quantity) {
                return NextResponse.json({ error: `Insufficient stock for ${product.title}` }, { status: 400 });
            }

            const basePaise = product.wholesale_price_paise * item.quantity;
            const gstPaise = Math.round(basePaise * (product.gst_percentage || 0) / 100);
            totalPaise += basePaise + gstPaise;
            validatedItems.push({
                product_id: product.id,
                quantity: item.quantity,
                unit_price_paise: product.wholesale_price_paise,
                gst_amount_paise: gstPaise
            });
        }

        // 4. Create Draft
        const { data: draft, error: draftErr } = await supabaseAdmin
            .from('wholesale_order_drafts')
            .insert({
                merchant_id: merchantId,
                items: validatedItems,
                total_amount_paise: totalPaise,
                expected_amount_paise: totalPaise,
                status: 'pending'
            })
            .select('id')
            .single();

        if (draftErr) {
            console.error('[Wholesale Draft Error]', draftErr);
            return NextResponse.json({ error: 'Failed to create wholesale draft' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            draftId: draft.id,
            totalPaise: totalPaise
        });

    } catch (error) {
        console.error('[Wholesale Draft Catch]', error);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
