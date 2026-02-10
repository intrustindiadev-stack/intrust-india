'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Package, DollarSign, ShoppingBag, Plus, Eye, Edit, Trash2, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useMerchant } from '@/hooks/useMerchant';

export default function MerchantDashboardPage() {
    const { merchant, loading: merchantLoading, error: merchantError } = useMerchant();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        totalSales: 0,
        activeCoupons: 0,
        listedCoupons: 0,
        totalRevenue: 0,
        totalCommission: 0,
    });
    const [coupons, setCoupons] = useState([]);

    useEffect(() => {
        if (merchantLoading) return;
        if (merchantError) {
            setError(merchantError.message); // Assuming error is an Error object
            setLoading(false);
            return;
        }
        if (!merchant) {
            // This case means no merchant record found for the user, or admin without selected merchant
            setLoading(false);
            return;
        }

        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Get merchant coupons
                const { data: merchantCoupons, error: couponsError } = await supabase
                    .from('coupons')
                    .select('*')
                    .eq('merchant_id', merchant.id)
                    .eq('is_merchant_owned', true)
                    .order('created_at', { ascending: false });

                if (couponsError) throw couponsError;

                // Calculate stats
                const activeCoupons = merchantCoupons.filter(c => c.status === 'available').length;
                const listedCoupons = merchantCoupons.filter(c => c.listed_on_marketplace).length;
                const soldCoupons = merchantCoupons.filter(c => c.status === 'sold').length;

                // Calculate total revenue (from sold coupons)
                const totalRevenue = merchantCoupons
                    .filter(c => c.status === 'sold')
                    .reduce((sum, c) => {
                        const sellingPrice = (c.merchant_selling_price_paise || 0) / 100;
                        const purchasePrice = (c.merchant_purchase_price_paise || 0) / 100;
                        const commission = (c.merchant_commission_paise || 0) / 100;
                        return sum + (sellingPrice - purchasePrice - commission);
                    }, 0);

                setStats({
                    totalSales: soldCoupons,
                    activeCoupons: activeCoupons,
                    listedCoupons: listedCoupons,
                    totalRevenue: totalRevenue,
                    totalCommission: (merchant.total_commission_paid_paise || 0) / 100,
                });

                // Transform coupons for display
                const transformedCoupons = merchantCoupons.map(c => ({
                    id: c.id,
                    brand: c.brand,
                    faceValue: c.face_value_paise / 100,
                    purchasePrice: (c.merchant_purchase_price_paise || 0) / 100,
                    sellingPrice: (c.merchant_selling_price_paise || 0) / 100,
                    commission: (c.merchant_commission_paise || 0) / 100,
                    status: c.status,
                    listed: c.listed_on_marketplace,
                }));

                setCoupons(transformedCoupons);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [merchant, merchantLoading, merchantError]);

    if (loading || merchantLoading) { // Combine loading states
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#92BCEA]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={fetchDashboardData}
                        className="px-4 py-2 bg-[#92BCEA] text-white rounded-lg hover:bg-[#7A93AC] transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const statsDisplay = [
        { label: 'Total Sales', value: stats.totalSales.toString(), change: '', icon: ShoppingBag, color: 'from-green-500 to-emerald-500' },
        { label: 'Active Coupons', value: stats.activeCoupons.toString(), change: `${stats.listedCoupons} listed`, icon: Package, color: 'from-blue-500 to-cyan-500' },
        { label: 'Total Revenue', value: `₹${stats.totalRevenue.toFixed(2)}`, change: '', icon: TrendingUp, color: 'from-purple-500 to-pink-500' },
        { label: 'Commission Paid', value: `₹${stats.totalCommission.toFixed(2)}`, change: '', icon: DollarSign, color: 'from-orange-500 to-red-500' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="pt-24 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                                Merchant Dashboard
                            </h1>
                            <p className="text-gray-600">Manage your inventory and track performance</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                href="/merchant/purchase"
                                className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-white border-2 border-[#92BCEA] text-[#92BCEA] font-bold rounded-xl hover:bg-[#92BCEA] hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <ShoppingBag size={20} />
                                <span className="hidden sm:inline">Purchase Coupons</span>
                                <span className="sm:hidden">Purchase</span>
                            </Link>
                            <Link
                                href="/merchant/inventory"
                                className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] hover:from-[#7A93AC] hover:to-[#92BCEA] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                            >
                                <Package size={20} />
                                <span className="hidden sm:inline">View Inventory</span>
                                <span className="sm:hidden">Inventory</span>
                            </Link>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
                        {statsDisplay.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <div key={stat.label} className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 hover:shadow-xl transition-all">
                                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}>
                                            <Icon className="text-white" size={20} />
                                        </div>
                                        {stat.change && <span className="text-xs sm:text-sm font-semibold text-gray-600">{stat.change}</span>}
                                    </div>
                                    <div className="text-xl sm:text-3xl font-bold text-gray-900 mb-1 truncate">{stat.value}</div>
                                    <div className="text-xs sm:text-sm text-gray-600">{stat.label}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Coupons Table */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-900">Your Coupons</h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Brand</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Face Value</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Purchase Price</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Selling Price</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Profit</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {coupons.map((coupon) => {
                                        const profit = coupon.sellingPrice - coupon.purchasePrice - coupon.commission;

                                        return (
                                            <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-900">{coupon.brand}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-gray-900">₹{coupon.faceValue.toLocaleString()}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-gray-900">₹{coupon.purchasePrice.toLocaleString()}</div>
                                                    <div className="text-xs text-gray-500">+ ₹{coupon.commission.toFixed(2)} fee</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {coupon.listed ? (
                                                        <div className="text-[#92BCEA] font-semibold">₹{coupon.sellingPrice.toLocaleString()}</div>
                                                    ) : (
                                                        <div className="text-gray-400">Not listed</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {coupon.listed ? (
                                                        <div className={`font-semibold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            ₹{profit.toFixed(2)}
                                                        </div>
                                                    ) : (
                                                        <div className="text-gray-400">-</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${coupon.status === 'sold' ? 'bg-green-100 text-green-700' :
                                                        coupon.listed ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {coupon.status === 'sold' ? 'Sold' : coupon.listed ? 'Listed' : 'Unlisted'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Link
                                                        href="/merchant/inventory"
                                                        className="text-[#92BCEA] hover:text-[#7A93AC] font-semibold text-sm"
                                                    >
                                                        Manage
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Empty State */}
                        {coupons.length === 0 && (
                            <div className="text-center py-16">
                                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-600 mb-4">No coupons in your inventory yet</p>
                                <Link
                                    href="/merchant/wholesale"
                                    className="inline-block px-6 py-3 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white font-bold rounded-xl hover:shadow-lg transition-all"
                                >
                                    Purchase Coupons
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
