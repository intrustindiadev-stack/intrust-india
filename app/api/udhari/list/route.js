import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const supabaseAdmin = createAdminClient();

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
                    coupon:coupons(id, title, brand, category, image_url, selling_price_paise, face_value_paise, masked_code),
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

            // Prevent encrypted code exposure for any status
            const enriched = (data || []).map(item => {
                let safeCoupon = null;
                if (item.coupon) {
                    const { encrypted_code, ...rest } = item.coupon;
                    safeCoupon = rest;
                }
                const result = { ...item, coupon: safeCoupon };
                
                if (result.coupon) {
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

            // Fetch distinct customer IDs for batch querying
            const customerIds = [...new Set((data || []).map(item => item.customer_id))];

            // 1. Batched purchase count
            let purchaseCounts = {};
            if (customerIds.length > 0) {
                const { data: ordersData } = await supabaseAdmin
                    .from('orders')
                    .select('user_id')
                    .in('user_id', customerIds)
                    .eq('payment_status', 'paid');
                ordersData?.forEach(order => {
                    purchaseCounts[order.user_id] = (purchaseCounts[order.user_id] || 0) + 1;
                });
            }

            // 2. Batched expired udhari count
            let defaultCounts = {};
            if (customerIds.length > 0) {
                const { data: expiredData } = await supabaseAdmin
                    .from('udhari_requests')
                    .select('customer_id')
                    .in('customer_id', customerIds)
                    .eq('status', 'expired');
                expiredData?.forEach(req => {
                    defaultCounts[req.customer_id] = (defaultCounts[req.customer_id] || 0) + 1;
                });
            }

            // 3. Batched completed udhari count
            let completedCounts = {};
            if (customerIds.length > 0) {
                const { data: completedData } = await supabaseAdmin
                    .from('udhari_requests')
                    .select('customer_id')
                    .in('customer_id', customerIds)
                    .eq('status', 'completed');
                completedData?.forEach(req => {
                    completedCounts[req.customer_id] = (completedCounts[req.customer_id] || 0) + 1;
                });
            }

            const enriched = (data || []).map(item => {
                const customerId = item.customer_id;
                const accountAge = item.customer?.created_at
                    ? Math.floor((Date.now() - new Date(item.customer.created_at).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;

                return {
                    ...item,
                    customerStats: {
                        purchaseCount: purchaseCounts[customerId] || 0,
                        defaultCount: defaultCounts[customerId] || 0,
                        completedUdhariCount: completedCounts[customerId] || 0,
                        accountAgeDays: accountAge,
                    },
                };
            });

            return NextResponse.json({ success: true, requests: enriched });
        }

        return NextResponse.json({ error: 'Invalid role parameter' }, { status: 400 });

    } catch (error) {
        console.error('Udhari list unexpected error:', error);
        return NextResponse.json({ error: 'An unexpected internal error occurred.' }, { status: 500 });
    }
}
