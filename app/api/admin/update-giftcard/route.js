import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const body = await request.json();
        const { id, brand, category, face_value_paise, selling_price_paise, status } = body;

        // 1. Verify Authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Verify Admin Role
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // 3. Update Coupon (Using Admin Client to bypass RLS)
        if (!id) {
            return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });
        }

        const adminSupabase = createAdminClient();

        const { data: updatedCoupon, error: updateError } = await adminSupabase
            .from('coupons')
            .update({
                brand,
                category,
                face_value_paise,
                selling_price_paise,
                status
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating coupon:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: updatedCoupon });

    } catch (error) {
        console.error('Unexpected error in update-giftcard:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
