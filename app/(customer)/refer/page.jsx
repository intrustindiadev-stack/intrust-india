'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Gift, Share2, Copy, CheckCircle, ChevronLeft, ChevronRight,
    Users, Coins
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';

// ─── Avatar colours per level ────────────────────────────────────────────────
const LEVEL_GRADIENTS = [
    'from-emerald-400 to-teal-500',     // root / You
    'from-amber-400 to-orange-500',     // L1
    'from-indigo-400 to-violet-500',    // L2
    'from-pink-400 to-rose-500',        // L3
    'from-sky-400 to-blue-500',         // L4
    'from-lime-400 to-green-500',       // L5
    'from-fuchsia-400 to-purple-500',   // L6
    'from-teal-400 to-cyan-500',        // L7
];

const gradient = (level) => LEVEL_GRADIENTS[Math.min(level, LEVEL_GRADIENTS.length - 1)];

// ─── Single tree node row ─────────────────────────────────────────────────────
function NetworkNode({ node, depth = 0 }) {
    const [expanded, setExpanded] = useState(depth < 1);
    const hasChildren = node.children && node.children.length > 0;
    const isRoot = depth === 0;

    const initial = node.full_name?.charAt(0)?.toUpperCase() || '?';
    const kycVerified = node.kyc_status === 'verified' || node.kyc_status === 'approved';

    return (
        <div>
            {/* Node row */}
            <div className={`flex items-center gap-2 p-2.5 rounded-xl mb-1.5 border transition-all
                ${isRoot
                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800'
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                }`}
            >
                {/* Toggle button / spacer */}
                {hasChildren ? (
                    <button
                        onClick={() => setExpanded(e => !e)}
                        className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        <ChevronRight size={11} className={`text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                    </button>
                ) : (
                    <div className="w-5 flex-shrink-0" />
                )}

                {/* Avatar */}
                <div className={`w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br ${gradient(depth)} flex items-center justify-center text-white font-bold text-xs`}>
                    {node.avatar_url
                        ? <img src={node.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        : initial
                    }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                        {isRoot ? 'You' : node.full_name}
                        {isRoot && <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs ml-1">(root)</span>}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {!isRoot && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                                L{node.level}
                            </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                            ${kycVerified
                                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                            }`}
                        >
                            {kycVerified ? 'KYC ✓' : 'KYC ⏳'}
                        </span>
                        {!isRoot && node.joined_at && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                {new Date(node.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                        )}
                    </div>
                </div>

                {/* Points */}
                <div className="text-right flex-shrink-0">
                    {isRoot ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500">—</p>
                    ) : (
                        <>
                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                {(node.reward_points?.total_earned || 0).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[9px] text-gray-400 dark:text-gray-500">pts earned</p>
                        </>
                    )}
                </div>
            </div>

            {/* Children */}
            <AnimatePresence initial={false}>
                {expanded && hasChildren && (
                    <motion.div
                        key="children"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-4 pl-3 border-l-2 border-emerald-100 dark:border-emerald-900/50 overflow-hidden"
                    >
                        {node.children.map(child => (
                            <NetworkNode key={child.user_id} node={child} depth={depth + 1} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ReferAndEarnPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [referralCode, setReferralCode] = useState(null);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [networkData, setNetworkData] = useState(null);

    useEffect(() => {
        if (!user && !loading) {
            router.push('/login');
        }
    }, [user, loading]);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                // Fetch referral code
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('referral_code')
                    .eq('id', user.id)
                    .single();

                if (profile?.referral_code) setReferralCode(profile.referral_code);

                // Fetch referral network tree + stats
                const res = await fetch('/api/referral/network');
                if (res.ok) {
                    const data = await res.json();
                    setNetworkData(data);
                }
            } catch (err) {
                console.error('Error fetching referral data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const handleCopy = () => {
        if (!referralCode) return;
        navigator.clipboard.writeText(referralCode);
        setCopied(true);
        toast.success('Code copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        if (!referralCode) return;
        const shareData = {
            title: 'Join Intrust & Earn Reward Points!',
            text: `Use my referral code ${referralCode} when you sign up on Intrust and earn Intrust Reward Points on every referral in your network!`,
            url: window.location.origin
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                handleCopy();
            }
        } catch (err) {
            console.error('Share error:', err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 font-[family-name:var(--font-outfit)] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
        );
    }

    const hasNetwork = networkData?.tree?.children?.length > 0;

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 font-[family-name:var(--font-outfit)] pb-24">
            <Navbar />

            {/* Back nav — mobile */}
            <div className="pt-[10vh] px-4 sm:hidden">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-sm"
                >
                    <ChevronLeft size={20} className="text-gray-700 dark:text-gray-300" />
                </button>
            </div>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 sm:pt-[15vh]">

                {/* Hero */}
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
                        🤝 Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Network</span>
                    </h1>
                    <p className="text-slate-500 dark:text-gray-300 sm:text-lg max-w-sm mx-auto">
                        Share your code and watch your referral chain grow
                    </p>
                </motion.div>

                {/* Referral Code Box */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-700 mb-6"
                >
                    <p className="text-center font-bold text-sm text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
                        Your Referral Code
                    </p>
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

                {/* Network Summary Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="grid grid-cols-3 gap-3 mb-6"
                >
                    {[
                        { label: 'Direct', value: networkData?.direct_referrals ?? 0, icon: <Users size={14} className="text-emerald-600 dark:text-emerald-400" /> },
                        { label: 'Network', value: networkData?.total_network_size ?? 0, icon: <Users size={14} className="text-indigo-600 dark:text-indigo-400" /> },
                        {
                            label: 'Pts Generated',
                            value: (networkData?.total_network_points_earned ?? 0).toLocaleString('en-IN'),
                            icon: <Coins size={14} className="text-amber-600 dark:text-amber-400" />
                        },
                    ].map((item) => (
                        <div key={item.label} className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                            <div className="flex items-center justify-center mb-1">{item.icon}</div>
                            <p className="text-lg font-black text-gray-900 dark:text-white leading-none">{item.value}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{item.label}</p>
                        </div>
                    ))}
                </motion.div>

                {/* Network Chain */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8"
                >
                    <p className="font-extrabold text-sm text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
                        🌳 Network Chain
                    </p>

                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                        {hasNetwork ? (
                            <NetworkNode node={networkData.tree} depth={0} />
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-4xl mb-3">🌱</p>
                                <p className="font-bold text-gray-700 dark:text-gray-300">No one in your network yet</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                    Share your code to start building your chain!
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* How it works */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/60 dark:bg-gray-800/60 rounded-3xl p-6 backdrop-blur-sm border border-gray-100/50 dark:border-gray-700/50"
                >
                    <h3 className="font-extrabold text-lg text-gray-900 dark:text-white mb-6">How it works?</h3>

                    <div className="space-y-6">
                        {[
                            { num: '1', title: 'Share your code', desc: 'Send your unique code to friends through any app.', color: 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' },
                            { num: '2', title: 'Friend signs up', desc: 'They use your code during onboarding and join your chain.', color: 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' },
                            { num: '3', title: 'Earn reward points', desc: 'You earn points from their activity — up to 7 levels deep!', color: 'bg-emerald-500 text-white shadow-sm shadow-emerald-400/30' },
                        ].map((step, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full ${step.color} font-bold flex items-center justify-center text-sm z-10`}>
                                        {step.num}
                                    </div>
                                    {i < 2 && <div className="w-[2px] h-full bg-gray-200 dark:bg-gray-700 mt-2 -mb-6" />}
                                </div>
                                <div className="pt-1 pb-4">
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">{step.title}</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

            </div>

            <CustomerBottomNav />
        </div>
    );
}
