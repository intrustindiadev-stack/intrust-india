"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function PurchasePage() {
    const [cart, setCart] = useState({});
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [purchasing, setPurchasing] = useState(false);
    const [merchantBalance, setMerchantBalance] = useState(0);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

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

            const { data: coupons, error: couponsError } = await supabase
                .from('coupons')
                .select('*')
                .eq('status', 'available')
                .eq('is_merchant_owned', false)
                .gte('valid_until', new Date().toISOString())
                .order('brand', { ascending: true });

            if (couponsError) throw couponsError;

            const transformedCoupons = (coupons || []).map(c => ({
                id: c.id,
                brand: c.brand,
                faceValue: c.face_value_paise / 100,
                price: c.selling_price_paise / 100,
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

    const addToCart = (item) => setCart(prev => ({ ...prev, [item.id]: 1 }));
    const deleteFromCart = (itemId) => setCart(prev => {
        const newCart = { ...prev };
        delete newCart[itemId];
        return newCart;
    });

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
            toast.error(`Insufficient balance! You need ₹${cartTotal.toFixed(2)} but have ₹${merchantBalance.toFixed(2)}`);
            return;
        }

        try {
            setPurchasing(true);
            const purchases = Object.keys(cart).map(async (couponId) => {
                const { error } = await supabase.rpc('merchant_purchase_coupon', {
                    p_coupon_id: couponId,
                    p_quantity: 1,
                    p_merchant_id: null
                });
                if (error) throw error;
            });

            await Promise.all(purchases);
            toast.success('Purchase successful! Check your inventory.');
            setCart({});
            fetchData();
        } catch (err) {
            console.error('Purchase error:', err);
            toast.error('Purchase failed: ' + err.message);
        } finally {
            setPurchasing(false);
        }
    };

    if (loading) {
        return (
            <div className="relative min-h-[60vh] flex items-center justify-center">
                <span className="material-icons-round animate-spin text-[#D4AF37] text-4xl">autorenew</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="relative min-h-[60vh] flex flex-col items-center justify-center">
                <span className="material-icons-round text-red-500 dark:text-red-400 text-6xl mb-4">error_outline</span>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Failed to load</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-sm">{error}</p>
                <button onClick={fetchData} className="px-6 py-3 rounded-xl bg-[#D4AF37] text-[#020617] font-bold hover:bg-opacity-90 transition-all gold-glow">
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Background embellishments */}
            <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-10 dark:opacity-20"></div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4 mt-6">
                <div>
                    <h2 className="font-display text-4xl font-bold mb-2 text-slate-800 dark:text-slate-100">Purchase Coupons</h2>
                    <p className="text-slate-500 dark:text-slate-400 flex flex-wrap items-center">
                        Acquire premium gift cards for your inventory
                        <span className="hidden sm:inline mx-2 text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-[#D4AF37] text-xs font-semibold tracking-wider uppercase mt-2 sm:mt-0">WHOLESALE MARKET</span>
                    </p>
                </div>
                <div className="flex bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full py-2 px-6 items-center space-x-3 shadow-sm">
                    <span className="material-icons-round text-[#D4AF37] text-lg">account_balance_wallet</span>
                    <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">Wallet Balance</p>
                        <p className="text-lg font-bold text-[#D4AF37]">₹{merchantBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {inventory.map((item) => {
                        const commission = item.price * 0.03;
                        const totalCost = item.price + commission;
                        const discount = ((item.faceValue - item.price) / item.faceValue * 100).toFixed(0);

                        return (
                            <div key={item.id} className="merchant-glass rounded-3xl p-6 border border-black/5 dark:border-white/5 hover:border-[#D4AF37]/30 transition-all group overflow-hidden relative shadow-sm">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-bl-full -z-10 group-hover:bg-[#D4AF37]/10 transition-colors"></div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-black/5 dark:border-white/10">
                                            <span className="font-bold text-[#D4AF37] text-xl">{item.brand.charAt(0)}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{item.brand}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Face Value: ₹{item.faceValue.toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                        {discount}% OFF
                                    </div>
                                </div>

                                <div className="mb-6 pb-6 border-b border-black/5 dark:border-white/5 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Customer Price</span>
                                        <span className="text-slate-700 dark:text-slate-200">₹{item.price.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Platform Fee (3%)</span>
                                        <span className="text-slate-700 dark:text-slate-200">+ ₹{commission.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-[15px] font-bold mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                                        <span className="text-slate-600 dark:text-slate-300">Your Cost</span>
                                        <span className="text-[#D4AF37]">₹{totalCost.toFixed(2)}</span>
                                    </div>
                                </div>

                                {cart[item.id] ? (
                                    <button onClick={() => deleteFromCart(item.id)} className="w-full py-3 merchant-glass bg-white/40 dark:bg-white/5 hover:bg-red-500/10 text-red-500 dark:text-red-400 text-sm font-bold rounded-xl transition-all border border-red-500/20 flex items-center justify-center space-x-2 shadow-sm">
                                        <span className="material-icons-round text-sm">remove_shopping_cart</span>
                                        <span>Remove from Cart</span>
                                    </button>
                                ) : (
                                    <button onClick={() => addToCart(item)} className="w-full py-3 merchant-glass bg-white/40 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl transition-all border border-black/5 dark:border-white/10 flex items-center justify-center space-x-2 shadow-sm">
                                        <span className="material-icons-round text-[#D4AF37] text-sm">add_shopping_cart</span>
                                        <span>Add to Cart</span>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="lg:col-span-1">
                    <div className="sticky top-24 merchant-glass rounded-3xl border border-black/5 dark:border-white/5 p-6 shadow-xl">
                        <h3 className="font-display text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center">
                            <span className="material-icons-round text-[#D4AF37] mr-2">shopping_basket</span>
                            Order Summary
                        </h3>

                        {cartItems === 0 ? (
                            <div className="text-center py-10">
                                <div className="w-16 h-16 mx-auto bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 border border-black/10 dark:border-white/10">
                                    <span className="material-icons-round text-slate-400 dark:text-slate-500 text-3xl">remove_shopping_cart</span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">Your cart is empty.</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 italic">Select coupons from the market to purchase.</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {Object.entries(cart).map(([id, qty]) => {
                                        const item = inventory.find(i => i.id === id);
                                        if (!item) return null;
                                        const cost = (item.price * 1.03) * qty;

                                        return (
                                            <div key={id} className="group flex justify-between items-center p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-colors">
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{item.brand}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">₹{item.price}</p>
                                                </div>
                                                <div className="flex flex-col items-end pl-3">
                                                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">₹{cost.toFixed(2)}</span>
                                                    <button onClick={() => deleteFromCart(id)} className="text-[10px] text-red-500 dark:text-red-400 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity hover:underline font-bold uppercase tracking-wider">
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="border-t border-black/5 dark:border-white/10 pt-6 space-y-3 mb-8">
                                    <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                                        <span>Subtotal ({cartItems} items)</span>
                                        <span className="text-slate-700 dark:text-slate-200">₹{cartSubtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                                        <span>Platform Commission (3%)</span>
                                        <span className="text-slate-700 dark:text-slate-200">₹{merchantCommission.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-end border-t border-black/10 dark:border-white/10 pt-4 mt-4">
                                        <span className="font-bold text-slate-600 dark:text-slate-300">Total</span>
                                        <div className="text-right">
                                            <span className="text-[10px] text-[#D4AF37] block mb-1 uppercase tracking-wider font-bold">Payable Amount</span>
                                            <span className="text-3xl font-display font-bold text-[#D4AF37]">₹{cartTotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {merchantBalance < cartTotal && (
                                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col items-center text-center">
                                        <span className="material-icons-round text-red-500 dark:text-red-400 mb-2">account_balance_wallet</span>
                                        <p className="text-sm text-red-500 dark:text-red-400 font-semibold mb-1">Insufficient Balance</p>
                                        <p className="text-xs text-red-500/80">Add ₹{(cartTotal - merchantBalance).toFixed(2)} to proceed.</p>
                                        <Link href="/merchant/wallet" className="text-xs font-bold text-red-600 dark:text-red-300 mt-3 underline hover:opacity-80">
                                            Go to Wallet
                                        </Link>
                                    </div>
                                )}

                                <button
                                    onClick={handlePurchase}
                                    disabled={purchasing || merchantBalance < cartTotal}
                                    className="w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed bg-[#D4AF37] text-[#020617] hover:bg-opacity-90 gold-glow shadow-lg shadow-[#D4AF37]/20"
                                >
                                    {purchasing ? (
                                        <>
                                            <span className="material-icons-round animate-spin text-sm">autorenew</span>
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons-round text-sm">payment</span>
                                            <span>Complete Purchase</span>
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
