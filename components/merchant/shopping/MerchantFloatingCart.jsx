'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart, X, Trash2, Loader2, Wallet, CreditCard,
    Tags, ChevronUp, Info
} from 'lucide-react';
import { useWholesaleCart } from '@/components/merchant/shopping/WholesaleCartContext';

const formatINR = (value) =>
    Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * MerchantFloatingCart — Order Slip UI for Merchant Wholesale and Coupon Purchasing.
 *
 * Responsive layout contract:
 *   • Desktop (md+): Overlay side-drawer sliding in from top-right (w-[400px] max-w-[92vw])
 *   • Mobile (< md): Bottom sheet drawer sliding up from screen bottom (rounded-t-2xl, max-h-[85vh])
 *   • Shared backdrop: fixed inset-0 z-[700] bg-black/50 with Esc key close and body scroll lock.
 *   • Single source of truth: automatically reads from useWholesaleCart when mounted inside WholesaleCartProvider,
 *     while supporting explicit legacy props from other pages like purchase/page.jsx.
 */
export default function MerchantFloatingCart({
    cartItems: cartItemsProp,
    merchantBalance: merchantBalanceProp,
    subtotalInRupees: subtotalInRupeesProp,
    onRemoveItem: onRemoveItemProp,
    onPurchaseWallet,
    onPurchaseGateway,
    isPurchasing = false,
    isProcessingGateway = false,
    // Coupon-specific: show commission
    showCommission = false,
    commissionRate = 0.03,
    // Custom button labels
    walletLabel = 'Pay via Wallet',
    gatewayLabel = 'Pay via UPI / Cards',
    // Disable gateway entirely
    disableGateway = false,
    // Hide the floating FAB below `md` — used by pages that render their own sticky cart bar on phones
    hideFabBelowMd = false,
    // Legacy flags preserved for non-wholesale consumers (e.g. merchant/purchase/page.jsx)
    alwaysShowFab = false,
    hideDesktopPanel = false,
    // Optional controlled drawer state so a parent (or context) can open the slip
    isDrawerOpen: isDrawerOpenProp,
    onDrawerOpenChange: onDrawerOpenChangeProp,
}) {
    const [mounted, setMounted] = useState(false);
    const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);

    const cartCtx = useWholesaleCart?.() || {};

    // Prefer explicit props if supplied, otherwise fallback to WholesaleCartContext
    const cartItems = cartItemsProp !== undefined ? cartItemsProp : (cartCtx.cartItems || []);
    const merchantBalance = merchantBalanceProp !== undefined
        ? merchantBalanceProp
        : (cartCtx.merchantBalance || 0);
    const subtotalInRupees = subtotalInRupeesProp !== undefined
        ? subtotalInRupeesProp
        : ((cartCtx.cartTotalPaise || 0) / 100);
    const onRemoveItem = onRemoveItemProp || cartCtx.removeFromCart;

    const drawerOpen = isDrawerOpenProp !== undefined
        ? isDrawerOpenProp
        : (cartCtx.cartDrawerOpen !== undefined ? cartCtx.cartDrawerOpen : internalDrawerOpen);

    const setDrawerOpen = onDrawerOpenChangeProp || (cartCtx.setCartDrawerOpen ? cartCtx.setCartDrawerOpen : setInternalDrawerOpen);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Lock body scroll when drawer is open
    useEffect(() => {
        if (!mounted) return;
        if (drawerOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [drawerOpen, mounted]);

    // Close on Escape key
    useEffect(() => {
        if (!mounted || !drawerOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setDrawerOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [drawerOpen, mounted, setDrawerOpen]);

    const commission = showCommission ? subtotalInRupees * commissionRate : 0;

    // SGST/CGST breakdown
    const sgstTotal = cartItems.reduce((sum, item) => {
        const itemTotal = (item.unit_price || 0) * (item.quantity || 1);
        const gstRate = (item.gst_percentage || 0) / 100;
        return sum + (itemTotal * gstRate) / 2;
    }, 0);
    const cgstTotal = cartItems.reduce((sum, item) => {
        const itemTotal = (item.unit_price || 0) * (item.quantity || 1);
        const gstRate = (item.gst_percentage || 0) / 100;
        return sum + (itemTotal * gstRate) / 2;
    }, 0);
    const gstTotal = sgstTotal + cgstTotal;
    const total = subtotalInRupees + commission + gstTotal;
    const isInsufficient = total > merchantBalance;
    const itemCount = cartItems.length;
    const baseSubtotal = subtotalInRupees - gstTotal;

    // Wholesale Breakdown
    const totalRetailValue = cartItems.reduce(
        (sum, item) => sum + ((item.retail_price || item.unit_price || 0) * (item.quantity || 1)),
        0
    );
    const estProfit = Math.max(0, totalRetailValue - subtotalInRupees);
    const profitMarginPercent = subtotalInRupees > 0 ? (estProfit / subtotalInRupees) * 100 : 0;

    const toggleDrawer = () => setDrawerOpen(!drawerOpen);

    const springTransition = { type: 'spring', stiffness: 320, damping: 32 };

    const renderCartContent = () => (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Balance bar */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 mb-3 shrink-0">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Your Wallet</p>
                    <p className="text-base font-bold text-white">₹{formatINR(merchantBalance)}</p>
                </div>
                {isInsufficient && itemCount > 0 && (
                    <span className="text-[10px] bg-red-500/20 border border-red-500/30 text-red-300 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                        Low Balance
                    </span>
                )}
            </div>

            {/* Items */}
            {itemCount === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 border border-dashed border-white/10 rounded-xl bg-white/[0.02] shrink-0">
                    <Tags className="text-white/20 mb-2.5" size={32} />
                    <p className="text-slate-400 text-xs font-medium text-center px-4">
                        Add items to see your order here.
                    </p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 no-scrollbar mb-3">
                    <AnimatePresence>
                        {cartItems.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="flex items-center justify-between group bg-white/5 hover:bg-white/10 p-2.5 rounded-xl border border-white/5 transition-colors"
                            >
                                <div className="flex-1 min-w-0 pr-2">
                                    <p className="font-semibold text-xs text-white truncate">
                                        {item.title || item.brand}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        ₹{formatINR(item.unit_price)} × {item.quantity || 1}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <p className="font-bold text-white text-xs">
                                        ₹{formatINR(item.unit_price * (item.quantity || 1))}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveItem?.(item.id)}
                                        aria-label={`Remove ${item.title || item.brand} from cart`}
                                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 hover:text-red-300 transition-all active:scale-90"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Summary */}
            {itemCount > 0 && (
                <div className="pt-3 border-t border-white/10 space-y-3 shrink-0">
                    {!showCommission && subtotalInRupees > 0 && (
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between text-slate-400 font-normal">
                                <span>Wholesale Cost</span>
                                <span className="text-slate-200">₹{formatINR(subtotalInRupees)}</span>
                            </div>
                            {sgstTotal > 0 && (
                                <div className="flex justify-between text-slate-400 font-normal">
                                    <span>SGST</span>
                                    <span className="text-slate-200">₹{formatINR(sgstTotal)}</span>
                                </div>
                            )}
                            {cgstTotal > 0 && (
                                <div className="flex justify-between text-slate-400 font-normal">
                                    <span>CGST</span>
                                    <span className="text-slate-200">₹{formatINR(cgstTotal)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-slate-400 font-normal">
                                <span>Est. Retail Value (MSRP)</span>
                                <span className="text-slate-200">₹{formatINR(totalRetailValue)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-400 font-semibold border-t border-white/10 pt-1 mt-0.5">
                                <span className="flex items-center gap-1.5">
                                    Est. Margin 
                                    <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                                        {profitMarginPercent.toFixed(1)}%
                                    </span>
                                </span>
                                <span>+₹{formatINR(estProfit)}</span>
                            </div>
                        </div>
                    )}
                    {showCommission && (
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between text-slate-400 font-normal">
                                <span>Base Price (excl. GST)</span>
                                <span>₹{formatINR(baseSubtotal)}</span>
                            </div>
                            {sgstTotal > 0 && (
                                <div className="flex justify-between text-slate-400 font-normal">
                                    <span>SGST</span>
                                    <span>₹{formatINR(sgstTotal)}</span>
                                </div>
                            )}
                            {cgstTotal > 0 && (
                                <div className="flex justify-between text-slate-400 font-normal">
                                    <span>CGST</span>
                                    <span>₹{formatINR(cgstTotal)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-slate-400 font-normal">
                                <span>Platform Fee ({(commissionRate * 100).toFixed(0)}%)</span>
                                <span className="text-amber-300">₹{formatINR(commission)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-300 font-bold border-t border-white/10 pt-1">
                                <span>Est. Net Credit</span>
                                <span>₹{formatINR(Math.max(0, subtotalInRupees - commission))}</span>
                            </div>
                        </div>
                    )}

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Total Payable</p>
                        <p className="text-2xl font-black text-white tracking-tight">
                            ₹{formatINR(total)}
                        </p>
                    </div>

                    {/* Low balance warning */}
                    {isInsufficient && (
                        <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <div className="flex items-start gap-1.5 text-amber-200 text-[11px] font-medium leading-tight">
                                <Info size={13} className="shrink-0 mt-0.5 text-amber-400" />
                                <p>Wallet insufficient. Top up your balance to complete checkout.</p>
                            </div>
                            <Link
                                href="/merchant/wallet"
                                className="w-full h-11 min-h-[44px] px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider text-center transition-all flex items-center justify-center gap-1.5"
                            >
                                <Wallet size={14} />
                                Add Money to Wallet
                            </Link>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onPurchaseWallet}
                            disabled={isPurchasing || isProcessingGateway || isInsufficient}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white h-11 min-h-[44px] rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:cursor-not-allowed"
                        >
                            {isPurchasing ? <Loader2 className="animate-spin" size={16} /> : <Wallet size={16} />}
                            {isPurchasing ? 'Processing...' : walletLabel}
                        </button>

                        {!disableGateway && (
                            <button
                                type="button"
                                onClick={onPurchaseGateway}
                                disabled={isPurchasing || isProcessingGateway}
                                className="w-full bg-white/10 hover:bg-white/15 disabled:bg-white/5 disabled:text-white/30 text-white h-11 min-h-[44px] rounded-xl font-medium text-xs border border-white/10 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:cursor-not-allowed"
                            >
                                {isProcessingGateway ? <Loader2 className="animate-spin" size={16} /> : <CreditCard size={16} />}
                                {isProcessingGateway ? 'Redirecting...' : gatewayLabel}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* ===== FLOATING ACTION BUTTON (FAB) =====
                Wholesale usage: hideFabBelowMd = true (phone uses WholesaleStickyCartBar, md+ uses FAB pill).
                Other consumers: shown at all sizes or controlled. */}
            <div className={hideFabBelowMd ? 'hidden md:block' : undefined}>
                <button
                    type="button"
                    id="merchant-floating-cart-btn"
                    onClick={toggleDrawer}
                    aria-label="Open Order Slip"
                    className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-[50] bg-slate-900 text-white rounded-xl shadow-xl border border-slate-800 flex items-center gap-3 px-4 py-2.5 h-11 min-h-[44px] active:scale-95 transition-all cursor-pointer"
                >
                    <div className="relative">
                        <ShoppingCart size={18} className="text-white" />
                        {itemCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                                {itemCount}
                            </span>
                        )}
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? 's' : ''}` : 'Cart'}
                        </p>
                        {itemCount > 0 && (
                            <p className="text-xs font-bold text-white leading-none">
                                ₹{formatINR(total)}
                            </p>
                        )}
                    </div>
                    <ChevronUp size={16} className={`text-slate-400 transition-transform duration-200 ${drawerOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* ===== PORTALED ORDER SLIP DRAWER (DESKTOP ASIDE + MOBILE BOTTOM SHEET) ===== */}
            {mounted && typeof document !== 'undefined' ? createPortal(
                <AnimatePresence>
                    {drawerOpen && (
                        <div
                            className="fixed inset-0 z-[700] flex justify-end items-end md:items-stretch"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Order Slip"
                        >
                            {/* Shared Backdrop */}
                            <motion.div
                                key="cart-backdrop"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => setDrawerOpen(false)}
                                className="fixed inset-0 bg-black/50 backdrop-blur-xs cursor-pointer"
                            />

                            {/* Desktop Overlay Side-Drawer (md+) */}
                            <motion.aside
                                key="desktop-drawer"
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={springTransition}
                                className="relative z-10 hidden md:flex flex-col h-full w-[400px] max-w-[92vw] bg-slate-900 border-l border-slate-800 shadow-2xl overflow-hidden"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                                    <div>
                                        <h2 className="text-base font-bold text-white tracking-tight">Order Slip</h2>
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDrawerOpen(false)}
                                        aria-label="Close cart"
                                        className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer"
                                    >
                                        <X size={17} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto p-5 min-h-0">
                                    {renderCartContent()}
                                </div>
                            </motion.aside>

                            {/* Mobile Bottom Sheet (< md) */}
                            <motion.div
                                key="mobile-sheet"
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={springTransition}
                                className="relative z-10 md:hidden w-full max-h-[85vh] bg-slate-900 rounded-t-2xl flex flex-col overflow-hidden border-t border-slate-800 pb-[env(safe-area-inset-bottom,0px)] shadow-2xl"
                            >
                                {/* Drag handle */}
                                <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 shrink-0" />

                                {/* Header */}
                                <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10 shrink-0">
                                    <div>
                                        <h2 className="text-base font-bold text-white">Order Slip</h2>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDrawerOpen(false)}
                                        aria-label="Close cart"
                                        className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer"
                                    >
                                        <X size={17} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                                    {renderCartContent()}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            ) : null}
        </>
    );
}
