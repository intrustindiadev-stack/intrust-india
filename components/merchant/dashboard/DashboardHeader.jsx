'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LiveButton from '@/components/merchant/LiveButton';
import StoreStatusToggle from '@/components/merchant/StoreStatusToggle';

export default function DashboardHeader({ merchant, profile, walletBalancePaise }) {
    const [showBalance, setShowBalance] = useState(false);
    const [animatedRevenue, setAnimatedRevenue] = useState(0);

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
            <div className="relative z-10 flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/40 shadow-sm backdrop-blur-sm overflow-hidden">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <span className="material-icons-round text-slate-900 text-2xl">storefront</span>
                        )}
                    </div>
                    <div>
                        <p className="text-sm text-slate-800/80 font-bold">{greeting}</p>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold font-display text-slate-900">
                                {merchant.business_name || 'Merchant'}
                            </h2>
                            {merchant.subscription_status === 'active' && (
                                <span className="bg-slate-900 text-[#D4AF37] text-[10px] uppercase font-black px-2 py-0.5 rounded-full shadow-sm">
                                    Premium
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
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
            <div className="relative z-10 flex items-center gap-3">
                <Link href="/merchant/shopping/wholesale" className="flex-1 bg-slate-900 hover:bg-slate-800 text-[#D4AF37] font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                    <span className="material-icons-round text-lg">add</span>
                    <span className="text-sm">Add Stock</span>
                </Link>
                <Link href="/merchant/wallet" className="flex-1 bg-white hover:bg-slate-50 text-slate-900 font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 border border-white/50">
                    <span className="material-icons-round text-lg">call_made</span>
                    <span className="text-sm">Withdraw</span>
                </Link>
                <div className="bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl py-2 px-3 flex items-center justify-center transition-all border border-white/40 shadow-sm flex-col">
                    <StoreStatusToggle initialStoreData={merchant} compact={true} />
                </div>
            </div>
        </div>
    );
}
