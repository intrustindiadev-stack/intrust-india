'use client';

import { memo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Minus, TrendingUp } from 'lucide-react';

/**
 * WholesaleProductCard — B2B sibling of components/commerce/ProductCardV2.jsx
 *
 * Shares the exact customer-storefront design language (rounded-2xl shell, aspect-square
 * media area, p-2 md:p-3 body rhythm, blue-forward action rail) but swaps the B2C payload
 * for merchant economics:
 *   • wholesale_price_paise        → primary, large price
 *   • suggested_retail_price_paise → secondary struck-through MSRP
 *   • Est. Margin pill             → (MSRP - wholesale) / wholesale, emerald gradient
 *
 * Touch target contract: every interactive control is >= 44x44px
 * (`h-11` = 44px, `w-11 min-w-[44px]`) so the stepper is thumb-tappable on a phone.
 */
const formatINR = (value) =>
    Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

function WholesaleProductCard({ product, qty = 0, onAdd, onDecrement, onSelect }) {
    if (!product) return null;

    const images = Array.isArray(product.product_images) ? product.product_images : [];
    const thumbnail = images[0] || null;

    const wholesaleInRupees = (Number(product.wholesale_price_paise) || 0) / 100;
    // Retail benchmark for the MSRP line + margin pill: `suggested_retail_price_paise` is
    // frequently seeded equal to the wholesale price, so fall back to the highest genuine
    // retail benchmark available (MRP, then the platform's own selling price).
    const msrpInRupees = Math.max(
        Number(product.suggested_retail_price_paise) || 0,
        Number(product.mrp_paise) || 0,
        Number(product.platform_price_paise) || 0
    ) / 100;

    const marginPerUnit = Math.max(0, msrpInRupees - wholesaleInRupees);
    const marginPercent = wholesaleInRupees > 0 && marginPerUnit > 0
        ? Math.round((marginPerUnit / wholesaleInRupees) * 100)
        : 0;

    const stock = Number(product.admin_stock) || 0;
    const isOutOfStock = stock <= 0;
    const isLowStock = stock > 0 && stock <= 5;
    const atMaxStock = qty >= stock;

    const eyebrow = product.sub_category || product.category || 'Wholesale';

    const vibrate = (ms) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(ms); } catch { /* device without haptics */ }
        }
    };

    // The synthetic event is forwarded so the parent's fly-to-cart animation can
    // read `e.currentTarget.getBoundingClientRect()` synchronously.
    const handleAdd = (e) => {
        e.stopPropagation();
        vibrate(40);
        if (onAdd) onAdd(e);
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        vibrate(40);
        if (onDecrement) onDecrement(e);
    };

    const openDetails = () => {
        if (onSelect) onSelect(product);
    };

    return (
        <div className="group relative flex flex-col justify-between h-full rounded-2xl overflow-hidden border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-[#12151c] shadow-sm hover:shadow-lg hover:border-blue-100 dark:hover:border-blue-500/20 hover:-translate-y-1 transition-all duration-300">

            {/* ── Media ───────────────────────────────────────────────── */}
            <div
                role="button"
                tabIndex={0}
                onClick={openDetails}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDetails();
                    }
                }}
                aria-label={`View details for ${product.title}`}
                className="w-full aspect-square bg-slate-50 dark:bg-[#0c0e14] relative cursor-pointer p-3 flex items-center justify-center overflow-hidden"
            >
                {thumbnail ? (
                    <motion.div
                        whileHover={{ scale: 1.06 }}
                        transition={{ duration: 0.3 }}
                        className="relative w-full h-full"
                    >
                        <Image
                            src={thumbnail}
                            alt={product.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className={`object-contain drop-shadow-sm ${isOutOfStock ? 'grayscale opacity-40' : ''}`}
                        />
                    </motion.div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Package size={40} className="text-slate-300 dark:text-slate-600" />
                    </div>
                )}

                {/* Est. Margin pill — B2B headline metric */}
                {marginPercent > 0 && (
                    <div className="absolute top-0 left-0 rounded-br-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-2.5 py-1 shadow-sm z-10 flex items-center gap-1">
                        <TrendingUp size={11} strokeWidth={3} />
                        <span className="text-[11px] font-bold leading-none">+{marginPercent}%</span>
                    </div>
                )}

                {/* Quantity-in-order pill */}
                <AnimatePresence>
                    {qty > 0 && (
                        <motion.div
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            className="absolute top-0 right-0 rounded-bl-xl bg-blue-600 text-white px-2.5 py-1 shadow-sm z-10 flex items-center gap-1"
                        >
                            <span className="text-[11px] font-bold leading-none">{qty}</span>
                            <span className="text-[9px] font-semibold uppercase tracking-wider opacity-90 leading-none">in order</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {isOutOfStock && (
                    <div className="absolute bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider py-1 text-center z-10">
                        Restocking soon
                    </div>
                )}
            </div>

            {/* ── Body ────────────────────────────────────────────────── */}
            <div className="flex flex-col flex-1 p-2 md:p-3 gap-1">
                <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                        {eyebrow}
                    </span>
                    <span
                        className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                            isOutOfStock
                                ? 'text-slate-400'
                                : isLowStock
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                    >
                        {isOutOfStock ? '0 left' : `${stock} left`}
                    </span>
                </div>

                <h3
                    onClick={openDetails}
                    title={product.title}
                    className="text-xs md:text-sm font-bold leading-snug line-clamp-2 min-h-[2rem] md:min-h-[2.5rem] text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                    {product.title}
                </h3>

                <div className="flex-1" />

                <div className="mt-2">
                    <div className="flex items-baseline gap-1">
                        <span className="text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                            ₹{formatINR(wholesaleInRupees)}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            / unit
                        </span>
                    </div>
                    {msrpInRupees > wholesaleInRupees && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 line-through">
                                ₹{formatINR(msrpInRupees)}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                MSRP
                            </span>
                        </div>
                    )}
                    {marginPerUnit > 0 && (
                        <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            Est. margin ₹{formatINR(marginPerUnit)} / unit
                        </p>
                    )}
                </div>
            </div>

            {/* ── Touch action rail (every target >= 44x44px) ──────────── */}
            <div className="p-2 border-t border-slate-100 dark:border-white/[0.04]">
                {isOutOfStock ? (
                    <div className="w-full h-11 min-h-[44px] rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase flex items-center justify-center tracking-wider">
                        Out of Stock
                    </div>
                ) : qty > 0 ? (
                    <div className="w-full flex items-center justify-between bg-blue-600 text-white rounded-xl h-11 min-h-[44px] px-1 shadow-sm shadow-blue-600/20">
                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            onClick={handleRemove}
                            aria-label={`Decrease quantity of ${product.title}`}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <Minus size={16} strokeWidth={3} />
                        </motion.button>
                        <span
                            aria-live="polite"
                            aria-label={`Quantity in order: ${qty}`}
                            className="text-sm font-black tabular-nums"
                        >
                            {qty}
                        </span>
                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            onClick={handleAdd}
                            disabled={atMaxStock}
                            aria-label={`Increase quantity of ${product.title}`}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Plus size={16} strokeWidth={3} />
                        </motion.button>
                    </div>
                ) : (
                    <motion.button
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        onClick={handleAdd}
                        aria-label={`Add ${product.title} to bulk order`}
                        className="w-full h-11 min-h-[44px] rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 dark:bg-blue-500/15 dark:text-sky-400 dark:hover:bg-blue-600 dark:hover:text-white border-2 border-blue-600 dark:border-sky-500/50 text-xs font-black uppercase tracking-wider shadow-xs transition-all flex items-center justify-center gap-1.5"
                    >
                        <Plus size={14} strokeWidth={3} />
                        <span>Add to Order</span>
                    </motion.button>
                )}
            </div>
        </div>
    );
}

export default memo(WholesaleProductCard);

