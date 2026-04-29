import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function PATCH(request) {
    try {
        const supabase = await createServerSupabaseClient();

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { transactionId } = body;

        if (!transactionId) {
            return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
        }

        // Update the is_scratched column
        const { data, error } = await supabase
            .from('reward_transactions')
            .update({ is_scratched: true })
            .eq('id', transactionId)
            .eq('user_id', user.id) // Ensure they only scratch their own rewards
            .select()
            .single();

        if (error) {
            console.error('Error updating scratch status:', error);
            return NextResponse.json({ success: false, error: 'Failed to update scratch status' }, { status: 500 });
        }

        return NextResponse.json({ success: true, transaction: data });
    } catch (error) {
        console.error('Scratch API error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
