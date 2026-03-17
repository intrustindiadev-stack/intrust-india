'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
    Clock, 
    Calendar, 
    ArrowLeft, 
    ShieldCheck, 
    TrendingUp, 
    CheckCircle, 
    XCircle,
    Building2,
    CalendarDays,
    ArrowUpRight,
    Wallet,
    Info,
    ChevronLeft
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

export default function LockinDetailsPage({ params }) {
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
                    .select('*, merchant:merchants(*, user_profiles(*))')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setLockin(data);
            } catch (err) {
                console.error('Error:', err);
                toast.error('Failed to load contract details');
                router.push('/admin/lockin');
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [id, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/50">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Decrypting Contract Vault...</p>
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

    // Projection data for this specific contract
    const projectionData = [];
    for (let i = 0; i <= lockin.lockin_period_months; i++) {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + i);
        const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        const principal = lockin.amount_paise / 100;
        const interest = principal * (lockin.interest_rate / 100) * (i / 12);
        projectionData.push({ month: label, value: principal + interest });
    }

    return (
        <div className="p-6 bg-[#FAFBFC] min-h-screen font-sans selection:bg-blue-100">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Minimal Header */}
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push('/admin/lockin')}
                        className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm group"
                    >
                        <ChevronLeft size={20} className="text-slate-600 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            Partnership Detail
                            <span className="text-[10px] font-black text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-tighter">#{lockin.id.slice(0, 8)}</span>
                        </h1>
                        <p className="text-xs font-medium text-slate-500">Fund Management & Compliance Oversight</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left side - Summary & Stats */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Principal Card */}
                        <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-200/50">
                            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                                <div className="space-y-4">
                                    <div className="p-2 bg-blue-500/20 w-fit rounded-xl">
                                        <ShieldCheck size={20} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-80">Partnership Capital</p>
                                        <h2 className="text-5xl font-bold tracking-tighter mt-1">₹{(lockin.amount_paise / 100).toLocaleString('en-IN')}</h2>
                                    </div>
                                    <div className="flex items-center gap-6 pt-2">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Reward Rate</p>
                                            <p className="text-lg font-bold text-blue-400">{lockin.interest_rate}% <span className="text-[10px] text-slate-500">Bonus</span></p>
                                        </div>
                                        <div className="w-px h-8 bg-white/10" />
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Retention Term</p>
                                            <p className="text-lg font-bold">{lockin.lockin_period_months} Months</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                     <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                                        lockin.status === 'active' 
                                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            : lockin.status === 'matured'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                    }`}>
                                        {lockin.status}
                                    </span>
                                    <p className="text-[9px] text-slate-500 font-medium">Secured on {startDate.toLocaleDateString('en-IN')}</p>
                                </div>
                            </div>
                            {/* Abstract Glow */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full" />
                        </div>

                        {/* Progress Tracker */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-900">Unlock Progress</h3>
                                <div className="flex items-center gap-2">
                                    <CalendarDays size={16} className="text-slate-400" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        {Math.round(progressPercent)}% Time Elapsed
                                    </span>
                                </div>
                            </div>
                            <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="absolute inset-y-0 left-0 bg-blue-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] font-black text-slate-400 tracking-widest uppercase italic">
                                <div>START: {startDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</div>
                                <div>UNLOCKS: {endDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</div>
                            </div>
                        </div>

                        {/* Projection Chart */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-8">Growth Projection</h3>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={projectionData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.05}/>
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="month" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{fontSize: 10, fill: '#94a3b8'}}
                                            dy={10}
                                        />
                                        <YAxis hide />
                                        <RechartsTooltip 
                                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                            formatter={(value) => [`₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 'Projected Value']}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="value" 
                                            stroke="#2563eb" 
                                            strokeWidth={3}
                                            fillOpacity={1} 
                                            fill="url(#colorValue)" 
                                            activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Right side - Partner & Security */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* Merchant Snapshot */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Partner Merchant</h4>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 font-bold text-xl">
                                    {lockin.merchant?.business_name?.[0]}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 tracking-tight">{lockin.merchant?.business_name}</p>
                                    <p className="text-xs text-slate-500">{lockin.merchant?.user_profiles?.full_name}</p>
                                </div>
                            </div>
                            <div className="mt-6 space-y-3">
                                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                    <span className="text-xs text-slate-500 font-medium">Merchant ID</span>
                                    <span className="text-xs font-bold text-slate-900 uppercase tracking-tight italic">MID-{lockin.merchant?.id.slice(0, 8)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500 font-medium">Account Status</span>
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                                        <CheckCircle size={14} />
                                        VERIFIED
                                    </span>
                                </div>
                            </div>
                            <button className="w-full mt-6 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all border border-slate-100 flex items-center justify-center gap-2">
                                <Building2 size={14} />
                                View Profile
                            </button>
                        </div>

                        {/* Security Ledger */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                                    <ShieldCheck size={16} />
                                </div>
                                <h4 className="text-sm font-bold text-slate-900">Settlement Security</h4>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="w-1 h-1 rounded-full bg-slate-200 mt-2 shrink-0" />
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Funds are held in a platform-managed escrow account and are not withdrawable by the merchant until maturity.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-1 h-1 rounded-full bg-slate-200 mt-2 shrink-0" />
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Bonuses are credited automatically to the merchant's bank account or wallet on <span className="font-bold text-slate-700">{endDate.toLocaleDateString('en-IN')}</span>.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                                    <Wallet size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auto-Settlement</p>
                                    <p className="text-xs font-bold text-slate-900">Active Enabled</p>
                                </div>
                            </div>
                        </div>

                        {/* Compliance Notice */}
                        <div className="p-6 rounded-3xl border border-blue-100 bg-blue-50/30">
                            <div className="flex items-start gap-3">
                                <Info size={16} className="text-blue-500 mt-0.5" />
                                <div className="space-y-1">
                                    <h5 className="text-xs font-bold text-blue-900 uppercase tracking-tight">System Compliance</h5>
                                    <p className="text-[10px] text-blue-700 leading-relaxed">
                                        This contract is governed by the platform's liquidity protocol. Any manual cancellation requires administrative override.
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
