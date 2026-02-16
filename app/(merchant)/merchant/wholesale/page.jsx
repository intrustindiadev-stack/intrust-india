'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function WholesalePage() {
    const [cart, setCart] = useState({});
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [purchasing, setPurchasing] = useState(false);
    const [merchantBalance, setMerchantBalance] = useState(0);

    // Fetch platform inventory and merchant balance
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Get merchant profile
            const { data: merchantData, error: merchantError } = await supabase
                .from('merchants')
                .select('id, wallet_balance_paise, status')
                .eq('user_id', user.id)
                .single();

            if (merchantError) throw merchantError;

            if (merchantData.status !== 'approved') {
                throw new Error('Your merchant account is not approved yet');
            }

            setMerchantBalance(merchantData.wallet_balance_paise / 100);

            // Get platform-owned coupons (not merchant-owned)
            const { data: coupons, error: couponsError } = await supabase
                .from('coupons')
                .select('*')
                .eq('status', 'available')
                .eq('is_merchant_owned', false)
                .gte('valid_until', new Date().toISOString())
                .order('brand', { ascending: true });

            if (couponsError) throw couponsError;

            // Transform to display format
            const transformedCoupons = (coupons || []).map(c => ({
                id: c.id,
                brand: c.brand,
                faceValue: c.face_value_paise / 100,
                price: c.selling_price_paise / 100, // Same price as customers
                stock: 50, // Mock stock for now
            }));

            setInventory(transformedCoupons);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const addToCart = (item) => {
        setCart(prev => ({
            ...prev,
            [item.id]: (prev[item.id] || 0) + 1
        }));
    };

    const removeFromCart = (itemId) => {
        setCart(prev => {
            const newCart = { ...prev };
            if (newCart[itemId] > 1) {
                newCart[itemId]--;
            } else {
                delete newCart[itemId];
            }
            return newCart;
        });
    };

    const deleteFromCart = (itemId) => {
        setCart(prev => {
            const newCart = { ...prev };
            delete newCart[itemId];
            return newCart;
        });
    };

    // Calculate totals
    const cartSubtotal = Object.entries(cart).reduce((total, [id, qty]) => {
        const item = inventory.find(i => i.id === id);
        return total + (item?.price || 0) * qty;
    }, 0);

    const merchantCommission = cartSubtotal * 0.03;
    const cartTotal = cartSubtotal + merchantCommission;
    const cartItems = Object.entries(cart).length;

    const handlePurchase = async () => {
        if (cartItems === 0) return;

        if (merchantBalance < cartTotal) {
            alert(`Insufficient balance! You need ₹${cartTotal.toFixed(2)} but have ₹${merchantBalance.toFixed(2)}`);
            return;
        }

        try {
            setPurchasing(true);

            // Purchase each coupon in cart
            const purchases = Object.entries(cart).map(async ([couponId, qty]) => {
                // For now, purchase one at a time (can be optimized later)
                for (let i = 0; i < qty; i++) {
                    const { data, error } = await supabase.rpc('merchant_purchase_coupon', {
                        p_coupon_id: couponId,
                        p_quantity: 1
                    });

                    if (error) throw error;
                }
            });

            await Promise.all(purchases);

            alert('Purchase successful! Check your inventory.');
            setCart({});
            fetchData(); // Refresh data
        } catch (err) {
            console.error('Purchase error:', err);
            alert('Purchase failed: ' + err.message);
        } finally {
            setPurchasing(false);
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={fetchData}
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
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                            Purchase Coupons
                        </h1>
                        <p className="text-gray-600">Buy gift cards at customer prices + 3% commission</p>
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
                            <span className="text-sm font-semibold text-green-900">Wallet Balance:</span>
                            <span className="text-lg font-bold text-green-600">₹{merchantBalance.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Inventory Grid */}
                        <div className="lg:col-span-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {inventory.map((item) => {
                                    const commission = item.price * 0.03;
                                    const totalCost = item.price + commission;

                                    return (
                                        <div key={item.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900 mb-1">{item.brand}</h3>
                                                    <p className="text-sm text-gray-600">Face Value: ₹{item.faceValue}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-[#92BCEA]">₹{item.price}</div>
                                                    <div className="text-xs text-gray-500">+ ₹{commission.toFixed(2)} fee</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-sm text-gray-600">Total Cost: ₹{totalCost.toFixed(2)}</span>
                                                <span className="text-sm font-semibold text-green-600">
                                                    {((item.faceValue - item.price) / item.faceValue * 100).toFixed(0)}% discount
                                                </span>
                                            </div>

                                            {cart[item.id] ? (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all flex items-center justify-center"
                                                    >
                                                        <Minus size={18} />
                                                    </button>
                                                    <div className="px-4 py-2 bg-gray-100 rounded-lg font-bold text-gray-900">
                                                        {cart[item.id]}
                                                    </div>
                                                    <button
                                                        onClick={() => addToCart(item)}
                                                        className="flex-1 py-2 bg-[#92BCEA] hover:bg-[#7A93AC] text-white rounded-lg transition-all flex items-center justify-center"
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => addToCart(item)}
                                                    className="w-full py-3 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] hover:from-[#7A93AC] hover:to-[#92BCEA] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                                >
                                                    <ShoppingCart size={18} />
                                                    Add to Cart
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Cart Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-24 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Cart Summary</h2>

                                {cartItems === 0 ? (
                                    <div className="text-center py-8">
                                        <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-600">Your cart is empty</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Cart Items */}
                                        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                                            {Object.entries(cart).map(([id, qty]) => {
                                                const item = inventory.find(i => i.id === id);
                                                if (!item) return null;

                                                const commission = item.price * 0.03;
                                                const totalCost = (item.price + commission) * qty;

                                                return (
                                                    <div key={id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                                        <div className="flex-1">
                                                            <div className="font-semibold text-gray-900">{item.brand}</div>
                                                            <div className="text-sm text-gray-600">₹{item.price} × {qty}</div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="font-bold text-gray-900">₹{totalCost.toFixed(2)}</div>
                                                            <button
                                                                onClick={() => deleteFromCart(id)}
                                                                className="p-1 hover:bg-red-50 rounded transition-all"
                                                            >
                                                                <Trash2 size={16} className="text-red-600" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Total */}
                                        <div className="border-t border-gray-200 pt-4 mb-6 space-y-2">
                                            <div className="flex items-center justify-between text-gray-600">
                                                <span>Subtotal</span>
                                                <span className="font-semibold">₹{cartSubtotal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-gray-600">
                                                <span>Commission (3%)</span>
                                                <span className="font-semibold">₹{merchantCommission.toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                                                <span>Total Amount</span>
                                                <span className="text-2xl text-[#92BCEA]">₹{cartTotal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Total Items</span>
                                                <span className="font-semibold text-gray-900">
                                                    {Object.values(cart).reduce((a, b) => a + b, 0)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Balance Check */}
                                        {merchantBalance < cartTotal && (
                                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                                                <p className="text-sm text-red-700 font-semibold">
                                                    Insufficient balance! Need ₹{(cartTotal - merchantBalance).toFixed(2)} more.
                                                </p>
                                            </div>
                                        )}

                                        {/* Checkout Button */}
                                        <button
                                            onClick={handlePurchase}
                                            disabled={purchasing || merchantBalance < cartTotal}
                                            className="w-full py-4 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] hover:from-[#7A93AC] hover:to-[#92BCEA] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {purchasing ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={20} />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <CreditCard size={20} />
                                                    Complete Purchase
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
