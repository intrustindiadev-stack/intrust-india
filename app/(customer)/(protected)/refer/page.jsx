'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Gift, Share2, Copy, CheckCircle, ChevronLeft, ChevronRight,
    Users, Coins, Network, Sparkles, Clock, Zap, Target,
    TrendingUp, Info, ArrowUpRight, ShieldCheck, PieChart, BarChart3, X
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';

// ─── Constants ──────────────────────────────────────────────────────────────
const POINTS_PER_RUPEE = 100;

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
    const earnedPoints = node.reward_points?.total_earned || 0;
    const earnedRupees = (earnedPoints / POINTS_PER_RUPEE).toFixed(2);

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: depth * 0.05 }}
            className="relative"
        >
            {depth > 0 && (
                <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-emerald-100 dark:bg-emerald-500/10" />
            )}

            <div className={`flex items-center gap-3 p-4 rounded-[2rem] mb-3 border transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer relative overflow-hidden group
                ${isRoot
                    ? 'bg-[#020617] border-white/10 shadow-2xl text-white'
                    : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 hover:shadow-xl backdrop-blur-xl'
                }`}
                onClick={() => setExpanded(e => !e)}
            >
                {/* Avatar */}
                <div className={`w-12 h-12 flex-shrink-0 rounded-2xl bg-gradient-to-br ${gradient(depth)} flex items-center justify-center text-white font-black text-lg shadow-lg ring-2 ring-white dark:ring-white/10 relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {node.avatar_url
                        ? <img src={node.avatar_url} alt="" className="w-full h-full object-cover" />
                        : initial
                    }
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className={`font-black text-sm sm:text-base truncate tracking-tight ${isRoot ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                            {isRoot ? 'Executive Master' : node.full_name}
                        </p>
                        {isRoot && (
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {!isRoot && (
                            <span className="text-[9px] px-2 py-0.5 rounded-lg font-black bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-white/5 uppercase tracking-[0.1em]">
                                L{node.level}
                            </span>
                        )}
                        <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black border flex items-center gap-1 uppercase tracking-widest
                            ${kycVerified
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20'
                                : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                            }`}
                        >
                            {kycVerified ? <ShieldCheck size={10} /> : <Clock size={10} />}
                            {kycVerified ? 'Verified' : 'Pending'}
                        </span>
                    </div>
                </div>

                <div className={`text-right flex-shrink-0 pl-4 border-l ${isRoot ? 'border-white/10' : 'border-gray-100 dark:border-white/10'}`}>
                    {isRoot ? (
                         <ChevronRight size={18} className={`text-white/40 transition-transform duration-500 ${expanded ? 'rotate-90' : ''}`} />
                    ) : (
                        <div className="flex flex-col items-end">
                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">
                                {earnedPoints.toLocaleString()}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Pts</p>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence initial={false}>
                {expanded && hasChildren && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, x: -10 }}
                        animate={{ height: 'auto', opacity: 1, x: 0 }}
                        exit={{ height: 0, opacity: 0, x: -10 }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        className="ml-6 pl-4 border-l-2 border-emerald-500/10 dark:border-emerald-500/20 overflow-hidden"
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

export default function ReferAndEarnPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [referralCode, setReferralCode] = useState(null);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [networkData, setNetworkData] = useState(null);
    const [hasReferrer, setHasReferrer] = useState(false);
    
    // Modal & Sheet state
    const [showStats, setShowStats] = useState(false);
    const [showShareSheet, setShowShareSheet] = useState(false);

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
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('referral_code, referred_by')
                    .eq('id', user.id)
                    .single();

                if (profile?.referral_code) setReferralCode(profile.referral_code);
                setHasReferrer(!!profile?.referred_by);

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
        toast.success('Empire Code copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        setShowShareSheet(true);
    };

    const handleApplyCode = async () => {
        if (!enterCode.trim()) {
            toast.error('Enter valid code');
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
                toast.success('Joined successfully!');
                setCodeApplied(true);
                const networkRes = await fetch('/api/referral/network');
                if (networkRes.ok) {
                    const networkData = await networkRes.json();
                    setNetworkData(networkData);
                }
            } else {
                toast.error(data.error || 'Failed to join');
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setApplyingCode(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#121212] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
        );
    }

    const hasNetwork = networkData?.tree?.children?.length > 0;
    const totalPoints = networkData?.total_network_points_earned ?? 0;
    const totalRupees = (totalPoints / POINTS_PER_RUPEE).toLocaleString('en-IN', { maximumFractionDigits: 0 });

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#121212] font-[family-name:var(--font-outfit)] pb-24 overflow-x-hidden">
            <Navbar />

            <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-[12vh]">
                <Breadcrumbs items={[{ label: 'Referral' }]} />

                {/* Hero / Empire Section */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative bg-gradient-to-br from-[#0F172A] to-black rounded-[3rem] p-10 text-white shadow-2xl mb-10 overflow-hidden group border border-white/5"
                >
                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
                    
                    <div className="relative z-10 text-center sm:text-left flex flex-col sm:flex-row items-center gap-8">
                        <motion.div
                            whileHover={{ rotate: 12, scale: 1.1 }}
                            className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-[2rem] flex items-center justify-center shadow-2xl border border-white/20 shrink-0"
                        >
                            <Network size={44} className="text-white" />
                        </motion.div>
                        
                        <div>
                            <h1 className="text-4xl sm:text-5xl font-black mb-3 tracking-tighter leading-none">Empire <span className="text-emerald-400">Builder</span></h1>
                            <p className="text-slate-400 text-sm sm:text-base font-medium max-w-sm">Grow a 7-level deep network and unlock unlimited liquid rewards.</p>
                        </div>
                    </div>
                </motion.div>

                {/* Tactical Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-10">
                    <button 
                        onClick={() => setShowStats(true)}
                        className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[2.5rem] p-6 text-left hover:shadow-xl transition-all group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
                            <PieChart size={24} />
                        </div>
                        <h4 className="font-black text-slate-900 dark:text-white mb-1">Network Stats</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{networkData?.total_network_size || 0} Total Members</p>
                    </button>

                    <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[2.5rem] p-6 text-left relative overflow-hidden">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                            <TrendingUp size={24} />
                        </div>
                        <h4 className="font-black text-slate-900 dark:text-white mb-1">Cash Value</h4>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter leading-none">₹{totalRupees}</p>
                    </div>
                </div>

                {/* Premium Invitation Passport */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-600 rounded-[3rem] p-8 sm:p-10 text-white shadow-2xl shadow-emerald-500/20 mb-10 relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                    <div className="absolute -top-32 -right-32 w-80 h-80 bg-white/10 blur-[100px] rounded-full group-hover:bg-white/20 transition-all duration-700" />
                    
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                                <Target size={22} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Invitation Code</span>
                        </div>

                        <div className="text-5xl sm:text-6xl font-mono font-black tracking-[0.3em] mb-10 drop-shadow-2xl select-all">
                            {referralCode || '------'}
                        </div>

                        <div className="flex gap-4 w-full">
                            <button
                                onClick={handleCopy}
                                className="flex-1 flex items-center justify-center gap-2 bg-white text-emerald-700 py-4.5 rounded-[2rem] font-black text-sm shadow-xl hover:bg-emerald-50 active:scale-95 transition-all"
                            >
                                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                                {copied ? 'Secured' : 'Secure Code'}
                            </button>
                            <button
                                onClick={handleShare}
                                className="w-16 h-16 flex items-center justify-center bg-black text-white rounded-[2rem] shadow-xl hover:bg-slate-900 active:scale-95 transition-all border border-white/10"
                            >
                                <Share2 size={24} />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Network Chain Tree */}
                <section className="mb-14">
                    <div className="flex items-center justify-between mb-8 px-1">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                            <h3 className="font-black text-2xl text-slate-900 dark:text-white tracking-tight leading-none">Empire Chain</h3>
                        </div>
                        <div className="px-4 py-1.5 rounded-full bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest border border-white/10">7 Levels Deep</div>
                    </div>

                    <div className="bg-white dark:bg-[#020617] rounded-[3rem] p-6 sm:p-10 border border-gray-100 dark:border-white/5 shadow-sm min-h-[400px] relative overflow-hidden">
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                        
                        <div className="relative z-10">
                            {hasNetwork ? (
                                <NetworkNode node={networkData.tree} depth={0} />
                            ) : (
                                <div className="text-center py-24">
                                    <div className="w-24 h-24 mx-auto bg-gray-50 dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-gray-100 dark:border-white/10 shadow-inner">
                                        <Users size={40} className="text-gray-300 dark:text-gray-700" />
                                    </div>
                                    <h4 className="font-black text-slate-900 dark:text-white text-xl mb-3 tracking-tight">Chain Empty</h4>
                                    <p className="text-sm font-medium text-slate-400 max-w-[200px] mx-auto leading-relaxed">Your network empire starts with a single share.</p>
                                    <button
                                        onClick={handleShare}
                                        className="mt-10 px-10 py-4 bg-emerald-500 text-white font-black rounded-[2rem] shadow-2xl shadow-emerald-500/20 hover:bg-emerald-400 transition-all active:scale-95 uppercase tracking-widest text-xs"
                                    >
                                        Initiate Share
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {/* Stats Analysis Modal */}
            <AnimatePresence>
                {showStats && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-white dark:bg-[#020617] rounded-[3rem] p-8 shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden"
                        >
                            <button 
                                onClick={() => setShowStats(false)}
                                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
                            >
                                <X size={20} />
                            </button>

                            <div className="mb-10">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Empire Analytics</h3>
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-2">Network breakdown</p>
                            </div>

                            <div className="space-y-6">
                                {[
                                    { label: 'Direct Referrals', value: networkData?.direct_referrals || 0, icon: <Users size={18} />, color: 'blue' },
                                    { label: 'Secondary Chain', value: (networkData?.total_network_size || 0) - (networkData?.direct_referrals || 0), icon: <Network size={18} />, color: 'purple' },
                                    { label: 'Lifetime Earnings', value: totalPoints, icon: <Coins size={18} />, color: 'amber' },
                                ].map((stat) => (
                                    <div key={stat.label} className="flex items-center justify-between p-5 rounded-[2rem] bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-500 flex items-center justify-center`}>
                                                {stat.icon}
                                            </div>
                                            <span className="font-bold text-slate-600 dark:text-slate-400 text-sm">{stat.label}</span>
                                        </div>
                                        <span className="font-black text-xl text-slate-900 dark:text-white">{stat.value.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-10 p-6 bg-[#020617] rounded-[2rem] text-center border border-white/5">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2">Passive Potential</p>
                                <p className="text-2xl font-black text-white italic">Level 7 Unlocked</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Share Sheet (Bottom Sheet) */}
            <AnimatePresence>
                {showShareSheet && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] flex items-end justify-center p-0 bg-slate-950/40 backdrop-blur-sm"
                        onClick={() => setShowShareSheet(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] rounded-t-[3rem] p-10 shadow-2xl border-t border-gray-100 dark:border-white/10"
                        >
                            <div className="w-16 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-8" />
                            
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-2 italic">Broadcast Empire</h3>
                            <p className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-10">Select your preferred encrypted channel</p>

                            <div className="grid grid-cols-2 gap-4 mb-10">
                                {[
                                    { label: 'WhatsApp', icon: <Share2 size={24} />, color: 'emerald' },
                                    { label: 'Telegram', icon: <Zap size={24} />, color: 'blue' },
                                    { label: 'Instagram', icon: <Target size={24} />, color: 'pink' },
                                    { label: 'X / Twitter', icon: <Network size={24} />, color: 'slate' },
                                ].map((channel) => (
                                    <button
                                        key={channel.label}
                                        onClick={() => {
                                            toast.success(`Opening ${channel.label}...`);
                                            setShowShareSheet(false);
                                        }}
                                        className="flex flex-col items-center gap-3 p-6 rounded-[2.5rem] bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-all active:scale-95"
                                    >
                                        <div className={`w-14 h-14 rounded-full bg-${channel.color}-500/10 text-${channel.color}-500 flex items-center justify-center shadow-inner`}>
                                            {channel.icon}
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{channel.label}</span>
                                    </button>
                                ))}
                            </div>

                            <button 
                                onClick={handleCopy}
                                className="w-full py-5 bg-emerald-500 text-white font-black rounded-[2rem] shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all uppercase tracking-[0.2em] text-xs"
                            >
                                Copy Private Link
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <CustomerBottomNav />
        </div>
    );
}
