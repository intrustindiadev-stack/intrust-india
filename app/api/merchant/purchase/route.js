import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { couponIds, merchantId } = await request.json();

        if (!couponIds || !Array.isArray(couponIds) || couponIds.length === 0) {
            return NextResponse.json({ success: false, message: 'Invalid coupon IDs' }, { status: 400 });
        }

        // Get current user to verify merchant ownership (if merchantId not provided/admin)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        // Call the RPC
        const { data, error } = await supabase.rpc('merchant_bulk_purchase_coupons', {
            p_coupon_ids: couponIds,
            p_merchant_id: merchantId || null
        });

        if (error) {
            console.error('RPC Error:', error);
            return NextResponse.json({ success: false, message: error.message }, { status: 500 });
        }

        if (data && data.success) {
            return NextResponse.json({ success: true, data });
        } else {
            return NextResponse.json({ success: false, message: data?.message || 'Purchase failed' }, { status: 400 });
        }

    } catch (error) {
        console.error('Server Error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
