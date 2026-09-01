'use client';

import { useState, memo } from 'react';
import { Plus, Minus, Package, BadgeCheck, Check, Heart, Image as ImageIcon } from 'lucide-react';
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
        <div className={`
            bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer group
            ${oos ? 'opacity-75' : ''}
        `}
        onClick={() => onSelect ? onSelect() : (product?.slug && router.push(`/shop/product/${product.slug}`))}
        >
            {/* Image Area */}
            <div className="aspect-square bg-gray-50 relative overflow-hidden">
                {product.product_images?.[0] ? (
                    <img 
                        src={product.product_images[0]} 
                        alt={item.custom_title || product.title}
                        className={`object-cover w-full h-full group-hover:scale-105 transition-transform duration-300 ${oos ? 'grayscale' : ''}`}
                        loading="lazy" 
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-gray-300" />
                    </div>
                )}

                {/* Discount Badge */}
                {mrp > sellingPrice && (
                    <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                        -{discountPct}%
                    </span>
                )}

                {/* Out of Stock Overlay */}
                {oos && (
                    <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
                        <span className="text-xs font-semibold text-gray-500 bg-white/90 px-3 py-1 rounded-full border border-gray-200">
                            Out of Stock
                        </span>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-3 space-y-1.5">
                <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">
                    {item.custom_title || product.title}
                </h3>
                
                {/* Price Row */}
                <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold text-gray-900">
                        ₹{sellingPrice.toFixed(2)}
                    </span>
                    {mrp > sellingPrice && (
                        <span className="text-xs text-gray-400 line-through">
                            ₹{mrp.toFixed(2)}
                        </span>
                    )}
                </div>

                {/* Rating (optional — render if data exists) */}
                {item.rating != null && (
                    <div className="flex items-center gap-1">
                        <div className="flex text-yellow-400 text-xs">
                            ★
                        </div>
                        {item.reviewCount != null && (
                            <span className="text-gray-400 text-xs">({item.reviewCount})</span>
                        )}
                    </div>
                )}

                {/* Action Button */}
                <button
                    disabled={oos}
                    className={`
                        mt-2 w-full text-sm font-medium py-2 rounded-lg transition-colors duration-150
                        ${!oos 
                            ? 'border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white' 
                            : 'border border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                        }
                    `}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!oos) handleAdd(e);
                    }}
                >
                    {!oos ? (cartItem ? `In Cart (${cartItem.quantity})` : 'Add to Cart') : 'Out of Stock'}
                </button>
            </div>
        </div>
    );
}

export default memo(ProductCardV2);
