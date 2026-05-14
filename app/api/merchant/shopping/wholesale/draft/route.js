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

        // 3. Create Draft securely via RPC
        const { data: result, error: rpcError } = await supabaseAdmin.rpc('create_wholesale_draft', {
            p_merchant_id: merchantId,
            p_items: items
        });

        if (rpcError) {
            console.error('[Wholesale Draft RPC Error]', rpcError);
            if (rpcError.message && rpcError.message.includes('Insufficient stock')) {
                return NextResponse.json({ error: rpcError.message }, { status: 400 });
            }
            if (rpcError.message && rpcError.message.includes('Product not found')) {
                return NextResponse.json({ error: rpcError.message }, { status: 404 });
            }
            return NextResponse.json({ error: 'Failed to create wholesale draft' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            draftId: result.draft_id,
            totalPaise: result.total_amount_paise
        });

    } catch (error) {
        console.error('[Wholesale Draft Catch]', error);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
