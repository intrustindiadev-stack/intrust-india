'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useMerchant } from '@/hooks/useMerchant';

export default function PurchasePage() {
    const { merchant, loading: merchantLoading, error: merchantError, isAdmin } = useMerchant();
    const [cart, setCart] = useState({});
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [purchasing, setPurchasing] = useState(false);
    const [merchantBalance, setMerchantBalance] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const PAGE_SIZE = 50;

    // Fetch platform inventory with pagination
    const fetchInventory = async (append = false) => {
        try {
            if (!append) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            setError(null);

            const startIndex = append ? inventory.length : 0;
            const endIndex = startIndex + PAGE_SIZE - 1;

            // Build query
            let query = supabase
                .from('coupons')
                .select('*')
                .eq('status', 'available')
                .is('merchant_id', null)
                .gte('valid_until', new Date().toISOString())
                .order('brand', { ascending: true })
                .range(startIndex, endIndex);

            // Add search filter if searchQuery exists
            if (searchQuery) {
                query = query.ilike('brand', `%${searchQuery}%`);
            }

            const { data: coupons, error: couponsError } = await query;

            if (couponsError) throw couponsError;

            // Check if there are more items
            setHasMore(coupons && coupons.length === PAGE_SIZE);

            // Group coupons by brand+price
            const grouped = {};
            (coupons || []).forEach(c => {
                const key = `${c.brand}-${c.face_value_paise}-${c.selling_price_paise}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        id: c.id,
                        ids: [c.id],
                        brand: c.brand,
                        faceValue: c.face_value_paise / 100,
                        price: c.selling_price_paise / 100,
                        stock: 0
                    };
                } else {
                    grouped[key].ids.push(c.id);
                }
                grouped[key].stock++;
            });

            const newItems = Object.values(grouped);
            setInventory(append ? [...inventory, ...newItems] : newItems);
        } catch (err) {
            console.error('Error fetching inventory:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        if (merchantLoading) return;

        if (merchantError && !isAdmin) {
            setError(merchantError.message || 'Error loading merchant profile');
            setLoading(false);
            return;
        }

        if (!merchant && !isAdmin) {
            // Should be handled by layout, but safe fallback
            setLoading(false);
            return;
        }

        if (merchant && merchant.status !== 'approved' && !isAdmin) {
            setError('Your merchant account is not approved yet.');
            setLoading(false);
            return;
        }

        setMerchantBalance(merchant ? (merchant.wallet_balance_paise || 0) / 100 : 0);
        fetchInventory();
    }, [merchant, merchantLoading, merchantError, isAdmin]);

    // Handle search query changes
    useEffect(() => {
        if (!merchant && !isAdmin) return;
        const debounceTimer = setTimeout(() => {
            fetchInventory(false); // Reset to first page on search
        }, 500);
        return () => clearTimeout(debounceTimer);
    }, [searchQuery]);

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
    const cartItems = Object.entries(cart).reduce((a, b) => a + b, 0);

    const handlePurchase = async () => {
        if (cartItems === 0) return;

        // Validation for merchants (admins bypass balance check)
        if (!isAdmin && merchantBalance < cartTotal) {
            alert(`Insufficient balance! You need ₹${cartTotal.toFixed(2)} but have ₹${merchantBalance.toFixed(2)}`);
            return;
        }

        try {
            setPurchasing(true);

            if (isAdmin && !merchant) {
                // Mock purchase for admin without merchant record
                await new Promise(resolve => setTimeout(resolve, 1000));
                alert('Admin Simulation: Purchase successful! (No real transaction created)');
                setCart({});
                return;
            }

            // Purchase each coupon in cart
            const purchasePromises = [];
            Object.entries(cart).forEach(([couponId, qty]) => {
                for (let i = 0; i < qty; i++) {
                    purchasePromises.push(
                        supabase.rpc('merchant_purchase_coupon', {
                            p_coupon_id: couponId,
                            p_quantity: 1
                        })
                    );
                }
            });

            const results = await Promise.all(purchasePromises);
            const errors = results.filter(r => r.error);
            if (errors.length > 0) throw new Error(`Failed to purchase ${errors.length} items. Possible KYC or balance issue.`);

            alert('Purchase successful! Check your inventory.');
            setCart({});
            // Update balance locally and refresher
            setMerchantBalance(prev => prev - cartTotal);
            fetchInventory();
        } catch (err) {
            console.error('Purchase error:', err);
            alert('Purchase failed: ' + err.message);
        } finally {
            setPurchasing(false);
        }
    };

    if (loading || merchantLoading) {
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
                        onClick={() => window.location.reload()}
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
<<<<<<< HEAD
                            Purchase Gift Cards
                        </h1>
                        <p className="text-gray-600 text-lg">
                            Buy gift cards in bulk from platform inventory.
                            List them on the marketplace at your own prices to earn profits.
                        </p>
=======
                            Purchase Coupons
                        </h1>
                        <p className="text-gray-600">Buy gift cards at customer prices + 3% commission</p>
>>>>>>> origin/yogesh
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
                            <span className="text-sm font-semibold text-green-900">Wallet Balance:</span>
                            <span className="text-lg font-bold text-green-600">₹{merchantBalance.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Inventory Grid */}
                        <div className="lg:col-span-2">
                            {/* Search Bar */}
                            <div className="mb-6">
                                <input
                                    type="text"
                                    placeholder="Search by brand name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-[#92BCEA] focus:ring-2 focus:ring-[#92BCEA]/20 transition-all"
                                />
                            </div>

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

                            {/* Load More Button */}
                            {hasMore && inventory.length > 0 && (
                                <div className="mt-8 text-center">
                                    <button
                                        onClick={() => fetchInventory(true)}
                                        disabled={loadingMore}
                                        className="px-8 py-3 bg-white border-2 border-[#92BCEA] text-[#92BCEA] font-bold rounded-xl hover:bg-[#92BCEA] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loadingMore ? (
                                            <>
                                                <Loader2 className="inline-block animate-spin mr-2" size={18} />
                                                Loading...
                                            </>
                                        ) : (
                                            'Load More'
                                        )}
                                    </button>
                                </div>
                            )}
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
