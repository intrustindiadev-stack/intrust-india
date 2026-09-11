'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Clock,
    Calendar,
    ShieldCheck,
    TrendingUp,
    CheckCircle,
    Building2,
    CalendarDays,
    Wallet,
    Info,
    ChevronLeft,
    ArrowUpRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer
} from 'recharts';
import { useTheme } from '@/lib/contexts/ThemeContext';

export default function MerchantLockinDetailPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const [lockin, setLockin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('merchant_lockin_balances')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setLockin(data);
            } catch (err) {
                console.error('Error:', err);
                toast.error('Failed to load contract details');
                router.push('/merchant/lockin');
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [id, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-800 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Syncing Portfolio Ledger...</p>
            </div>
        );
    }

    if (!lockin) return null;

    const startDate = new Date(lockin.start_date);
    const endDate = new Date(lockin.end_date);
    const today = new Date();

    // Calculate progress
    const totalDuration = endDate - startDate;
    const elapsed = Math.min(totalDuration, Math.max(0, today - startDate));
    const progressPercent = (elapsed / totalDuration) * 100;

    // Projection Data
    const projectionData = [];
    for (let i = 0; i <= lockin.lockin_period_months; i++) {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + i);
        const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        const principal = lockin.amount_paise / 100;
        const interest = principal * (lockin.interest_rate / 100) * (i / 12);
        projectionData.push({ month: label, value: principal + interest });
    }

    const handleClaim = async () => {
        let interestPaise = lockin.accumulated_interest_paise || 0;
        if (lockin.status === 'matured' || lockin.status === 'active') {
            const start = new Date(lockin.start_date);
            const end = lockin.end_date ? new Date(lockin.end_date) : new Date();
            const boundedEnd = Math.min(new Date().getTime(), end.getTime());
            const days = Math.max(0, boundedEnd - start.getTime()) / (1000 * 60 * 60 * 24);
            const calcInterest = Math.round(lockin.amount_paise * (lockin.interest_rate / 100 / 365) * days);
            interestPaise = Math.max(interestPaise, calcInterest);
        }
        const totalAmount = (lockin.amount_paise + interestPaise) / 100;

        const confirm = window.confirm(`Request release of ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} to your bank account?`);
        if (!confirm) return;

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/payout-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    amount: totalAmount,
                    source: 'growth_fund',
                    reference_id: id
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');

            toast.success('Payout request submitted successfully!');
            router.refresh();
            // Refetch data
            const { data: updated } = await supabase.from('merchant_lockin_balances').select('*').eq('id', id).single();
            setLockin(updated);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const statusConfig = {
        active: 'bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30',
        matured: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
        payout_requested: 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
        paid_out: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        cancelled: 'bg-red-50 text-red-700 border-red-200/70 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30'
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 min-h-screen font-sans selection:bg-blue-100 dark:selection:bg-blue-900 text-slate-900 dark:text-slate-100">
            <div className="max-w-4xl mx-auto space-y-8 md:space-y-10">
                {/* Clean Header */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => router.push('/merchant/lockin')}
                            aria-label="Back to Growth Portfolio"
                            className="p-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all shadow-xs group"
                        >
                            <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Partnership Overview</h1>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Fund Ref: #{lockin.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusConfig[lockin.status] || 'bg-slate-50'}`}>
                        {lockin.status.replace('_', ' ')}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Primary Stats */}
                    <div className="lg:col-span-12">
                        <div className="bg-slate-950 dark:bg-slate-900/95 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 text-white shadow-2xl shadow-blue-950/20 relative overflow-hidden group border border-slate-800/80 dark:border-white/10">
                            {/* High-end Gradient Layers */}
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 blur-[130px] rounded-full -mr-48 -mt-48 transition-all duration-700 group-hover:bg-blue-600/30 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full -ml-40 -mb-40 transition-all duration-700 group-hover:bg-emerald-500/20 pointer-events-none" />

                            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 items-end">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                        <p className="text-[10px] font-black text-blue-200/70 uppercase tracking-[0.2em]">Partnership Capital</p>
                                    </div>
                                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white font-mono">
                                        ₹{(lockin.amount_paise / 100).toLocaleString('en-IN')}
                                    </h2>
                                </div>
                                <div className="space-y-1 border-white/10 md:border-l md:pl-10">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reward Rate</p>
                                    <p className="text-3xl font-black text-emerald-400 font-mono">{lockin.interest_rate}% <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-1">Bonus</span></p>
                                </div>
                                <div className="space-y-1 border-white/10 md:border-l md:pl-10">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retention Term</p>
                                    <p className="text-3xl font-black text-white font-mono">{lockin.lockin_period_months} <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase ml-1">Months</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress & Growth Chart */}
                    <div className="lg:col-span-8 space-y-8 min-w-0">
                        {lockin.status === 'matured' && (
                            <button
                                type="button"
                                onClick={handleClaim}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-bold text-base shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
                            >
                                <ArrowUpRight size={22} />
                                Release Funds to Bank
                            </button>
                        )}

                        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Unlock Progress</h3>
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">
                                    Unlocked {endDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                            <div className="relative h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700">
                                <div
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(37,99,235,0.5)] group"
                                    style={{ width: `${progressPercent}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
                                    Initiated {startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </div>
                                <div className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15 px-3 py-1 rounded-full border border-blue-200/70 dark:border-blue-500/30">{Math.round(progressPercent)}% Accomplished</div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm min-w-0">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Growth Projection</h3>
                                <div className="p-2 bg-blue-50 dark:bg-blue-500/15 rounded-lg">
                                    <TrendingUp size={16} className="text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                            <div className="h-[250px] w-full min-w-0">
                                {mounted ? (
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220} debounce={50}>
                                        <AreaChart data={projectionData}>
                                            <defs>
                                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={isDark ? 0.25 : 0.08} />
                                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255, 255, 255, 0.07)' : '#f1f5f9'} />
                                            <XAxis
                                                dataKey="month"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}
                                                dy={10}
                                            />
                                            <YAxis hide />
                                            <RechartsTooltip
                                                contentStyle={{
                                                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                                                    borderColor: isDark ? '#1e293b' : '#e2e8f0',
                                                    color: isDark ? '#f8fafc' : '#0f172a',
                                                    borderRadius: '16px',
                                                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                                                }}
                                                formatter={(value) => [`₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 'Projected Value']}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#2563eb"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorValue)"
                                                activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 3 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl animate-pulse">
                                        <span className="text-xs text-slate-400 font-medium">Loading projection...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Security & Info */}
                    <div className="lg:col-span-4 space-y-8 min-w-0">
                        <div className="bg-slate-950 dark:bg-slate-900/90 border border-slate-800 dark:border-white/10 rounded-3xl p-6 text-white shadow-xl">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-6">
                                <ShieldCheck size={20} className="text-blue-400" />
                            </div>
                            <h4 className="font-bold text-lg tracking-tight">Protected Growth</h4>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium">
                                Funds are held in a secure partnership vault. Rewards accumulate based on retention and are disbursed upon term completion.
                            </p>
                            <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider">Disbursement</span>
                                    <span className="text-blue-400 font-black">Bank Transfer</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider">Assurance</span>
                                    <span className="text-emerald-400 font-black flex items-center gap-1">
                                        <CheckCircle size={10} />
                                        VERIFIED
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">
                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Partnership Lifecycle</h4>
                            <div className="relative pl-8 space-y-8">
                                {/* Vertical Line */}
                                <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />

                                {[
                                    { label: 'Initiated', date: startDate, active: true },
                                    { label: 'Growth Active', date: 'In Progress', active: progressPercent > 0 && progressPercent < 100 },
                                    { label: 'Fund Unlocked', date: endDate, active: progressPercent >= 100 },
                                    { label: 'Disbursement', date: lockin.status === 'paid_out' ? 'Completed' : 'Pending', active: lockin.status === 'paid_out' }
                                ].map((step, idx) => (
                                    <div key={idx} className="relative flex items-start gap-4">
                                        <div className={`absolute -left-5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ring-4 transition-all duration-500 ${step.active ? 'bg-blue-600 ring-blue-50 dark:ring-blue-950 scale-125' : 'bg-slate-300 dark:bg-slate-700 ring-slate-100 dark:ring-slate-800'
                                            }`} />
                                        <div className="space-y-0.5">
                                            <p className={`text-[11px] font-black uppercase tracking-widest ${step.active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                                {step.label}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400">
                                                {typeof step.date === 'string' ? step.date : step.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20">
                            <div className="flex items-start gap-3">
                                <Info size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                                <div className="space-y-1">
                                    <h5 className="text-[10px] font-black text-amber-900 dark:text-amber-300 uppercase tracking-widest leading-none">Reward Policy</h5>
                                    <p className="text-[10px] text-amber-800 dark:text-amber-300/80 font-medium leading-relaxed">
                                        Retention bonuses are calculated based on the net term. Manual pre-mature release is not available to ensure fund integrity.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

