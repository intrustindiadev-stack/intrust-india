'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Gift, Share2, Copy, CheckCircle, ChevronLeft, ArrowRight, Coins, Users } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';

export default function ReferAndEarnPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [referralCode, setReferralCode] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalReferrals: 0, totalEarned: 0 });
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
            return;
        }

        const fetchReferralData = async () => {
            if (!user) return;
            try {
                // Fetch User Profile code
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('referral_code')
                    .eq('id', user.id)
                    .single();

                if (profile?.referral_code) {
                    setReferralCode(profile.referral_code);
                }

                // Fetch total referrals
                const { count: totalReferrals } = await supabase
                    .from('user_profiles')
                    .select('id', { count: 'exact', head: true })
                    .eq('referred_by', user.id);

                // Fetch total earned (from cashbacks or wallet transactions)
                // For simplified logic right now we'll calculate based on standard 100Rs per valid referral,
                // Or fetch from `customer_wallet_transactions` where type = CASHBACK and description ILIKE '%referral%'
                const { data: txs } = await supabase
                    .from('customer_wallet_transactions')
                    .select('amount_paise')
                    .eq('user_id', user.id)
                    .eq('type', 'CASHBACK')
                    .ilike('description', '%referral%');

                const totalEarned = (txs || []).reduce((acc, curr) => acc + (curr.amount_paise || 0), 0) / 100;

                setStats({ totalReferrals: totalReferrals || 0, totalEarned });
            } catch (err) {
                console.error('Error fetching referral data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchReferralData();
    }, [user]);

    const handleCopy = () => {
        if (referralCode) {
            navigator.clipboard.writeText(referralCode);
            setCopied(true);
            toast.success('Code copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleShare = async () => {
        if (!referralCode) return;

        const shareData = {
            title: 'Join Intrust & Get ₹100 Cashback!',
            text: `Use my referral code ${referralCode} when you sign up on Intrust and we both get ₹100 inside our wallets!`,
            url: window.location.origin
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                handleCopy(); // fallback
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 font-[family-name:var(--font-outfit)] flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 font-[family-name:var(--font-outfit)] pb-24">
            <Navbar />

            {/* Top Back Navigation (Mobile primarily) */}
            <div className="pt-[10vh] px-4 sm:hidden">
                <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-sm">
                    <ChevronLeft size={20} className="text-gray-700 dark:text-gray-300" />
                </button>
            </div>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 sm:pt-[15vh]">

                {/* Hero Illustration & Copy */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8 relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 blur-[80px] -z-10 rounded-full" />
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-[2rem] shadow-xl shadow-emerald-500/30 flex items-center justify-center mb-6 rotate-12">
                        <Gift size={48} className="text-white -rotate-12" />
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                        Refer & Earn <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">₹100</span>
                    </h1>
                    <p className="text-slate-500 dark:text-gray-300 sm:text-lg max-w-sm mx-auto">
                        Invite your friends to Intrust. They get ₹100, and you get ₹100 when they complete signing up!
                    </p>
                </motion.div>

                {/* The Code Box */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-700 mb-8"
                >
                    <p className="text-center font-bold text-sm text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Your Referral Code</p>

                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-200" />
                        <div className="relative bg-gray-50 dark:bg-gray-900/50 border-2 border-dashed border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 sm:p-6 flex items-center justify-between">
                            <span className="text-3xl sm:text-4xl font-mono font-black text-slate-800 dark:text-gray-100 tracking-[0.2em] ml-2">
                                {referralCode || '------'}
                            </span>
                            <button
                                onClick={handleCopy}
                                className="w-12 h-12 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all active:scale-95"
                            >
                                {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleShare}
                        className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all"
                    >
                        <Share2 size={20} />
                        Share Now
                    </button>
                </motion.div>

                {/* Stats Container */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm"
                    >
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-3">
                            <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Referrals</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalReferrals}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm"
                    >
                        <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-3">
                            <Coins size={18} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Earned</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">₹{stats.totalEarned.toLocaleString('en-IN')}</p>
                    </motion.div>
                </div>

                {/* How it works */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/60 dark:bg-gray-800/60 rounded-3xl p-6 backdrop-blur-sm border border-gray-100/50 dark:border-gray-700/50"
                >
                    <h3 className="font-extrabold text-lg text-gray-900 dark:text-white mb-6">How it works?</h3>

                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold flex items-center justify-center text-sm z-10 shadow-sm">1</div>
                                <div className="w-[2px] h-full bg-gray-200 dark:bg-gray-700 mt-2 -mb-6" />
                            </div>
                            <div className="pt-1 pb-4">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-1">Share your code</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Send your unique code to friends and family through any app.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold flex items-center justify-center text-sm z-10 shadow-sm">2</div>
                                <div className="w-[2px] h-full bg-gray-200 dark:bg-gray-700 mt-2 -mb-6" />
                            </div>
                            <div className="pt-1 pb-4">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-1">Friend signs up</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">They use your code during their first login onboarding step.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-sm z-10 shadow-sm shadow-emerald-500/20">3</div>
                            </div>
                            <div className="pt-1">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-1">Both get ₹100</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Instantly credited to your Intrust Wallets immediately.</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

            </div>

            <CustomerBottomNav />
        </div>
    );
}
