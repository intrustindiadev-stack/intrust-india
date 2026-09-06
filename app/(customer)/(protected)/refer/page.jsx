'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Gift, Share2, Copy, CheckCircle, ChevronLeft, ChevronRight,
    Users, Coins, Network, Sparkles, Clock, Zap, Target,
    TrendingUp, Info, ArrowUpRight, ShieldCheck, PieChart, BarChart3, X,
    RefreshCw
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';

// ─── Constants ──────────────────────────────────────────────────────────────
const POINTS_PER_RUPEE = 100;

const LEVEL_GRADIENTS = [
    'from-blue-600 to-indigo-600',    // root / You
    'from-blue-500 to-sky-500',       // L1
    'from-indigo-500 to-blue-600',    // L2
    'from-sky-500 to-cyan-600',       // L3
    'from-blue-600 to-blue-400',      // L4
    'from-indigo-600 to-sky-500',     // L5
    'from-blue-500 to-indigo-500',    // L6
    'from-slate-600 to-slate-500',    // L7
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

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: depth * 0.05 }}
            className="relative"
        >
            {depth > 0 && (
                <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-blue-100 dark:bg-blue-500/20" />
            )}

            <div
                className={`flex items-center gap-3 p-4 rounded-2xl mb-3 border transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer relative overflow-hidden group ${
                    isRoot
                        ? 'bg-surface-container-lowest border-blue-500/30 shadow-md text-on-surface'
                        : 'bg-surface-container-lowest border-outline-variant/30 hover:border-blue-500/30 text-on-surface shadow-xs'
                }`}
                onClick={() => setExpanded(e => !e)}
            >
                {/* Avatar */}
                <div className={`w-11 h-11 flex-shrink-0 rounded-xl bg-gradient-to-br ${gradient(depth)} flex items-center justify-center text-white font-black text-base shadow-sm relative overflow-hidden`}>
                    {node.avatar_url ? (
                        <Image
                            src={node.avatar_url}
                            alt=""
                            fill
                            sizes="44px"
                            className="object-cover"
                        />
                    ) : (
                        initial
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-extrabold text-sm text-on-surface leading-tight truncate">
                            {isRoot ? 'Your Account (Primary)' : node.full_name}
                        </p>
                        {isRoot && (
                            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {!isRoot && (
                            <span className="text-[9px] px-2 py-0.5 rounded-md font-black bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                                L{node.level}
                            </span>
                        )}
                        <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold border flex items-center gap-1 uppercase tracking-wider ${
                            kycVerified
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}>
                            {kycVerified ? <ShieldCheck size={10} /> : <Clock size={10} />}
                            {kycVerified ? 'Verified' : 'Pending'}
                        </span>
                    </div>
                </div>

                <div className={`text-right flex-shrink-0 pl-3 border-l border-outline-variant/20`}>
                    {isRoot ? (
                        <ChevronRight size={16} className={`text-on-surface-variant/40 transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`} />
                    ) : (
                        <div className="flex flex-col items-end">
                            <p className="text-sm font-black text-blue-600 dark:text-blue-400 tracking-tight leading-none">
                                {earnedPoints.toLocaleString()}
                            </p>
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5">Pts</p>
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
                        transition={{ duration: 0.3 }}
                        className="ml-5 pl-4 border-l-2 border-blue-500/20 overflow-hidden"
                    >
                        <div className="pt-1">
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

// ─── Upline Node Row ─────────────────────────────────────────────────────────
function UplineNode({ node }) {
    if (!node) return null;
    const initial = node.full_name?.charAt(0)?.toUpperCase() || '?';
    return (
        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs mb-6">
            <div className="w-11 h-11 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-black text-base shrink-0">
                {node.avatar_url ? (
                    <div className="relative w-full h-full rounded-xl overflow-hidden">
                        <Image src={node.avatar_url} alt="" fill className="object-cover" />
                    </div>
                ) : (
                    initial
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Invited By</p>
                <p className="font-extrabold text-sm text-on-surface truncate">{node.full_name}</p>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-widest">
                Sponsor
            </span>
        </div>
    );
}

export default function ReferPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [referralCode, setReferralCode] = useState('');
    const [hasReferrer, setHasReferrer] = useState(false);
    const [enterCode, setEnterCode] = useState('');
    const [applyingCode, setApplyingCode] = useState(false);
    const [codeApplied, setCodeApplied] = useState(false);
    const [networkData, setNetworkData] = useState(null);
    const [networkError, setNetworkError] = useState(null);
    const [retryingNetwork, setRetryingNetwork] = useState(false);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [showShareSheet, setShowShareSheet] = useState(false);
    const [showStats, setShowStats] = useState(false);

    const fetchNetworkData = async (isRetry = false) => {
        if (isRetry) setRetryingNetwork(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/referral/network', {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error('Unable to parse network response');
            }
            if (!res.ok) throw new Error(data?.error || 'Failed to load network tree');
            setNetworkData(data);
            setNetworkError(null);
        } catch (err) {
            console.error('Error fetching referral network:', err);
            setNetworkError(err.message);
        } finally {
            if (isRetry) setRetryingNetwork(false);
        }
    };

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

                await fetchNetworkData();
            } catch (err) {
                console.error('Error fetching referral data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/signup?ref=${referralCode}`
        : `https://intrustindia.com/signup?ref=${referralCode}`;

    const shareText = `Join InTrust India! Shop smart, save big, and earn instant cashback on top local stores. Use my referral code ${referralCode} to claim your welcome bonus: ${shareUrl}`;

    const handleCopy = () => {
        if (!referralCode) return;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Referral link copied to clipboard!");
    };

    const handleMainShare = async () => {
        if (!referralCode) return;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'InTrust Referral Invitation',
                    text: shareText,
                    url: shareUrl,
                });
            } catch (err) {
                setShowShareSheet(true);
            }
        } else {
            setShowShareSheet(true);
        }
    };

    const handleChannelShare = (channel) => {
        let url = '';
        switch (channel) {
            case 'WhatsApp':
                url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                break;
            case 'Telegram':
                url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
                break;
            case 'Instagram':
                navigator.clipboard.writeText(shareUrl);
                toast.success("Link copied! Opening Instagram...");
                url = 'https://instagram.com';
                break;
            case 'X / Twitter':
                url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
                break;
        }
        if (url) window.open(url, '_blank');
        setShowShareSheet(false);
    };

    const handleApplyCode = async () => {
        if (!enterCode.trim()) {
            toast.error('Please enter a valid invite code');
            return;
        }

        setApplyingCode(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/referral/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    referral_code_entered: enterCode.trim(),
                    code: enterCode.trim()
                })
            });
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error('Failed to process referral code');
            }
            if (!res.ok) throw new Error(data?.error || 'Failed to apply referral code');

            toast.success('Referral code linked successfully!');
            setCodeApplied(true);
            setHasReferrer(true);
            await fetchNetworkData();
        } catch (err) {
            toast.error(err.message || 'Invalid or expired referral code');
        } finally {
            setApplyingCode(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-xs font-bold text-on-surface-variant animate-pulse">Loading Refer &amp; Earn...</p>
            </div>
        );
    }

    const hasNetwork = networkData?.tree?.children?.length > 0;
    const totalPoints = networkData?.total_network_points_earned ?? 0;
    const totalRupees = (totalPoints / POINTS_PER_RUPEE).toLocaleString('en-IN', { maximumFractionDigits: 0 });

    return (
        <div className="w-full pb-24 overflow-x-hidden">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
                <CustomerBreadcrumbs items={[{ label: 'Refer & Earn' }]} />

                {/* Cross-navigation to Rewards */}
                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => router.push('/rewards')}
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl group transition-all hover:border-blue-500/30 shadow-xs"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
                            <Gift size={18} />
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Portfolio</p>
                            <p className="text-sm font-extrabold text-on-surface">View My Rewards</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-on-surface-variant/40 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                </motion.button>

                {/* Hero / Referral Section Banner */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/20 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5 sm:gap-6 text-center sm:text-left">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/30 shrink-0">
                            <Network className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                        </div>
                        
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-black mb-1.5 tracking-tight leading-none text-white">
                                Refer &amp; Earn Program
                            </h1>
                            <p className="text-blue-100 text-xs sm:text-sm font-medium max-w-sm">
                                Invite friends to InTrust, grow your network up to 7 tiers, and earn cashback on every transaction.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
                    <button 
                        onClick={() => setShowStats(true)}
                        className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 sm:p-5 text-left hover:border-blue-500/30 transition-all group relative overflow-hidden shadow-xs hover:shadow-sm"
                    >
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-3">
                            <PieChart size={18} />
                        </div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-on-surface mb-0.5">Network Stats</h4>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{networkData?.total_network_size || 0} Members</p>
                    </button>

                    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 sm:p-5 text-left relative overflow-hidden shadow-xs">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                            <TrendingUp size={18} />
                        </div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-on-surface mb-0.5">Total Earnings</h4>
                        <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">₹{totalRupees}</p>
                    </div>
                </div>

                {/* Invitation Passport Card */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-sm relative overflow-hidden text-center space-y-5"
                >
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <Target size={13} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Your Exclusive Referral Code</span>
                    </div>

                    <div className="text-3xl sm:text-5xl font-mono font-black tracking-[0.25em] text-on-surface select-all py-1">
                        {referralCode || '------'}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 w-full pt-1">
                        <button
                            onClick={handleCopy}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all"
                        >
                            {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                            <span>{copied ? 'Code Copied!' : 'Copy Invite Code'}</span>
                        </button>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleChannelShare('WhatsApp')}
                                className="flex-1 sm:flex-none px-5 py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center gap-2 justify-center font-bold text-xs sm:text-sm"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                                </svg>
                                <span>WhatsApp</span>
                            </button>

                            <button
                                onClick={handleMainShare}
                                className="p-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/30 active:scale-[0.98] transition-all flex items-center justify-center"
                                title="Share"
                            >
                                <Share2 size={18} />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Enter Referral Code Section */}
                {!hasReferrer && !codeApplied && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-surface-container-lowest rounded-3xl p-6 sm:p-7 border border-outline-variant/30 shadow-sm space-y-3"
                    >
                        <h3 className="text-base font-extrabold text-on-surface">Enter Sponsor / Friend Code</h3>
                        <p className="text-xs text-on-surface-variant font-medium">Have an invitation code from a friend? Enter it here to claim your sign-up bonus coins.</p>
                        
                        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                            <input
                                type="text"
                                value={enterCode}
                                onChange={(e) => setEnterCode(e.target.value.toUpperCase())}
                                placeholder="ENTER CODE"
                                className="w-full sm:flex-1 bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3.5 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all uppercase text-on-surface placeholder:text-on-surface-variant/40"
                            />
                            <button
                                onClick={handleApplyCode}
                                disabled={applyingCode}
                                className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-blue-500/25 transition-all disabled:opacity-40 flex items-center justify-center active:scale-[0.98]"
                            >
                                {applyingCode ? <RefreshCw className="animate-spin" size={16} /> : 'Connect'}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Upline Section */}
                {networkData?.upline?.length > 0 && (
                    <section className="space-y-2">
                        <h3 className="font-extrabold text-sm text-on-surface-variant uppercase tracking-wider px-1">Your Sponsor</h3>
                        <UplineNode node={networkData.upline[0]} />
                    </section>
                )}

                {/* Network Chain Tree */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                            <h3 className="font-black text-lg text-on-surface tracking-tight">Referral Network Hierarchy</h3>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                            7 Tiers Active
                        </span>
                    </div>

                    <div className="bg-surface-container-lowest rounded-3xl p-5 sm:p-7 border border-outline-variant/30 shadow-xs min-h-[300px] relative overflow-hidden">
                        {networkError ? (
                            <div className="text-center py-16 space-y-3">
                                <div className="w-14 h-14 mx-auto bg-red-100 dark:bg-red-950/40 rounded-2xl flex items-center justify-center text-red-500">
                                    <X size={26} />
                                </div>
                                <h4 className="font-black text-on-surface text-base">Network Unavailable</h4>
                                <p className="text-xs text-on-surface-variant max-w-xs mx-auto">We encountered an issue loading your referral tree. Please retry.</p>
                                <button
                                    onClick={() => fetchNetworkData(true)}
                                    disabled={retryingNetwork}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-blue-500/25 transition-all active:scale-[0.98] inline-flex items-center gap-2 disabled:opacity-50"
                                >
                                    <RefreshCw size={14} className={retryingNetwork ? "animate-spin" : ""} />
                                    <span>{retryingNetwork ? 'Retrying...' : 'Retry Connection'}</span>
                                </button>
                            </div>
                        ) : hasNetwork ? (
                            <NetworkNode node={networkData.tree} depth={0} />
                        ) : networkData?.upline?.length > 0 ? (
                            <div className="text-center py-10 px-4">
                                <p className="text-xs font-medium text-on-surface-variant max-w-xs mx-auto">
                                    No referrals yet — share your link with friends to start earning passive commissions.
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-16 space-y-4">
                                <div className="w-16 h-16 mx-auto bg-blue-600/10 text-blue-600 rounded-3xl flex items-center justify-center">
                                    <Users size={30} />
                                </div>
                                <h4 className="font-black text-on-surface text-lg">No Referrals Yet</h4>
                                <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                                    Your referral earnings will grow automatically as soon as your invited friends place their first orders.
                                </p>
                                <button
                                    onClick={handleMainShare}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all inline-flex items-center gap-2"
                                >
                                    <Share2 size={14} />
                                    <span>Share Invite Link</span>
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Stats Analysis Modal */}
            <AnimatePresence>
                {showStats && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 sm:p-7 shadow-2xl border border-outline-variant/30 overflow-hidden space-y-5"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-on-surface">Referral Analytics</h3>
                                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-0.5">Network breakdown</p>
                                </div>
                                <button 
                                    onClick={() => setShowStats(false)}
                                    className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { label: 'Direct Referrals', value: networkData?.direct_referrals || 0, icon: <Users size={16} />, color: 'text-blue-600 bg-blue-500/10' },
                                    { label: 'Secondary Referrals', value: (networkData?.total_network_size || 0) - (networkData?.direct_referrals || 0), icon: <Network size={16} />, color: 'text-indigo-600 bg-indigo-500/10' },
                                    { label: 'Lifetime Earnings', value: totalPoints, icon: <Coins size={16} />, color: 'text-amber-600 bg-amber-500/10' },
                                ].map((stat) => (
                                    <div key={stat.label} className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low/70 border border-outline-variant/20">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl ${stat.color} flex items-center justify-center shrink-0`}>
                                                {stat.icon}
                                            </div>
                                            <span className="font-bold text-on-surface text-xs">{stat.label}</span>
                                        </div>
                                        <span className="font-black text-base text-on-surface tabular-nums">{stat.value.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 bg-surface-container-low rounded-2xl text-center border border-outline-variant/20">
                                <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-0.5">Network Status</p>
                                <p className="text-base font-black text-blue-600 dark:text-blue-400">7 Active Earning Tiers</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Share Bottom Sheet */}
            <AnimatePresence>
                {showShareSheet && (
                    <div 
                        className="fixed inset-0 z-[150] flex items-end justify-center p-0 bg-slate-950/60 backdrop-blur-sm"
                        onClick={() => setShowShareSheet(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-lg bg-surface-container-lowest rounded-t-3xl p-6 sm:p-8 shadow-2xl border-t border-outline-variant/30 space-y-6"
                        >
                            <div className="w-12 h-1 bg-surface-container-high rounded-full mx-auto" />
                            
                            <div className="text-center">
                                <h3 className="text-xl font-black text-on-surface tracking-tight">Share Referral Link</h3>
                                <p className="text-xs text-on-surface-variant font-medium mt-1">Choose your preferred channel to invite friends</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'WhatsApp', icon: <Share2 size={20} />, color: 'bg-emerald-500/10 text-emerald-600' },
                                    { label: 'Telegram', icon: <Zap size={20} />, color: 'bg-sky-500/10 text-sky-600' },
                                    { label: 'Instagram', icon: <Target size={20} />, color: 'bg-pink-500/10 text-pink-600' },
                                    { label: 'X / Twitter', icon: <Network size={20} />, color: 'bg-slate-500/10 text-slate-700 dark:text-slate-200' },
                                ].map((channel) => (
                                    <button
                                        key={channel.label}
                                        onClick={() => handleChannelShare(channel.label)}
                                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/25 transition-all active:scale-95"
                                    >
                                        <div className={`w-11 h-11 rounded-full ${channel.color} flex items-center justify-center`}>
                                            {channel.icon}
                                        </div>
                                        <span className="text-xs font-extrabold text-on-surface">{channel.label}</span>
                                    </button>
                                ))}
                            </div>

                            <button 
                                onClick={handleCopy}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black rounded-2xl shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all text-xs uppercase tracking-wider"
                            >
                                Copy Referral Link
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
