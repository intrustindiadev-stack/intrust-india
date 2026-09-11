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
                .maybeSingle();

            if (!merchant) {
                return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
            }

            // Fetch merchant udhari settings
            const { data: merchantSettings } = await supabaseAdmin
                .from('merchant_udhari_settings')
                .select('*')
                .eq('merchant_id', merchant.id)
                .maybeSingle();

            let query = supabaseAdmin
                .from('udhari_requests')
                .select(`
                    *,
                    coupon:coupons(id, title, brand, category, image_url, selling_price_paise, face_value_paise),
                    customer:user_profiles!udhari_requests_customer_id_fkey(id, full_name, phone, created_at, kyc_status),
                    shopping_order_group:shopping_order_group_id(
                        id,
                        total_amount_paise,
                        delivery_status,
                        created_at,
                        shopping_order_items(
                            id,
                            quantity,
                            unit_price_paise,
                            shopping_products(id, title, product_images)
                        )
                    )
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

            // 1. Batched purchase count (both digital gift card orders and physical shop order groups)
            let purchaseCounts = {};
            if (customerIds.length > 0) {
                const [ordersRes, shopOrdersRes] = await Promise.all([
                    supabaseAdmin
                        .from('orders')
                        .select('user_id')
                        .in('user_id', customerIds)
                        .eq('payment_status', 'paid'),
                    supabaseAdmin
                        .from('shopping_order_groups')
                        .select('customer_id')
                        .in('customer_id', customerIds)
                        .neq('delivery_status', 'cancelled')
                ]);

                ordersRes.data?.forEach(order => {
                    purchaseCounts[order.user_id] = (purchaseCounts[order.user_id] || 0) + 1;
                });
                shopOrdersRes.data?.forEach(order => {
                    purchaseCounts[order.customer_id] = (purchaseCounts[order.customer_id] || 0) + 1;
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

            // 4. Batched reminder history for active requests
            const requestIds = (data || []).map(item => item.id);
            let remindersMap = {};
            if (requestIds.length > 0) {
                const { data: remindersData } = await supabaseAdmin
                    .from('udhari_reminders')
                    .select('udhari_request_id, sent_at, reminder_type')
                    .in('udhari_request_id', requestIds)
                    .order('sent_at', { ascending: false });

                remindersData?.forEach(rem => {
                    if (!remindersMap[rem.udhari_request_id]) {
                        remindersMap[rem.udhari_request_id] = {
                            lastSentAt: rem.sent_at,
                            lastType: rem.reminder_type,
                            totalCount: 0,
                        };
                    }
                    remindersMap[rem.udhari_request_id].totalCount += 1;
                });
            }

            const now = new Date();
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            // Authoritative KPI tallies
            let totalOutstandingPaise = 0;
            let overdueAmountPaise = 0;
            let dueSoonAmountPaise = 0;
            let collectedAmountPaise = 0;
            let pendingCount = 0;
            let awaitingCount = 0;
            let overdueCount = 0;
            let todayCollectedPaise = 0;
            let todayCreditPaise = 0;
            const activeDebtorIds = new Set();

            const enriched = (data || []).map(item => {
                const customerId = item.customer_id;
                const accountAge = item.customer?.created_at
                    ? Math.floor((Date.now() - new Date(item.customer.created_at).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;

                const isApproved = item.status === 'approved';
                const isOverdue = isApproved && item.due_date && new Date(item.due_date) < now;
                const dueDateObj = item.due_date ? new Date(item.due_date) : null;
                const isDueSoon = isApproved && !isOverdue && dueDateObj && (dueDateObj.getTime() - now.getTime()) <= (3 * 24 * 60 * 60 * 1000);

                // KPI accumulation
                if (item.status === 'pending') {
                    pendingCount += 1;
                } else if (isApproved) {
                    awaitingCount += 1;
                    totalOutstandingPaise += (item.amount_paise || 0);
                    activeDebtorIds.add(customerId);
                    if (isOverdue) {
                        overdueCount += 1;
                        overdueAmountPaise += (item.amount_paise || 0);
                    } else if (isDueSoon) {
                        dueSoonAmountPaise += (item.amount_paise || 0);
                    }
                    if (item.responded_at && new Date(item.responded_at) >= todayStart) {
                        todayCreditPaise += (item.amount_paise || 0);
                    }
                } else if (item.status === 'completed') {
                    collectedAmountPaise += (item.amount_paise || 0);
                    if (item.completed_at && new Date(item.completed_at) >= todayStart) {
                        todayCollectedPaise += (item.amount_paise || 0);
                    }
                }

                // Phone privacy masking in backend (unmask only if overdue or authorized)
                const rawPhone = item.customer?.phone || '';
                const maskedPhone = rawPhone.length >= 4 
                    ? `${rawPhone.slice(0, 3)}XXXXXX${rawPhone.slice(-2)}` 
                    : rawPhone;

                const safeCustomer = item.customer ? {
                    ...item.customer,
                    phone: isOverdue ? rawPhone : maskedPhone,
                    phoneMasked: maskedPhone,
                    isPhoneRevealed: isOverdue,
                } : null;

                const reminderInfo = remindersMap[item.id] || null;

                return {
                    ...item,
                    isOverdue,
                    isDueSoon,
                    customer: safeCustomer,
                    reminder: reminderInfo,
                    customerStats: {
                        purchaseCount: purchaseCounts[customerId] || 0,
                        defaultCount: defaultCounts[customerId] || 0,
                        completedUdhariCount: completedCounts[customerId] || 0,
                        accountAgeDays: accountAge,
                    },
                };
            });

            // Customer Debtor Accounts Aggregation
            const customerMap = {};
            for (const item of enriched) {
                const cid = item.customer_id;
                if (!customerMap[cid]) {
                    customerMap[cid] = {
                        customerId: cid,
                        customerName: item.customer?.full_name || 'Customer',
                        phone: item.customer?.phone || '',
                        phoneMasked: item.customer?.phoneMasked || '',
                        kycStatus: item.customer?.kyc_status || 'unverified',
                        accountAgeDays: item.customerStats?.accountAgeDays || 0,
                        totalOutstandingPaise: 0,
                        overdueAmountPaise: 0,
                        activeCreditsCount: 0,
                        overdueCreditsCount: 0,
                        completedCreditsCount: item.customerStats?.completedUdhariCount || 0,
                        earliestDueDate: null,
                        latestRequestDate: item.created_at,
                        purchaseCount: item.customerStats?.purchaseCount || 0,
                        defaultCount: item.customerStats?.defaultCount || 0,
                    };
                }

                if (item.status === 'approved') {
                    customerMap[cid].totalOutstandingPaise += (item.amount_paise || 0);
                    customerMap[cid].activeCreditsCount += 1;
                    if (item.due_date) {
                        const d = new Date(item.due_date);
                        if (!customerMap[cid].earliestDueDate || d < new Date(customerMap[cid].earliestDueDate)) {
                            customerMap[cid].earliestDueDate = item.due_date;
                        }
                    }
                    if (item.isOverdue) {
                        customerMap[cid].overdueCreditsCount += 1;
                        customerMap[cid].overdueAmountPaise += (item.amount_paise || 0);
                    }
                }
            }

            const customerAccounts = Object.values(customerMap).map(c => {
                const hasOverdue = c.overdueCreditsCount > 0;
                const isDueSoon = !hasOverdue && c.earliestDueDate && (new Date(c.earliestDueDate).getTime() - now.getTime()) <= (3 * 24 * 60 * 60 * 1000);
                return {
                    ...c,
                    riskStatus: hasOverdue ? 'overdue' : isDueSoon ? 'due_soon' : c.activeCreditsCount > 0 ? 'current' : 'none',
                };
            });

            return NextResponse.json({
                success: true,
                requests: enriched,
                kpis: {
                    totalOutstandingPaise,
                    overdueAmountPaise,
                    dueSoonAmountPaise,
                    collectedAmountPaise,
                    pendingCount,
                    awaitingCount,
                    overdueCount,
                    activeDebtorsCount: activeDebtorIds.size,
                    todayCollectedPaise,
                    todayCreditPaise,
                },
                customerAccounts,
                settings: merchantSettings || {
                    merchant_id: merchant.id,
                    udhari_enabled: false,
                    max_credit_limit_paise: 500000,
                    max_duration_days: 15,
                    convenience_fee_bps: 300,
                },
            });
        }

        return NextResponse.json({ error: 'Invalid role parameter' }, { status: 400 });

    } catch (error) {
        console.error('Udhari list unexpected error:', error);
        return NextResponse.json({ error: 'An unexpected internal error occurred.' }, { status: 500 });
    }
}
