'use client';

import { useState, memo } from 'react';
import { Plus, Minus, Package, BadgeCheck, Check, Heart, Sparkles } from 'lucide-react';
import Image from 'next/image';
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

    const productSlugOrId = product?.slug || product?.id;
    const displayImage = getProductFallbackImage(product || item);

    return (
        <div
            className={`group relative flex flex-col h-full rounded-3xl p-3 sm:p-4 transition-all duration-300 ${
                isDark
                    ? 'bg-[#0c0e16] hover:bg-[#12151c] border border-white/[0.08] shadow-md hover:border-blue-500/40'
                    : 'bg-white border-slate-200/80 shadow-xs border hover:border-blue-500/40 hover:shadow-xl'
            }`}
        >
            {/* Product Image & Badges */}
            <div
                onClick={() => onSelect ? onSelect() : (productSlugOrId && router.push(`/shop/product/${productSlugOrId}`))}
                className={`relative w-full aspect-square shrink-0 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer mb-3 p-2.5 ${
                    isDark ? 'bg-slate-900/60' : 'bg-slate-50 border border-slate-100'
                }`}
            >
                <img
                    src={displayImage}
                    alt={item.custom_title || product?.title || 'Product'}
                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                />

                {/* Discount Badge */}
                {discountPct > 0 && (
                    <div className="absolute top-2 left-2 px-1.5 sm:px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-sm z-10">
                        {discountPct}% OFF
                    </div>
                )}

                {/* Animated Wishlist Heart Button */}
                <motion.button
                    type="button"
                    whileTap={{ scale: 1.35 }}
                    whileHover={{ scale: 1.1 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onWishlist && onWishlist(item);
                    }}
                    className={`absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all z-20 shadow-xs ${
                        isWishlisted 
                            ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-500 border border-rose-200 dark:border-rose-800 shadow-sm'
                            : 'bg-white/80 dark:bg-black/60 text-slate-400 hover:text-rose-500 border border-slate-200/60 dark:border-white/10'
                    }`}
                    title={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                >
                    <motion.div
                        animate={isWishlisted ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Heart size={14} className={isWishlisted ? "fill-rose-500 text-rose-500" : "currentColor"} />
                    </motion.div>
                </motion.button>

                {oos && <OutOfStockOverlay />}
            </div>

            {/* Product Details */}
            <div
                onClick={() => onSelect ? onSelect() : (productSlugOrId && router.push(`/shop/product/${productSlugOrId}`))}
                className={`flex flex-col flex-1 w-full justify-between ${productSlugOrId ? 'cursor-pointer' : 'cursor-default'} ${oos ? 'opacity-50' : ''}`}
            >
                <div>
                    <h3 className={`text-[13px] sm:text-[14px] font-bold leading-tight line-clamp-2 transition-colors ${
                        isDark ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-600'
                    }`}>
                        {item.custom_title || product?.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider truncate max-w-[110px] ${
                            isDark ? 'text-gray-400' : 'text-slate-500'
                        }`}>
                            {product?.category || 'General'}
                        </span>
                        {(item.sub_category || product?.sub_category) && (item.sub_category || product?.sub_category) !== 'General' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 truncate max-w-[90px]">
                                {item.sub_category || product?.sub_category}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-end justify-between mt-3.5 w-full pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                    <div className="flex flex-col">
                        {savings > 0 && (
                            <span className={`text-[10px] font-bold line-through ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                                ₹{mrp.toLocaleString('en-IN')}
                            </span>
                        )}
                        <div className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            ₹{sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </div>
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                            Earn Coins
                        </span>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0 relative z-10" onClick={e => e.stopPropagation()}>
                        {oos ? (
                            <OutOfStockBadge variant="soft" size="sm" />
                        ) : cartItem ? (
                            <div className="flex items-center bg-blue-600 text-white rounded-xl h-8 px-1 shadow-md shadow-blue-500/25">
                                <motion.button
                                    whileTap={{ scale: 0.88 }}
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50); 
                                        onRemove && onRemove(); 
                                    }}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <Minus size={13} strokeWidth={3} />
                                </motion.button>
                                <span className="text-xs font-black w-6 text-center">{cartItem.quantity}</span>
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
                                whileTap={{ scale: 0.9 }}
                                onClick={handleAdd}
                                className={`h-8 px-3.5 sm:px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 ${
                                    justAdded 
                                        ? 'bg-emerald-600 text-white shadow-emerald-500/25' 
                                        : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-500/25'
                                }`}
                            >
                                {justAdded ? (
                                    <>
                                        <Check size={14} strokeWidth={3} />
                                        <span>Added</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus size={13} strokeWidth={3} />
                                        <span>Add</span>
                                    </>
                                )}
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default memo(ProductCardV2);

