'use client';

import { useState } from 'react';
import { ShoppingCart, X, ArrowRight, Package, Minus, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

// Helper to get the display name of a cart item
function getItemName(item) {
    return item.custom_title
        || item.shopping_products?.title
        || item.shopping_products?.name
        || item.title
        || item.name
        || 'Product';
}

// Helper to get the first image of a cart item
function getItemImage(item) {
    const imgs = item.shopping_products?.product_images;
    if (Array.isArray(imgs) && imgs.length > 0) return imgs[0];
    return item.shopping_products?.image_url || item.image_url || null;
}

export default function FloatingCart({
    count,
    total,
    savings,
    items = [],
    customer,
    onClear,
    primaryColor = '#3b82f6',
    secondaryColor = '#4f46e5',
    merchant = null,
}) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Only render when there are items
    if (count === 0) return null;

    const logoUrl = merchant?.logo_url || merchant?.image_url || null;
    const businessName = merchant?.business_name || 'Store';
    const initial = businessName.charAt(0).toUpperCase();

    const handleCheckout = () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
        setDrawerOpen(false);
        setTimeout(() => router.push('/shop/cart'), 250);
    };

    return (
        <>
            {/* ══════════════════════════════════════
                FAB — left side, above bottom nav
                Mirrors chatbot button on the right.
                bottom-[88px] = 80px nav + 8px gap
               ══════════════════════════════════════ */}
            <AnimatePresence>
                <motion.button
                    key="cart-fab"
                    initial={{ x: -72, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -72, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setDrawerOpen(true)}
                    aria-label={`Open cart — ${count} items`}
                    className="fixed left-4 bottom-[88px] z-[100] flex items-center gap-2.5 pl-1 pr-3.5 py-1 rounded-full pointer-events-auto select-none"
                    style={{
                        background: isDark
                            ? `linear-gradient(135deg, ${primaryColor}E0, ${secondaryColor}D0)`
                            : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                        boxShadow: `0 6px 28px ${primaryColor}50, 0 2px 8px rgba(0,0,0,0.18)`,
                        border: '1px solid rgba(255,255,255,0.22)',
                    }}
                >
                    {/* Shop avatar / cart icon */}
                    <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {logoUrl ? (
                            <Image
                                src={logoUrl}
                                alt={businessName}
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                            />
                        ) : (
                            <ShoppingCart size={17} className="text-white" strokeWidth={2.5} />
                        )}
                    </div>

                    {/* Label */}
                    <div className="flex flex-col leading-none">
                        <span className="text-[9px] font-black tracking-[0.15em] uppercase text-white/70">
                            {count} item{count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[13px] font-black text-white tabular-nums">
                            ₹{((total || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </span>
                    </div>

                    {/* Badge */}
                    <motion.span
                        key={count}
                        initial={{ scale: 1.5 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                        className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-white flex items-center justify-center text-[10px] font-black shadow"
                        style={{ color: primaryColor }}
                    >
                        {count > 9 ? '9+' : count}
                    </motion.span>
                </motion.button>
            </AnimatePresence>

            {/* ══════════════════════════════════════
                Drawer — slides in from the LEFT
               ══════════════════════════════════════ */}
            <AnimatePresence>
                {drawerOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="cart-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setDrawerOpen(false)}
                            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-[6px]"
                        />

                        {/* Panel */}
                        <motion.div
                            key="cart-panel"
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
                            className="fixed top-0 left-0 bottom-0 z-[201] w-[min(90vw,360px)] flex flex-col overflow-hidden"
                            style={{
                                background: isDark
                                    ? `linear-gradient(160deg, #0d1525 0%, #080d1a 100%)`
                                    : `linear-gradient(160deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                                boxShadow: '12px 0 48px rgba(0,0,0,0.35)',
                            }}
                        >
                            {/* Ambient glows */}
                            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-[100px] opacity-30 pointer-events-none"
                                style={{ background: primaryColor }} />
                            <div className="absolute -bottom-24 right-0 w-56 h-56 rounded-full blur-[80px] opacity-20 pointer-events-none"
                                style={{ background: secondaryColor }} />

                            {/* ─── Header ─── */}
                            <div className="relative z-10 flex items-center gap-3 px-5 pt-14 pb-4 border-b border-white/10">
                                {/* Logo */}
                                <div className="w-11 h-11 rounded-[1.3rem] bg-white/15 border border-white/25 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                    {logoUrl ? (
                                        <Image src={logoUrl} alt={businessName} width={44} height={44} className="object-cover w-full h-full" />
                                    ) : (
                                        <span className="text-white font-black text-lg select-none">{initial}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-black tracking-[0.2em] uppercase text-white/55 leading-none mb-0.5">Shopping at</p>
                                    <p className="text-[15px] font-black text-white leading-tight truncate">{businessName}</p>
                                </div>
                                <button
                                    onClick={() => setDrawerOpen(false)}
                                    className="w-8 h-8 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all shrink-0"
                                    aria-label="Close cart"
                                >
                                    <X size={14} className="text-white" strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* ─── Item count chip ─── */}
                            <div className="relative z-10 flex items-center gap-2 px-5 py-3">
                                <ShoppingCart size={13} className="text-white/50" />
                                <span className="text-[11px] font-black uppercase tracking-widest text-white/50">
                                    {count} item{count !== 1 ? 's' : ''} in cart
                                </span>
                            </div>

                            {/* ─── Item list ─── */}
                            <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-2 space-y-2 min-h-0">
                                {items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
                                        <Package size={36} className="text-white/15" />
                                        <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Cart is empty</p>
                                    </div>
                                ) : (
                                    items.map((item) => {
                                        const name = getItemName(item);
                                        const imgSrc = getItemImage(item);
                                        const unitPrice = (item.retail_price_paise || 0) / 100;
                                        const qty = item.quantity || 1;
                                        const lineTotal = unitPrice * qty;

                                        return (
                                            <motion.div
                                                key={item.id}
                                                layout
                                                initial={{ opacity: 0, x: -12 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex items-center gap-3 bg-white/8 border border-white/10 rounded-2xl p-2.5"
                                            >
                                                {/* Image */}
                                                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden shrink-0">
                                                    {imgSrc ? (
                                                        <Image
                                                            src={imgSrc}
                                                            alt={name}
                                                            width={40}
                                                            height={40}
                                                            className="object-contain w-full h-full p-0.5"
                                                        />
                                                    ) : (
                                                        <Package size={15} className="text-white/30" />
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] font-bold text-white leading-tight line-clamp-1">{name}</p>
                                                    <p className="text-[10px] font-black text-white/50 mt-0.5 tabular-nums">
                                                        ₹{unitPrice.toLocaleString('en-IN')} × {qty}
                                                    </p>
                                                </div>

                                                {/* Line total */}
                                                <p className="text-[13px] font-black text-white tabular-nums shrink-0">
                                                    ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                                </p>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>

                            {/* ─── Footer ─── */}
                            {count > 0 && (
                                <div className="relative z-10 px-5 pt-4 pb-8 border-t border-white/10 space-y-3">
                                    {savings > 0 && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest">You save</span>
                                            <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                                                ₹{(savings / 100).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-baseline justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-widest text-white/50">Total</span>
                                        <span className="text-2xl font-black text-white tabular-nums tracking-tight">
                                            ₹{((total || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                        </span>
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={handleCheckout}
                                        className="w-full bg-white rounded-[1.3rem] py-4 flex items-center justify-center gap-2 font-black text-[12px] uppercase tracking-[0.1em] shadow-2xl group"
                                        style={{ color: primaryColor }}
                                    >
                                        <ShoppingCart size={15} strokeWidth={2.5} />
                                        <span>Review Order · {count} item{count !== 1 ? 's' : ''}</span>
                                        <ArrowRight size={14} strokeWidth={3} className="group-hover:translate-x-1 transition-transform duration-150" />
                                    </motion.button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
