import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Auth check
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid token or user not found' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role') || 'customer'; // 'customer' or 'merchant'
        const status = searchParams.get('status'); // optional filter

        // ========== CUSTOMER VIEW ==========
        if (role === 'customer') {
            let query = supabaseAdmin
                .from('udhari_requests')
                .select(`
                    *,
                    coupon:coupons(id, title, brand, category, image_url, selling_price_paise, face_value_paise, encrypted_code, masked_code),
                    merchant:merchants(id, business_name)
                `)
                .eq('customer_id', user.id)
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Udhari list error:', error);
                return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
            }

            // For approved requests, include the coupon code
            const enriched = (data || []).map(item => {
                const result = { ...item };
                // Only show real coupon code for approved/completed requests
                // Use encrypted_code as the primary code field
                if (['approved', 'completed'].includes(item.status) && item.coupon) {
                    result.couponCode = item.coupon.encrypted_code || item.coupon.masked_code;
                } else if (item.coupon) {
                    // For pending/denied, mask it or nullify it
                    result.couponCode = null;
                }
                return result;
            });

            return NextResponse.json({ success: true, requests: enriched });
        }

        // ========== MERCHANT VIEW ==========
        if (role === 'merchant') {
            // Verify merchant
            const { data: merchant } = await supabaseAdmin
                .from('merchants')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!merchant) {
                return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
            }

            let query = supabaseAdmin
                .from('udhari_requests')
                .select(`
                    *,
                    coupon:coupons(id, title, brand, category, image_url, selling_price_paise, face_value_paise),
                    customer:user_profiles!udhari_requests_customer_id_fkey(id, full_name, phone, created_at, kyc_status)
                `)
                .eq('merchant_id', merchant.id)
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Udhari merchant list error:', error);
                return NextResponse.json({ error: error.message || 'Failed to fetch requests' }, { status: 500 });
            }

            // Enrich with customer stats (purchase count, default count, account age)
            const enriched = await Promise.all((data || []).map(async (item) => {
                const customerId = item.customer_id;

                // Get customer purchase count
                const { count: purchaseCount } = await supabaseAdmin
                    .from('orders')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', customerId)
                    .eq('payment_status', 'paid');

                // Get customer udhari default count
                const { count: defaultCount } = await supabaseAdmin
                    .from('udhari_requests')
                    .select('*', { count: 'exact', head: true })
                    .eq('customer_id', customerId)
                    .eq('status', 'expired');

                // Get customer completed udhari count
                const { count: completedCount } = await supabaseAdmin
                    .from('udhari_requests')
                    .select('*', { count: 'exact', head: true })
                    .eq('customer_id', customerId)
                    .eq('status', 'completed');

                const accountAge = item.customer?.created_at
                    ? Math.floor((Date.now() - new Date(item.customer.created_at).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;

                return {
                    ...item,
                    customerStats: {
                        purchaseCount: purchaseCount || 0,
                        defaultCount: defaultCount || 0,
                        completedUdhariCount: completedCount || 0,
                        accountAgeDays: accountAge,
                    },
                };
            }));

            return NextResponse.json({ success: true, requests: enriched });
        }

        return NextResponse.json({ error: 'Invalid role parameter' }, { status: 400 });

    } catch (error) {
        console.error('Udhari list unexpected error:', error);
        return NextResponse.json({ error: 'An unexpected internal error occurred.' }, { status: 500 });
    }
}
