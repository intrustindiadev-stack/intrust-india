"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Loader2, Package, RefreshCw, Tags, Sparkles, 
    AlertTriangle, Lock, Clock, Info, ChevronDown, 
    ChevronUp, Search, ShieldAlert, Tag, Calendar, CheckCircle2
} from 'lucide-react';
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
    
    // Search and Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'expired'
    const [expandedTerms, setExpandedTerms] = useState({});

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

            // Fetch available coupons without auto-filtering expired ones so merchant can see status
            const { data: coupons, error: couponsError } = await supabase
                .from('coupons')
                .select('*')
                .eq('status', 'available')
                .is('merchant_id', null)
                .order('brand', { ascending: true });

            if (couponsError) throw couponsError;

            const transformedCoupons = (coupons || []).map(c => ({
                id: c.id,
                brand: c.brand,
                title: c.title,
                description: c.description,
                category: c.category,
                faceValue: c.face_value_paise / 100,
                price: c.selling_price_paise / 100,
                imageUrl: c.image_url,
                validUntil: c.valid_until,
                terms: c.terms_and_conditions,
                usageInstructions: c.usage_instructions,
                maskedCode: c.masked_code,
                tags: c.tags,
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

    const toggleTerms = (id) => {
        setExpandedTerms(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const addToCart = (item) => {
        const isExpired = item.validUntil && new Date(item.validUntil) < new Date();
        if (isExpired) {
            toast.error('Cannot purchase expired coupon! Validity has expired.');
            return;
        }
        setCart(prev => ({ ...prev, [item.id]: 1 }));
    };

    const removeFromCart = (itemId) => setCart(prev => {
        const newCart = { ...prev };
        delete newCart[itemId];
        return newCart;
    });

    // Filtered inventory
    const filteredInventory = useMemo(() => {
        return inventory.filter(item => {
            const isExpired = item.validUntil && new Date(item.validUntil) < new Date();
            
            if (statusFilter === 'active' && isExpired) return false;
            if (statusFilter === 'expired' && !isExpired) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchesBrand = item.brand?.toLowerCase().includes(q);
                const matchesTitle = item.title?.toLowerCase().includes(q);
                const matchesCategory = item.category?.toLowerCase().includes(q);
                const matchesCode = item.maskedCode?.toLowerCase().includes(q);
                if (!matchesBrand && !matchesTitle && !matchesCategory && !matchesCode) return false;
            }

            return true;
        });
    }, [inventory, searchQuery, statusFilter]);

    // Normalized cart items for MerchantFloatingCart
    const cartItems = Object.entries(cart).map(([id]) => {
        const item = inventory.find(i => i.id === id);
        if (!item) return null;
        // Double check item is not expired
        const isExpired = item.validUntil && new Date(item.validUntil) < new Date();
        if (isExpired) return null;

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
                const couponIds = cartItems.map(i => i.id);

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
                            Acquire verified gift cards for your retail inventory
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

                {/* Search & Filter Bar */}
                <div className="mb-6 flex flex-col sm:flex-row gap-3 bg-white dark:bg-white/5 p-3 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by brand, category or code format..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all border ${statusFilter === 'all' ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-slate-300'}`}
                        >
                            All ({inventory.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('active')}
                            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all border ${statusFilter === 'active' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-slate-300'}`}
                        >
                            Valid Only
                        </button>
                        <button
                            onClick={() => setStatusFilter('expired')}
                            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all border ${statusFilter === 'expired' ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-slate-300'}`}
                        >
                            Expired ({inventory.filter(i => i.validUntil && new Date(i.validUntil) < new Date()).length})
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Coupon Cards Grid */}
                    <div className="xl:col-span-2">
                        {filteredInventory.length === 0 ? (
                            <div className="py-20 text-center bg-white dark:bg-white/5 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/10">
                                <Tags size={56} className="mx-auto text-slate-200 dark:text-white/10 mb-4" />
                                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-1">
                                    No coupons matching criteria
                                </h3>
                                <p className="text-slate-400 dark:text-slate-500 text-sm">Try adjusting your search query or status filter.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-40 xl:pb-4">
                                {filteredInventory.map((item) => {
                                    const commission = item.price * COMMISSION_RATE;
                                    const totalCost = item.price + commission;
                                    const discount = ((item.faceValue - item.price) / item.faceValue * 100).toFixed(0);
                                    const inCart = !!cart[item.id];
                                    const isExpired = item.validUntil && new Date(item.validUntil) < new Date();
                                    const isExpanded = !!expandedTerms[item.id];

                                    const formattedExpiry = item.validUntil 
                                        ? new Date(item.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                        : 'No Expiry';

                                    return (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            whileHover={{ y: isExpired ? 0 : -2 }}
                                            className={`merchant-glass rounded-[2rem] p-5 border transition-all duration-300 group overflow-hidden relative shadow-sm ${
                                                isExpired
                                                    ? 'border-rose-300 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10'
                                                    : inCart
                                                        ? 'border-[#D4AF37]/50 shadow-lg shadow-[#D4AF37]/10 bg-[#D4AF37]/5'
                                                        : 'border-black/5 dark:border-white/5 hover:border-[#D4AF37]/30 hover:shadow-xl hover:shadow-[#D4AF37]/5'
                                            }`}
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-bl-full -z-10 group-hover:bg-[#D4AF37]/10 transition-colors" />

                                            {/* Header row */}
                                            <div className="flex justify-between items-start mb-4 gap-2">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="relative w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-black/5 dark:border-white/10 overflow-hidden flex-shrink-0 shadow-sm">
                                                        {item.imageUrl ? (
                                                            <Image src={item.imageUrl} alt={item.brand} fill className="object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <span className="font-black text-[#D4AF37] text-xl">{item.brand?.charAt(0)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 truncate">{item.brand}</h3>
                                                            {item.category && (
                                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                                                    {item.category}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                            {item.title || `Face Value: ₹${item.faceValue.toLocaleString('en-IN')}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Status pill: Expired vs Discount */}
                                                {isExpired ? (
                                                    <div className="bg-rose-500/15 border border-rose-500/30 px-3 py-1 rounded-full text-rose-600 dark:text-rose-400 text-xs font-black flex items-center gap-1 flex-shrink-0 animate-pulse">
                                                        <AlertTriangle size={12} /> Validity Expired
                                                    </div>
                                                ) : (
                                                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-600 dark:text-emerald-400 text-xs font-black flex-shrink-0">
                                                        {discount}% OFF
                                                    </div>
                                                )}
                                            </div>

                                            {/* Masked Code Preview */}
                                            <div className="mb-4 px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                                                    <Lock size={12} className="text-[#D4AF37]" /> Code Format:
                                                </span>
                                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 tracking-wider">
                                                    {item.maskedCode || '****-****-****'}
                                                </span>
                                            </div>

                                            {/* Price breakdown */}
                                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-1.5 mb-4">
                                                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                                    <span>Face Value</span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-200">₹{item.faceValue.toLocaleString('en-IN')}</span>
                                                </div>
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
                                                    <span className={isExpired ? "text-rose-500" : "text-[#D4AF37]"}>₹{totalCost.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Validity Date Footer */}
                                            <div className="mb-4 flex items-center justify-between text-xs px-1">
                                                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                                                    <Calendar size={13} className={isExpired ? "text-rose-500" : "text-slate-400"} />
                                                    Valid Till:
                                                </span>
                                                <span className={`font-bold ${isExpired ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {formattedExpiry} {isExpired && '(Expired)'}
                                                </span>
                                            </div>

                                            {/* Expandable Terms & Description */}
                                            {(item.description || item.terms || item.usageInstructions) && (
                                                <div className="mb-4">
                                                    <button
                                                        onClick={() => toggleTerms(item.id)}
                                                        className="w-full text-left flex items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors py-1"
                                                    >
                                                        <span>{isExpanded ? 'Hide Details & Terms' : 'View Details & Terms'}</span>
                                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </button>
                                                    
                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="mt-2 p-3 rounded-xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 space-y-2 overflow-hidden"
                                                            >
                                                                {item.description && (
                                                                    <div>
                                                                        <p className="font-bold text-slate-700 dark:text-slate-200">Description:</p>
                                                                        <p className="text-[11px] leading-relaxed mt-0.5">{item.description}</p>
                                                                    </div>
                                                                )}
                                                                {item.terms && (
                                                                    <div>
                                                                        <p className="font-bold text-slate-700 dark:text-slate-200">Terms & Conditions:</p>
                                                                        <p className="text-[11px] leading-relaxed mt-0.5">{item.terms}</p>
                                                                    </div>
                                                                )}
                                                                {item.usageInstructions && (
                                                                    <div>
                                                                        <p className="font-bold text-slate-700 dark:text-slate-200">How to Redeem:</p>
                                                                        <p className="text-[11px] leading-relaxed mt-0.5">{item.usageInstructions}</p>
                                                                    </div>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}

                                            {/* Action Button */}
                                            {isExpired ? (
                                                <button
                                                    disabled
                                                    className="w-full py-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-black border border-rose-500/20 cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                                                    title="Cannot purchase expired cards"
                                                >
                                                    <ShieldAlert size={16} />
                                                    Validity Expired
                                                </button>
                                            ) : (
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
                                            )}
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
