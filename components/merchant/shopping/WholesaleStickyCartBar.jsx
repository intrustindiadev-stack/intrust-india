'use client';

import { motion } from 'framer-motion';
import { ShoppingCart, ReceiptText, TrendingUp } from 'lucide-react';
import { useWholesaleCart } from '@/components/merchant/shopping/WholesaleCartContext';

/**
 * WholesaleStickyCartBar — mobile-only bulk order summary.
 *
 * Always-on total visibility for the merchant while they scan stock on a phone.
 * Tapping "View Order Slip" opens the Wholesale checkout drawer (MerchantFloatingCart)
 * through useWholesaleCart or controlled onDrawerOpenChange state.
 *
 * Positioning note: the bar is anchored exactly on top of the merchant's floating
 * bottom navigation (MerchantBottomNav: 4.5rem tall at a 1.5rem offset = 6rem)
 * instead of bottom-0, preventing the bar from covering app nav tabs on phones.
 *
 * Stack math:
 *   Bottom-nav pill (~5rem + safe-area) + sticky bar (~76px) ≈ 190px clearance = pb-24 + MerchantBottomNav 7rem spacer.
 *
 * Anchor contract:
 *   Keeps id="wholesale-sticky-cart-target" for fly-to-cart animation.
 */
const formatINR = (value) =>
    Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function WholesaleStickyCartBar(props) {
    const cart = useWholesaleCart?.() || {};

    const itemCount = props.itemCount !== undefined ? props.itemCount : (cart.totalUnits ?? 0);
    const lineCount = props.lineCount !== undefined ? props.lineCount : (cart.lineCount ?? 0);
    // grandTotalPaise includes GST, matching the order slip's total payable
    const total = props.total !== undefined
        ? props.total
        : ((cart.grandTotalPaise ?? cart.cartTotalPaise ?? 0) / 100);
    const estMargin = props.estMargin !== undefined
        ? props.estMargin
        : ((cart.estimatedMarginTotal ?? 0) / 100);
    const marginPercent = props.marginPercent !== undefined
        ? props.marginPercent
        : (cart.estimatedMarginPercent ?? 0);
    const onViewOrder = props.onViewOrder ?? (() => cart.setCartDrawerOpen?.(true));

    if (itemCount <= 0) return null;

    return (
        <div
            role="region"
            aria-label="Bulk order summary"
            className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] left-0 w-full bg-white dark:bg-slate-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 p-4 md:hidden border-t border-slate-100 dark:border-slate-800"
        >
            <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
                <div id="wholesale-sticky-cart-target" className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-sky-400 shrink-0">
                        <ShoppingCart size={18} />
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                            {lineCount}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none">
                            {itemCount} {itemCount === 1 ? 'unit' : 'units'} in order
                        </p>
                        <div className="flex items-baseline gap-1.5 min-w-0">
                            <p className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5 truncate">
                                ₹{formatINR(total)}
                            </p>
                            {estMargin > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                    <TrendingUp size={10} strokeWidth={3} />
                                    +{marginPercent}%
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={onViewOrder}
                    className="h-11 min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/20 flex items-center justify-center gap-1.5 shrink-0 active:scale-95 transition-all"
                >
                    <ReceiptText size={15} />
                    <span className="whitespace-nowrap">View Order Slip</span>
                </motion.button>
            </div>
        </div>
    );
}
