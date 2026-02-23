'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ListToMarketplace({ coupon, onClose, onSuccess }) {
    const [sellingPrice, setSellingPrice] = useState(
        coupon.merchant_selling_price_paise ? (coupon.merchant_selling_price_paise / 100).toString() : ''
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Calculate values
    const faceValue = (coupon.face_value_paise || 0) / 100;

    // Use the mapped purchase_price from backend, or fallback to face_value
    const purchasePrice = coupon.purchase_price ?? faceValue;
    const commission = coupon.commission ?? (purchasePrice * 0.03); // Fallback estimate if no commission record

    const sellingPriceNum = parseFloat(sellingPrice) || 0;
    const customerFee = sellingPriceNum * 0.03;
    const customerTotal = sellingPriceNum + customerFee;
    const merchantProfit = sellingPriceNum - purchasePrice - commission;
    const customerDiscount = ((faceValue - sellingPriceNum) / faceValue) * 100;

    // Profit markup %
    const markup = purchasePrice > 0
        ? ((merchantProfit / purchasePrice) * 100)
        : 100; // If purchase price is 0 (shouldn't happen), assume 100% markup

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (sellingPriceNum <= 0) {
            setError('Please enter a valid selling price');
            return;
        }

        // Removed the hard block "Selling price must be higher than purchase price"
        // to allow selling at loss (liquidation), but kept the warning in UI.

        try {
            setLoading(true);
            setError(null);

            // Call the merchant_list_to_marketplace function
            const { data, error: listError } = await supabase.rpc('merchant_list_to_marketplace', {
                p_coupon_id: coupon.id,
                p_selling_price_paise: Math.floor(sellingPriceNum * 100)
            });

            if (listError) throw listError;

            onSuccess();
        } catch (err) {
            console.error('Error listing to marketplace:', err);
            setError(err.message || 'Failed to list coupon');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#020617] border border-white/10 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative overflow-hidden">
                {/* Background embellishments */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[80px] pointer-events-none"></div>

                {/* Header */}
                <div className="sticky top-0 bg-[#020617]/80 backdrop-blur-md border-b border-white/5 py-5 px-6 flex items-center justify-between rounded-t-3xl z-20">
                    <h2 className="text-2xl font-display font-bold text-slate-100 flex items-center">
                        <span className="material-icons-round text-[#D4AF37] mr-3">storefront</span>
                        List to Marketplace
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                    >
                        <span className="material-icons-round text-lg">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 relative z-10">
                    {/* Coupon Info */}
                    <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-[#D4AF37]/5 to-transparent skew-x-12 -translate-x-4 opacity-50 pointer-events-none"></div>
                        <h3 className="text-xl font-bold text-[#D4AF37] mb-4 font-display">{coupon.brand}</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm relative z-10">
                            <div>
                                <div className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Face Value</div>
                                <div className="text-xl font-bold text-slate-100">₹{faceValue.toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Purchase Price</div>
                                <div className="text-xl font-bold text-slate-100">₹{purchasePrice.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-500 mt-1 uppercase">
                                    {coupon.purchase_price !== null
                                        ? `+ ₹${commission.toFixed(2)} Platform Fee`
                                        : '(Estimated)'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Selling Price Input */}
                    <div className="group">
                        <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-2 transition-colors">
                            Your Selling Price (₹) *
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold material-icons-round select-none">currency_rupee</span>
                            <input
                                type="number"
                                step="0.01"
                                value={sellingPrice}
                                onChange={(e) => setSellingPrice(e.target.value)}
                                className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-100 font-bold text-xl transition-all"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-2 font-medium">
                            This is the price customers will see, excluding the 3% buyer fee.
                        </p>
                    </div>

                    {/* Calculations */}
                    {sellingPriceNum > 0 && (
                        <div className="space-y-4">
                            {/* Merchant Profit */}
                            <div className={`rounded-2xl p-5 border ${merchantProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`material-icons-round text-lg ${merchantProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {merchantProfit >= 0 ? 'trending_up' : 'trending_down'}
                                    </span>
                                    <h4 className={`font-bold uppercase tracking-widest text-[11px] ${merchantProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {merchantProfit >= 0 ? 'Your Profit Margin' : 'Your Loss'}
                                    </h4>
                                </div>
                                <div className={`text-4xl font-display font-bold mb-4 ${merchantProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ₹{merchantProfit.toFixed(2)}
                                </div>
                                <div className={`text-sm space-y-2 font-medium ${merchantProfit >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                                    <div className="flex justify-between items-center">
                                        <span>Selling Price</span>
                                        <span className="font-bold text-slate-200">₹{sellingPriceNum.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Purchase Cost</span>
                                        <span className="font-bold text-slate-200">- ₹{purchasePrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Commission Paid</span>
                                        <span className="font-bold text-slate-200">- ₹{commission.toFixed(2)}</span>
                                    </div>
                                    <div className={`pt-3 mt-1 border-t items-center flex justify-between ${merchantProfit >= 0 ? 'border-emerald-500/20 text-emerald-300' : 'border-red-500/20 text-red-300'}`}>
                                        <span className="font-bold uppercase tracking-wider text-[11px]">= Net {merchantProfit >= 0 ? 'Profit' : 'Loss'}</span>
                                        <span className="font-bold">₹{merchantProfit.toFixed(2)} ({markup.toFixed(1)}%)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Warning if selling at loss */}
                            {merchantProfit < 0 && (
                                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start gap-3">
                                    <span className="material-icons-round text-orange-400 mt-0.5">warning</span>
                                    <div>
                                        <h5 className="font-bold text-orange-400">Selling at a Loss</h5>
                                        <p className="text-sm text-orange-400/80 mt-1">
                                            Your selling price is lower than your total cost of <span className="font-bold">₹{(purchasePrice + commission).toFixed(2)}</span>. You will incur a loss on this sale.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Customer View */}
                            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-icons-round text-slate-300 text-lg">face</span>
                                    <h4 className="font-bold uppercase tracking-widest text-[11px] text-slate-300">Customer View</h4>
                                </div>
                                <div className="space-y-3 text-sm text-slate-400 font-medium">
                                    <div className="flex justify-between items-center">
                                        <span>Face Value</span>
                                        <span className="font-bold text-slate-200">₹{faceValue.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Your Listed Price</span>
                                        <span className="font-bold text-slate-200">₹{sellingPriceNum.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Buyer Platform Fee (3%)</span>
                                        <span className="font-bold text-slate-200">+ ₹{customerFee.toFixed(2)}</span>
                                    </div>
                                    <div className="pt-3 mt-1 border-t border-white/10 flex justify-between items-center text-base">
                                        <span className="font-bold uppercase tracking-wider text-[11px] text-slate-300">Total Customer Pays</span>
                                        <span className="font-bold text-slate-100">₹{customerTotal.toFixed(2)}</span>
                                    </div>

                                    {customerDiscount > 0 && (
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mt-4 flex justify-between items-center">
                                            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Customer Saves</div>
                                            <div className="text-xl font-bold text-emerald-400">
                                                {customerDiscount.toFixed(1)}% OFF
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm font-bold flex items-center space-x-2">
                            <span className="material-icons-round text-red-400">error_outline</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-4 pt-6 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || sellingPriceNum <= 0}
                            className="flex-1 py-4 bg-[#D4AF37] text-[#020617] font-bold rounded-xl shadow-lg shadow-[#D4AF37]/20 hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 gold-glow"
                        >
                            {loading ? (
                                <>
                                    <span className="material-icons-round animate-spin text-sm">autorenew</span>
                                    <span>Listing...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-round text-sm">publish</span>
                                    <span>{coupon.listed_on_marketplace ? 'Update Listing' : 'List Coupon'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
