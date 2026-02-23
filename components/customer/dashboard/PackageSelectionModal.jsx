import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Wallet, Star, Smartphone, CheckCircle, X } from 'lucide-react';

export default function PackageSelectionModal({ showPackages, setShowPackages, handleBuyPackage, userData }) {
    if (!showPackages) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-gray-950/40 backdrop-blur-md p-0 sm:p-4"
            >
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className="bg-gray-900 w-full max-w-3xl rounded-t-[40px] sm:rounded-[40px] border-t sm:border border-white/10 overflow-hidden relative shadow-[0_-20px_80px_rgba(0,0,0,0.5)]"
                >
                    {/* Accent Glows */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

                    <div className="relative flex flex-col md:flex-row h-full max-h-[90vh] overflow-y-auto sm:overflow-hidden">

                        {/* Benefits Section (Left on Desktop) */}
                        <div className="hidden md:flex flex-col w-72 bg-white/5 border-r border-white/5 p-8">
                            <div className="mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/40 mb-4">
                                    <Shield className="text-white" size={24} />
                                </div>
                                <h3 className="text-lg font-black text-white italic tracking-tight">ELITE BENEFITS</h3>
                                <p className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest">Membership Perks</p>
                            </div>

                            <div className="space-y-6">
                                {[
                                    { title: 'Identity Verification', desc: 'Premium blue tick profile badge', icon: CheckCircle },
                                    { title: 'Instant Cashback', desc: 'Up to ₹1499 back in wallet', icon: Wallet },
                                    { title: 'Priority Access', desc: 'Exclusive merchant offers first', icon: Star },
                                    { title: '24/7 Support', desc: 'Dedicated priority support line', icon: Smartphone }
                                ].map((benefit, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="mt-1 flex-shrink-0">
                                            <benefit.icon size={16} className="text-amber-500" />
                                        </div>
                                        <div>
                                            <div className="text-[13px] font-bold text-white leading-tight mb-0.5">{benefit.title}</div>
                                            <div className="text-[11px] text-white/40 font-medium leading-tight">{benefit.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-auto pt-8 border-t border-white/5">
                                <p className="text-[10px] text-white/20 font-medium leading-relaxed italic">
                                    Join thousands of elite users enjoying high-value savings every day.
                                </p>
                            </div>
                        </div>

                        {/* Selection Section (Right) */}
                        <div className="flex-1 p-6 sm:p-10">
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <h2 className="text-3xl font-black text-white italic tracking-tighter leading-none mb-2">CHOOSE YOUR PLAN</h2>
                                    <p className="text-amber-500/80 text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                                        Secure Payment via SABPAISA <Shield size={12} strokeWidth={3} />
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowPackages(false)}
                                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all hover:bg-white/10"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Mobile Benefits (Brief) */}
                            <div className="flex md:hidden items-center gap-4 mb-8 p-4 bg-white/5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                                {['Verified Identity', 'Instant Cashback', 'Priority Support'].map((b, i) => (
                                    <div key={i} className="flex items-center gap-2 whitespace-nowrap">
                                        <CheckCircle size={12} className="text-amber-500" />
                                        <span className="text-[10px] font-bold text-white/60 uppercase">{b}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="grid gap-5">
                                {[
                                    { id: 'GOLD_1M', label: '1 MONTH ELITE', price: 299, cashback: 199, popular: false, color: 'from-blue-500/20 to-indigo-500/5' },
                                    { id: 'GOLD_3M', label: '3 MONTHS ELITE', price: 799, cashback: 499, popular: true, color: 'from-amber-500/20 to-orange-500/5' },
                                    { id: 'GOLD_1Y', label: '1 YEAR ELITE', price: 2499, cashback: 1499, popular: false, color: 'from-purple-500/20 to-pink-500/5' },
                                ].map((pkg) => (
                                    <button
                                        key={pkg.id}
                                        onClick={() => handleBuyPackage(pkg)}
                                        className={`group relative p-6 rounded-[2rem] border transition-all duration-500 text-left ${pkg.popular
                                            ? 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/50 shadow-[0_20px_50px_rgba(245,158,11,0.1)] ring-1 ring-amber-500/20'
                                            : 'bg-white/5 border-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        {pkg.popular && (
                                            <div className="absolute top-0 right-8 px-4 py-1.5 bg-amber-500 text-[10px] font-black text-black rounded-b-xl tracking-tighter uppercase shadow-lg shadow-amber-900/40">
                                                Most Popular CHOICE
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between relative z-10">
                                            <div>
                                                <span className={`text-[10px] font-black tracking-[0.2em] mb-2 block uppercase ${pkg.popular ? 'text-amber-500' : 'text-white/40'}`}>
                                                    {pkg.label}
                                                </span>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-3xl font-black text-white italic tracking-tighter">₹{pkg.price}</span>
                                                    <span className="text-sm font-bold text-white/20 line-through">₹{Math.round(pkg.price * 1.5)}</span>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 inline-block group-hover:scale-110 transition-transform duration-500">
                                                    <div className="text-[10px] font-bold text-emerald-500 tracking-tighter uppercase mb-0.5">Instant Return</div>
                                                    <div className="text-base font-black text-emerald-400 leading-none italic">+ ₹{pkg.cashback}</div>
                                                </div>
                                                <p className="mt-2 text-[11px] text-white/30 font-bold tracking-tight">Net Cost: ₹{pkg.price - pkg.cashback}</p>
                                            </div>
                                        </div>

                                        {/* Hover Glow */}
                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>

                            {/* Wallet Balance Integration Intro */}
                            <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <Wallet size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Your Balance</div>
                                        <div className="text-lg font-black text-white italic">₹{userData.walletBalance.toFixed(2)}</div>
                                    </div>
                                </div>
                                {userData.walletBalance >= 299 ? (
                                    <div className="text-[10px] font-bold text-emerald-500/80 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                                        AVAILABLE FOR WALLET PAY
                                    </div>
                                ) : (
                                    <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest italic">
                                        Top up to pay via wallet
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
