'use client';

import { useState, useMemo } from 'react';
import ReferralCodeCard from '@/components/merchant/ReferralCodeCard';
import EnterReferralCodeSection from '@/components/merchant/EnterReferralCodeSection';
import {
    Users,
    Coins,
    Sparkles,
    Calendar,
    Search,
    Network,
    Award,
    CheckCircle2,
    Clock,
    Share2,
    Gift,
    TrendingUp,
    Check
} from 'lucide-react';

function getStatusBadge(status) {
    let bg = 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400 border-slate-200 dark:border-white/10';

    switch (status?.toLowerCase()) {
        case 'approved':
            bg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            break;
        case 'pending':
            bg = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
            break;
        case 'suspended':
        case 'rejected':
            bg = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
            break;
    }

    return (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${bg}`}>
            {status || 'Unknown'}
        </span>
    );
}

export default function ReferralNetworkClient({
    referralCode,
    hasReferrer,
    directReferrals = [],
    prizeHistory = [],
    chainDepth = 0,
    referralPrizeRupees = 200
}) {
    const [activeTab, setActiveTab] = useState('referrals');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Calculate aggregated metrics
    const totalDirect = directReferrals.length;
    const activeSubscribers = useMemo(
        () => directReferrals.filter(r => r?.subscription_status === 'active').length,
        [directReferrals]
    );
    const totalEarnedPaise = useMemo(
        () => prizeHistory.reduce((acc, p) => acc + (p.amount_paise || 0), 0),
        [prizeHistory]
    );
    const totalEarnedRupees = (totalEarnedPaise / 100).toLocaleString('en-IN');

    // Filter direct referrals
    const filteredReferrals = useMemo(() => {
        return directReferrals.filter((ref) => {
            const matchesSearch = !searchQuery || 
                ref?.business_name?.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesStatus = 
                statusFilter === 'all' ? true :
                statusFilter === 'subscribed' ? ref?.subscription_status === 'active' :
                ref?.subscription_status !== 'active';

            return matchesSearch && matchesStatus;
        });
    }, [directReferrals, searchQuery, statusFilter]);

    return (
        <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold uppercase tracking-widest mb-2">
                        <Network size={13} />
                        Partner Growth Program
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Refer & Earn Network
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Invite fellow business owners to InTrust and earn instant cash rewards when they activate.
                    </p>
                </div>
            </div>

            {/* Top 4-card Metric Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Direct Referrals */}
                <div className="bg-white dark:bg-slate-900/80 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Referrals</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                            {totalDirect}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                            {activeSubscribers} subscribed partner{activeSubscribers !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>

                {/* 2. Wallet Prizes Earned */}
                <div className="bg-white dark:bg-slate-900/80 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Earned</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <Coins size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                            ₹{totalEarnedRupees}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                            Credited directly to wallet
                        </div>
                    </div>
                </div>

                {/* 3. Reward Rate */}
                <div className="bg-white dark:bg-slate-900/80 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Per Referral Bonus</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[#D4AF37] flex items-center justify-center">
                            <Gift size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                            ₹{referralPrizeRupees}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                            On merchant activation
                        </div>
                    </div>
                </div>

                {/* 4. Network Depth */}
                <div className="bg-white dark:bg-slate-900/80 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Network Tier</span>
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <TrendingUp size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                            {chainDepth > 0 ? `Tier ${chainDepth}` : 'Tier 1'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                            Multi-level tracking active
                        </div>
                    </div>
                </div>
            </div>

            {/* Promotional Banner Card with Transparent Vector Illustration */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-[#121829] text-white p-6 sm:p-8 border border-white/10 shadow-lg">
                {/* Transparent geometric network illustration in background */}
                <div className="absolute right-0 bottom-0 w-80 h-80 pointer-events-none opacity-10 translate-x-12 translate-y-12">
                    <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#D4AF37]">
                        <circle cx="150" cy="150" r="120" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" />
                        <circle cx="150" cy="150" r="80" stroke="currentColor" strokeWidth="2" />
                        <circle cx="150" cy="50" r="18" fill="currentColor" />
                        <circle cx="250" cy="150" r="18" fill="currentColor" />
                        <circle cx="150" cy="250" r="18" fill="currentColor" />
                        <circle cx="50" cy="150" r="18" fill="currentColor" />
                        <line x1="150" y1="68" x2="150" y2="132" stroke="currentColor" strokeWidth="3" />
                        <line x1="150" y1="168" x2="150" y2="232" stroke="currentColor" strokeWidth="3" />
                        <line x1="68" y1="150" x2="132" y2="150" stroke="currentColor" strokeWidth="3" />
                        <line x1="168" y1="150" x2="232" y2="150" stroke="currentColor" strokeWidth="3" />
                    </svg>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-xl">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
                            <Sparkles size={13} className="text-amber-400" />
                            Unlimited Partner Rewards
                        </div>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                            Earn <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200">₹{referralPrizeRupees}</span> for each active business!
                        </h2>
                        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                            Share your link with retail shops, wholesalers, and service providers. When they register and activate their account, your wallet receives ₹{referralPrizeRupees} instantly.
                        </p>
                    </div>

                    <div className="shrink-0 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-5 text-center min-w-[190px]">
                        <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-1">
                            Reward Per Merchant
                        </div>
                        <div className="text-4xl sm:text-5xl font-black text-white">
                            ₹{referralPrizeRupees}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Instant Wallet Credit</div>
                    </div>
                </div>
            </div>

            {/* Referral Code & Enter Code Sections */}
            <div className="space-y-4">
                <ReferralCodeCard referralCode={referralCode} prizeRupees={referralPrizeRupees} />
                <EnterReferralCodeSection hasReferrer={hasReferrer} />
            </div>

            {/* Segmented Tabs & Lists */}
            <div className="bg-white dark:bg-slate-900/80 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
                {/* Tab Strip */}
                <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-xl self-start">
                        <button
                            onClick={() => setActiveTab('referrals')}
                            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                                activeTab === 'referrals'
                                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                        >
                            <Users size={16} />
                            <span>Direct Referrals</span>
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-white/10">
                                {totalDirect}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('prizes')}
                            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                                activeTab === 'prizes'
                                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                        >
                            <Coins size={16} />
                            <span>Prize History</span>
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-white/10">
                                {prizeHistory.length}
                            </span>
                        </button>
                    </div>

                    {/* Filter controls for referrals tab */}
                    {activeTab === 'referrals' && totalDirect > 0 && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search business..."
                                    className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 w-full sm:w-44"
                                />
                            </div>

                            <div className="flex items-center gap-1 border border-slate-200 dark:border-white/10 rounded-xl p-0.5 bg-slate-50 dark:bg-white/5">
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                                        statusFilter === 'all'
                                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                            : 'text-slate-500 dark:text-slate-400'
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setStatusFilter('subscribed')}
                                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                                        statusFilter === 'subscribed'
                                            ? 'bg-emerald-500 text-white shadow-xs'
                                            : 'text-slate-500 dark:text-slate-400'
                                    }`}
                                >
                                    Subscribed
                                </button>
                                <button
                                    onClick={() => setStatusFilter('free')}
                                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                                        statusFilter === 'free'
                                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                            : 'text-slate-500 dark:text-slate-400'
                                    }`}
                                >
                                    Free Tier
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tab Content 1: Direct Referrals */}
                {activeTab === 'referrals' && (
                    <div className="p-4 sm:p-6">
                        {directReferrals.length === 0 ? (
                            <div className="py-16 text-center">
                                {/* Transparent vector empty state */}
                                <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M16 42a8 8 0 0 1 16 0" />
                                        <circle cx="24" cy="26" r="6" />
                                        <path d="M36 42a8 8 0 0 1 16 0" />
                                        <circle cx="44" cy="26" r="6" />
                                        <circle cx="32" cy="54" r="4" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">No referrals yet</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
                                    Share your referral link above with other merchants to start building your network and earning rewards.
                                </p>
                            </div>
                        ) : filteredReferrals.length === 0 ? (
                            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                                No merchants match your current search/filter.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {filteredReferrals.map((ref, idx) => (
                                    <div
                                        key={idx}
                                        className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-sm">
                                                {ref?.business_name?.[0]?.toUpperCase() || 'M'}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                                                    {ref?.business_name || 'Business Partner'}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    <Calendar size={12} />
                                                    <span>Joined {ref?.created_at ? new Date(ref.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2.5 self-end sm:self-center">
                                            {getStatusBadge(ref?.status)}
                                            {ref?.subscription_status === 'active' ? (
                                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Subscribed Partner
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10">
                                                    Free Tier
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab Content 2: Prize History */}
                {activeTab === 'prizes' && (
                    <div className="p-4 sm:p-6">
                        {prizeHistory.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                    <Coins size={36} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">No prizes earned yet</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
                                    Cash rewards will automatically be added here once your referred merchants activate their subscription.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {prizeHistory.map((prize) => {
                                    const descMatches = prize.description?.match(/from merchant (.*)$/i);
                                    const sourceMerchant = descMatches ? descMatches[1] : (prize.description || 'Referral Activation Bonus');

                                    return (
                                        <div
                                            key={prize.id}
                                            className="py-3.5 px-3 sm:px-4 rounded-xl hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                                    <Coins size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                                        {sourceMerchant}
                                                    </h4>
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                        {new Date(prize.created_at).toLocaleDateString('en-IN', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <div className="font-black text-emerald-600 dark:text-emerald-400 text-base sm:text-lg">
                                                    +₹{(prize.amount_paise / 100).toFixed(2)}
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    Wallet Credit
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
