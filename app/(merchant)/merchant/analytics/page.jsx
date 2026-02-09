'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    TrendingUp,
    Package,
    DollarSign,
    ShoppingBag,
    Award,
    Calendar,
    Loader2,
    ArrowUp,
    ArrowDown
} from 'lucide-react';

export default function MerchantAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [merchantProfile, setMerchantProfile] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    const fetchAnalyticsData = async () => {
        try {
            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Get merchant profile
            const { data: merchant } = await supabase
                .from('merchants')
                .select('*')
                .eq('user_id', user.id)
                .single();

            setMerchantProfile(merchant);

            // Get inventory
            const { data: coupons } = await supabase
                .from('coupons')
                .select('*')
                .eq('merchant_id', merchant.id)
                .eq('is_merchant_owned', true);

            setInventory(coupons || []);

            // Get transactions
            const { data: txns } = await supabase
                .from('merchant_transactions')
                .select('*')
                .eq('merchant_id', merchant.id)
                .order('created_at', { ascending: false });

            setTransactions(txns || []);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate analytics
    const analytics = {
        totalSales: transactions.filter(t => t.transaction_type === 'sale').length,
        totalRevenue: transactions
            .filter(t => t.transaction_type === 'sale')
            .reduce((sum, t) => sum + (t.amount_paise || 0), 0) / 100,
        totalPurchases: transactions.filter(t => t.transaction_type === 'purchase').length,
        totalSpent: transactions
            .filter(t => t.transaction_type === 'purchase')
            .reduce((sum, t) => sum + Math.abs(t.amount_paise || 0), 0) / 100,
        totalCommission: (merchantProfile?.total_commission_paid_paise || 0) / 100,
        activeCoupons: inventory.filter(c => c.status === 'available').length,
        listedCoupons: inventory.filter(c => c.listed_on_marketplace).length,
        avgProfit: inventory.filter(c => c.listed_on_marketplace).length > 0
            ? inventory
                .filter(c => c.listed_on_marketplace)
                .reduce((sum, c) => {
                    const profit = (c.merchant_selling_price_paise || 0) -
                        (c.merchant_purchase_price_paise || 0) -
                        (c.merchant_commission_paise || 0);
                    return sum + profit;
                }, 0) / inventory.filter(c => c.listed_on_marketplace).length / 100
            : 0,
    };

    // Top performing coupons
    const topCoupons = inventory
        .filter(c => c.listed_on_marketplace)
        .map(c => ({
            ...c,
            profit: ((c.merchant_selling_price_paise || 0) -
                (c.merchant_purchase_price_paise || 0) -
                (c.merchant_commission_paise || 0)) / 100
        }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#92BCEA]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                        Analytics
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600">Track your performance and insights</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-sm">
                                <DollarSign className="text-white" size={20} />
                            </div>
                        </div>
                        <div className="text-xl sm:text-3xl font-bold text-gray-900 mb-1 truncate">
                            ₹{analytics.totalRevenue.toLocaleString()}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Total Revenue</div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
                                <ShoppingBag className="text-white" size={20} />
                            </div>
                        </div>
                        <div className="text-xl sm:text-3xl font-bold text-gray-900 mb-1">{analytics.totalSales}</div>
                        <div className="text-xs sm:text-sm text-gray-600">Total Sales</div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
                                <Package className="text-white" size={20} />
                            </div>
                        </div>
                        <div className="text-xl sm:text-3xl font-bold text-gray-900 mb-1">{analytics.activeCoupons}</div>
                        <div className="text-xs sm:text-sm text-gray-600">Active Coupons</div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm">
                                <TrendingUp className="text-white" size={20} />
                            </div>
                        </div>
                        <div className="text-xl sm:text-3xl font-bold text-gray-900 mb-1 truncate">
                            ₹{analytics.avgProfit.toFixed(0)}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Avg. Profit/Coupon</div>
                    </div>
                </div>

                {/* Performance Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 sm:mb-8">
                    {/* Revenue vs Spending */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue vs Spending</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Revenue</span>
                                    <span className="text-sm font-bold text-green-600">
                                        ₹{analytics.totalRevenue.toLocaleString()}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all"
                                        style={{
                                            width: `${Math.min(
                                                (analytics.totalRevenue / (analytics.totalRevenue + analytics.totalSpent)) * 100,
                                                100
                                            )}%`
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Spending</span>
                                    <span className="text-sm font-bold text-red-600">
                                        ₹{analytics.totalSpent.toLocaleString()}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-gradient-to-r from-red-500 to-rose-500 h-3 rounded-full transition-all"
                                        style={{
                                            width: `${Math.min(
                                                (analytics.totalSpent / (analytics.totalRevenue + analytics.totalSpent)) * 100,
                                                100
                                            )}%`
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Commission Paid</span>
                                    <span className="text-sm font-bold text-orange-600">
                                        ₹{analytics.totalCommission.toLocaleString()}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-gradient-to-r from-orange-500 to-amber-500 h-3 rounded-full transition-all"
                                        style={{
                                            width: `${Math.min(
                                                (analytics.totalCommission / analytics.totalSpent) * 100,
                                                100
                                            )}%`
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Inventory Status */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Inventory Status</h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
                                    <p className="text-sm text-gray-600">Total Coupons</p>
                                </div>
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                    <Package className="text-white" size={28} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                                <div className="text-center p-3 bg-green-50 rounded-xl">
                                    <p className="text-2xl font-bold text-green-600">{analytics.listedCoupons}</p>
                                    <p className="text-xs text-gray-600">Listed</p>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-xl">
                                    <p className="text-2xl font-bold text-gray-600">
                                        {inventory.length - analytics.listedCoupons}
                                    </p>
                                    <p className="text-xs text-gray-600">Unlisted</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Performing Coupons */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Award className="text-[#92BCEA]" size={24} />
                            Top Performing Coupons
                        </h3>
                    </div>

                    {topCoupons.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-600">No listed coupons yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {topCoupons.map((coupon, index) => (
                                <div key={coupon.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center text-white font-bold flex-shrink-0">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 truncate">{coupon.brand}</p>
                                                <p className="text-sm text-gray-500">
                                                    Face Value: ₹{(coupon.face_value_paise / 100).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-lg font-bold text-green-600">
                                                +₹{coupon.profit.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-gray-500">Profit</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
