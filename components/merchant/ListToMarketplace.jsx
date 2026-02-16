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
    const purchasePrice = (coupon.merchant_purchase_price_paise || 0) / 100;
    const commission = (coupon.merchant_commission_paise || 0) / 100;
    const faceValue = (coupon.face_value_paise || 0) / 100;

    const sellingPriceNum = parseFloat(sellingPrice) || 0;
    const customerFee = sellingPriceNum * 0.03;
    const customerTotal = sellingPriceNum + customerFee;
    const merchantProfit = sellingPriceNum - purchasePrice - commission;
    const customerDiscount = ((faceValue - sellingPriceNum) / faceValue) * 100;
    const markup = ((sellingPriceNum - purchasePrice) / purchasePrice) * 100;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (sellingPriceNum <= 0) {
            setError('Please enter a valid selling price');
            return;
        }

        if (sellingPriceNum <= purchasePrice) {
            setError('Selling price must be higher than purchase price to make profit');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            if (isAdmin) {
                // Mock success for admin
                await new Promise(resolve => setTimeout(resolve, 1000));
                console.log('Admin Simulation: Listing successful');
                onSuccess();
                return;
            }

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
                                <div className="text-gray-600">Your Purchase Price</div>
                                <div className="text-xl font-bold text-gray-900">₹{purchasePrice.toLocaleString()}</div>
                                <div className="text-xs text-gray-500">+ ₹{commission.toFixed(2)} commission paid</div>
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
                            This is the price customers will see before platform fee
                        </p>
                    </div>

                    {/* Calculations */}
                    {sellingPriceNum > 0 && (
                        <div className="space-y-4">
                            {/* Merchant Profit */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign size={20} className="text-green-600" />
                                    <h4 className="font-semibold text-green-900">Your Profit</h4>
                                </div>
                                <div className="text-3xl font-bold text-green-600 mb-2">
                                    ₹{merchantProfit.toFixed(2)}
                                </div>
                                <div className="text-sm text-green-700 space-y-1">
                                    <div>Selling Price: ₹{sellingPriceNum.toFixed(2)}</div>
                                    <div>- Purchase Price: ₹{purchasePrice.toFixed(2)}</div>
                                    <div>- Commission Paid: ₹{commission.toFixed(2)}</div>
                                    <div className="pt-1 border-t border-green-300 font-semibold">
                                        = Net Profit: ₹{merchantProfit.toFixed(2)} ({markup.toFixed(1)}% markup)
                                    </div>
                                </div>
                            </div>

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
