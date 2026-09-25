'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { 
    Trophy, 
    ShoppingBag, 
    Gift, 
    Store, 
    Clock, 
    Sparkles, 
    ShieldCheck, 
    ArrowRight, 
    ArrowLeft, 
    CheckCircle2, 
    Bell, 
    Flame, 
    Coins, 
    Zap,
    ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MARKETING_COMING_SOON_CONFIG } from '@/lib/marketingConfig';

const ICON_MAP = {
    Trophy,
    ShoppingBag,
    Gift,
    Store,
    Flame,
    Zap,
    Coins
};

export default function MarketingComingSoon({ user = null, profile = null, isMerchant = false }) {
    const [notified, setNotified] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

    const handleNotifyMe = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            setNotified(true);
            toast.success("You're on the early-access VIP list! We'll notify you as soon as Marketing Hub goes live.", {
                icon: '🎉',
                duration: 4500
            });
        }, 600);
    };

    return (
        <div className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden py-8 sm:py-16 px-4 sm:px-6 lg:px-8">
            {/* Ambient Background Glow Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/15 dark:bg-blue-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
            <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-indigo-500/15 dark:bg-purple-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '2.5s' }} />
            <div className="absolute top-2/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/10 dark:bg-amber-600/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-5xl w-full mx-auto relative z-10 flex flex-col items-center text-center">
                
                {/* ── Top Status Pill ── */}
                <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-black shadow-xs backdrop-blur-md"
                >
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-blue-400"></span>
                    </span>
                    <Sparkles size={14} className="text-amber-500" />
                    <span>InTrust Marketing Hub • Pre-Launch Mode</span>
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] tracking-wide uppercase">
                        Coming Soon
                    </span>
                </motion.div>

                {/* ── Hero Mascot & Speech Bubble ── */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="relative mb-6 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-xl mx-auto"
                >
                    {/* 3D Mascot Robot */}
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 drop-shadow-[0_15px_30px_rgba(0,0,0,0.25)] shrink-0">
                        <Image
                            src="/robot-mascot-nobg.png"
                            alt="InTrust Assistant Robot"
                            fill
                            sizes="(max-width: 640px) 112px, 128px"
                            className="object-contain animate-bounce-subtle"
                            priority
                        />
                    </div>

                    {/* Speech Bubble */}
                    <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-xl text-left max-w-sm">
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                            👋 {displayName ? <span>Hey <strong>{displayName}</strong>! </span> : <span>Hey there! </span>}
                            We're putting the final polish on our <strong>Marketing & Rewards Suite</strong>. You'll soon be able to play daily cash quizzes, earn promotional cashbacks, and win mystery gift packages!
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            <Clock size={11} /> Launching Very Soon
                        </div>
                    </div>
                </motion.div>

                {/* ── Main Headline & Subtitle ── */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-4 max-w-3xl leading-tight"
                >
                    We're Crafting <br />
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent">
                        Something Extraordinary
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.25 }}
                    className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
                >
                    {MARKETING_COMING_SOON_CONFIG.description}
                </motion.p>

                {/* ── 4 Feature Preview Cards ── */}
                <motion.div
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-10 text-left"
                >
                    {MARKETING_COMING_SOON_CONFIG.features.map((feat, idx) => {
                        const Icon = ICON_MAP[feat.icon] || Trophy;
                        return (
                            <div
                                key={idx}
                                className="group relative p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feat.color} flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform`}>
                                            <Icon size={20} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-white/10">
                                            {feat.tag}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {feat.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {feat.desc}
                                    </p>
                                </div>

                                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] font-bold text-slate-400">
                                    <span>In Development</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                </div>
                            </div>
                        );
                    })}
                </motion.div>

                {/* ── Interactive Notify / VIP Access Form ── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                    className="w-full max-w-lg mx-auto bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5 dark:from-white/5 dark:to-white/5 p-6 rounded-3xl border border-blue-500/20 dark:border-white/10 shadow-lg mb-10"
                >
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Sparkles size={18} className="text-amber-500" />
                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                            Get Early VIP Access
                        </h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                        Be the first to claim welcome quiz coins and exclusive launch promotional bonuses.
                    </p>

                    {notified ? (
                        <div className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm">
                            <CheckCircle2 size={18} />
                            <span>You are registered for priority launch access!</span>
                        </div>
                    ) : (
                        <form onSubmit={handleNotifyMe} className="flex flex-col sm:flex-row gap-2.5">
                            <input
                                type="text"
                                readOnly={!!user?.email}
                                defaultValue={user?.email || ''}
                                placeholder="Enter your email or phone"
                                className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-md shadow-blue-500/25 transition-all transform active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
                            >
                                <Bell size={14} />
                                <span>{isSubmitting ? 'Registering...' : 'Notify Me'}</span>
                            </button>
                        </form>
                    )}
                </motion.div>

                {/* ── Navigation Actions ── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="flex flex-wrap items-center justify-center gap-4 mb-8"
                >
                    <Link
                        href={isMerchant ? '/merchant/dashboard' : '/dashboard'}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10 font-bold text-xs sm:text-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-white/20 transition-all active:scale-95"
                    >
                        <ArrowLeft size={16} />
                        <span>{isMerchant ? 'Back to Merchant Dashboard' : 'Back to Customer Dashboard'}</span>
                    </Link>

                    <Link
                        href="/shop"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs sm:text-sm hover:bg-slate-800 dark:hover:bg-slate-100 shadow-md transition-all active:scale-95"
                    >
                        <span>Explore InTrust Mart</span>
                        <ArrowRight size={16} />
                    </Link>
                </motion.div>

                {/* ── Trust & Security Ribbon ── */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-blue-500" />
                        Launching Soon
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <span className="flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        100% Verified InTrust Rewards
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <span className="flex items-center gap-1.5">
                        <Coins size={14} className="text-amber-500" />
                        Direct Wallet Cashbacks
                    </span>
                </div>

            </div>
        </div>
    );
}
