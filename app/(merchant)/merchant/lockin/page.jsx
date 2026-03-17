'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Clock,
    TrendingUp,
    Calendar,
    ChevronRight,
    ShieldCheck,
    CheckCircle,
    XCircle,
    AlertCircle,
    ArrowUpRight,
    PieChart as PieIcon,
    Building2,
    Building
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import LockinAnalytics from '@/components/merchant/lockin/LockinAnalytics';

export default function MerchantLockinPage() {
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);

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
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Growth Portfolio</h1>
                        <p className="text-sm font-medium text-slate-500">Track and manage your partnership growth funds and bonus accruals</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <ShieldCheck size={16} className="text-blue-500" />
                            <span className="text-xs font-bold text-slate-700">Protected Assets</span>
                        </div>
                        <button
                            onClick={fetchBalances}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white border hover:border-slate-200 rounded-xl transition-all shadow-sm"
                        >
                            <Clock size={18} />
                        </button>
                    </div>
                </div>

                {/* Portfolio Value Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 bg-[#0F172A] rounded-[2.5rem] p-10 text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden group">
                        {/* High-end Gradient Layers */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full -mr-48 -mt-48 transition-all duration-700 group-hover:bg-blue-600/30" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full -ml-32 -mb-32 transition-all duration-700 group-hover:bg-emerald-500/20" />

                        <div className="relative z-10 flex flex-col h-full justify-between gap-12">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                    <p className="text-[10px] font-black text-blue-200/60 uppercase tracking-[0.2em]">Growth Balance</p>
                                </div>
                                <h2 className="text-6xl font-black tracking-tighter text-white">
                                    ₹{(totalPrincipal + totalAccumulated).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    <span className="text-xl font-medium text-slate-500 ml-2 tracking-normal align-top mt-2 inline-block">.{(totalAccumulated % 1).toFixed(2).split('.')[1]}</span>
                                </h2>
                            </div>

                            <div className="flex flex-wrap items-center gap-12">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Partnership Capital</p>
                                    <p className="text-2xl font-bold text-white">₹{totalPrincipal.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="w-px h-10 bg-white/5 hidden sm:block" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest">Retention Bonus</p>
                                    <div className="flex items-center gap-3">
                                        <p className="text-2xl font-bold text-emerald-400">₹{totalAccumulated.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-black text-emerald-400">
                                            +{(totalAccumulated / totalPrincipal * 100 || 0).toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 grid grid-cols-1 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between group hover:border-blue-200 dark:hover:border-blue-500/50 transition-all cursor-default">
                            <div className="flex items-center justify-between">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-all">
                                    <PieIcon size={24} />
                                </div>
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Bonus Avg</span>
                            </div>
                            <div className="mt-4">
                                <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    {activeBalances.length > 0 ? (activeBalances.reduce((a, b) => a + b.interest_rate, 0) / activeBalances.length).toFixed(1) : 0}%
                                    <span className="text-[10px] text-slate-400 font-bold ml-2 tracking-widest uppercase">Reward</span>
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-2 flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Portfolio growth is optimal
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-900 dark:bg-blue-950/20 border border-transparent dark:border-blue-500/10 rounded-[2rem] p-7 shadow-xl shadow-slate-200 dark:shadow-none flex flex-col justify-between group cursor-default relative overflow-hidden transition-all duration-500 hover:shadow-2xl">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <p className="text-white font-black text-sm tracking-tight uppercase">Bank Payout</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                        <p className="text-emerald-400 text-[9px] font-black uppercase tracking-widest">Verified Channel</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-slate-400 text-[10px] font-medium leading-relaxed relative z-10 mt-6 pt-6 border-t border-white/5">
                                Settlements are processed directly to your registered bank account upon fund unlock.
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
                                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-8 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-blue-500/10 transition-all duration-500 group flex flex-col justify-between min-h-[280px] hover:-translate-y-2"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="w-14 h-14 rounded-[1.25rem] bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 transition-all group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600">
                                            <ShieldCheck size={28} />
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border-2 transition-all group-hover:shadow-lg ${item.status === 'active'
                                                ? 'bg-blue-500/5 text-blue-600 border-blue-100 dark:border-blue-900/50 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600'
                                                : item.status === 'matured'
                                                    ? 'bg-emerald-500/5 text-emerald-600 border-emerald-100 dark:border-emerald-900/50 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600'
                                                    : 'bg-slate-500/5 text-slate-500 border-slate-100 dark:border-slate-800 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900'
                                            }`}>
                                            {item.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className="mt-8 space-y-1">
                                        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:scale-[1.02] transition-transform">₹{(item.amount_paise / 100).toLocaleString('en-IN')}</p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{item.interest_rate}% BONUS</span>
                                            <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800" />
                                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">{item.lockin_period_months}M Term</span>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-600 transition-colors">
                                                <Calendar size={14} className="text-slate-400 group-hover:text-blue-500 dark:group-hover:text-white" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors uppercase tracking-widest">Unlocks {new Date(item.end_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-blue-600 flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-all duration-500 shadow-xl">
                                            <ArrowUpRight size={16} />
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
