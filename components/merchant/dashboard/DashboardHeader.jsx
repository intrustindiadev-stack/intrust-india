'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LiveButton from '@/components/merchant/LiveButton';
import StoreStatusToggle from '@/components/merchant/StoreStatusToggle';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

export default function DashboardHeader({ merchant, profile, walletBalancePaise }) {
    const router = useRouter();
    const [showBalance, setShowBalance] = useState(false);
    const [animatedRevenue, setAnimatedRevenue] = useState(0);

    // Subscription expiry countdown
    const expiryDate = merchant?.subscription_expires_at ? new Date(merchant.subscription_expires_at) : null;
    const daysLeft = expiryDate ? Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
    const showExpiryBanner = daysLeft !== null && daysLeft <= 30;
    const expiryColor = daysLeft <= 0 ? 'expired' : daysLeft <= 7 ? 'urgent' : 'warning';

    useEffect(() => {
        if (showBalance) {
            let startTimestamp = null;
            const duration = 800; // ms
            const target = walletBalancePaise / 100;

            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                // easeOutQuart
                const easeProgress = 1 - Math.pow(1 - progress, 4);
                
                setAnimatedRevenue(target * easeProgress);

                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    setAnimatedRevenue(target);
                }
            };
            window.requestAnimationFrame(step);
        } else {
            setAnimatedRevenue(0);
        }
    }, [showBalance, walletBalancePaise]);

    // Determine greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning,' : hour < 18 ? 'Good Afternoon,' : 'Good Evening,';

    return (
        <div className="bg-[#D4AF37] text-slate-900 rounded-b-[2rem] pt-8 pb-24 px-6 sm:px-8 relative shadow-lg overflow-hidden">
            {/* Creative Background Elements for Gold Header */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/20 rounded-full blur-[40px]"></div>
                <div className="absolute top-20 -left-10 w-32 h-32 bg-[#B8860B]/30 rounded-full blur-[30px]"></div>
                <div className="absolute bottom-0 right-10 w-64 h-32 bg-gradient-to-t from-white/10 to-transparent skew-y-12 transform origin-bottom-right"></div>
            </div>

            {/* Top Bar: Profile & Notifications */}
            <div className="relative z-10 flex items-center justify-between gap-3 mb-6 sm:mb-8 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Link href="/merchant/profile" className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/40 shadow-sm backdrop-blur-sm overflow-hidden hover:scale-105 hover:brightness-110 transition-all cursor-pointer">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <span className="material-icons-round text-slate-900 text-2xl">storefront</span>
                        )}
                    </Link>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-slate-800/80 font-bold leading-tight">{greeting}</p>
                        <h2 className="text-lg sm:text-xl font-bold font-display text-slate-900 truncate">
                            {merchant.business_name || 'Merchant'}
                        </h2>
                        {/* Merchant Plan Expiry Chip */}
                        {daysLeft !== null && (
                            <motion.button
                                onClick={() => router.push('/merchant/subscription')}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileTap={{ scale: 0.96 }}
                                className={`mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all backdrop-blur-sm ${
                                    expiryColor === 'expired'
                                        ? 'bg-red-600/20 text-red-700 border border-red-600/30'
                                        : expiryColor === 'urgent'
                                        ? 'bg-red-500/15 text-red-800 border border-red-500/30 animate-pulse'
                                        : daysLeft <= 30
                                        ? 'bg-amber-900/15 text-amber-950 border border-amber-900/20'
                                        : 'bg-slate-900/10 text-slate-900 border border-slate-900/15 hover:bg-slate-900/20'
                                }`}
                            >
                                {expiryColor === 'urgent' || expiryColor === 'expired' ? (
                                    <AlertTriangle size={11} />
                                ) : (
                                    <Clock size={11} />
                                )}
                                {daysLeft <= 0
                                    ? 'Plan Expired — Renew'
                                    : `Plan Ends in ${daysLeft} ${daysLeft === 1 ? 'Day' : 'Days'}`}
                            </motion.button>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <div className="bg-white/20 rounded-full px-1 py-1 backdrop-blur-sm">
                        <LiveButton />
                    </div>
                </div>
            </div>

            {/* Total Balance / Revenue */}
            <div className="relative z-10 mb-8">
                <div 
                    className="flex items-center gap-2 text-slate-800/80 mb-1 cursor-pointer hover:text-slate-900 transition-colors inline-flex"
                    onClick={() => setShowBalance(!showBalance)}
                >
                    <p className="text-sm font-bold">My Portfolio</p>
                    <span className="material-icons-round text-[16px]">
                        {showBalance ? 'visibility' : 'visibility_off'}
                    </span>
                </div>
                <div className="flex items-end justify-between">
                    <h1 className="text-4xl sm:text-5xl font-black font-display tracking-tight text-slate-900 drop-shadow-sm">
                        <span className="text-2xl mr-1 text-slate-800/80">₹</span>
                        {showBalance 
                            ? animatedRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '••••••'
                        }
                    </h1>
                    <div className="bg-white/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/40 flex items-center gap-1 shadow-sm">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-900">INR</span>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="relative z-10 flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                <Link href="/merchant/shopping/wholesale" className="flex-1 min-w-[130px] bg-slate-900 hover:bg-slate-800 text-[#D4AF37] font-bold py-3 px-3.5 sm:px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                    <span className="material-icons-round text-lg">add</span>
                    <span className="text-xs sm:text-sm">Add Stock</span>
                </Link>
                <Link href="/merchant/wallet" className="flex-1 min-w-[130px] bg-white hover:bg-slate-50 text-slate-900 font-bold py-3 px-3.5 sm:px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 border border-white/50">
                    <span className="material-icons-round text-lg">call_made</span>
                    <span className="text-xs sm:text-sm">Withdraw</span>
                </Link>
                <div className="bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl py-2 px-3 flex items-center justify-center transition-all border border-white/40 shadow-sm shrink-0">
                    <StoreStatusToggle initialStoreData={merchant} compact={true} />
                </div>
            </div>
        </div>
    );
}
