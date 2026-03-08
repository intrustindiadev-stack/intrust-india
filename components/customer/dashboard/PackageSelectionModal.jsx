import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Wallet, Star, Smartphone, CheckCircle, X, ChevronRight, CreditCard, Sparkles, AlertCircle } from 'lucide-react';

export default function PackageSelectionModal({ showPackages, setShowPackages, handleBuyPackage, userData }) {
    const [selectedPackage, setSelectedPackage] = useState(null);

    // Hardcode packages within component for easy access
    const packages = [
        { id: 'GOLD_1M', label: '1 MONTH ELITE', price: 299, cashback: 199, popular: false },
        { id: 'GOLD_3M', label: '3 MONTHS ELITE', price: 799, cashback: 499, popular: true },
        { id: 'GOLD_1Y', label: '1 YEAR ELITE', price: 2499, cashback: 1499, popular: false },
    ];

    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (showPackages) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            setSelectedPackage(null); // reset state when closed externally
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showPackages]);

    const resetAndClose = () => {
        setSelectedPackage(null);
        setShowPackages(false);
    };

    const handleConfirmPayment = (method) => {
        if (!selectedPackage) return;
        handleBuyPackage(selectedPackage);
        resetAndClose();
    };

    if (!showPackages) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center bg-black/60 backdrop-blur-sm sm:p-4"
            >
                <div className="absolute inset-0" onClick={resetAndClose}></div>

                <motion.div
                    initial={{ y: '100%', scale: 0.95 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: '100%', scale: 0.95 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="w-full max-w-3xl bg-[#0a0a0a] rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/10 overflow-hidden relative shadow-2xl flex flex-col md:flex-row max-h-[85vh] z-10"
                >
                    {/* Subtle Top Glow */}
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>

                    {/* Left Panel: Luxury Benefits (Hidden on small screens) */}
                    <div className="hidden md:flex flex-col w-72 bg-white/[0.02] border-r border-white/5 p-6 relative">
                        <div className="mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/20 mb-4 relative group">
                                <Shield className="text-[#111] fill-[#111]" size={20} />
                                <div className="absolute inset-0 bg-amber-400 blur-md opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
                            </div>
                            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 to-amber-400 tracking-tight leading-none mb-1">InTrust GOLD</h3>
                            <p className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest">Premium Access</p>
                        </div>

                        <div className="space-y-4 flex-1 mt-2">
                            {[
                                { title: 'Verified Badge', desc: 'Secure the Blue Tick', icon: CheckCircle },
                                { title: 'Instant Cashback', desc: 'Recoup your costs', icon: Wallet },
                                { title: 'VIP Access', desc: 'Exclusive merchant deals', icon: Star },
                                { title: 'Priority Support', desc: '24/7 dedicated agents', icon: Smartphone }
                            ].map((benefit, i) => (
                                <div key={i} className="flex gap-3 items-start">
                                    <div className="mt-0.5 w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">
                                        <benefit.icon size={12} className="text-amber-400" />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold text-gray-200 uppercase tracking-wide mb-0.5">{benefit.title}</div>
                                        <div className="text-[10px] text-gray-400 leading-tight">{benefit.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel: Packages & Payment flow */}
                    <div className="flex-1 flex flex-col relative bg-[#0f0f0f]">
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0f0f0f]/90 backdrop-blur-md z-20">
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                                    {selectedPackage ? 'Payment Details' : 'Select Plan'}
                                </h2>
                                <p className="text-amber-500/80 text-[10px] font-medium uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                    Secure Checkout <Shield size={10} className="fill-amber-500/20" />
                                </p>
                            </div>
                            <button
                                onClick={selectedPackage ? () => setSelectedPackage(null) : resetAndClose}
                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content Area - Scrollable */}
                        <div className="flex-1 overflow-y-auto no-scrollbar p-5">

                            {/* Mobile Mini-Benefits */}
                            {!selectedPackage && (
                                <div className="flex md:hidden items-center gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
                                    {['Verified Tick', 'Cashback', 'VIP Support'].map((b, i) => (
                                        <div key={i} className="flex items-center gap-1 whitespace-nowrap bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                                            <Sparkles size={10} className="text-amber-400" />
                                            <span className="text-[10px] font-semibold text-amber-200 uppercase tracking-wide">{b}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <AnimatePresence mode="wait">
                                {!selectedPackage ? (
                                    <motion.div
                                        key="packages"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="grid gap-3"
                                    >
                                        {packages.map((pkg) => (
                                            <button
                                                key={pkg.id}
                                                onClick={() => setSelectedPackage(pkg)}
                                                className={`relative p-4 rounded-2xl border transition-all text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${pkg.popular
                                                    ? 'bg-amber-500/5 border-amber-500/40 hover:bg-amber-500/10'
                                                    : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                                                    }`}
                                            >
                                                {pkg.popular && (
                                                    <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-amber-400 to-amber-600 px-2 py-0.5 rounded shadow-sm">
                                                        <span className="text-[8px] font-bold text-black uppercase tracking-wider block">Best Value</span>
                                                    </div>
                                                )}

                                                <div>
                                                    <span className={`text-[10px] font-bold tracking-widest uppercase block mb-1 ${pkg.popular ? 'text-amber-500' : 'text-gray-400'}`}>
                                                        {pkg.label}
                                                    </span>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-2xl font-black text-white leading-none">₹{pkg.price}</span>
                                                        <span className="text-xs font-medium text-gray-500 line-through">₹{Math.round(pkg.price * 1.5)}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto">
                                                    <div className="text-left sm:text-right">
                                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1 mb-1 inline-block">
                                                            <div className="text-[11px] font-bold text-emerald-400 leading-none">Get ₹{pkg.cashback} Back</div>
                                                        </div>
                                                        <p className="text-[10px] text-gray-400 font-medium">Net Cost: <span className="text-white font-bold">₹{pkg.price - pkg.cashback}</span></p>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                                        <ChevronRight size={16} className="text-gray-400" />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="payment"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-4"
                                    >
                                        {/* Order Summary Compact */}
                                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-medium text-gray-400">{selectedPackage.label}</span>
                                                <span className="text-sm font-bold text-white">₹{selectedPackage.price}</span>
                                            </div>
                                            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Total</span>
                                                <span className="text-lg font-black text-amber-400 leading-none">₹{selectedPackage.price}</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Sparkles size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-gray-400 leading-relaxed">
                                                    You will receive <span className="text-emerald-400 font-bold">₹{selectedPackage.cashback}</span> instantly in your wallet upon payment.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Payment Methods */}
                                        <div className="space-y-2 mt-4">
                                            <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-2">Select Method</h4>

                                            {/* Wallet Option */}
                                            <button
                                                disabled={userData.walletBalance < selectedPackage.price}
                                                onClick={() => handleConfirmPayment('wallet')}
                                                className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left relative ${userData.walletBalance >= selectedPackage.price
                                                    ? 'bg-blue-500/5 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50'
                                                    : 'bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${userData.walletBalance >= selectedPackage.price ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-500'}`}>
                                                        <Wallet size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-white leading-tight">InTrust Wallet</div>
                                                        <div className="text-[10px] text-gray-400 mt-0.5">
                                                            Balance: ₹{userData.walletBalance.toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {userData.walletBalance < selectedPackage.price ? (
                                                    <div className="text-right">
                                                        <span className="text-[9px] font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded md flex items-center gap-1 uppercase tracking-wider">
                                                            <AlertCircle size={10} /> Add ₹{(selectedPackage.price - userData.walletBalance).toFixed(0)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="px-3 py-1.5 bg-blue-500 rounded-lg text-[9px] font-bold uppercase tracking-wider text-white">
                                                        Pay Now
                                                    </div>
                                                )}
                                            </button>

                                            {/* Gateway Option */}
                                            <button
                                                onClick={() => handleConfirmPayment('gateway')}
                                                className="w-full p-4 rounded-2xl border bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all flex items-center justify-between gap-3 text-left"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                                                        <CreditCard size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-white leading-tight">Pay Online</div>
                                                        <div className="text-[10px] text-gray-400 mt-0.5">UPI, Cards, Netbanking</div>
                                                    </div>
                                                </div>
                                                <div className="px-3 py-1.5 bg-amber-500 rounded-lg text-[9px] font-bold uppercase tracking-wider text-black">
                                                    Proceed
                                                </div>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
