'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Gift, Share2, Copy, CheckCircle, ChevronLeft, ChevronRight,
    Users, Coins, Network, Sparkles
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
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: depth * 0.05 }}
        >
            {/* Node row */}
            <div className={`flex items-center gap-3 p-3 rounded-2xl mb-2 border transition-all hover:scale-[1.01] cursor-pointer
                ${isRoot
                    ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-900/30 dark:to-teal-900/30 border-emerald-500/20 shadow-sm shadow-emerald-500/10'
                    : 'bg-white/50 dark:bg-white/5 border-gray-200/50 dark:border-white/10 hover:shadow-md backdrop-blur-sm'
                }`}
                onClick={() => setExpanded(e => !e)}
            >
                {/* Toggle button / spacer */}
                {hasChildren ? (
                    <button
                        className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full bg-white dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-black/40 transition-colors shadow-sm"
                    >
                        <ChevronRight size={14} className={`text-gray-500 dark:text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`} />
                    </button>
                ) : (
                    <div className="w-6 flex-shrink-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
                    </div>
                )}

                {/* Avatar */}
                <div className={`w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br ${gradient(depth)} flex items-center justify-center text-white font-bold text-sm shadow-inner ring-2 ring-white/20`}>
                    {node.avatar_url
                        ? <img src={node.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        : initial
                    }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate tracking-tight">
                        {isRoot ? 'You' : node.full_name}
                        {isRoot && <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs ml-1.5">(root)</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {!isRoot && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30">
                                L{node.level}
                            </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border
                            ${kycVerified
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                                : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                            }`}
                        >
                            {kycVerified ? 'KYC ✓' : 'KYC ⏳'}
                        </span>
                        {!isRoot && node.joined_at && (
                            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                {new Date(node.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                        )}
                    </div>
                </div>

                {/* Points */}
                <div className="text-right flex-shrink-0 pl-2 border-l border-gray-100 dark:border-white/10">
                    {isRoot ? (
                        <p className="text-sm font-black text-gray-400 dark:text-gray-600">—</p>
                    ) : (
                        <>
                            <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                                {(node.reward_points?.total_earned || 0).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">earned</p>
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
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="ml-5 pl-4 border-l-[3px] border-emerald-100 dark:border-emerald-500/20 overflow-hidden"
                    >
                        <div className="pt-2">
                            {node.children.map(child => (
                                <NetworkNode key={child.user_id} node={child} depth={depth + 1} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
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
    const [hasReferrer, setHasReferrer] = useState(false);
    
    // Referral application state
    const [enterCode, setEnterCode] = useState('');
    const [applyingCode, setApplyingCode] = useState(false);
    const [codeApplied, setCodeApplied] = useState(false);

    useEffect(() => {
        if (!user && !loading) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                // Fetch referral code
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('referral_code, referred_by')
                    .eq('id', user.id)
                    .single();

                if (profile?.referral_code) setReferralCode(profile.referral_code);
                setHasReferrer(!!profile?.referred_by);

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

    const handleApplyCode = async () => {
        if (!enterCode.trim()) {
            toast.error('Please enter a referral code');
            return;
        }

        setApplyingCode(true);
        try {
            const res = await fetch('/api/referral/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ referral_code_entered: enterCode })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success('Referral code applied successfully!');
                setCodeApplied(true);
                // Re-fetch network data to show the new tree
                const networkRes = await fetch('/api/referral/network');
                if (networkRes.ok) {
                    const networkData = await networkRes.json();
                    setNetworkData(networkData);
                }
            } else {
                toast.error(data.error || 'Failed to apply referral code');
            }
        } catch (err) {
            console.error('Error applying referral code:', err);
            toast.error('An unexpected error occurred');
        } finally {
            setApplyingCode(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#121212] font-[family-name:var(--font-outfit)] flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
        );
    }

    const hasNetwork = networkData?.tree?.children?.length > 0;

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#121212] font-[family-name:var(--font-outfit)] pb-24 overflow-x-hidden">
            <Navbar />

            {/* Back nav — mobile */}
            <div className="pt-[10vh] px-4 sm:hidden">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 flex items-center justify-center bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-full shadow-sm"
                >
                    <ChevronLeft size={20} className="text-gray-700 dark:text-gray-300" />
                </button>
            </div>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 sm:pt-[15vh]">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
                    <button onClick={() => router.push('/dashboard')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Dashboard</button>
                    <ChevronRight size={14} />
                    <span className="text-gray-900 dark:text-white font-bold">Network</span>
                </nav>

                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8 relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 blur-[80px] -z-10 rounded-full" />
                    <motion.div 
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-2xl shadow-emerald-500/30 flex items-center justify-center mb-6 rotate-12 ring-1 ring-white/20"
                    >
                        <Network size={44} className="text-white -rotate-12" />
                    </motion.div>
                    <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                        🤝 Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Network</span>
                    </h1>
                    <p className="text-slate-500 dark:text-gray-400 sm:text-lg max-w-sm mx-auto font-medium">
                        Share your code and watch your passive income grow
                    </p>
                </motion.div>

                {/* Promotional Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-gradient-to-r from-emerald-900 to-teal-900 dark:from-[#020617] dark:to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-900/20 border border-emerald-500/30 dark:border-emerald-500/20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 mb-8"
                >
                    <div className="absolute -right-10 -top-10 text-emerald-400 opacity-10 pointer-events-none">
                        <Gift size={220} />
                    </div>
                    
                    <div className="relative z-10 flex-1 text-center md:text-left">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-3">
                            <Sparkles size={14} />
                            Unlimited Potential
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black mb-2 text-white leading-tight">
                            Earn <span className="text-emerald-400">Reward Points</span> For Every Referral!
                        </h2>
                        <p className="text-emerald-100/80 max-w-xl text-sm sm:text-base mx-auto md:mx-0 font-medium">
                            Invite friends to join InTrust India using your unique referral code. You'll earn points not just from your direct referrals, but from their referrals too—up to 7 levels deep!
                            <span className="block mt-2 font-bold text-emerald-300 text-base sm:text-lg">Earn up to ₹50,000 per month!</span>
                        </p>
                    </div>
                    
                    <div className="relative z-10 shrink-0 bg-gradient-to-br from-emerald-400 to-teal-300 text-teal-950 px-8 py-5 rounded-2xl font-black text-center shadow-[0_0_20px_rgba(52,211,153,0.3)] border border-emerald-200 flex flex-col items-center justify-center min-w-[160px]">
                        <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Network Depth</div>
                        <div className="text-4xl flex items-center drop-shadow-sm">
                            7 Levels
                        </div>
                    </div>
                </motion.div>

                {/* Referral Code Box */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="relative bg-white dark:bg-white/5 rounded-3xl p-6 shadow-xl shadow-black/5 dark:shadow-none border border-gray-100 dark:border-white/10 mb-8 backdrop-blur-xl overflow-hidden"
                >
                    {/* Decorative orb */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none" />

                    <p className="text-center font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">
                        Your Referral Code
                    </p>
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300" />
                        <div className="relative bg-gray-50/80 dark:bg-black/40 backdrop-blur-md border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 sm:p-6 flex items-center justify-between shadow-inner">
                            <span className="text-3xl sm:text-4xl font-mono font-black text-slate-800 dark:text-white tracking-[0.2em] ml-2 drop-shadow-sm">
                                {referralCode || '------'}
                            </span>
                            <button
                                onClick={handleCopy}
                                className="w-12 h-12 flex items-center justify-center bg-white dark:bg-white/10 rounded-xl shadow-sm border border-gray-200 dark:border-white/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-white/20 transition-all active:scale-95 group-hover:shadow-md"
                            >
                                {copied ? <CheckCircle size={22} className="text-emerald-500" /> : <Copy size={22} />}
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleShare}
                        className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all ring-1 ring-white/20"
                    >
                        <Share2 size={20} />
                        Share Now
                    </button>
                </motion.div>

                {/* Enter Referral Code Section - Only if they don't have a referrer */}
                {!hasReferrer && !codeApplied && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 }}
                        className="bg-white dark:bg-white/5 rounded-3xl p-6 border border-gray-100 dark:border-white/10 shadow-xl mb-8 overflow-hidden relative"
                    >
                        {/* Decorative background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
                        
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Gift size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Have a referral code?</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Join a network and start your chain</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <input
                                type="text"
                                value={enterCode}
                                onChange={(e) => setEnterCode(e.target.value.toUpperCase())}
                                placeholder="ENTER CODE"
                                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-center text-2xl font-mono font-black tracking-[0.2em] text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all uppercase"
                                maxLength={10}
                            />
                            
                            <button
                                onClick={handleApplyCode}
                                disabled={applyingCode || !enterCode.trim()}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {applyingCode ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>Apply Code</>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Success Banner if code just applied */}
                {codeApplied && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-3xl p-6 text-center mb-8"
                    >
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle size={28} />
                        </div>
                        <h3 className="font-bold text-emerald-900 dark:text-emerald-100 text-lg">You've joined the network!</h3>
                        <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Your tree has been updated successfully.</p>
                    </motion.div>
                )}

                {/* Network Summary Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="grid grid-cols-3 gap-3 sm:gap-4 mb-8"
                >
                    {[
                        { label: 'Direct', value: networkData?.direct_referrals ?? 0, icon: <Users size={16} className="text-emerald-600 dark:text-emerald-400" />, color: 'bg-emerald-50 dark:bg-emerald-500/10' },
                        { label: 'Network', value: networkData?.total_network_size ?? 0, icon: <Network size={16} className="text-indigo-600 dark:text-indigo-400" />, color: 'bg-indigo-50 dark:bg-indigo-500/10' },
                        {
                            label: 'Points Earned',
                            value: (networkData?.total_network_points_earned ?? 0).toLocaleString('en-IN'),
                            icon: <Coins size={16} className="text-amber-600 dark:text-amber-400" />,
                            color: 'bg-amber-50 dark:bg-amber-500/10'
                        },
                    ].map((item) => (
                        <div key={item.label} className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/10 shadow-sm text-center backdrop-blur-xl">
                            <div className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center mx-auto mb-2`}>
                                {item.icon}
                            </div>
                            <p className="text-xl font-black text-gray-900 dark:text-white leading-none tracking-tight mb-1">{item.value}</p>
                            <p className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{item.label}</p>
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
                    <div className="flex items-center justify-between mb-4">
                        <p className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live Network Tree
                        </p>
                    </div>

                    <div className="bg-white dark:bg-white/5 rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-white/10 backdrop-blur-xl min-h-[200px]">
                        {hasNetwork ? (
                            <NetworkNode node={networkData.tree} depth={0} />
                        ) : (
                            <div className="text-center py-12">
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                                    className="w-20 h-20 mx-auto bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4"
                                >
                                    <span className="text-4xl">🌱</span>
                                </motion.div>
                                <p className="font-bold text-gray-900 dark:text-white text-lg mb-1">No network yet</p>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-[200px] mx-auto">
                                    Share your code to start building your passive income chain!
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
                    className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-3xl p-6 sm:p-8 border border-emerald-100 dark:border-emerald-900/30 relative overflow-hidden"
                >
                    <h3 className="font-black text-xl text-emerald-900 dark:text-emerald-100 mb-6 flex items-center gap-2">
                        <Gift size={20} className="text-emerald-500" />
                        How it works?
                    </h3>

                    <div className="space-y-6 relative">
                        {/* Connecting Line */}
                        <div className="absolute left-4 top-4 bottom-8 w-[2px] bg-gradient-to-b from-emerald-200 to-transparent dark:from-emerald-500/20" />

                        {[
                            { num: '1', title: 'Share your code', desc: 'Send your unique code to friends through any app.' },
                            { num: '2', title: 'Friend signs up', desc: 'They use your code during sign-up or on their Network page and join your chain.' },
                            { num: '3', title: 'Earn reward points', desc: 'You earn points from their activity — up to 7 levels deep!' },
                        ].map((step, i) => (
                            <div key={i} className="flex gap-4 relative z-10">
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-emerald-500/20 ring-4 ring-emerald-50 dark:ring-emerald-900/20">
                                        {step.num}
                                    </div>
                                </div>
                                <div className="pt-1">
                                    <h4 className="font-bold text-gray-900 dark:text-emerald-100 mb-1">{step.title}</h4>
                                    <p className="text-sm font-medium text-emerald-800/70 dark:text-emerald-100/60 leading-relaxed">{step.desc}</p>
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
