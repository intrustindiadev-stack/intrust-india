import { redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import { Gift, ShoppingBag, TrendingUp, Wallet, Award } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import CouponCodeReveal from './CouponCodeReveal';

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

    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            id,
            amount,
            created_at,
            coupons (
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            <Navbar />

            <div style={{ paddingTop: '15vh' }} className="pb-24 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                            My Gift Cards
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">View and manage your purchased gift cards</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-100 dark:border-gray-700 shadow-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                    <ShoppingBag size={20} className="text-white" />
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{totalCards}</div>
                            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Cards</div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-100 dark:border-gray-700 shadow-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                                    <Award size={20} className="text-white" />
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{activeCount}</div>
                            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Active</div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-100 dark:border-gray-700 shadow-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                    <Wallet size={20} className="text-white" />
                                </div>
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">₹{totalValue.toFixed(0)}</div>
                            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Value</div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-100 dark:border-gray-700 shadow-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                                    <TrendingUp size={20} className="text-white" />
                                </div>
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">₹{totalSavings.toFixed(0)}</div>
                            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Saved</div>
                        </div>
                    </div>

                    {/* Coupons Grid */}
                    {processedCoupons.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            {processedCoupons.map((coupon) => (
                                <div
                                    key={coupon.id}
                                    className={`bg-white dark:bg-gray-800 rounded-3xl shadow-lg border overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 ${coupon.uiStatus === 'active' ? 'border-gray-100 dark:border-gray-700' : 'border-gray-200 dark:border-gray-600 opacity-75'
                                        }`}
                                >
                                    {/* Card Header */}
                                    <div className={`relative h-40 bg-gradient-to-br ${coupon.gradient} overflow-hidden`}>
                                        {/* Animated Background */}
                                        <div className="absolute inset-0 opacity-20">
                                            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl animate-pulse-slow" />
                                        </div>

                                        {/* Status Badge */}
                                        <div className="absolute top-4 right-4">
                                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${coupon.uiStatus === 'active'
                                                ? 'bg-white text-green-600'
                                                : 'bg-white/90 text-gray-600'
                                                }`}>
                                                {coupon.uiStatus === 'active' ? '✓ Active' : coupon.uiStatus}
                                            </span>
                                        </div>

                                        {/* Brand Logo */}
                                        <div className="absolute top-4 left-4 w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-xl">
                                            {coupon.logo}
                                        </div>

                                        {/* Brand Name */}
                                        <div className="absolute bottom-4 left-4">
                                            <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                                                {coupon.brand}
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-5 sm:p-6">
                                        {/* Value */}
                                        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
                                            <div>
                                                <div className="text-xs text-gray-500 mb-1">Face Value</div>
                                                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] bg-clip-text text-transparent">
                                                    ₹{coupon.faceValue}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">You Paid</div>
                                                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">₹{coupon.paidAmount}</div>
                                                <div className="text-xs text-green-600 font-semibold">
                                                    Saved ₹{(coupon.faceValue - coupon.paidAmount).toFixed(0)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Coupon Code */}
                                        <CouponCodeReveal couponId={coupon.id} />

                                        {/* Details */}
                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Merchant</span>
                                                <span className="font-semibold text-gray-900 dark:text-gray-100">{coupon.merchant}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Purchased</span>
                                                <span className="text-gray-900 dark:text-gray-100">{coupon.formattedDate}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Expires</span>
                                                <span className="text-gray-900 dark:text-gray-100">{coupon.formattedExpiry}</span>
                                            </div>
                                        </div>

                                        {/* How to Use */}
                                        {coupon.uiStatus === 'active' && (
                                            <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl">
                                                <div className="text-sm text-blue-800">
                                                    <div className="font-semibold mb-1">💡 How to use:</div>
                                                    <div>Decrypt, copy the code, and apply it at {coupon.brand} checkout</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Empty State */
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShoppingBag className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                No coupons yet
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Start browsing and purchase your first gift card
                            </p>
                            <a
                                href="/gift-cards"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all"
                            >
                                <ShoppingBag size={20} />
                                Browse Gift Cards
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Navigation */}
            <CustomerBottomNav />
        </div>
    );
}
