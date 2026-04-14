"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Package, RefreshCw, Tags, Sparkles } from 'lucide-react';
import MerchantFloatingCart from '@/components/merchant/shopping/MerchantFloatingCart';
import SuccessAnimation from '@/components/ui/SuccessAnimation';
import { useSubscription } from '@/components/merchant/SubscriptionContext';
import { useConfetti } from '@/components/ui/ConfettiProvider';

const COMMISSION_RATE = 0.03;

export default function PurchasePage() {
    const [cart, setCart] = useState({});
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [purchasing, setPurchasing] = useState(false);
    const [merchantBalance, setMerchantBalance] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successStats, setSuccessStats] = useState(null);
    const { performAction } = useSubscription();
    const { trigger: triggerConfetti } = useConfetti();

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
                .is('merchant_id', null)
                .gte('valid_until', new Date().toISOString())
                .order('brand', { ascending: true });

            if (couponsError) throw couponsError;

            const transformedCoupons = (coupons || []).map(c => ({
                id: c.id,
                brand: c.brand,
                faceValue: c.face_value_paise / 100,
                price: c.selling_price_paise / 100,
                imageUrl: c.image_url,
            }));

            setInventory(transformedCoupons);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const addToCart = (item) => setCart(prev => ({ ...prev, [item.id]: 1 }));
    const removeFromCart = (itemId) => setCart(prev => {
        const newCart = { ...prev };
        delete newCart[itemId];
        return newCart;
    });

    // Normalized cart items for MerchantFloatingCart
    const cartItems = Object.entries(cart).map(([id]) => {
        const item = inventory.find(i => i.id === id);
        if (!item) return null;
        return {
            id: item.id,
            title: item.brand,
            unit_price: item.price + item.price * COMMISSION_RATE,
            quantity: 1,
        };
    }).filter(Boolean);

    const subtotalWithCommission = cartItems.reduce((s, i) => s + i.unit_price, 0);

    const handlePurchaseWallet = async () => {
        if (cartItems.length === 0) return;

        performAction(async () => {
            if (merchantBalance < subtotalWithCommission) {
                toast.error(`Insufficient balance! Need ₹${subtotalWithCommission.toFixed(2)} but have ₹${merchantBalance.toFixed(2)}`);
                return;
            }

            try {
                setPurchasing(true);
                const couponIds = Object.keys(cart);

                const response = await fetch('/api/merchant/purchase', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ couponIds }),
                });

                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.message || 'Purchase failed');

                // Trigger celebration
                triggerConfetti();

                // Show success animation
                setSuccessStats([
                    { label: 'Coupons Added', value: cartItems.length },
                    { label: 'Total Paid', value: `₹${subtotalWithCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                ]);
                setCart({});
                setShowSuccess(true);
                fetchData();
            } catch (err) {
                console.error('Purchase error:', err);
                toast.error('Purchase failed: ' + err.message);
            } finally {
                setPurchasing(false);
            }
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                >
                    <RefreshCw size={32} className="text-[#D4AF37]" />
                </motion.div>
                <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Loading available coupons...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    <span className="material-icons-round text-red-500 text-3xl">error_outline</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Failed to load</h3>
                <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm">{error}</p>
                <button
                    onClick={fetchData}
                    className="px-6 py-3 rounded-2xl bg-[#D4AF37] text-black font-black text-sm hover:opacity-90 transition-all shadow-lg shadow-amber-500/20"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <>
            <SuccessAnimation
                isVisible={showSuccess}
                onClose={() => setShowSuccess(false)}
                title="Purchase Complete!"
                message="Your coupons have been added to your inventory and are ready to sell."
                stats={successStats}
                primaryAction={{ label: 'View My Coupons', href: '/merchant/inventory' }}
                secondaryAction={{ label: 'Buy More Coupons', onClick: () => setShowSuccess(false) }}
            />

            <div className="relative">
                {/* Background glows */}
                <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#D4AF37]/8 rounded-full blur-[120px] pointer-events-none -z-10" />
                <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-black uppercase tracking-widest mb-3">
                            <Sparkles size={12} />
                            Wholesale Market
                        </div>
                        <h2 className="font-display text-3xl sm:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                            Purchase Coupons
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                            Acquire premium gift cards for your inventory
                        </p>
                    </div>
                    {/* Wallet balance pill */}
                    <div className="flex items-center gap-3 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl py-3 px-5 self-start sm:self-auto shadow-sm">
                        <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center">
                            <span className="material-icons-round text-[#D4AF37] text-lg">account_balance_wallet</span>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black">Wallet Balance</p>
                            <p className="text-lg font-black text-[#D4AF37]">₹{merchantBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Coupon Cards Grid */}
                    <div className="xl:col-span-2">
                        {inventory.length === 0 ? (
                            <div className="py-20 text-center bg-white dark:bg-white/5 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/10">
                                <Tags size={56} className="mx-auto text-slate-200 dark:text-white/10 mb-4" />
                                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-1">
                                    No coupons available
                                </h3>
                                <p className="text-slate-400 dark:text-slate-500 text-sm">Check back later for new listings.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-40 xl:pb-4">
                                {inventory.map((item) => {
                                    const commission = item.price * COMMISSION_RATE;
                                    const totalCost = item.price + commission;
                                    const discount = ((item.faceValue - item.price) / item.faceValue * 100).toFixed(0);
                                    const inCart = !!cart[item.id];

                                    return (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            whileHover={{ y: -2 }}
                                            className={`merchant-glass rounded-[2rem] p-5 border transition-all duration-300 group overflow-hidden relative shadow-sm ${inCart
                                                ? 'border-[#D4AF37]/50 shadow-lg shadow-[#D4AF37]/10 bg-[#D4AF37]/5'
                                                : 'border-black/5 dark:border-white/5 hover:border-[#D4AF37]/30 hover:shadow-xl hover:shadow-[#D4AF37]/5'
                                                }`}
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-bl-full -z-10 group-hover:bg-[#D4AF37]/10 transition-colors" />

                                            <div className="flex justify-between items-start mb-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-black/5 dark:border-white/10 overflow-hidden flex-shrink-0 shadow-sm">
                                                        {item.imageUrl ? (
                                                            <Image src={item.imageUrl} alt={item.brand} fill className="object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <span className="font-black text-[#D4AF37] text-xl">{item.brand.charAt(0)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100">{item.brand}</h3>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            Face Value: ₹{item.faceValue.toLocaleString('en-IN')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-600 dark:text-emerald-400 text-xs font-black flex-shrink-0">
                                                    {discount}% OFF
                                                </div>
                                            </div>

                                            {/* Price breakdown */}
                                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-1.5 mb-4">
                                                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                                    <span>Wholesale Price</span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-200">₹{item.price.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                                    <span>Platform Fee (3%)</span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-200">+₹{commission.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm font-black pt-1.5 border-t border-slate-200 dark:border-white/10">
                                                    <span className="text-slate-600 dark:text-slate-300">Your Cost</span>
                                                    <span className="text-[#D4AF37]">₹{totalCost.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Cart Button */}
                                            <AnimatePresence mode="wait">
                                                {inCart ? (
                                                    <motion.button
                                                        key="remove"
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="w-full py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 text-sm font-black transition-all border border-red-500/20 flex items-center justify-center gap-2 active:scale-95"
                                                    >
                                                        <span className="material-icons-round text-sm">remove_shopping_cart</span>
                                                        Remove from Cart
                                                    </motion.button>
                                                ) : (
                                                    <motion.button
                                                        key="add"
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        onClick={() => addToCart(item)}
                                                        className="w-full py-3 rounded-2xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] dark:text-amber-400 text-sm font-black transition-all border border-[#D4AF37]/20 flex items-center justify-center gap-2 active:scale-95"
                                                    >
                                                        <span className="material-icons-round text-sm">add_shopping_cart</span>
                                                        Add to Cart
                                                    </motion.button>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Floating Cart */}
                    <MerchantFloatingCart
                        cartItems={cartItems}
                        merchantBalance={merchantBalance}
                        subtotalInRupees={subtotalWithCommission}
                        onRemoveItem={removeFromCart}
                        onPurchaseWallet={handlePurchaseWallet}
                        isPurchasing={purchasing}
                        disableGateway={true}
                        walletLabel="Complete Purchase"
                    />
                </div>
            </div>
        </>
    );
}
