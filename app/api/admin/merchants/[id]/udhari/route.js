import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
        const { id: merchantId } = await params;
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const status = searchParams.get('status');
        
        const offset = (page - 1) * limit;

        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin role
        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Build query for requests (flat, no nested embeds)
        let query = admin
            .from('udhari_requests')
            .select('id, customer_id, coupon_id, amount_paise, status, duration_days, due_date, requested_at, responded_at, completed_at', { count: 'exact' })
            .eq('merchant_id', merchantId)
            .order('requested_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: requests, count, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        // Fetch user profiles for customers
        const customerIds = [...new Set(requests.map(r => r.customer_id).filter(Boolean))];
        const customerMap = {};
        if (customerIds.length > 0) {
            const { data: profiles } = await admin
                .from('user_profiles')
                .select('id, full_name, email')
                .in('id', customerIds);
            if (profiles) {
                for (const p of profiles) {
                    customerMap[p.id] = p;
                }
            }
        }

        // Fetch coupon details
        const couponIds = [...new Set(requests.map(r => r.coupon_id).filter(Boolean))];
        const couponMap = {};
        if (couponIds.length > 0) {
            const { data: coupons } = await admin
                .from('coupons')
                .select('id, title, brand')
                .in('id', couponIds);
            if (coupons) {
                for (const c of coupons) {
                    couponMap[c.id] = c;
                }
            }
        }

        // Fetch related settlement transactions
        const requestIds = requests.map(r => r.id);
        const transactionsMap = {};
        
        if (requestIds.length > 0) {
            const { data: txs } = await admin
                .from('merchant_transactions')
                .select('id, metadata')
                .eq('merchant_id', merchantId)
                .eq('transaction_type', 'udhari_payment');
                
            if (txs) {
                txs.forEach(tx => {
                    const reqId = tx.metadata?.udhari_request_id;
                    if (reqId) {
                        transactionsMap[reqId] = tx.id;
                    }
                });
            }
        }

        const enrichedRequests = requests.map(r => {
            const customer = customerMap[r.customer_id] || {};
            const coupon = couponMap[r.coupon_id] || {};
            return {
                id: r.id,
                customer_id: r.customer_id,
                coupon_id: r.coupon_id,
                amount_paise: r.amount_paise,
                status: r.status,
                duration_days: r.duration_days,
                due_date: r.due_date,
                requested_at: r.requested_at,
                responded_at: r.responded_at,
                completed_at: r.completed_at,
                customer_name: customer.full_name || 'Unknown',
                customer_email: customer.email || 'N/A',
                coupon_title: coupon.title || 'Unknown Coupon',
                coupon_brand: coupon.brand || 'Unknown Brand',
                settlement_transaction_id: transactionsMap[r.id] || null
            };
        });

        return NextResponse.json({
            requests: enrichedRequests,
            pagination: {
                page,
                limit,
                total: count
            }
        });
    } catch (err) {
        console.error('[API] Admin Merchant Udhari Detail GET Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
