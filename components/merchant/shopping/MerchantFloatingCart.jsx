'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart, X, Trash2, Loader2, Wallet, CreditCard,
    Tags, ChevronUp, ChevronDown, Info, Package, ArrowRight
} from 'lucide-react';

export default function MerchantFloatingCart({
    cartItems = [],
    merchantBalance = 0,
    subtotalInRupees = 0,
    onRemoveItem,
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
}) {
    const [drawerOpen, setDrawerOpen] = useState(false);
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
    const grossProfit = showCommission
        ? Math.max(0, (subtotalInRupees - commission) * 0.08)  // estimate
        : 0;

    // Wholesale Breakdown
    const totalRetailValue = cartItems.reduce((sum, item) => sum + ((item.retail_price || item.unit_price || 0) * (item.quantity || 1)), 0);
    const estProfit = Math.max(0, totalRetailValue - subtotalInRupees);
    const profitMarginPercent = subtotalInRupees > 0 ? (estProfit / subtotalInRupees) * 100 : 0;

    const toggleDrawer = () => setDrawerOpen(prev => !prev);

    const drawerVariants = {
        hidden: { y: '100%', opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
        exit: { y: '100%', opacity: 0, transition: { duration: 0.25 } },
    };

    const renderCartContent = () => (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Balance bar */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 mb-3 shrink-0">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Your Wallet</p>
                    <p className="text-base font-bold text-white">₹{merchantBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
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
                                        ₹{(item.unit_price).toLocaleString()} × {item.quantity || 1}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <p className="font-bold text-white text-xs">
                                        ₹{(item.unit_price * (item.quantity || 1)).toLocaleString()}
                                    </p>
                                    <button
                                        onClick={() => onRemoveItem(item.id)}
                                        aria-label={`Remove ${item.title || item.brand} from cart`}
                                        className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 hover:text-red-300 transition-all active:scale-90"
                                    >
                                        <Trash2 size={12} />
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
                                <span className="text-slate-200">₹{subtotalInRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {sgstTotal > 0 && (
                                <div className="flex justify-between text-slate-400 font-normal">
                                    <span>SGST</span>
                                    <span className="text-slate-200">₹{sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            {cgstTotal > 0 && (
                                <div className="flex justify-between text-slate-400 font-normal">
                                    <span>CGST</span>
                                    <span className="text-slate-200">₹{cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-slate-400 font-normal">
                                <span>Est. Retail Value (MSRP)</span>
                                <span className="text-slate-200">₹{totalRetailValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-emerald-400 font-semibold border-t border-white/10 pt-1 mt-0.5">
                                <span className="flex items-center gap-1.5">
                                    Est. Margin 
                                    <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                                        {profitMarginPercent.toFixed(1)}%
                                    </span>
                                </span>
                                <span>+₹{estProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    )}
                    {showCommission && (
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between text-slate-400 font-normal">
                                <span>Base Price (excl. GST)</span>
                                <span>₹{baseSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {sgstTotal > 0 && (
                                <div className="flex justify-between text-slate-400 font-normal">
                                    <span>SGST</span>
                                    <span>₹{sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            {cgstTotal > 0 && (
                                <div className="flex justify-between text-slate-400 font-normal">
                                    <span>CGST</span>
                                    <span>₹{cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-slate-400 font-normal">
                                <span>Platform Fee ({(commissionRate * 100).toFixed(0)}%)</span>
                                <span className="text-amber-300">₹{commission.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-300 font-bold border-t border-white/10 pt-1">
                                <span>Est. Net Credit</span>
                                <span>₹{Math.max(0, subtotalInRupees - commission).toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Total Payable</p>
                        <p className="text-2xl font-black text-white tracking-tight">
                            ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                                className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center transition-all flex items-center justify-center gap-1.5"
                            >
                                <Wallet size={12} />
                                Add Money to Wallet
                            </Link>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 pt-1">
                        <button
                            onClick={onPurchaseWallet}
                            disabled={isPurchasing || isProcessingGateway || isInsufficient}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:cursor-not-allowed"
                        >
                            {isPurchasing ? <Loader2 className="animate-spin" size={16} /> : <Wallet size={16} />}
                            {isPurchasing ? 'Processing...' : walletLabel}
                        </button>

                        {!disableGateway && (
                            <button
                                onClick={onPurchaseGateway}
                                disabled={isPurchasing || isProcessingGateway}
                                className="w-full bg-white/10 hover:bg-white/15 disabled:bg-white/5 disabled:text-white/30 text-white py-2.5 rounded-xl font-medium text-xs border border-white/10 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:cursor-not-allowed"
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
            {/* ===== DESKTOP STICKY SIDEBAR ===== */}
            <div className="hidden xl:block">
                <div className="sticky top-24 bg-slate-900 rounded-2xl p-5 text-white shadow-xl border border-slate-800 overflow-hidden flex flex-col max-h-[calc(100vh-7rem)]">
                    <div className="relative z-10 flex flex-col flex-1 min-h-0">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10 flex-shrink-0">
                            <div>
                                <h2 className="text-base font-bold text-white tracking-tight">Order Slip</h2>
                                <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">
                                    {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                                </p>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center relative text-slate-300">
                                <ShoppingCart size={17} />
                                {itemCount > 0 && (
                                     <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                                         {itemCount}
                                     </span>
                                )}
                            </div>
                        </div>
                        {renderCartContent()}
                    </div>
                </div>
            </div>

            {/* ===== MOBILE: FAB + FULL-SCREEN / SHEET CART ===== */}
            <div className="xl:hidden">
                {/* FAB — bottom floating action pill */}
                <button
                    id="merchant-floating-cart-btn"
                    onClick={toggleDrawer}
                    className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-[50] bg-slate-900 text-white rounded-xl shadow-xl border border-slate-800 flex items-center gap-3 px-4 py-2.5 active:scale-95 transition-all"
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
                                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                        )}
                    </div>
                    <ChevronUp size={16} className={`text-slate-400 transition-transform duration-200 ${drawerOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Mobile Drawer */}
                <AnimatePresence>
                    {drawerOpen && (
                        <div className="fixed inset-0 z-[700] flex flex-col justify-end bg-black/60 backdrop-blur-xs">
                            <motion.div
                                className="w-full max-h-[85vh] bg-slate-900 rounded-t-2xl flex flex-col overflow-hidden border-t border-slate-800 pb-safe shadow-2xl"
                                initial={{ y: '100%' }}
                                animate={{ y: 0, transition: { type: 'spring', stiffness: 320, damping: 32 } }}
                                exit={{ y: '100%', transition: { duration: 0.2 } }}
                            >
                                {/* Drawer Header */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                                    <div>
                                        <h2 className="text-base font-bold text-white">Order Slip</h2>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setDrawerOpen(false)}
                                        aria-label="Close cart"
                                        className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                                    >
                                        <X size={17} />
                                    </button>
                                </div>

                                {/* Drawer Content */}
                                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                                    {renderCartContent()}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

        </>
    );
}
