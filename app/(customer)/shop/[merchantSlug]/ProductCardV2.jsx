'use client';

import { useState, memo } from 'react';
import { Plus, Minus, Package, BadgeCheck, Check, Heart } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { isStorefrontItemOOS } from '@/lib/shopping/stock';
import OutOfStockOverlay from '@/components/ui/OutOfStockOverlay';
import OutOfStockBadge from '@/components/ui/OutOfStockBadge';

function ProductCardV2({ item, cartItem, onAdd, onRemove, onSelect, primaryColor = '#ff477e', secondaryColor = '#ff477e', isWishlisted = false, onWishlist, isStoreOpen = true }) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const product = item.shopping_products;
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
            onAdd(); // Triggers parent toast
            return;
        }
        setJustAdded(true);
        onAdd();
        setTimeout(() => setJustAdded(false), 1800);
    };

    // Calculation of MRP and Selling Price
    const mrp = (product.mrp_paise || product.suggested_retail_price_paise || item.retail_price_paise || 0) / 100;
    const sellingPrice = item.is_platform_product
        ? ((product?.platform_price_paise ?? product?.suggested_retail_price_paise) || item.retail_price_paise || 0) / 100
        : (item.retail_price_paise || 0) / 100;
    const savings = mrp > sellingPrice ? mrp - sellingPrice : 0;
    const discountPct = mrp > 0 ? Math.round((savings / mrp) * 100) : 0;

    return (
        <div
            className={`group relative flex flex-col h-full rounded-3xl p-3 sm:p-4 transition-all duration-300 ${isDark
                ? 'bg-[#0c0e16] hover:bg-[#12151c] border border-white/[0.08] shadow-md'
                : 'bg-white border-slate-200 shadow-xs border hover:border-emerald-500/40 hover:shadow-lg'
                }`}
        >
            {/* Product Image */}
            <div
                onClick={() => onSelect ? onSelect() : (product?.slug && router.push(`/shop/product/${product.slug}`))}
                className={`relative w-full aspect-square shrink-0 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer mb-3 p-2 ${isDark ? 'bg-gray-800' : 'bg-slate-50 border border-slate-100'}`}
            >
                {product.product_images?.[0] ? (
                    <Image
                        src={product.product_images[0]}
                        alt={product.title}
                        fill
                        sizes="(max-width: 640px) 150px, 200px"
                        className="object-contain transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <Package size={24} className={isDark ? 'text-white/20' : 'text-slate-300'} />
                )}
                {oos && <OutOfStockOverlay />}
            </div>

            {/* Product Details */}
            <div
                onClick={() => onSelect ? onSelect() : (product?.slug && router.push(`/shop/product/${product.slug}`))}
                className={`flex flex-col flex-1 w-full justify-between ${product?.slug ? 'cursor-pointer' : 'cursor-default'} ${oos ? 'opacity-50' : ''}`}
            >
                <div>
                    <h3 className={`text-[13px] sm:text-[14px] font-bold leading-tight line-clamp-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {item.custom_title || product.title}
                    </h3>
                    <p className={`text-[10px] font-extrabold uppercase tracking-wider mt-1 line-clamp-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                        {product.category || 'General'}
                    </p>
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
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0 relative z-10" onClick={e => e.stopPropagation()}>
                        {oos ? (
                            <OutOfStockBadge variant="soft" size="sm" />
                        ) : cartItem ? (
                            <div className="flex items-center bg-sky-500 text-white rounded-xl h-8 px-1 shadow-sm">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50); onRemove(); }}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <Minus size={13} strokeWidth={3} />
                                </motion.button>
                                <span className="text-xs font-black w-6 text-center">{cartItem.quantity}</span>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
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
                                className={`h-8 px-4 rounded-xl flex items-center justify-center text-xs font-black uppercase tracking-wider shadow-xs transition-all active:scale-95 ${
                                    justAdded 
                                        ? 'bg-sky-500 text-white border-sky-500' 
                                        : 'bg-sky-50 hover:bg-sky-500 hover:text-white text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-sky-500 dark:hover:text-white border-2 border-sky-500 dark:border-sky-400/40'
                                }`}
                            >
                                {justAdded ? <Check size={14} strokeWidth={3} /> : 'ADD'}
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default memo(ProductCardV2);
