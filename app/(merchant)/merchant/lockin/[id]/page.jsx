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

export default function MerchantLockinDetailPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const [lockin, setLockin] = useState(null);
    const [loading, setLoading] = useState(true);

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
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFBFC]">
                <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Syncing Portfolio Ledger...</p>
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
        const totalAmount = (lockin.amount_paise + (lockin.accumulated_interest_paise || 0)) / 100;

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
        active: 'bg-blue-50 text-blue-700 border-blue-100',
        matured: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        payout_requested: 'bg-amber-50 text-amber-700 border-amber-100',
        paid_out: 'bg-slate-100 text-slate-600 border-slate-200',
        cancelled: 'bg-red-50 text-red-700 border-red-100'
    };

    return (
        <div className="p-4 md:p-6 bg-[#FAFBFC] min-h-screen font-sans selection:bg-blue-100">
            <div className="max-w-4xl mx-auto space-y-10">
                {/* Clean Header */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/merchant/lockin')}
                            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm group"
                        >
                            <ChevronLeft size={20} className="text-slate-600 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Partnership Overview</h1>
                            <p className="text-xs font-medium text-slate-500">Fund Ref: #{lockin.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusConfig[lockin.status] || 'bg-slate-50'}`}>
                        {lockin.status.replace('_', ' ')}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Primary Stats */}
                    <div className="lg:col-span-12">
                        <div className="bg-[#0F172A] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden group">
                            {/* High-end Gradient Layers */}
                            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 blur-[130px] rounded-full -mr-48 -mt-48 transition-all duration-700 group-hover:bg-blue-600/30" />
                            <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full -ml-40 -mb-40 transition-all duration-700 group-hover:bg-emerald-500/20" />

                            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 items-end">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                        <p className="text-[10px] font-black text-blue-200/60 uppercase tracking-[0.2em]">Partnership Capital</p>
                                    </div>
                                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white">
                                        ₹{(lockin.amount_paise / 100).toLocaleString('en-IN')}
                                    </h2>
                                </div>
                                <div className="space-y-1 border-white/5 md:border-l md:pl-10">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reward Rate</p>
                                    <p className="text-3xl font-black text-emerald-400">{lockin.interest_rate}% <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase ml-1">Bonus</span></p>
                                </div>
                                <div className="space-y-1 border-white/5 md:border-l md:pl-10">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Retention Term</p>
                                    <p className="text-3xl font-black text-white">{lockin.lockin_period_months} <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase ml-1">Months</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress & Growth Chart */}
                    <div className="lg:col-span-8 space-y-8">
                        {lockin.status === 'matured' && (
                            <button
                                onClick={handleClaim}
                                className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-bold text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 animate-pulse-subtle"
                            >
                                <ArrowUpRight size={24} />
                                Release Funds to Bank
                            </button>
                        )}

                        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 text-sm">Unlock Progress</h3>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                                    Unlocked {endDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                            <div className="relative h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                <div
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(37,99,235,0.5)] group"
                                    style={{ width: `${progressPercent}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-100 border border-slate-200" />
                                    Initiated {startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </div>
                                <div className="text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">{Math.round(progressPercent)}% Accomplished</div>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-bold text-slate-900 text-sm">Growth Projection</h3>
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <TrendingUp size={16} className="text-blue-600" />
                                </div>
                            </div>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={projectionData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.05} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="month"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
                                            dy={10}
                                        />
                                        <YAxis hide />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
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
                            </div>
                        </div>
                    </div>

                    {/* Security & Info */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-6">
                                <ShieldCheck size={20} className="text-blue-400" />
                            </div>
                            <h4 className="font-bold text-lg tracking-tight">Protected Growth</h4>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium">
                                Funds are held in a secure partnership vault. Rewards accumulate based on retention and are disbursed upon term completion.
                            </p>
                            <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-slate-500 font-bold uppercase tracking-wider">Disbursement</span>
                                    <span className="text-blue-400 font-black">Bank Transfer</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-slate-500 font-bold uppercase tracking-wider">Assurance</span>
                                    <span className="text-emerald-400 font-black flex items-center gap-1">
                                        <CheckCircle size={10} />
                                        VERIFIED
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-8">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Partnership Lifecycle</h4>
                            <div className="relative pl-8 space-y-8">
                                {/* Vertical Line */}
                                <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-100" />

                                {[
                                    { label: 'Initiated', date: startDate, active: true },
                                    { label: 'Growth Active', date: 'In Progress', active: progressPercent > 0 && progressPercent < 100 },
                                    { label: 'Fund Unlocked', date: endDate, active: progressPercent >= 100 },
                                    { label: 'Disbursement', date: lockin.status === 'paid_out' ? 'Completed' : 'Pending', active: lockin.status === 'paid_out' }
                                ].map((step, idx) => (
                                    <div key={idx} className="relative flex items-start gap-4">
                                        <div className={`absolute -left-5 w-2.5 h-2.5 rounded-full border-2 border-white ring-4 transition-all duration-500 ${step.active ? 'bg-blue-600 ring-blue-50 scale-125' : 'bg-slate-200 ring-slate-50'
                                            }`} />
                                        <div className="space-y-0.5">
                                            <p className={`text-[11px] font-black uppercase tracking-widest ${step.active ? 'text-slate-900' : 'text-slate-400'}`}>
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

                        <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100">
                            <div className="flex items-start gap-3">
                                <Info size={16} className="text-amber-600 mt-0.5" />
                                <div className="space-y-1">
                                    <h5 className="text-[10px] font-black text-amber-900 uppercase tracking-widest leading-none">Reward Policy</h5>
                                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
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
