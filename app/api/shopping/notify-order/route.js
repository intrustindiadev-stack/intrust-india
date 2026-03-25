import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { group_id, amount_paise } = body;

        if (!group_id || !amount_paise) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const admin = createAdminClient();

        // Security check: ensure order group exists, belongs to user, and is completed
        const { data: orderGroup, error: orderError } = await admin
            .from('shopping_order_groups')
            .select('id, status, customer_id')
            .eq('id', group_id)
            .eq('customer_id', user.id)
            .eq('status', 'completed')
            .single();

        if (orderError || !orderGroup) {
            console.error('[Notify Order] Order validation failed:', orderError?.message || 'Order not found or not completed');
            // Do not reveal too much info if possible, but still allow tracking
            return NextResponse.json({ success: true }); // Return true to avoid client errors, but we don't send notification
        }

        const formattedAmount = (amount_paise / 100).toFixed(2);

        // Insert Customer Notification
        const { error: notifyError } = await admin.from('notifications').insert({
            user_id: user.id,
            title: 'Order Placed Successfully ✅',
            body: `Your order of ₹${formattedAmount} has been confirmed.`,
            type: 'success',
            reference_id: group_id,
            reference_type: 'shopping_order'
        });

        if (notifyError) {
            console.error('[Notify Order] Failed to insert notification:', notifyError.message);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Notify Order] Server Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
