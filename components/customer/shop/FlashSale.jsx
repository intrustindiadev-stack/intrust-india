'use client';

import { useState, useEffect, useRef } from 'react';
import { Zap, Plus, Minus, Check, Flame, Package, Store, ShoppingBag, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import OutOfStockOverlay from '@/components/ui/OutOfStockOverlay';
import OutOfStockBadge from '@/components/ui/OutOfStockBadge';
import { intervalToDuration } from 'date-fns';
import { createClient } from '@/lib/supabaseClient';

// ─── Individual Flash Sale Card ─────────────────────────────────────────────
function FlashSaleCard({ item, cartItem, onAdd, onRemove, onExpire, isStoreOpen, primaryColor, secondaryColor }) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [justAdded, setJustAdded] = useState(false);
    const [isClosedAnim, setIsClosedAnim] = useState(false);

    const product = item.shopping_products || {};
    const imageUrl = item.thumbnail || product.product_images?.[0] || null;
    const mrp = (item.original_price ?? product.mrp_paise ?? product.suggested_retail_price_paise ?? 0) / 100;
    // Flash-sale items are exempt from the platform-price override: sale_price is the
    // canonical price for this surface and is set explicitly by the admin when creating
    // the flash-sale entry. No need to defer to shopping_products.suggested_retail_price_paise here.
    const price = (item.sale_price ?? item.retail_price_paise ?? 0) / 100;
    const slug = item.url ? item.url.split('/').pop() : product.slug;
    const stock = item.stock_quantity ?? product.admin_stock ?? null;
    const oos = stock !== null && stock <= 0;

    const [remaining, setRemaining] = useState(null);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!item.ends_at) {
            setRemaining(null);
            return;
        }

        const tick = () => {
            const remainingMs = new Date(item.ends_at) - Date.now();
            if (remainingMs <= 0) {
                if (timerRef.current) clearInterval(timerRef.current);
                onExpire?.(item.id);
                setRemaining(null);
            } else {
                const duration = intervalToDuration({ start: 0, end: remainingMs });
                const parts = [];
                if (duration.hours > 0) parts.push(`${duration.hours}h`);
                parts.push(`${duration.minutes}m`);
                parts.push(`${duration.seconds}s`);
                setRemaining(parts.join(' '));
            }
        };

        tick();
        timerRef.current = setInterval(tick, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [item.ends_at, item.id, onExpire]);

    const discountPct = item.discount_percent ?? (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);

    const handleCardClick = () => {
        if (slug) router.push(`/shop/product/${slug}`);
    };

    const handleAdd = (e) => {
        e.stopPropagation();
        if (!isStoreOpen) {
            setIsClosedAnim(true);
            setTimeout(() => setIsClosedAnim(false), 1200);
            onAdd();
            return;
        }
        setJustAdded(true);
        onAdd();
        setTimeout(() => setJustAdded(false), 1800);
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        onRemove();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-[58vw] sm:w-auto shrink-0 snap-center flex flex-col rounded-2xl overflow-hidden border cursor-pointer group transition-all duration-300 ${
                isDark
                    ? 'bg-[#0e111a] border-white/[0.06] hover:border-white/[0.12] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
                    : 'bg-white border-slate-200 hover:shadow-xl hover:border-slate-300'
            }`}
            onClick={handleCardClick}
            whileHover={{ y: -2 }}
        >
            {/* Image Area */}
            <div className={`relative w-full aspect-square flex items-center justify-center overflow-hidden ${isDark ? 'bg-[#0a0c14]' : 'bg-slate-50'}`}>
                {/* Discount Badge */}
                {discountPct > 0 && (
                    <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm tracking-tight">
                        {discountPct}% OFF
                    </div>
                )}

                {remaining !== null && (
                    <div className="absolute top-2 right-2 z-10 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm tracking-tight">
                        <Clock size={8} className="inline mr-0.5" />{remaining}
                    </div>
                )}

                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={item.name || product.title || 'Product'}
                        loading="lazy"
                        className={`w-[80%] h-[80%] object-contain transition-transform duration-500 group-hover:scale-110 ${isDark ? '' : 'mix-blend-multiply'}`}
                    />
                ) : (
                    <Package size={36} strokeWidth={1} className={isDark ? 'text-white/10' : 'text-slate-200'} />
                )}

                {/* Subtle gradient overlay at bottom */}
                <div className={`absolute inset-x-0 bottom-0 h-8 ${isDark ? 'bg-gradient-to-t from-[#0e111a] to-transparent' : 'bg-gradient-to-t from-white/30 to-transparent'}`} />
                {oos && <OutOfStockOverlay />}
            </div>

            {/* Info */}
            <div className={`flex flex-col flex-1 p-3 ${oos ? 'opacity-50' : ''}`}>
                <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: primaryColor }}>
                    Intrust Official
                </p>
                <h3 className={`text-xs font-bold line-clamp-2 leading-snug min-h-[2.5em] mb-2 ${isDark ? 'text-white/85' : 'text-slate-800'}`}>
                    {item.name || product.title || 'Product'}
                </h3>

                {/* Pricing */}
                <div className="flex items-baseline gap-1.5 mb-1.5 flex-wrap">
                    <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </span>
                    {mrp > price && (
                        <span className={`text-[11px] font-semibold line-through ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                            ₹{mrp.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </span>
                    )}
                </div>

                {/* Stock indicator */}
                {stock !== null && stock > 0 && stock <= 20 && (
                    <div className="flex items-center gap-1 mb-2">
                        <Flame size={10} className="text-orange-500 shrink-0" />
                        <span className="text-[10px] font-bold text-orange-500">Only {stock} left!</span>
                    </div>
                )}
            </div>

            {/* Add to Cart Action — stops card click propagation */}
            <div className={`px-3 pb-3 pt-0`} onClick={(e) => e.stopPropagation()}>
                {oos ? (
                    <div className="flex items-center justify-center h-9 w-full">
                        <OutOfStockBadge variant="soft" size="sm" />
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {justAdded ? (
                            <motion.div
                                key="success"
                                initial={{ scale: 0.85, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.85, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                                className="flex items-center justify-center gap-1.5 text-white h-9 w-full rounded-xl"
                                style={{ background: 'linear-gradient(135deg, #10b981, #34d399)', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
                            >
                                <Check size={14} strokeWidth={3} />
                                <span className="text-xs font-black">Added!</span>
                            </motion.div>
                        ) : cartItem ? (
                            <motion.div
                                key="qty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center justify-between text-white rounded-xl overflow-hidden h-9 w-full"
                                style={{
                                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                                    boxShadow: `0 4px 16px ${primaryColor}30`
                                }}
                            >
                                <button
                                    onClick={handleRemove}
                                    className="w-10 h-full flex items-center justify-center hover:bg-black/15 transition-colors active:bg-black/25"
                                >
                                    <Minus size={13} strokeWidth={3} />
                                </button>
                                <motion.span
                                    key={cartItem.quantity}
                                    initial={{ scale: 1.4, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-sm font-black w-8 text-center bg-black/10 h-full flex items-center justify-center shadow-inner"
                                >
                                    {cartItem.quantity}
                                </motion.span>
                                <button
                                    onClick={handleAdd}
                                    className="w-10 h-full flex items-center justify-center hover:bg-black/15 transition-colors active:bg-black/25"
                                >
                                    <Plus size={13} strokeWidth={3} />
                                </button>
                            </motion.div>
                        ) : (
                            <motion.button
                                key="add"
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{
                                    scale: 1,
                                    opacity: 1,
                                    x: isClosedAnim ? [-2, 2, -2, 2, 0] : 0
                                }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                whileTap={{ scale: 0.94 }}
                                transition={{
                                    x: { duration: 0.4 },
                                    default: { type: 'spring', stiffness: 400, damping: 25 }
                                }}
                                onClick={handleAdd}
                                className={`w-full h-9 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs tracking-wide transition-all active:scale-95 ${isDark
                                    ? 'border text-white'
                                    : 'border text-white shadow-sm hover:brightness-110'
                                    }`}
                                style={{
                                    borderColor: isClosedAnim ? '#ef4444' : `${primaryColor}50`,
                                    backgroundColor: isClosedAnim ? '#ef4444' : (isDark ? 'transparent' : primaryColor),
                                    color: isClosedAnim ? 'white' : (isDark ? primaryColor : 'white'),
                                }}
                            >
                                {isClosedAnim ? <Store size={12} strokeWidth={3} /> : <ShoppingBag size={12} strokeWidth={3} />}
                                <span>{isClosedAnim ? 'CLOSED' : 'ADD'}</span>
                            </motion.button>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </motion.div>
    );
}

// ─── Flash Sale Section ──────────────────────────────────────────────────────
export default function FlashSale({ initialItems = [], cart = [], onAdd, onRemove, isStoreOpen = true, primaryColor = '#3b82f6', secondaryColor = '#60a5fa' }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [items, setItems] = useState(initialItems);

    const fetchItems = async () => {
        try {
            const res = await fetch('/api/flash-sale', { cache: 'no-store' });
            const data = await res.json();
            setItems(data.items || []);
        } catch (err) {
            console.error('Error fetching flash sale items:', err);
        }
    };

    useEffect(() => {
        fetchItems();
        const pollInterval = setInterval(fetchItems, 5 * 60 * 1000);
        return () => clearInterval(pollInterval);
    }, []);

    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel('flash_sale_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'flash_sale_items' }, () => {
                fetchItems();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleExpire = (itemId) => {
        setItems(prev => prev.filter(i => i.id !== itemId));
    };

    if (items.length === 0) return null;

    return (
        <div className={`mt-5 mb-2 rounded-[1.5rem] md:rounded-[2rem] border overflow-hidden ${
            isDark
                ? 'bg-[#0d1018] border-white/[0.05]'
                : 'bg-gradient-to-br from-amber-50/80 to-white border-amber-100'
        }`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 md:px-6 pt-4 md:pt-5 pb-3 border-b ${isDark ? 'border-white/[0.05]' : 'border-amber-100/80'}`}>
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center ${isDark ? 'bg-amber-500/15' : 'bg-amber-500/10'}`}>
                        <Zap size={16} className="text-amber-500" fill="currentColor" />
                    </div>
                    <div>
                        <h2 className={`text-base md:text-lg font-black tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Flash Sale
                        </h2>
                        <p className={`text-[10px] font-semibold mt-0.5 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                            Limited time deals
                        </p>
                    </div>
                </div>
                <div className={`text-xs font-black px-3 py-1.5 rounded-full ${isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-500/10 text-amber-600'}`}>
                    {items.length} deals
                </div>
            </div>

            {/* Cards — horizontal scroll on mobile, grid on sm+ */}
            <div className="flex overflow-x-auto sm:grid sm:grid-cols-3 gap-3 md:gap-4 p-4 md:p-5 pb-4 snap-x snap-mandatory no-scrollbar">
                {items.map(item => (
                    <FlashSaleCard
                        key={item.id}
                        item={item}
                        cartItem={cart.find(c => c.id === item.id)}
                        onAdd={() => onAdd(item)}
                        onRemove={() => onRemove(item)}
                        onExpire={handleExpire}
                        isStoreOpen={isStoreOpen}
                        primaryColor={primaryColor}
                        secondaryColor={secondaryColor}
                    />
                ))}
            </div>
        </div>
    );
}
