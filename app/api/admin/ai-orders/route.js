import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

function formatTimeAgo(dateString) {
    if (!dateString) return 'Just now';
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);
        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch real AI orders
        const { data: orders, error: ordersError } = await admin
            .from('ai_orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;

        // 2. Fetch real merchants and user profiles
        const { data: merchantsData } = await admin
            .from('merchants')
            .select('id, user_id, business_name, business_phone, business_email, status');

        const { data: userProfiles } = await admin
            .from('user_profiles')
            .select('id, full_name, phone, email, avatar_url');

        const merchantsMap = {};
        (merchantsData || []).forEach(m => {
            if (m.user_id) merchantsMap[m.user_id] = m;
        });

        const profilesMap = {};
        (userProfiles || []).forEach(p => {
            profilesMap[p.id] = p;
        });

        // Enrich real orders
        const enrichedOrders = (orders || []).map((order) => {
            const merchantInfo = merchantsMap[order.merchant_id] || null;
            const profileInfo = profilesMap[order.merchant_id] || null;

            return {
                ...order,
                order_code: order.order_code || `AI-${order.id.slice(0, 4).toUpperCase()}`,
                category: order.category || 'Electronics',
                product_image_url: order.product_image_url || null,
                merchant: {
                    user_id: order.merchant_id,
                    business_name: merchantInfo?.business_name || profileInfo?.full_name || 'Unassigned',
                    contact_name: profileInfo?.full_name || merchantInfo?.business_name || 'Merchant Owner',
                    phone: merchantInfo?.business_phone || profileInfo?.phone || '—',
                    email: merchantInfo?.business_email || profileInfo?.email || '—',
                    avatar_url: profileInfo?.avatar_url || null,
                    status: merchantInfo?.status || 'approved'
                }
            };
        });

        // 3. Real 5 KPI Stats
        const total = enrichedOrders.length;
        const pending = enrichedOrders.filter(o => o.status === 'PENDING').length;
        const paymentPending = enrichedOrders.filter(o => o.status === 'PAYMENT_PENDING').length;
        const accepted = enrichedOrders.filter(o => o.status === 'ACCEPTED').length;
        const completedOrders = enrichedOrders.filter(o => o.status === 'COMPLETED');
        const completed = completedOrders.length;
        const cancelled = enrichedOrders.filter(o => o.status === 'REJECTED' || o.status === 'CANCELLED').length;
        const totalProfitDistributedPaise = completedOrders.reduce((acc, curr) => acc + Number(curr.profit_margin_paise || 0), 0);

        // 4. Real Category Distribution from DB
        const categoryCounts = {};
        const palette = ['#2563eb', '#38bdf8', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#94a3b8'];
        enrichedOrders.forEach(o => {
            const cat = o.category || 'General';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        const categoryDistribution = Object.keys(categoryCounts).map((catName, idx) => ({
            name: catName,
            value: total > 0 ? Math.round((categoryCounts[catName] / total) * 100) : 0,
            count: categoryCounts[catName],
            color: palette[idx % palette.length]
        }));

        // 5. Real Order Performance (Daily dual-bar buckets)
        const performanceMap = {};
        enrichedOrders.forEach(o => {
            const d = new Date(o.created_at);
            const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            if (!performanceMap[label]) {
                performanceMap[label] = { date: label, created: 0, completed: 0 };
            }
            performanceMap[label].created += 1;
            if (o.status === 'COMPLETED') {
                performanceMap[label].completed += 1;
            }
        });

        const performanceData = Object.values(performanceMap).slice(-5);

        // 6. Real Top Performing Merchants from DB
        const merchantStatsMap = {};
        enrichedOrders.forEach(o => {
            if (!o.merchant_id) return;
            if (!merchantStatsMap[o.merchant_id]) {
                merchantStatsMap[o.merchant_id] = {
                    id: o.merchant_id,
                    name: o.merchant.contact_name,
                    store: o.merchant.business_name,
                    initial: (o.merchant.contact_name || o.merchant.business_name || 'M')[0].toUpperCase(),
                    orders: 0,
                    revenuePaise: 0
                };
            }
            merchantStatsMap[o.merchant_id].orders += 1;
            if (['ACCEPTED', 'COMPLETED'].includes(o.status)) {
                merchantStatsMap[o.merchant_id].revenuePaise += Number(o.wholesale_price_paise || 0);
            }
        });

        let topMerchants = Object.values(merchantStatsMap)
            .sort((a, b) => b.revenuePaise - a.revenuePaise || b.orders - a.orders)
            .slice(0, 3)
            .map((m, idx) => ({
                rank: idx + 1,
                name: m.name,
                store: m.store,
                initial: m.initial,
                orders: m.orders,
                revenue: `₹${(m.revenuePaise / 100).toLocaleString('en-IN')}`
            }));

        // If no merchant orders yet, show registered merchants
        if (topMerchants.length === 0 && merchantsData && merchantsData.length > 0) {
            topMerchants = merchantsData.slice(0, 3).map((m, idx) => {
                const prof = profilesMap[m.user_id];
                const name = prof?.full_name || m.business_name;
                return {
                    rank: idx + 1,
                    name,
                    store: m.business_name,
                    initial: (name || 'M')[0].toUpperCase(),
                    orders: 0,
                    revenue: '₹0'
                };
            });
        }

        // 7. Real Recent Activity Feed
        const recentActivity = enrichedOrders.slice(0, 5).map((o, idx) => {
            let actionText = `Order ${o.order_code} created`;
            let color = 'bg-blue-500';

            if (o.status === 'ACCEPTED') {
                actionText = `Order ${o.order_code} accepted by ${o.merchant.contact_name}`;
                color = 'bg-emerald-500';
            } else if (o.status === 'COMPLETED') {
                actionText = `Order ${o.order_code} completed & funds released`;
                color = 'bg-emerald-600';
            } else if (o.status === 'PAYMENT_PENDING') {
                actionText = `Payment pending for order ${o.order_code}`;
                color = 'bg-amber-500';
            }

            return {
                id: o.id || idx,
                title: actionText,
                time: formatTimeAgo(o.updated_at || o.created_at),
                color,
                product_image_url: o.product_image_url,
                product_name: o.product_name,
                category: o.category
            };
        });

        return NextResponse.json({
            orders: enrichedOrders,
            stats: {
                total,
                pending,
                paymentPending,
                accepted,
                completed,
                cancelled,
                totalProfitDistributedPaise,
                totalOrders: total,
                activeInvestments: accepted + paymentPending,
                totalProfitDistributed: totalProfitDistributedPaise
            },
            categoryDistribution,
            performanceData,
            topMerchants,
            recentActivity
        });
    } catch (error) {
        console.error('Error fetching AI orders:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);
        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { 
            merchant_id, 
            product_name, 
            category, 
            wholesale_price_paise, 
            retail_price_paise, 
            profit_margin_paise,
            product_image_url
        } = body;

        if (!product_name || !wholesale_price_paise || !retail_price_paise || !profit_margin_paise) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Count existing orders for sequential code
        const { count } = await admin.from('ai_orders').select('*', { count: 'exact', head: true });
        const orderNum = 1000 + (count || 0) + 1;
        const fallbackCode = `AI-${orderNum}`;

        const insertPayload = {
            admin_id: user.id,
            merchant_id: merchant_id || null,
            product_name: product_name.trim(),
            category: category || 'Electronics',
            product_image_url: product_image_url || null,
            wholesale_price_paise: Math.round(Number(wholesale_price_paise)),
            retail_price_paise: Math.round(Number(retail_price_paise)),
            profit_margin_paise: Math.round(Number(profit_margin_paise)),
            status: 'PENDING',
            order_code: fallbackCode
        };

        const { data, error } = await admin
            .from('ai_orders')
            .insert([insertPayload])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ order: data }, { status: 201 });
    } catch (error) {
        console.error('Error creating AI order:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
