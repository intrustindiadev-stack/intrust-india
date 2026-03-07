import { redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import MyGiftCardsClient from './MyGiftCardsClient';

// Helper functions for UI mapping
function getBrandGradient(brand) {
    const brands = {
        'Flipkart': 'from-blue-600 via-blue-500 to-cyan-500',
        'Amazon': 'from-orange-500 via-amber-500 to-yellow-500',
        'Swiggy': 'from-orange-600 via-red-500 to-pink-500',
        'Zomato': 'from-red-600 via-red-500 to-pink-500',
        'Myntra': 'from-pink-600 via-fuchsia-500 to-purple-500',
        'Uber': 'from-gray-900 via-gray-800 to-gray-700',
    };
    return brands[brand] || 'from-indigo-600 via-purple-500 to-pink-500';
}

function getBrandLogo(brand) {
    const logos = {
        'Flipkart': '🛒',
        'Amazon': '📦',
        'Swiggy': '🍔',
        'Zomato': '🍕',
        'Myntra': '👗',
        'Uber': '🚗',
    };
    return logos[brand] || '🎁';
}

export default async function MyCouponsPage() {
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    // Fetch orders with coupons (only paid orders)
    console.log('🔍 [MY-GIFTCARDS] Fetching orders for user:', user.id);

    // Setup admin client to bypass RLS for inner joins (orders -> coupons -> merchants)
    const { createClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: orders, error } = await supabaseAdmin
        .from('orders')
        .select(`
            id,
            amount,
            created_at,
            coupons:coupons!orders_giftcard_id_fkey (
                id,
                brand,
                title,
                selling_price_paise,
                face_value_paise,
                status,
                purchased_at,
                valid_until,
                merchant_id,
                merchant:merchants(
                    business_name
                )
            )
        `)
        .eq('user_id', user.id)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });

    console.log('🔍 [MY-GIFTCARDS] Query result:', {
        ordersCount: orders?.length || 0,
        hasError: !!error,
        errorDetails: error,
        firstOrder: orders?.[0]
    });

    if (error) {
        console.error('❌ [MY-GIFTCARDS] Error fetching orders:', error);
    }

    // Process the data
    const processedCoupons = (orders || []).map(order => {
        const coupon = order.coupons;
        if (!coupon) return null;

        const isExpired = new Date(coupon.valid_until) < new Date();

        // Determine UI status
        let uiStatus = 'active';
        if (isExpired) uiStatus = 'expired';
        if (coupon.status === 'used') uiStatus = 'used';
        if (coupon.status === 'sold' && !isExpired) uiStatus = 'active';

        // Resolve Merchant Name
        const merchantName = coupon.merchant?.business_name || 'INTRUST Marketplace';
        return {
            orderId: order.id,
            ...coupon,
            uiStatus,
            paidAmount: order.amount / 100, // Convert paise to rupees
            faceValue: coupon.face_value_paise / 100,
            sellingPrice: coupon.selling_price_paise / 100,
            gradient: getBrandGradient(coupon.brand),
            logo: getBrandLogo(coupon.brand),
            merchant: merchantName,
            formattedDate: new Date(coupon.purchased_at).toLocaleDateString(),
            formattedExpiry: new Date(coupon.valid_until).toLocaleDateString()
        };
    }).filter(Boolean);

    // Calculate statistics
    const totalCards = processedCoupons.length;
    const activeCount = processedCoupons.filter(c => c.uiStatus === 'active').length;
    const totalValue = processedCoupons.reduce((sum, c) => sum + c.faceValue, 0);
    const totalPaid = processedCoupons.reduce((sum, c) => sum + c.paidAmount, 0);
    const totalSavings = totalValue - totalPaid;

    return (
        <>
            <Navbar />
            <MyGiftCardsClient
                coupons={processedCoupons}
                totalCards={totalCards}
                activeCount={activeCount}
                totalValue={totalValue}
                totalSavings={totalSavings}
            />
            <CustomerBottomNav />
        </>
    );
}
