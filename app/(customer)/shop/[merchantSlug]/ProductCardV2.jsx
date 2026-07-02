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

function ProductCardV2({ item, cartItem, onAdd, onRemove, primaryColor = '#ff477e', secondaryColor = '#ff477e', isWishlisted = false, onWishlist, isStoreOpen = true }) {
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
            className={`group relative flex flex-col h-full rounded-2xl p-2.5 sm:p-3 transition-all duration-300 ${isDark
                ? 'bg-[#0c0e16] hover:bg-[#12151c] border border-white/[0.04] shadow-[0_4px_20px_rgb(0,0,0,0.1)]'
                : 'bg-white border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)]'
                }`}
        >
            {/* Product Image */}
            <div
                onClick={() => product?.slug && router.push(`/shop/product/${product.slug}`)}
                className={`relative w-full aspect-square shrink-0 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer mb-3 ${isDark ? 'bg-gray-800' : 'bg-slate-50'}`}
            >
                {product.product_images?.[0] ? (
                    <Image
                        src={product.product_images[0]}
                        alt={product.title}
                        fill
                        sizes="(max-width: 640px) 150px, 200px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <Package size={24} className={isDark ? 'text-white/20' : 'text-slate-300'} />
                )}
                {oos && <OutOfStockOverlay />}
            </div>

            {/* Product Details */}
            <div
                onClick={() => product?.slug && router.push(`/shop/product/${product.slug}`)}
                className={`flex flex-col flex-1 w-full justify-between ${product?.slug ? 'cursor-pointer' : 'cursor-default'} ${oos ? 'opacity-50' : ''}`}
            >
                <div>
                    <h3 className={`text-[13px] sm:text-[15px] font-bold leading-tight line-clamp-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {item.custom_title || product.title}
                    </h3>
                    <p className={`text-[11px] mt-1 line-clamp-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {product.category || 'Food & Drink'}
                    </p>
                </div>

                <div className="flex items-end justify-between mt-3 w-full">
                    <div className="flex flex-col">
                        {savings > 0 && (
                            <span className={`text-[10px] font-bold line-through ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                                ₹{mrp.toLocaleString('en-IN')}
                            </span>
                        )}
                        <div className={`text-[14px] sm:text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            ₹{sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0 relative z-10" onClick={e => e.stopPropagation()}>
                        {oos ? (
                            <OutOfStockBadge variant="soft" size="sm" />
                        ) : cartItem ? (
                            <div className="flex items-center bg-blue-600 text-white rounded-lg h-8 px-1 shadow-md">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50); onRemove(); }}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-md"
                                >
                                    <Minus size={14} strokeWidth={3} />
                                </motion.button>
                                <span className="text-xs font-bold w-6 text-center">{cartItem.quantity}</span>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleAdd}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-md"
                                >
                                    <Plus size={14} strokeWidth={3} />
                                </motion.button>
                            </div>
                        ) : (
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={handleAdd}
                                className={`h-8 px-3 sm:px-4 rounded-lg flex items-center justify-center text-[11px] sm:text-xs font-black uppercase tracking-widest shadow-sm border ${justAdded ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 dark:bg-blue-600/10 dark:text-blue-500 dark:border-blue-600/20'}`}
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
