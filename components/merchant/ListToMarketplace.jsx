'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Store, X, AlertCircle, TrendingUp, TrendingDown, HelpCircle, Check, ShieldAlert } from 'lucide-react';

export default function ListToMarketplace({ coupon, onClose, onSuccess }) {
    // Calculate baseline values
    const faceValue = (coupon.face_value_paise || 0) / 100;
    const purchasePrice = coupon.purchase_price ?? ((coupon.merchant_purchase_price_paise || 0) / 100) ?? faceValue;
    const commission = coupon.commission ?? (purchasePrice * 0.03);

    // Default 10% margin recommendation
    const recommendedSellingPrice = purchasePrice + commission + (purchasePrice * 0.10);

    const defaultSellingPrice = coupon.merchant_selling_price_paise
        ? (coupon.merchant_selling_price_paise / 100).toFixed(2)
        : recommendedSellingPrice.toFixed(2);

    const [sellingPrice, setSellingPrice] = useState(defaultSellingPrice);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ESC key closes modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const sellingPriceNum = parseFloat(sellingPrice) || 0;
    const customerFee = sellingPriceNum * 0.03;
    const customerTotal = sellingPriceNum + customerFee;
    const merchantProfit = sellingPriceNum - purchasePrice - commission;
    const customerDiscount = faceValue > 0 ? ((faceValue - sellingPriceNum) / faceValue) * 100 : 0;

    // Profit Margin % (Profit / Selling Price)
    const profitMargin = sellingPriceNum > 0
        ? ((merchantProfit / sellingPriceNum) * 100)
        : 0;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (sellingPriceNum <= 0) {
            setError('Please enter a valid selling price greater than ₹0.');
            return;
        }

        if (profitMargin > 10.01) { 
            setError('Platform policy restricts merchant profit margin to a maximum of 10%. Please lower your selling price.');
            return;
        }

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
            setError(err.message || 'Failed to list coupon to marketplace.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="list-modal-title"
        >
            <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto relative overflow-hidden my-auto text-slate-900 dark:text-slate-100">
                {/* Background glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none -z-10" />

                {/* Header */}
                <div className="sticky top-0 bg-white/95 dark:bg-[#0b1329]/95 backdrop-blur-md border-b border-slate-100 dark:border-white/5 py-4 px-6 flex items-center justify-between z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
                            <Store size={20} />
                        </div>
                        <div>
                            <h2 id="list-modal-title" className="text-lg font-bold font-display tracking-tight text-slate-900 dark:text-white">
                                {coupon.listed_on_marketplace ? 'Edit Marketplace Listing' : 'List to Marketplace'}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Set your selling price and publish to marketplace buyers
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        type="button"
                        aria-label="Close dialog"
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 relative z-10">
                    {/* Card Overview Banner */}
                    <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {coupon.brand}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-white/10 px-2 py-0.5 rounded-md">
                                {coupon.category || 'Gift Card'}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Face Value</span>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                    ₹{faceValue.toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Your Cost</span>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                    ₹{purchasePrice.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                    + ₹{commission.toFixed(2)} platform fee
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Selling Price Input */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label htmlFor="selling-price-input" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                Selling Price (₹) <span className="text-rose-500">*</span>
                            </label>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                Max allowed margin: 10%
                            </span>
                        </div>

                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg select-none">₹</span>
                            <input
                                id="selling-price-input"
                                type="number"
                                step="0.01"
                                min="0"
                                value={sellingPrice}
                                onChange={(e) => {
                                    setSellingPrice(e.target.value);
                                    setError(null);
                                }}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 text-slate-900 dark:text-white font-bold text-xl transition-all"
                                placeholder="0.00"
                                required
                            />
                        </div>

                        {/* Quick Margin Presets */}
                        <div className="flex items-center justify-between mt-3">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">Quick Margins:</span>
                            <div className="flex gap-1.5">
                                {[2, 5, 8, 10].map(percent => {
                                    const targetMargin = percent / 100;
                                    const cost = purchasePrice + commission;
                                    const targetPrice = cost / (1 - targetMargin);
                                    const isSelected = Math.abs(profitMargin - percent) < 0.2;

                                    return (
                                        <button
                                            key={percent}
                                            type="button"
                                            onClick={() => {
                                                setSellingPrice(targetPrice.toFixed(2));
                                                setError(null);
                                            }}
                                            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all ${
                                                isSelected
                                                    ? 'bg-[#D4AF37] border-[#D4AF37] text-slate-900 shadow-sm'
                                                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                                            }`}
                                        >
                                            {percent}%
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Real-time Calculation Breakdown */}
                    {sellingPriceNum > 0 && (
                        <div className="space-y-3">
                            {/* Merchant Profit Card */}
                            <div className={`rounded-xl p-4 border transition-all ${
                                merchantProfit >= 0 
                                    ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20' 
                                    : 'bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20'
                            }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                        {merchantProfit >= 0 ? (
                                            <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
                                        ) : (
                                            <TrendingDown size={16} className="text-rose-600 dark:text-rose-400" />
                                        )}
                                        <span className={`text-xs font-bold uppercase tracking-wider ${
                                            merchantProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                                        }`}>
                                            {merchantProfit >= 0 ? 'Your Net Profit' : 'Estimated Loss'}
                                        </span>
                                    </div>
                                    <span className={`text-lg font-bold font-display ${
                                        merchantProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                    }`}>
                                        ₹{merchantProfit.toFixed(2)} ({profitMargin.toFixed(1)}%)
                                    </span>
                                </div>

                                <div className="text-xs space-y-1 pt-2 border-t border-slate-200/60 dark:border-white/10 text-slate-600 dark:text-slate-300">
                                    <div className="flex justify-between">
                                        <span>Listed Price</span>
                                        <span className="font-semibold">₹{sellingPriceNum.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Purchase Cost + Platform Fee</span>
                                        <span className="font-semibold">- ₹{(purchasePrice + commission).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Warning: Selling at loss */}
                            {merchantProfit < 0 && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                                    <span>
                                        Selling price is below total cost (₹{(purchasePrice + commission).toFixed(2)}). You will incur a loss on this card.
                                    </span>
                                </div>
                            )}

                            {/* Warning: Margin > 10% */}
                            {profitMargin > 10 && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-rose-800 dark:text-rose-300 text-xs font-medium">
                                    <ShieldAlert size={16} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                                    <span>
                                        Profit margin exceeds platform policy limit of 10% ({profitMargin.toFixed(1)}%). Lower your selling price to continue.
                                    </span>
                                </div>
                            )}

                            {/* Customer View Card */}
                            <div className="bg-slate-50 dark:bg-white/[0.02] rounded-xl p-3.5 border border-slate-200/80 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 font-semibold mb-1">
                                    <span>Customer Pays (Price + 3% Buyer Fee)</span>
                                    <span className="font-bold text-slate-900 dark:text-white">₹{customerTotal.toFixed(2)}</span>
                                </div>
                                {customerDiscount > 0 && (
                                    <div className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-between">
                                        <span>Customer Savings vs Face Value:</span>
                                        <span>{customerDiscount.toFixed(1)}% OFF</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all text-xs uppercase tracking-wider"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || sellingPriceNum <= 0 || profitMargin > 10.01}
                            className="flex-1 py-3 px-4 bg-[#D4AF37] hover:bg-[#c9a42f] text-slate-950 font-bold rounded-xl shadow-md shadow-[#D4AF37]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                    <span>Listing...</span>
                                </>
                            ) : (
                                <>
                                    <Store size={15} />
                                    <span>{coupon.listed_on_marketplace ? 'Update Listing' : 'List Card'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
