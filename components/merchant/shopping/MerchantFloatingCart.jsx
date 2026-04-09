'use client';

import { useState } from 'react';
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
    const total = subtotalInRupees + commission;
    const isInsufficient = total > merchantBalance;
    const itemCount = cartItems.length;

    // GST breakdown (weighted avg across items)
    const gstTotal = cartItems.reduce((sum, item) => {
        const itemTotal = (item.buying_price_rupees || item.price_rupees || 0) * (item.quantity || 1);
        const gstRate = (item.gst_percentage || 0) / 100;
        return sum + itemTotal * gstRate;
    }, 0);
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

    const CartContent = () => (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Balance bar */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 mb-4 shrink-0">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-300/70 mb-0.5">Your Wallet</p>
                    <p className="text-lg font-black text-white">₹{merchantBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                {isInsufficient && itemCount > 0 && (
                    <span className="text-[10px] bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                        Low Balance
                    </span>
                )}
            </div>

            {/* Items */}
            {itemCount === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 border border-dashed border-white/10 rounded-[2rem] bg-white/5 shrink-0">
                    <Tags className="text-white/20 mb-4" size={40} />
                    <p className="text-white/40 text-sm font-bold text-center px-6">
                        Add items to see your order here.
                    </p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 custom-scrollbar mb-4">
                    <AnimatePresence>
                        {cartItems.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="flex items-center justify-between group bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/5 transition-colors"
                            >
                                <div className="flex-1 min-w-0 pr-3">
                                    <p className="font-bold text-sm text-white truncate mb-0.5">
                                        {item.title || item.brand}
                                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">
                                        ₹{(item.unit_price).toLocaleString()} × {item.quantity || 1}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <p className="font-black text-white text-sm">
                                        ₹{(item.unit_price * (item.quantity || 1)).toLocaleString()}
                                    </p>
                                    <button
                                        onClick={() => onRemoveItem(item.id)}
                                        className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 hover:text-red-300 transition-all opacity-100 group-hover:opacity-100 active:scale-90"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Summary */}
            {itemCount > 0 && (
                <div className="pt-4 border-t border-white/10 space-y-4 shrink-0 pb-2">
                    {!showCommission && subtotalInRupees > 0 && (
                        <div className="space-y-1.5 text-xs px-1">
                            <div className="flex justify-between text-blue-300/70 font-medium">
                                <span>Wholesale Cost</span>
                                <span>₹{subtotalInRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-blue-300/70 font-medium">
                                <span>Est. Retail Value (MSRP)</span>
                                <span>₹{totalRetailValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-emerald-400 font-bold border-t border-white/10 pt-1.5 mt-1">
                                <span className="flex items-center gap-1.5">Est. Margin <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] uppercase tracking-widest">{profitMarginPercent.toFixed(1)}%</span></span>
                                <span>+₹{estProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    )}
                    {showCommission && (
                        <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between text-blue-300/70 font-medium">
                                <span>Base Price (excl. GST)</span>
                                <span>₹{baseSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {gstTotal > 0 && (
                                <div className="flex justify-between text-teal-300/80 font-medium">
                                    <span>GST (avg {((gstTotal / subtotalInRupees) * 100).toFixed(1)}%)</span>
                                    <span>₹{gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-blue-300/70 font-medium">
                                <span>Platform Fee ({(commissionRate * 100).toFixed(0)}%)</span>
                                <span className="text-amber-300/80">₹{commission.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-300/90 font-black border-t border-white/10 pt-1.5">
                                <span>Est. Net Credit</span>
                                <span>₹{Math.max(0, subtotalInRupees - commission).toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[10px] font-black text-blue-300/70 uppercase tracking-widest mb-1">Total Payable</p>
                        <p className="text-3xl font-black text-white tracking-tight">
                            ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                    </div>

                    {/* Low balance warning */}
                    {isInsufficient && (
                        <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[10px] font-bold leading-tight">
                            <Info size={14} className="shrink-0 mt-0.5" />
                            <p>Wallet insufficient. Use UPI/Cards to complete purchase.</p>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex flex-col gap-2">
                        <motion.button
                            onClick={onPurchaseWallet}
                            disabled={isPurchasing || isProcessingGateway || isInsufficient}
                            whileTap={{ scale: 0.97 }}
                            className="w-full bg-white hover:bg-blue-50 disabled:bg-white/10 disabled:text-white/30 text-[#1e3a5f] py-4 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            {isPurchasing ? <Loader2 className="animate-spin" size={18} /> : <Wallet size={18} />}
                            {isPurchasing ? 'Processing...' : walletLabel}
                        </motion.button>

                        {!disableGateway && (
                            <motion.button
                                onClick={onPurchaseGateway}
                                disabled={isPurchasing || isProcessingGateway}
                                whileTap={{ scale: 0.97 }}
                                className="w-full bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/20 disabled:text-white/30 text-white py-4 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                {isProcessingGateway ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
                                {isProcessingGateway ? 'Redirecting...' : gatewayLabel}
                            </motion.button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* ===== DESKTOP STICKY SIDEBAR ===== */}
            <div className="hidden xl:block xl:col-span-1">
                <div className="sticky top-24 bg-[#1e3a5f] rounded-[2.5rem] p-7 text-white shadow-2xl shadow-blue-900/20 border border-blue-800 overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
                    {/* Glows */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />

                    <div className="relative z-10 flex flex-col flex-1 min-h-0">
                        <div className="flex items-end justify-between mb-6 flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight mb-0.5">Order Slip</h2>
                                <p className="text-blue-300/70 text-[10px] font-bold uppercase tracking-widest">
                                    {itemCount} Item{itemCount !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <div className="w-11 h-11 rounded-2xl bg-blue-500/20 flex items-center justify-center relative">
                                <ShoppingCart size={20} className="text-blue-300" />
                                {itemCount > 0 && (
                                    <motion.div
                                        key={itemCount}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#D4AF37] rounded-full text-black text-[10px] font-black flex items-center justify-center"
                                    >
                                        {itemCount}
                                    </motion.div>
                                )}
                            </div>
                        </div>
                        <CartContent />
                    </div>
                </div>
            </div>

            {/* ===== MOBILE: FLOATING BUTTON + BOTTOM DRAWER ===== */}
            <div className="xl:hidden">
                {/* FAB */}
                <motion.button
                    onClick={toggleDrawer}
                    className="fixed right-4 bottom-28 z-[500] bg-[#1e3a5f] text-white rounded-2xl shadow-2xl shadow-blue-900/40 border border-blue-700 flex items-center gap-3 px-5 py-4"
                    whileTap={{ scale: 0.95 }}
                    animate={itemCount > 0 ? { scale: [1, 1.05, 1] } : {}}
                    transition={itemCount > 0 ? { duration: 0.4 } : {}}
                >
                    <div className="relative">
                        <ShoppingCart size={22} className="text-white" />
                        <AnimatePresence>
                            {itemCount > 0 && (
                                <motion.div
                                    key={itemCount}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-[#D4AF37] rounded-full text-black text-[10px] font-black flex items-center justify-center"
                                >
                                    {itemCount}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">
                            {itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? 's' : ''}` : 'Cart'}
                        </p>
                        {itemCount > 0 && (
                            <p className="text-sm font-black text-white">
                                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                        )}
                    </div>
                    <motion.div animate={{ rotate: drawerOpen ? 180 : 0 }}>
                        <ChevronUp size={18} className="text-blue-300" />
                    </motion.div>
                </motion.button>

                {/* Bottom Drawer */}
                <AnimatePresence>
                    {drawerOpen && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600]"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setDrawerOpen(false)}
                            />

                            {/* Drawer Panel */}
                            <motion.div
                                className="fixed left-0 right-0 bottom-0 z-[700] bg-[#1e3a5f] rounded-t-[2.5rem] p-6 shadow-2xl border-t border-blue-700 flex flex-col overflow-hidden"
                                style={{ maxHeight: '88vh' }}
                                variants={drawerVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            >
                                {/* Handle + Header */}
                                <div className="flex items-center justify-between mb-5 flex-shrink-0">
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight">Order Slip</h2>
                                        <p className="text-blue-300/70 text-[10px] font-bold uppercase tracking-widest">
                                            {itemCount} Item{itemCount !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setDrawerOpen(false)}
                                        className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none" />

                                <div className="relative z-10 flex flex-col flex-1 min-h-0 overflow-hidden">
                                    <CartContent />
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
