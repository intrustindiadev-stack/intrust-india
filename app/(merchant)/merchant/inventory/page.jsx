'use client';

import { useState, useEffect } from 'react';
import { Package, TrendingUp, DollarSign, Eye, Edit2, Trash2, Plus, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useMerchant } from '@/hooks/useMerchant';
import ListToMarketplace from '@/components/merchant/ListToMarketplace';

export default function InventoryPage() {
    const { merchant, loading: merchantLoading, error: merchantError, isAdmin } = useMerchant();
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCoupon, setSelectedCoupon] = useState(null);
    const [showListModal, setShowListModal] = useState(false);
    const [filter, setFilter] = useState('all'); // all, listed, unlisted

    // Fetch merchant inventory
    const fetchInventory = async () => {
        try {
            setLoading(true);
            setError(null);

            let query = supabase
                .from('coupons')
                .select('*')
                .order('created_at', { ascending: false });

            if (isAdmin) {
                // Admins see all coupons (or subset)
                // For "Merchant Inventory" simulation, we can just show global coupons or 
                // coupons owned by *any* merchant?
                // Step 4 says: "If role === admin (dev mode): Fetch all coupons"
                // So no change needed for admin part really, it was already selecting * 
            } else if (merchant) {
                // Merchants see their own coupons
                query = query
                    .eq('merchant_id', merchant.id);
                // Removing .eq('is_merchant_owned', true) as we now rely on merchant_id foreign key
            } else {
                setInventory([]);
                return;
            }

            const { data: coupons, error: couponsError } = await query;

            if (couponsError) throw couponsError;

            setInventory(coupons || []);
        } catch (err) {
            console.error('Error fetching inventory:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (merchantLoading) return;

        // If error is strictly about merchant loading, we might want to show it.
        // But for admins, merchant might be null without error.

        if (merchantError && !isAdmin) {
            setError(merchantError.message || 'Error loading merchant profile');
            setLoading(false);
            return;
        }

        // If not admin and no merchant, we can't show inventory
        if (!isAdmin && !merchant) {
            setLoading(false);
            return;
        }

        fetchInventory();
    }, [merchant, merchantLoading, merchantError, isAdmin]);

    // Calculate stats
    const stats = {
        total: inventory.length,
        listed: inventory.filter(c => c.listed_on_marketplace).length,
        unlisted: inventory.filter(c => !c.listed_on_marketplace).length,
        totalValue: inventory.reduce((sum, c) => sum + (c.merchant_purchase_price_paise || 0), 0) / 100,
    };

    // Filter inventory
    const filteredInventory = inventory.filter(c => {
        if (filter === 'listed') return c.listed_on_marketplace;
        if (filter === 'unlisted') return !c.listed_on_marketplace;
        return true;
    });

    const handleListSuccess = () => {
        setShowListModal(false);
        setSelectedCoupon(null);
        fetchInventory();
    };

    const handleUnlist = async (couponId) => {
        try {
            const { error } = await supabase
                .from('coupons')
                .update({ listed_on_marketplace: false })
                .eq('id', couponId);

            if (error) throw error;
            fetchInventory();
        } catch (err) {
            alert('Failed to unlist: ' + err.message);
        }
    };

    if (loading) {
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Inventory</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={fetchInventory}
                        className="px-4 py-2 bg-[#92BCEA] text-white rounded-lg hover:bg-[#7A93AC] transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="pt-24 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    {/* Header */}
                    <div className="mb-6 sm:mb-8">
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                            My Inventory
                        </h1>
                        <p className="text-sm sm:text-base text-gray-600">Manage your purchased coupons and marketplace listings</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                    <Package className="text-white" size={24} />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</div>
                            <div className="text-sm text-gray-600">Total Coupons</div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                                    <TrendingUp className="text-white" size={24} />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.listed}</div>
                            <div className="text-sm text-gray-600">Listed on Marketplace</div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                                    <Package className="text-white" size={24} />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.unlisted}</div>
                            <div className="text-sm text-gray-600">Unlisted</div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                    <DollarSign className="text-white" size={24} />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">₹{stats.totalValue.toLocaleString()}</div>
                            <div className="text-sm text-gray-600">Total Investment</div>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${filter === 'all'
                                ? 'bg-[#92BCEA] text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            All ({stats.total})
                        </button>
                        <button
                            onClick={() => setFilter('listed')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${filter === 'listed'
                                ? 'bg-[#92BCEA] text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Listed ({stats.listed})
                        </button>
                        <button
                            onClick={() => setFilter('unlisted')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${filter === 'unlisted'
                                ? 'bg-[#92BCEA] text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Unlisted ({stats.unlisted})
                        </button>
                    </div>

                    {/* Inventory Table */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
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
                                    {filteredInventory.map((coupon) => {
                                        const purchasePrice = (coupon.merchant_purchase_price_paise || 0) / 100;
                                        const commission = (coupon.merchant_commission_paise || 0) / 100;
                                        const sellingPrice = (coupon.merchant_selling_price_paise || 0) / 100;
                                        const profit = sellingPrice - purchasePrice - commission;

                                        return (
                                            <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-900">{coupon.brand}</div>
                                                    <div className="text-sm text-gray-500">{coupon.category}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-gray-900">₹{(coupon.face_value_paise / 100).toLocaleString()}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-gray-900">₹{purchasePrice.toLocaleString()}</div>
                                                    <div className="text-xs text-gray-500">+ ₹{commission.toFixed(2)} fee</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {coupon.listed_on_marketplace ? (
                                                        <div className="text-[#92BCEA] font-semibold">₹{sellingPrice.toLocaleString()}</div>
                                                    ) : (
                                                        <div className="text-gray-400">Not listed</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {coupon.listed_on_marketplace ? (
                                                        <div className={`font-semibold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            ₹{profit.toFixed(2)}
                                                        </div>
                                                    ) : (
                                                        <div className="text-gray-400">-</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${coupon.listed_on_marketplace
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {coupon.listed_on_marketplace ? 'Listed' : 'Unlisted'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {!coupon.listed_on_marketplace ? (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedCoupon(coupon);
                                                                    setShowListModal(true);
                                                                }}
                                                                className="p-2 bg-[#92BCEA] hover:bg-[#7A93AC] text-white rounded-lg transition-colors"
                                                                title="List to Marketplace"
                                                            >
                                                                <Plus size={18} />
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedCoupon(coupon);
                                                                        setShowListModal(true);
                                                                    }}
                                                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                                    title="Edit Price"
                                                                >
                                                                    <Edit2 size={18} className="text-gray-600" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUnlist(coupon.id)}
                                                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Remove from Marketplace"
                                                                >
                                                                    <Trash2 size={18} className="text-red-600" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Empty State */}
                        {filteredInventory.length === 0 && (
                            <div className="text-center py-16">
                                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-600 mb-4">
                                    {filter === 'all' ? 'No coupons in inventory' : `No ${filter} coupons`}
                                </p>
                                {filter === 'all' && (
                                    <a
                                        href="/merchant/purchase"
                                        className="inline-block px-6 py-3 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white font-bold rounded-xl hover:shadow-lg transition-all"
                                    >
                                        Purchase Coupons
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* List to Marketplace Modal */}
            {showListModal && selectedCoupon && (
                <ListToMarketplace
                    coupon={selectedCoupon}
                    isAdmin={isAdmin}
                    onClose={() => {
                        setShowListModal(false);
                        setSelectedCoupon(null);
                    }}
                    onSuccess={handleListSuccess}
                />
            )}
        </div>
    );
}
