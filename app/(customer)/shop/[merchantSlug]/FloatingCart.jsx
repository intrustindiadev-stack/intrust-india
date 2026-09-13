'use client';
import React, { useEffect } from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

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
    const isVisible = Boolean(count && count > 0);

    // Broadcast cart visibility so Chatbot and layout can coordinate animations dynamically
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('intrust:floating-cart', {
                detail: { visible: isVisible, count: count || 0, total: total || 0 }
            }));
            if (isVisible) {
                document.body.setAttribute('data-floating-cart', 'true');
            } else {
                document.body.removeAttribute('data-floating-cart');
            }
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('intrust:floating-cart', {
                    detail: { visible: false }
                }));
                document.body.removeAttribute('data-floating-cart');
            }
        };
    }, [isVisible, count, total]);

    // Only render when there are items
    if (!isVisible) return null;

    // Fallback if total wasn't calculated upstream or passed as 0
    const computedTotal = (total && total > 0)
        ? total
        : items.reduce((acc, item) => {
            const unitPrice = Number(
                item.retail_price_paise
                    ? item.retail_price_paise / 100
                    : (item.sale_price || item.price || item.selling_price || 0)
            );
            return acc + (unitPrice * (item.quantity || 1) * 100);
        }, 0);

    const formattedTotal = ((computedTotal || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 });
    const formattedSavings = savings > 0 ? Math.round(savings / 100) : 0;

    const handleGoToCart = (e) => {
        e.stopPropagation();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(50); } catch (e) {}
        }
        router.push('/shop/cart');
    };

    return (
        <AnimatePresence>
            <motion.div
                key="floating-cart-bar"
                initial={{ opacity: 0, y: 55, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 55, scale: 0.94 }}
                transition={{
                    type: 'spring',
                    damping: 24,
                    stiffness: 300,
                    mass: 0.8
                }}
                onClick={handleGoToCart}
                className="fixed bottom-[74px] sm:bottom-6 left-3.5 right-3.5 sm:left-auto sm:right-6 sm:w-[390px] z-[60] p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#0c0e16]/95 text-slate-900 dark:text-white shadow-2xl shadow-slate-900/15 dark:shadow-black/60 border border-slate-200/90 dark:border-white/10 flex items-center justify-between gap-3 backdrop-blur-2xl cursor-pointer hover:border-blue-500/50 transition-colors duration-500 group"
            >
                {/* Left: Bag Icon & Item Info */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center shrink-0 text-blue-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
                        <ShoppingBag size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5 leading-tight">
                            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                {count} {count === 1 ? 'Item' : 'Items'}
                            </span>
                            <span className="text-slate-300 dark:text-white/30 text-[11px]">•</span>
                            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                ₹{formattedTotal}
                            </span>
                        </div>

                        <div className="flex items-center gap-1 mt-0.5 text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                            {formattedSavings > 0 ? (
                                <>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Saved ₹{formattedSavings}</span>
                                    <span className="text-slate-300 dark:text-white/30">•</span>
                                    <span className="truncate">Same-Day Delivery</span>
                                </>
                            ) : (
                                <span className="truncate flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                    <span>Same-Day Delivery</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Sleek Action Button */}
                <button
                    type="button"
                    onClick={handleGoToCart}
                    className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all active:scale-95"
                >
                    <span>View Cart</span>
                    <ArrowRight size={13} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
            </motion.div>
        </AnimatePresence>
    );
}
