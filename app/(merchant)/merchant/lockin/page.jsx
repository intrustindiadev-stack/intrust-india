'use client';

import { useState, useEffect } from 'react';
import { animate, motionValue } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import {
    Building2,
    Eye,
    EyeOff,
    ShieldCheck,
    PieChart as PieIcon,
    Calendar,
    ArrowUpRight,
    Clock,
    AlertCircle,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import LockinAnalytics from '@/components/merchant/lockin/LockinAnalytics';

export default function MerchantLockinPage() {
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRevealed, setIsRevealed] = useState(false);

    // Animated Counter Component
    const AnimatedNumber = ({ value, decimals = 0 }) => {
        const [displayValue, setDisplayValue] = useState(0);

        useEffect(() => {
            if (!isRevealed) {
                setDisplayValue(0);
                return;
            }
            const controls = motionValue(0);
            animate(0, value, {
                duration: 1.5,
                ease: "easeOut",
                onUpdate: (latest) => setDisplayValue(latest)
            });
        }, [value, isRevealed]);

        return <span>{displayValue.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}</span>;
    };

    const fetchBalances = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: merchant } = await supabase
                .from('merchants')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!merchant) return;

            const { data, error } = await supabase
                .from('merchant_lockin_balances')
                .select('*')
                .eq('merchant_id', merchant.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBalances(data || []);
        } catch (err) {
            console.error('Error:', err);
            toast.error('Failed to load portfolio');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBalances();
    }, []);

    const activeBalances = balances.filter(b => b.status === 'active');
    const totalPrincipal = activeBalances.reduce((sum, b) => sum + (b.amount_paise || 0), 0) / 100;

    const totalAccumulated = activeBalances.reduce((sum, b) => {
        const principal = b.amount_paise / 100;
        const rate = b.interest_rate / 100;
        const startDate = new Date(b.start_date);
        const daysElapsed = Math.max(0, (new Date() - startDate) / (1000 * 60 * 60 * 24));
        return sum + (principal * (rate / 365) * daysElapsed);
    }, 0);

    return (
        <div className="p-6 bg-[#FAFBFC] min-h-screen font-sans selection:bg-blue-100 italic-none">
            <div className="max-w-6xl mx-auto space-y-10">
                {/* Refined Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1.5">
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Growth Portfolio</h1>
                        <p className="text-sm font-semibold text-slate-500 tracking-tight opacity-70">Capital deployed to fuel INTRUST Mart inventory, powered by your business.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <ShieldCheck size={16} className="text-blue-500" />
                            <span className="text-xs font-bold text-slate-700">Protected Assets</span>
                        </div>
                        <button
                            onClick={fetchBalances}
                            disabled={loading}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white border hover:border-slate-200 rounded-xl transition-all shadow-sm group disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={`${loading ? 'animate-spin text-blue-500' : 'group-hover:rotate-180 transition-all duration-500'}`} />
                        </button>
                    </div>
                </div>

                {/* Portfolio Value Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 bg-slate-950 rounded-[3rem] p-10 md:p-14 text-white shadow-2xl shadow-blue-900/10 relative overflow-hidden group border border-white/5">
                        {/* High-end Gradient Layers */}
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 blur-[130px] rounded-full -mr-48 -mt-48 transition-all duration-1000 group-hover:bg-blue-600/20" />
                        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full -ml-32 -mb-32" />

                        <div className="relative z-10 flex flex-col h-full justify-between gap-14">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.25em]">Growth Balance</p>
                                    </div>
                                    <button
                                        onClick={() => setIsRevealed(!isRevealed)}
                                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-slate-400 hover:text-white"
                                    >
                                        {isRevealed ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                <div className="h-24 flex items-center">
                                    <AnimatePresence mode="wait">
                                        {!isRevealed ? (
                                            <motion.button
                                                key="tap-to-view"
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                onClick={() => setIsRevealed(true)}
                                                className="group/btn flex items-center gap-4 px-8 py-5 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 hover:scale-105 active:scale-95 transition-all"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover/btn:rotate-12 transition-transform">
                                                    <Eye size={18} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Confidential</p>
                                                    <p className="text-sm font-extrabold text-white tracking-tight">Tap to View Balance</p>
                                                </div>
                                            </motion.button>
                                        ) : (
                                            <motion.div
                                                key="balance-revealed"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-baseline gap-2"
                                            >
                                                <span className="text-xl md:text-3xl font-bold text-slate-400 align-top mt-2">₹</span>
                                                <h2 className="text-5xl md:text-8xl font-extrabold tracking-tighter text-white">
                                                    <AnimatedNumber value={totalPrincipal + totalAccumulated} />
                                                    <span className="text-xl md:text-2xl font-medium text-slate-500 ml-1 tracking-normal">.{(totalAccumulated % 1).toFixed(2).split('.')[1]}</span>
                                                </h2>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-16 pt-8 border-t border-white/5">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Partnership Capital</p>
                                    <p className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                                        ₹{isRevealed ? <AnimatedNumber value={totalPrincipal} /> : '• • • • • •'}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">Retention Bonus</p>
                                    <div className="flex items-center gap-4">
                                        <p className="text-2xl md:text-3xl font-extrabold text-emerald-400 tracking-tight">
                                            ₹{isRevealed ? <AnimatedNumber value={totalAccumulated} decimals={2} /> : '• • • •'}
                                        </p>
                                        {isRevealed && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-[11px] font-black text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                            >
                                                +{(totalAccumulated / totalPrincipal * 100 || 0).toFixed(2)}%
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 grid grid-cols-1 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between group hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-default">
                            <div className="flex items-center justify-between">
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                    <PieIcon size={24} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">Bonus Avg</span>
                            </div>
                            <div className="mt-8">
                                <p className="text-5xl font-extrabold text-slate-900 dark:text-white tracking-tighter">
                                    {activeBalances.length > 0 ? (activeBalances.reduce((a, b) => a + b.interest_rate, 0) / activeBalances.length).toFixed(1) : 0}%
                                    <span className="text-[11px] text-blue-500 font-bold ml-2 tracking-widest uppercase">Reward</span>
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                    <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-tight">Optimal Growth</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-950 border border-white/5 rounded-[2.5rem] p-8 text-white shadow-2xl flex flex-col justify-between group cursor-default relative overflow-hidden transition-all duration-500">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full -mr-16 -mt-16" />
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg">
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <p className="text-white font-extrabold text-base tracking-tight uppercase">Bank Payout</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                        <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.15em]">Direct Settlement</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-slate-400 text-[11px] font-medium leading-relaxed relative z-10 mt-8 pt-8 border-t border-white/5 opacity-80">
                                Funds are wired directly to your verified bank account upon contract maturity.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Growth Visualization */}
                <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 md:p-12 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Growth Roadmap</h2>
                            <p className="text-xs font-medium text-slate-500 italic">Projected maturity and interest distribution</p>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-[10px] font-bold text-slate-600 uppercase">Projected Value</span>
                            </div>
                        </div>
                    </div>
                    {!loading && <LockinAnalytics balances={balances} />}
                </div>

                {/* Contract Inventory */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                            Asset Inventory
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{balances.length}</span>
                        </h3>
                    </div>

                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center space-y-4">
                            <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Syncing Vault...</p>
                        </div>
                    ) : balances.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {balances.map(item => (
                                <Link
                                    href={`/merchant/lockin/${item.id}`}
                                    key={item.id}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-9 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-blue-500/10 transition-all duration-500 group flex flex-col justify-between min-h-[300px] hover:-translate-y-2 relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center border border-slate-100 dark:border-slate-700 transition-all group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 shadow-sm">
                                            <ShieldCheck size={26} />
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${item.status === 'active'
                                            ? 'bg-blue-50 text-blue-600 border-blue-100'
                                            : item.status === 'matured'
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                : 'bg-slate-50 text-slate-500 border-slate-200'
                                            }`}>
                                            {item.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className="mt-10 space-y-2 relative z-10">
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">Capital Sum</p>
                                        <p className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tighter group-hover:scale-[1.02] transition-transform origin-left">₹{(item.amount_paise / 100).toLocaleString('en-IN')}</p>
                                        <div className="flex items-center gap-3 pt-1">
                                            <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest">{item.interest_rate}% Reward</span>
                                            <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800" />
                                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{item.lockin_period_months}M Term</span>
                                        </div>
                                    </div>

                                    <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-3">
                                            <Calendar size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Unlocks {new Date(item.end_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
                                        </div>
                                        <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-blue-600 flex items-center justify-center text-white scale-90 group-hover:scale-100 group-hover:rotate-45 transition-all duration-500 shadow-lg">
                                            <ArrowUpRight size={18} />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white border border-dashed border-slate-200 rounded-[2.5rem] p-20 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                                <AlertCircle size={32} className="text-slate-300" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm">Portfolio Empty</h4>
                            <p className="text-slate-500 text-xs mt-1 max-w-xs font-medium">Your locked growth contracts will appear here once initiated.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
