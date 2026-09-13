'use client';

import { useState, memo } from 'react';
import { Plus, Minus, Check, Heart, Zap, Star, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { isStorefrontItemOOS } from '@/lib/shopping/stock';
import { getProductFallbackImage } from '@/lib/shopping/categories';
import OutOfStockOverlay from '@/components/ui/OutOfStockOverlay';
import OutOfStockBadge from '@/components/ui/OutOfStockBadge';

function ProductCardV2({ 
    item, 
    cartItem, 
    onAdd, 
    onRemove, 
    onSelect, 
    onQuickView,
    merchantSlug = null,
    primaryColor = '#2563EB', 
    secondaryColor = '#3b82f6', 
    isWishlisted = false, 
    onWishlist, 
    isStoreOpen = true 
}) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const product = item?.shopping_products || item;
    const oos = isStorefrontItemOOS(item);
    const [justAdded, setJustAdded] = useState(false);
    const [isClosedAnimation, setIsClosedAnimation] = useState(false);

    const handleAdd = (e) => {
        e.stopPropagation();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50);
        }
        if (!isStoreOpen) {
            setIsClosedAnimation(true);
            setTimeout(() => setIsClosedAnimation(false), 1200);
            onAdd && onAdd();
            return;
        }
        setJustAdded(true);
        onAdd && onAdd();
        setTimeout(() => setJustAdded(false), 1800);
    };

    // Calculation of MRP and Selling Price
    const mrp = (product?.mrp_paise || product?.suggested_retail_price_paise || item?.retail_price_paise || 0) / 100;
    const sellingPrice = item?.is_platform_product
        ? ((product?.platform_price_paise ?? product?.suggested_retail_price_paise) || item?.retail_price_paise || 0) / 100
        : ((item?.retail_price_paise || product?.platform_price_paise || 0) / 100);
    const savings = mrp > sellingPrice ? mrp - sellingPrice : 0;
    const discountPct = mrp > 0 ? Math.round((savings / mrp) * 100) : 0;

    const productSlugOrId = product?.slug || product?.id || item?.slug || item?.id;
    const pdpUrl = productSlugOrId 
        ? `/shop/product/${productSlugOrId}${merchantSlug ? `?merchant=${merchantSlug}` : ''}`
        : null;

    const handleOpenPdp = (e) => {
        if (onSelect) {
            onSelect();
            return;
        }
        if (pdpUrl) {
            router.push(pdpUrl);
        }
    };

    const displayImage = getProductFallbackImage(product || item);

    return (
        <div
            className={`group relative flex flex-col justify-between h-full rounded-3xl p-3 sm:p-3.5 transition-all duration-300 ${
                isDark
                    ? 'bg-[#0c0e16] hover:bg-[#12151c] border border-white/[0.08] shadow-sm hover:border-sky-500/40 hover:shadow-xl'
                    : 'bg-white border border-slate-200/90 shadow-xs hover:border-sky-500/40 hover:shadow-xl'
            }`}
        >
            <div>
                {/* Product Image & Badges */}
                <div
                    onClick={handleOpenPdp}
                    className={`relative w-full aspect-square shrink-0 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer mb-2.5 p-2.5 ${
                        isDark ? 'bg-slate-900/60' : 'bg-slate-50 border border-slate-100'
                    }`}
                >
                    <img
                        src={displayImage}
                        alt={item.custom_title || product?.title || 'Product'}
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                    />

                    {/* Delivery Badge — Same-Day Delivery */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-white/95 dark:bg-slate-900/95 text-sky-800 dark:text-sky-300 text-[10px] font-black tracking-tight flex items-center gap-1 shadow-xs border border-sky-500/25 z-10">
                        <Zap size={10} className="text-sky-600 dark:text-sky-400 fill-sky-500" />
                        <span>SAME DAY</span>
                    </span>

                    {/* Discount Badge */}
                    {discountPct > 0 && (
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black uppercase shadow-xs z-10">
                            {discountPct}% OFF
                        </div>
                    )}

                    {/* Animated Wishlist Heart Button */}
                    <motion.button
                        type="button"
                        whileTap={{ scale: 1.25 }}
                        whileHover={{ scale: 1.1 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                                try { navigator.vibrate(40); } catch (e) {}
                            }
                            onWishlist && onWishlist(item);
                        }}
                        className={`absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all z-20 shadow-xs ${
                            isWishlisted 
                                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-500 border border-rose-200 dark:border-rose-800 shadow-sm'
                                : 'bg-white/85 dark:bg-black/60 text-slate-400 hover:text-rose-500 border border-slate-200/60 dark:border-white/10'
                        }`}
                        title={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                    >
                        {isWishlisted && (
                            <motion.span
                                key={`burst-${item.id || item.product_id}`}
                                initial={{ scale: 0.8, opacity: 0.8 }}
                                animate={{ scale: 1.8, opacity: 0 }}
                                transition={{ duration: 0.45, ease: "easeOut" }}
                                className="absolute inset-0 rounded-full border-2 border-rose-500 pointer-events-none"
                            />
                        )}
                        <motion.div
                            animate={isWishlisted ? { 
                                scale: [1, 1.45, 0.85, 1.15, 1],
                                rotate: [0, -10, 10, -5, 0]
                            } : { scale: 1, rotate: 0 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                        >
                            <Heart 
                                size={14} 
                                className={`transition-colors duration-300 ${
                                    isWishlisted 
                                        ? "fill-rose-500 text-rose-500 drop-shadow-[0_2px_6px_rgba(244,63,94,0.45)]" 
                                        : "currentColor"
                                }`} 
                            />
                        </motion.div>
                    </motion.button>

                    {/* Quick View Eye Button */}
                    {onQuickView && (
                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.92 }}
                            whileHover={{ scale: 1.1 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                                    try { navigator.vibrate(30); } catch (e) {}
                                }
                                onQuickView(item);
                            }}
                            className="absolute top-10 sm:top-11 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center backdrop-blur-md bg-white/85 dark:bg-black/60 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 border border-slate-200/60 dark:border-white/10 transition-all z-20 shadow-xs"
                            title="Quick View"
                        >
                            <Eye size={14} />
                        </motion.button>
                    )}

                    {oos && <OutOfStockOverlay />}
                </div>

                {/* Standard Pack / Unit Size */}
                <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                    1 Unit • Standard Pack
                </p>

                {/* Title */}
                <div
                    onClick={handleOpenPdp}
                    className={`${productSlugOrId ? 'cursor-pointer' : 'cursor-default'} ${oos ? 'opacity-50' : ''}`}
                >
                    <h3 className={`text-xs sm:text-sm font-bold leading-snug line-clamp-2 transition-colors ${
                        isDark ? 'text-white group-hover:text-sky-400' : 'text-slate-900 group-hover:text-blue-600'
                    }`}>
                        {item.custom_title || product?.title}
                    </h3>
                    
                    {/* Category & Rating Row */}
                    <div className="flex items-center justify-between gap-1.5 mt-1">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider truncate min-w-0 ${
                            isDark ? 'text-gray-400' : 'text-slate-500'
                        }`}>
                            {(item.sub_category || product?.sub_category) && (item.sub_category || product?.sub_category) !== 'General' 
                                ? (item.sub_category || product?.sub_category) 
                                : (product?.category || 'General')}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0 text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                            <Star size={9} className="fill-amber-500 text-amber-500" />
                            <span>{product?.rating || '4.8'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Price and Action Section — Vertical Stack to Never Collapse on Mobile */}
            <div className="mt-2.5 w-full pt-2 border-t border-slate-100 dark:border-white/[0.06] space-y-1.5">
                {/* Price Line */}
                <div className="flex items-baseline justify-between gap-1">
                    <div className="flex items-baseline gap-1.5 min-w-0 flex-wrap">
                        <span className={`text-sm sm:text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            ₹{sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </span>
                        {savings > 0 && (
                            <span className={`text-[10px] sm:text-[11px] font-semibold line-through ${isDark ? 'text-white/35' : 'text-slate-400'}`}>
                                ₹{mrp.toLocaleString('en-IN')}
                            </span>
                        )}
                    </div>
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        Earn Coins
                    </span>
                </div>

                {/* Full-width Action Stepper / Out of Stock / ADD Button */}
                <div className="w-full relative z-10" onClick={e => e.stopPropagation()}>
                    {oos ? (
                        <div className="w-full h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase flex items-center justify-center tracking-wider shadow-2xs">
                            Out of Stock
                        </div>
                    ) : cartItem ? (
                        <div className="w-full flex items-center justify-between bg-blue-600 text-white rounded-xl h-8 px-1.5 shadow-sm shadow-blue-600/20">
                            <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40); 
                                    onRemove && onRemove(); 
                                }}
                                className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <Minus size={13} strokeWidth={3} />
                            </motion.button>
                            <span className="text-xs font-black">{cartItem.quantity}</span>
                            <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={handleAdd}
                                className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <Plus size={13} strokeWidth={3} />
                            </motion.button>
                        </div>
                    ) : (
                        <motion.button
                            whileTap={{ scale: 0.94 }}
                            onClick={handleAdd}
                            className="w-full h-8 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 dark:bg-blue-500/15 dark:text-sky-400 dark:hover:bg-blue-600 dark:hover:text-white border-2 border-blue-600 dark:border-sky-500/50 text-xs font-black uppercase tracking-wider shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1"
                        >
                            {justAdded ? (
                                <>
                                    <Check size={13} strokeWidth={3} />
                                    <span>Added</span>
                                </>
                            ) : (
                                <span>ADD</span>
                            )}
                        </motion.button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default memo(ProductCardV2);
