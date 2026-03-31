'use client';

import { useState } from 'react';
import { Plus, Minus, Package, BadgeCheck, Check, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductCardV2({ item, cartItem, onAdd, onRemove, primaryColor = '#000000', secondaryColor = '#1e293b', isWishlisted = false, onWishlist }) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const product = item.shopping_products;
    const [justAdded, setJustAdded] = useState(false);

    const handleAdd = (e) => {
        e.stopPropagation();
        setJustAdded(true);
        onAdd();
        setTimeout(() => setJustAdded(false), 1000);
    };

    // Calculation of MRP and Selling Price
    const mrp = (product.mrp_paise || product.suggested_retail_price_paise || item.retail_price_paise || 0) / 100;
    const sellingPrice = (item.retail_price_paise || 0) / 100;
    const savings = mrp > sellingPrice ? mrp - sellingPrice : 0;
    const discountPct = mrp > 0 ? Math.round((savings / mrp) * 100) : 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`group relative flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-300 ${isDark
                ? 'bg-[#12151c] hover:bg-[#161a24] border shadow-lg'
                : 'bg-white border-slate-200 shadow-sm hover:shadow-md border'
                }`}
            style={isDark ? {
                borderColor: `${primaryColor}12`,
                boxShadow: `0 4px 24px ${primaryColor}06`
            } : {}}
        >
                <div
                    className={`absolute top-0 left-0 text-white text-[10px] font-black px-2.5 py-1 rounded-br-xl z-10`}
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                >
                    {discountPct}% OFF
                </div>

            <div
                onClick={() => router.push(`/shop/product/${item.product_id}`)}
                className="relative cursor-pointer flex flex-col flex-1 p-2 md:p-3"
            >
                {/* Product Image — subtle category-colored inner glow in dark mode */}
                <div
                    className={`w-full aspect-square relative mb-3 rounded-xl flex items-center justify-center overflow-hidden ${isDark ? 'bg-[#0c0e14]' : 'bg-slate-50/50'}`}
                    style={isDark ? {
                        boxShadow: `inset 0 0 40px ${primaryColor}08`
                    } : {}}
                >
                    {product.product_images?.[0] ? (
                        <img
                            src={product.product_images[0]}
                            alt={product.title}
                            className={`w-[85%] h-[85%] object-contain transition-transform duration-500 group-hover:scale-110 ${isDark ? '' : 'mix-blend-multiply'}`}
                        />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center ${isDark ? 'text-white/10' : 'text-slate-200'}`}>
                            <Package size={32} strokeWidth={1} />
                        </div>
                    )}

                    {/* Wishlist Heart Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onWishlist?.(); }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm transition-all hover:scale-110 active:scale-95 z-10 border border-white/20"
                        style={isDark ? { background: 'rgba(12,14,20,0.85)', borderColor: 'rgba(255,255,255,0.06)' } : {}}
                    >
                        <Heart
                            size={14}
                            className={isWishlisted ? 'text-pink-500' : (isDark ? 'text-white/30' : 'text-slate-400')}
                            fill={isWishlisted ? 'currentColor' : 'none'}
                            strokeWidth={isWishlisted ? 0 : 2}
                        />
                    </button>

                </div>

                <div className="flex flex-col flex-1 text-left px-1">
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-wider truncate" style={{ color: isDark ? `${primaryColor}CC` : primaryColor }}>
                                {item.merchants?.business_name || 'InTrust Official'}
                            </p>
                            <BadgeCheck size={12} className="shrink-0" style={{ color: primaryColor }} />
                        </div>
                    </div>
                    <h3 className={`text-xs md:text-sm font-bold leading-[1.3] line-clamp-2 min-h-[2.6em] mb-2 ${isDark ? 'text-white/80' : 'text-slate-800'}`}>
                        {item.custom_title || product.title}
                    </h3>

                    <div className="mt-auto">
                        {/* Savings row */}
                        {savings > 0 && (
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-medium line-through ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
                                    ₹{mrp.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors`}
                                    style={{ 
                                        backgroundColor: isDark ? `${primaryColor}20` : `${primaryColor}10`,
                                        color: primaryColor 
                                    }}
                                >
                                    Save ₹{savings.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                </span>
                            </div>
                        )}

                        {/* Price */}
                        <div className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            ₹{sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className={`p-2 w-full pt-1 border-t ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                <AnimatePresence mode="wait">
                    {justAdded ? (
                        <motion.div
                            key="success"
                            initial={{ scale: 0.8, opacity: 0, borderRadius: 20 }}
                            animate={{ scale: 1, opacity: 1, borderRadius: 12 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            className="flex items-center justify-center text-white shadow-sm h-9 md:h-10 w-full"
                            style={{
                                background: primaryColor,
                                boxShadow: isDark ? `0 4px 16px ${primaryColor}40` : `0 4px 14px ${primaryColor}30`
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                            >
                                <Check size={18} strokeWidth={3} />
                            </motion.div>
                        </motion.div>
                    ) : cartItem ? (
                        <motion.div
                            key="qty"
                            initial={{ width: "60%", opacity: 0 }}
                            animate={{ width: "100%", opacity: 1 }}
                            exit={{ width: "60%", opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            className="mx-auto flex items-center justify-between text-white rounded-xl overflow-hidden shadow-sm h-9 md:h-10 w-full"
                            style={{
                                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                                boxShadow: isDark ? `0 4px 16px ${primaryColor}30` : `0 2px 8px ${primaryColor}25`
                            }}
                        >
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="w-10 h-full flex items-center justify-center hover:bg-black/10 transition-colors active:bg-black/20"
                            >
                                <Minus size={14} strokeWidth={3} />
                            </button>
                            <motion.span
                                key={cartItem.quantity}
                                initial={{ scale: 1.4, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-sm font-black w-8 text-center bg-black/10 h-full flex flex-col justify-center shadow-inner"
                            >
                                {cartItem.quantity}
                            </motion.span>
                            <button
                                onClick={(e) => { e.stopPropagation(); onAdd(); }}
                                className="w-10 h-full flex items-center justify-center hover:bg-black/10 transition-colors active:bg-black/20"
                            >
                                <Plus size={14} strokeWidth={3} />
                            </button>
                        </motion.div>
                    ) : (
                        <motion.button
                            key="add"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            onClick={handleAdd}
                            className={`w-full h-9 md:h-10 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs transition-all active:scale-95 ${isDark ? 'border' : 'border shadow-sm hover:shadow-md'}`}
                            style={{
                                borderColor: `${primaryColor}40`,
                                color: isDark ? primaryColor : 'white',
                                backgroundColor: isDark ? 'transparent' : primaryColor
                            }}
                            onMouseEnter={(e) => { 
                                if (isDark) { 
                                    e.target.style.background = `${primaryColor}15`; 
                                } else {
                                    e.target.style.filter = 'brightness(1.1)';
                                }
                            }}
                            onMouseLeave={(e) => { 
                                if (isDark) { 
                                    e.target.style.background = 'transparent'; 
                                } else {
                                    e.target.style.filter = 'none';
                                }
                            }}
                        >
                            ADD <Plus size={14} strokeWidth={2.5} />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
