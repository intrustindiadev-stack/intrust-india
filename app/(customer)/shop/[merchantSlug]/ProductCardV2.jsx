'use client';

import { useState, memo } from 'react';
import { Plus, Minus, Package, BadgeCheck, Check, Heart, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { isStorefrontItemOOS } from '@/lib/shopping/stock';
import OutOfStockOverlay from '@/components/ui/OutOfStockOverlay';
import OutOfStockBadge from '@/components/ui/OutOfStockBadge';

import Link from 'next/link';

function ProductCardV2({ item, cartItem, onAdd, onRemove, onSelect, primaryColor = '#ff477e', secondaryColor = '#ff477e', isWishlisted = false, onWishlist, isStoreOpen = true }) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const product = item.shopping_products;
    const oos = isStorefrontItemOOS(item);
    const [justAdded, setJustAdded] = useState(false);
    const [isClosedAnimation, setIsClosedAnimation] = useState(false);

    const handleAdd = (e) => {
        e.preventDefault();
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

    const handleRemove = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(30);
        }
        onRemove();
    };

    // Calculation of MRP and Selling Price
    const mrp = (product.mrp_paise || product.suggested_retail_price_paise || item.retail_price_paise || 0) / 100;
    const sellingPrice = item.is_platform_product
        ? ((product?.platform_price_paise ?? product?.suggested_retail_price_paise) || item.retail_price_paise || 0) / 100
        : (item.retail_price_paise || 0) / 100;
    const savings = mrp > sellingPrice ? mrp - sellingPrice : 0;
    const discountPct = mrp > 0 ? Math.round((savings / mrp) * 100) : 0;
    
    const productUrl = `/shop/product/${product?.slug || product?.id}`;

    return (
        <div className={`
            bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] 
            transition-all duration-300 overflow-hidden group flex flex-col hover:-translate-y-1 relative
            ${oos ? 'opacity-75' : ''}
        `}>
            <Link 
                href={productUrl} 
                className="block cursor-pointer flex-1"
                onClick={(e) => {
                    if (onSelect) {
                        e.preventDefault();
                        onSelect();
                    }
                }}
            >
                {/* Image Area - Updated to 4:5 aspect ratio for Fashion */}
                <div className="aspect-[4/5] bg-[#F7F9FC] relative overflow-hidden">
                    {product.product_images?.[0] ? (
                        <img 
                            src={product.product_images[0]} 
                            alt={item.custom_title || product.title}
                            className={`object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 ${oos ? 'grayscale opacity-80' : ''}`}
                            loading="lazy" 
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-10 h-10 text-gray-300" />
                        </div>
                    )}

                    {/* Gradient Overlay for bottom text readability if needed */}
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Discount Badge */}
                    {mrp > sellingPrice && (
                        <span className="absolute top-2 left-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded shadow-sm tracking-wider uppercase">
                            {discountPct}% OFF
                        </span>
                    )}

                    {/* Out of Stock Overlay */}
                    {oos && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                            <span className="text-xs font-bold text-gray-600 bg-white/95 px-4 py-1.5 rounded-full shadow-sm border border-gray-100 uppercase tracking-wide">
                                Sold Out
                            </span>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="p-3 pb-1 flex flex-col flex-1 relative z-10 bg-white">
                    <h3 className="text-xs sm:text-sm font-medium text-gray-800 line-clamp-2 leading-snug mb-2 group-hover:text-blue-600 transition-colors">
                        {item.custom_title || product.title}
                    </h3>
                    
                    {/* Bottom Row: Price & Action */}
                    <div className="mt-auto pt-1 flex items-end justify-between gap-1">
                        <div className="flex flex-col">
                            {mrp > sellingPrice && (
                                <span className="text-[10px] sm:text-xs text-gray-400 line-through leading-none mb-0.5">
                                    ₹{mrp.toFixed(2)}
                                </span>
                            )}
                            <span className="text-sm sm:text-base font-bold text-gray-900 leading-none">
                                ₹{sellingPrice.toFixed(2)}
                            </span>
                        </div>
                        
                        {/* Compact Add Button Zepto-style */}
                        <div className="shrink-0 relative z-20" onClick={(e) => e.preventDefault()}>
                            {!oos ? (
                                cartItem ? (
                                    <div className="flex items-center bg-blue-50 border border-blue-200 rounded-lg h-7 sm:h-8 shadow-sm">
                                        <button 
                                            onClick={handleRemove}
                                            className="w-7 sm:w-8 h-full flex items-center justify-center text-blue-600 hover:bg-blue-100 rounded-l-lg transition-colors"
                                        >
                                            <Minus size={14} strokeWidth={2.5} />
                                        </button>
                                        <div className="w-6 sm:w-8 text-center text-xs sm:text-sm font-bold text-blue-700">
                                            {cartItem.quantity}
                                        </div>
                                        <button 
                                            onClick={handleAdd}
                                            className="w-7 sm:w-8 h-full flex items-center justify-center text-blue-600 hover:bg-blue-100 rounded-r-lg transition-colors"
                                        >
                                            <Plus size={14} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        className="h-7 sm:h-8 px-3 sm:px-4 bg-white border border-blue-600 text-blue-600 text-xs sm:text-sm font-bold rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1 shadow-sm"
                                        onClick={handleAdd}
                                    >
                                        ADD
                                    </button>
                                )
                            ) : null}
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}

export default memo(ProductCardV2);
