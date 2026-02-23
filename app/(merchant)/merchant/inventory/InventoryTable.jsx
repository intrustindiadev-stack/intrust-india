'use client';

import { useState } from 'react';
import ListToMarketplace from '@/components/merchant/ListToMarketplace';
import { supabase } from '@/lib/supabaseClient';

export default function InventoryTable({ initialCoupons, isAdmin }) {
    const [inventory] = useState(initialCoupons);
    const [selectedCoupon, setSelectedCoupon] = useState(null);
    const [showListModal, setShowListModal] = useState(false);

    const handleListSuccess = async () => {
        setShowListModal(false);
        setSelectedCoupon(null);
        window.location.reload();
    };

    const handleUnlist = async (couponId) => {
        try {
            const { error } = await supabase
                .from('coupons')
                .update({ listed_on_marketplace: false })
                .eq('id', couponId);

            if (error) throw error;
            window.location.reload();
        } catch (err) {
            alert('Failed to unlist: ' + err.message);
        }
    };

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                    <thead>
                        <tr className="text-[11px] uppercase tracking-widest text-slate-500 font-bold border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                            <th className="px-8 py-5">Brand</th>
                            <th className="px-8 py-5">Face Value</th>
                            <th className="px-8 py-5">Purchase Price</th>
                            <th className="px-8 py-5">Selling Price</th>
                            <th className="px-8 py-5">Profit</th>
                            <th className="px-8 py-5">Status</th>
                            <th className="px-8 py-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {inventory.map((coupon) => {
                            const rawPurchasePrice = coupon.purchase_price ?? ((coupon.merchant_purchase_price_paise || 0) / 100);

                            // Ensure purchase price is treated as a positive number (Total Investment)
                            const purchasePrice = Math.abs(rawPurchasePrice);
                            const sellingPrice = (coupon.merchant_selling_price_paise || 0) / 100;

                            // Profit = Selling Price - Total Investment (which includes fee)
                            const profit = sellingPrice - purchasePrice;

                            return (
                                <tr key={coupon.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-500/10 flex items-center justify-center border border-black/5 dark:border-slate-500/20">
                                                <span className="font-bold text-[#D4AF37] text-lg">{coupon.brand.charAt(0)}</span>
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{coupon.brand}</div>
                                                <div className="text-[10px] text-slate-500 font-semibold">{coupon.category || "Gift Card"}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-slate-700 dark:text-slate-300 font-bold">₹{(coupon.face_value_paise / 100).toLocaleString('en-IN')}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-slate-800 dark:text-slate-100">₹{purchasePrice.toLocaleString('en-IN')}</div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-tight">Total Investment</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        {coupon.listed_on_marketplace ? (
                                            <div className="text-blue-600 dark:text-blue-400 font-bold">₹{sellingPrice.toLocaleString('en-IN')}</div>
                                        ) : (
                                            <div className="text-slate-400 dark:text-slate-500 text-sm font-semibold italic">Not listed</div>
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        {coupon.listed_on_marketplace ? (
                                            <div className={`font-bold ${profit > 0 ? 'text-emerald-600 dark:text-emerald-400' : profit < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                ₹{profit.toFixed(2)}
                                            </div>
                                        ) : (
                                            <div className="text-slate-400 dark:text-slate-500">-</div>
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${coupon.listed_on_marketplace
                                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-black/5 dark:border-white/5'
                                            }`}>
                                            {coupon.listed_on_marketplace ? 'Listed' : 'Unlisted'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            {!coupon.listed_on_marketplace ? (
                                                <button
                                                    onClick={() => {
                                                        setSelectedCoupon(coupon);
                                                        setShowListModal(true);
                                                    }}
                                                    className="w-10 h-10 flex items-center justify-center bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl transition-all shadow-sm"
                                                    title="List to Marketplace"
                                                >
                                                    <span className="material-icons-round text-sm">storefront</span>
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCoupon(coupon);
                                                            setShowListModal(true);
                                                        }}
                                                        className="w-10 h-10 flex items-center justify-center bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-xl transition-all shadow-sm"
                                                        title="Edit Listing"
                                                    >
                                                        <span className="material-icons-round text-sm">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleUnlist(coupon.id)}
                                                        className="w-10 h-10 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 rounded-xl transition-all shadow-sm"
                                                        title="Remove from Marketplace"
                                                    >
                                                        <span className="material-icons-round text-sm">visibility_off</span>
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
