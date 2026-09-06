'use client';

import { ShoppingBag, ChevronRight, Zap } from 'lucide-react';
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

    // Only render when there are items
    if (!count || count === 0) return null;

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
            navigator.vibrate(50);
        }
        router.push('/shop/cart');
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={handleGoToCart}
                className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-[420px] z-50 p-4 rounded-3xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-white shadow-2xl shadow-blue-500/25 border border-sky-300/30 flex items-center justify-between gap-4 backdrop-blur-xl cursor-pointer hover:shadow-blue-500/40 transition-all"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 border border-white/20">
                        <ShoppingBag size={22} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black tracking-tight">
                                {count} {count === 1 ? 'ITEM' : 'ITEMS'}
                            </span>
                            <span className="text-xs opacity-75">•</span>
                            <span className="text-sm font-black">₹{formattedTotal}</span>
                        </div>
                        <p className="text-[11px] text-sky-100 font-bold flex items-center gap-1 truncate">
                            {formattedSavings > 0 ? (
                                <>
                                    <Zap size={12} className="fill-sky-200 text-sky-200 shrink-0" />
                                    <span>Saved ₹{formattedSavings} • Express Bhopal</span>
                                </>
                            ) : (
                                <>
                                    <Zap size={12} className="fill-sky-200 text-sky-200 shrink-0" />
                                    <span>⚡ Express Delivery • Live Order Tracking</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleGoToCart}
                    className="px-4 py-2.5 rounded-2xl bg-white hover:bg-sky-50 text-blue-900 text-xs font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                    <span>View Cart</span>
                    <ChevronRight size={15} strokeWidth={3} />
                </button>
            </motion.div>
        </AnimatePresence>
    );
}
