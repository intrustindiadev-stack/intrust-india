'use client';

import { useState } from 'react';
import { Edit2, Trash2, Plus, Package } from 'lucide-react';
import ListToMarketplace from '@/components/merchant/ListToMarketplace';
import { supabase } from '@/lib/supabaseClient';

export default function InventoryTable({ initialCoupons, isAdmin }) {
    const [inventory, setInventory] = useState(initialCoupons);
    const [selectedCoupon, setSelectedCoupon] = useState(null);
    const [showListModal, setShowListModal] = useState(false);

    const handleListSuccess = async () => {
        setShowListModal(false);
        setSelectedCoupon(null);

        // Refresh the entire page to get updated stats
        window.location.reload();
    };

    const handleUnlist = async (couponId) => {
        try {
            const { error } = await supabase
                .from('coupons')
                .update({ listed_on_marketplace: false })
                .eq('id', couponId);

            if (error) throw error;

            // Refresh the page to update stats
            window.location.reload();
        } catch (err) {
            alert('Failed to unlist: ' + err.message);
        }
    };

    return (
        <>
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
                        {inventory.map((coupon) => {
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

            {inventory.length === 0 && (
                <div className="text-center py-16">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">No coupons found</p>
                </div>
            )}

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
        </>
    );
}
