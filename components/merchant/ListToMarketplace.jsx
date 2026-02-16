'use client';

import { useState } from 'react';
import { X, TrendingUp, DollarSign, Users, Calculator } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function ListToMarketplace({ coupon, onClose, onSuccess, isAdmin }) {
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                    <h2 className="text-2xl font-bold text-gray-900">List to Marketplace</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <X size={24} className="text-gray-600" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Coupon Info */}
                    <div className="bg-gradient-to-br from-[#92BCEA]/10 to-[#AFB3F7]/10 rounded-2xl p-6 border border-[#92BCEA]/20">
                        <h3 className="text-lg font-bold text-gray-900 mb-3">{coupon.brand}</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="text-gray-600">Face Value</div>
                                <div className="text-xl font-bold text-gray-900">₹{faceValue.toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="text-gray-600">Purchase Price</div>
                                <div className="text-xl font-bold text-gray-900">₹{purchasePrice.toLocaleString()}</div>
                                <div className="text-xs text-gray-500">
                                    {coupon.purchase_price !== null
                                        ? `+ ₹${commission.toFixed(2)} commission pd.`
                                        : '(Estimated)'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Selling Price Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Selling Price (₹) *
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={sellingPrice}
                            onChange={(e) => setSellingPrice(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all text-lg font-semibold"
                            placeholder="Enter selling price"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            This is the price customers will see excluding fee
                        </p>
                    </div>

                    {/* Calculations */}
                    {sellingPriceNum > 0 && (
                        <div className="space-y-4">
                            {/* Merchant Profit */}
                            <div className={`rounded-2xl p-4 border ${merchantProfit >= 0 ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign size={20} className={merchantProfit >= 0 ? 'text-green-600' : 'text-red-600'} />
                                    <h4 className={`font-semibold ${merchantProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                                        {merchantProfit >= 0 ? 'Your Profit' : 'Loss'}
                                    </h4>
                                </div>
                                <div className={`text-3xl font-bold mb-2 ${merchantProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ₹{merchantProfit.toFixed(2)}
                                </div>
                                <div className={`text-sm space-y-1 ${merchantProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    <div className="flex justify-between">
                                        <span>Selling Price:</span>
                                        <span>₹{sellingPriceNum.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>- Purchase Price:</span>
                                        <span>₹{purchasePrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>- Commission:</span>
                                        <span>₹{commission.toFixed(2)}</span>
                                    </div>
                                    <div className={`pt-1 border-t font-semibold flex justify-between ${merchantProfit >= 0 ? 'border-green-300' : 'border-red-300'}`}>
                                        <span>= Net {merchantProfit >= 0 ? 'Profit' : 'Loss'}:</span>
                                        <span>₹{merchantProfit.toFixed(2)} ({markup.toFixed(2)}%)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Warning if selling at loss */}
                            {merchantProfit < 0 && (
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                                    <Calculator className="text-orange-500 mt-0.5" size={20} />
                                    <div>
                                        <h5 className="font-bold text-orange-800">You are selling at a loss</h5>
                                        <p className="text-sm text-orange-700 mt-1">
                                            Your selling price of ₹{sellingPriceNum} is lower than your total cost (₹{(purchasePrice + commission).toFixed(2)}).
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Customer View */}
                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users size={20} className="text-blue-600" />
                                    <h4 className="font-semibold text-blue-900">Customer Sees</h4>
                                </div>
                                <div className="space-y-2 text-sm text-blue-700">
                                    <div className="flex justify-between">
                                        <span>Face Value:</span>
                                        <span className="font-semibold">₹{faceValue.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Your Price:</span>
                                        <span className="font-semibold">₹{sellingPriceNum.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Platform Fee (3%):</span>
                                        <span className="font-semibold">₹{customerFee.toFixed(2)}</span>
                                    </div>
                                    <div className="pt-2 border-t border-blue-300 flex justify-between text-base">
                                        <span className="font-bold">Customer Pays:</span>
                                        <span className="font-bold text-blue-600">₹{customerTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-blue-100 rounded-lg px-3 py-2 mt-2">
                                        <div className="text-xs text-blue-600">Customer Discount</div>
                                        <div className="text-lg font-bold text-blue-700">
                                            {customerDiscount.toFixed(1)}% OFF
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Warning if low/negative profit */}
                            {merchantProfit <= 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-red-700">
                                        <Calculator size={20} />
                                        <span className="font-semibold">
                                            {merchantProfit < 0 ? 'You will lose money!' : 'No profit!'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-red-600 mt-1">
                                        Your selling price should be higher than ₹{(purchasePrice + commission).toFixed(2)} to make profit
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || sellingPriceNum <= 0 || merchantProfit < 0}
                            className="flex-1 py-3 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] hover:from-[#7A93AC] hover:to-[#92BCEA] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Listing...
                                </>
                            ) : (
                                <>
                                    <TrendingUp size={20} />
                                    {coupon.listed_on_marketplace ? 'Update Listing' : 'List to Marketplace'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
