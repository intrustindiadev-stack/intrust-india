'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { 
    ArrowLeft, Clock, Package, TrendingUp, Sparkles, Building2, 
    Eye, FileText, CheckCircle2, XCircle, ShoppingBag, 
    BarChart3, Calendar, Phone, Mail, User, Wallet, Zap,
    TrendingDown, ChevronRight, Activity, Globe, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ── Mini Bar Chart (Admin Version) ───────────────────────────────────────────
function MiniBarChart({ data, color = '#6366f1' }) {
    const max = Math.max(...data.map(d => d.value), 1);
    const [hovered, setHovered] = useState(null);

    return (
        <div className="relative">
            {hovered !== null && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 shadow-xl text-white text-[10px] font-black px-3 py-1.5 rounded-xl whitespace-nowrap z-30 pointer-events-none flex flex-col items-center">
                    <span className="text-[8px] text-slate-400 uppercase tracking-widest">{data[hovered]?.label}</span>
                    <span>₹{(data[hovered]?.value / 100).toLocaleString('en-IN')}</span>
                </div>
            )}
            <div className="flex items-end gap-[4px] h-24 pt-4">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5 cursor-pointer group"
                        onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                        <motion.div
                            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                            transition={{ delay: i * 0.02, duration: 0.5, ease: 'circOut' }}
                            style={{ 
                                height: `${Math.max((d.value / max) * 100, 6)}%`, 
                                backgroundColor: hovered === i ? '#4f46e5' : color, 
                                originY: 1 
                            }}
                            className={`w-full rounded-t-md transition-all duration-200 ${hovered === i ? 'opacity-100 shadow-[0_0_12px_rgba(79,70,229,0.3)]' : 'opacity-80'}`}
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-between mt-3 px-1">
                {data.filter((_, i) => i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1).map((d, i) => (
                    <span key={i} className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{d.label}</span>
                ))}
            </div>
        </div>
    );
}

// ── Stats Row Component ──────────────────────────────────────────────────────
function DetailStat({ icon: Icon, label, value, sub, color = 'indigo' }) {
    const themes = {
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
    };
    return (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${themes[color]}`}>
                <Icon size={18} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none">{label}</p>
                <p className="text-lg font-black text-slate-800 tracking-tight truncate">{value}</p>
                {sub && <p className="text-[10px] text-slate-400 font-bold mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export default function AutoMerchantDetailsClient({ merchantId }) {
    const router = useRouter();
    const [merchant, setMerchant] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [chartPeriod, setChartPeriod] = useState(14); // 7, 14, 30

    useEffect(() => {
        fetchDetails();
    }, [merchantId]);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const { data: merchantData, error: merchantError } = await supabase
                .from('merchants')
                .select('*, user_profiles:user_id ( full_name, phone, email )')
                .eq('id', merchantId)
                .single();

            if (merchantError) throw merchantError;
            setMerchant(merchantData);

            const { data: ordersData, error: ordersError } = await supabase
                .from('shopping_order_groups')
                .select('id, created_at, delivery_status, total_amount_paise, merchant_profit_paise, platform_cut_paise, customer_name')
                .eq('merchant_id', merchantId)
                .order('created_at', { ascending: false })
                .limit(500);

            if (ordersError) throw ordersError;
            setOrders(ordersData || []);

        } catch (err) {
            console.error('Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Derived Metrics ──
    const metrics = useMemo(() => {
        const delivered = orders.filter(o => o.delivery_status === 'delivered');
        const grossRevenue = delivered.reduce((s, o) => s + (o.total_amount_paise || 0), 0);
        const platformCut = delivered.reduce((s, o) => s + (o.platform_cut_paise || 0), 0);
        const merchantProfit = delivered.reduce((s, o) => s + (o.merchant_profit_paise || 0), 0);
        
        return {
            totalOrders: orders.length,
            deliveredCount: delivered.length,
            grossRevenue,
            platformCut,
            merchantProfit,
            successRate: orders.length > 0 ? Math.round((delivered.length / orders.length) * 100) : 0
        };
    }, [orders]);

    // ── Chart Logic ──
    const chartData = useMemo(() => {
        const days = [];
        for (let i = chartPeriod - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0,0,0,0);
            const next = new Date(d); next.setDate(next.getDate() + 1);
            
            const dayOrders = orders.filter(o => {
                const t = new Date(o.created_at);
                return t >= d && t < next;
            });
            
            days.push({
                label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                value: dayOrders.reduce((s, o) => s + (o.platform_cut_paise || 0), 0), // Focusing on platform cut for admin
                count: dayOrders.length
            });
        }
        return days;
    }, [orders, chartPeriod]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Analyzing Merchant DNA</p>
            </div>
        </div>
    );

    if (error || !merchant) return (
        <div className="p-8 text-center bg-rose-50 text-rose-600 rounded-3xl m-8 border border-rose-100">
            <p className="font-black text-lg mb-2">Access Grid Failure</p>
            <p className="text-sm font-bold opacity-70 mb-6">{error || 'Merchant not found'}</p>
            <button onClick={() => router.back()} className="px-6 py-2.5 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-rose-700 transition-all">Back to Network</button>
        </div>
    );

    const isAutoActive = merchant.auto_mode_status === 'active';
    const fmt = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`;

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-24">
            {/* ── Sticky Header ── */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Merchant Profile</p>
                        <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none">{merchant.business_name}</h1>
                    </div>
                </div>
                <div className="flex gap-2">
                    {merchant.user_profiles?.phone && (
                        <a href={`tel:${merchant.user_profiles.phone}`} className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-all">
                            <Phone size={18} />
                        </a>
                    )}
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
                
                {/* ── Hero Status Card ── */}
                <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl relative p-8 md:p-12">
                    {/* Background Visuals */}
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/5 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center justify-between">
                        <div className="flex items-center gap-8 text-center md:text-left">
                            <div className="w-24 h-24 rounded-3xl bg-white shadow-2xl p-1 shrink-0 overflow-hidden border-2 border-indigo-500/20">
                                {merchant.avatar_url ? <img src={merchant.avatar_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200"><Building2 size={40} /></div>}
                            </div>
                            <div>
                                <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                                    <h2 className="text-3xl font-black text-white tracking-tight">{merchant.business_name}</h2>
                                    {isAutoActive ? (
                                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE AUTO
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full">STANDBY</span>
                                    )}
                                </div>
                                <div className="flex flex-wrap justify-center md:justify-start items-center gap-y-2 gap-x-6 text-slate-400 text-sm">
                                    <p className="flex items-center gap-2"><User size={14} className="text-slate-500" /> {merchant.user_profiles?.full_name}</p>
                                    <p className="flex items-center gap-2"><Mail size={14} className="text-slate-500" /> {merchant.user_profiles?.email || 'No email'}</p>
                                    <p className="flex items-center gap-2"><Phone size={14} className="text-slate-500" /> {merchant.user_profiles?.phone}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 p-6 min-w-[240px]">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3 flex items-center justify-between">
                                License Status <Clock size={12} className="text-slate-500" />
                            </p>
                            {merchant.auto_mode_valid_until ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <p className={`text-2xl font-black ${isAutoActive ? 'text-white' : 'text-rose-400'}`}>{isAutoActive ? 'Valid' : 'Expired'}</p>
                                        <p className="text-[10px] font-bold text-slate-500 pb-1">Expires {new Date(merchant.auto_mode_valid_until).toLocaleDateString('en-IN', {month:'short', day:'numeric'})}</p>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: isAutoActive ? '100%' : '0%' }} className="h-full bg-indigo-500 rounded-full" />
                                    </div>
                                    <div className="flex justify-between text-[11px] font-bold text-slate-300">
                                        <span>Full Automation</span>
                                        <span className="flex items-center gap-1"><Zap size={10} className="text-[#D4AF37]" /> PRO</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-4 text-center">
                                    <p className="text-slate-500 text-xs font-bold">No Active License</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Dashboard Content ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left: Analytics */}
                    <div className="lg:col-span-8 space-y-6">
                        
                        {/* Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <DetailStat icon={TrendingUp} label="Gross Rev" value={fmt(metrics.grossRevenue)} color="indigo" />
                            <DetailStat icon={Package} label="Orders" value={metrics.totalOrders} color="amber" />
                            <DetailStat icon={ShieldCheck} label="Sucess" value={`${metrics.successRate}%`} color="emerald" />
                            <DetailStat icon={Zap} label="Platform" value={fmt(metrics.platformCut)} color="rose" />
                        </div>

                        {/* Revenue Split Card */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp size={16} className="text-indigo-600" /> Revenue Ecosystem
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">Breakdown of gross sales into merchant & platform share</p>
                                </div>
                                <div className="flex gap-1.5 p-1 bg-slate-50 rounded-xl">
                                    {[7, 14, 30].map(p => (
                                        <button key={p} onClick={() => setChartPeriod(p)}
                                            className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${chartPeriod === p ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                                            {p} Days
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
                                {/* Visual breakdown */}
                                <div className="md:col-span-4 space-y-6">
                                    <div>
                                        <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                            <span>Merchant Share</span>
                                            <span className="text-slate-800">{((metrics.merchantProfit / Math.max(metrics.grossRevenue, 1)) * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${(metrics.merchantProfit / Math.max(metrics.grossRevenue, 1)) * 100}%` }} className="h-full bg-slate-900 rounded-full" />
                                        </div>
                                        <p className="text-lg font-black text-slate-800 mt-2">{fmt(metrics.merchantProfit)}</p>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                            <span>Platform Cut</span>
                                            <span className="text-indigo-600">{((metrics.platformCut / Math.max(metrics.grossRevenue, 1)) * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${(metrics.platformCut / Math.max(metrics.grossRevenue, 1)) * 100}%` }} className="h-full bg-indigo-500 rounded-full" />
                                        </div>
                                        <p className="text-lg font-black text-indigo-600 mt-2">{fmt(metrics.platformCut)}</p>
                                    </div>
                                </div>

                                {/* Graph */}
                                <div className="md:col-span-8 bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Daily Platform Cut</span>
                                        <TrendingUp size={14} className="text-indigo-600" />
                                    </div>
                                    <MiniBarChart data={chartData} color="#6366f1" />
                                </div>
                            </div>
                        </div>

                        {/* Recent Order Activity */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                                    <Activity size={16} className="text-indigo-600" /> Automation Log
                                </h3>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last {orders.length} events</div>
                            </div>
                            
                            <div className="divide-y divide-slate-50">
                                {orders.length === 0 ? (
                                    <div className="p-20 text-center">
                                        <ShoppingBag size={48} className="mx-auto text-slate-100 mb-4" />
                                        <p className="text-slate-400 text-sm font-bold">No data processed yet</p>
                                    </div>
                                ) : (
                                    orders.slice(0, 10).map((o, idx) => (
                                        <Link key={o.id} href={`/admin/shopping/orders/${o.id}`}
                                            className="p-5 flex items-center justify-between hover:bg-slate-50 transition-all group">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                                                    <span className="text-[8px] font-black text-slate-400 group-hover:text-indigo-400">#ORD</span>
                                                    <span className="text-[13px] font-black text-slate-800 group-hover:text-indigo-600">{o.id.slice(-4).toUpperCase()}</span>
                                                </div>
                                                <div>
                                                    <p className="text-[15px] font-black text-slate-800 tracking-tight">{fmt(o.total_amount_paise)}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${o.delivery_status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                                                            {o.delivery_status || 'pending'}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                            <Clock size={10} /> {new Date(o.created_at).toLocaleDateString('en-IN', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Platform</p>
                                                    <p className="text-[13px] font-black text-indigo-600">{fmt(o.platform_cut_paise || 0)}</p>
                                                </div>
                                                <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                            <div className="p-4 bg-slate-50 text-center border-t border-slate-50">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">End of recent log</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Info & Actions */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Summary Card */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full" />
                            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Sparkles size={14} className="text-indigo-600"/> Merchant Insights
                            </h3>
                            <div className="space-y-5">
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-slate-400">Network Weight</span>
                                    <span className="text-slate-800">High Reliability</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-slate-400">Commission Rate</span>
                                    <span className="text-slate-800">{((1 - (merchant.commission_rate || 0.95)) * 100).toFixed(0)}% Fee</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-slate-400">Onboarding Date</span>
                                    <span className="text-slate-800">{new Date(merchant.created_at).toLocaleDateString('en-IN', {month:'long', year:'numeric'})}</span>
                                </div>
                                <div className="h-px bg-slate-100" />
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                <CheckCircle2 size={16} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600">Verification</span>
                                        </div>
                                        <span className="text-[10px] font-black text-emerald-600 uppercase">Verified</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                <Building2 size={14} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600">Business KYC</span>
                                        </div>
                                        <span className="text-[10px] font-black text-indigo-600 uppercase">Submitted</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action List */}
                        <div className="bg-slate-900 rounded-[2rem] p-6 shadow-xl border border-white/5">
                            <h3 className="text-white/40 font-black text-[10px] uppercase tracking-widest mb-4">Command Center</h3>
                            <div className="space-y-2">
                                <Link href={`/admin/merchants/${merchant.id}`} 
                                    className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl group transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                            <Building2 size={16} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-white font-black text-xs">Standard Profile</p>
                                            <p className="text-white/30 text-[9px] font-bold">Full Identity Details</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-white/20 group-hover:text-white" />
                                </Link>
                                
                                <button className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-rose-500/20 rounded-2xl group transition-all border border-transparent hover:border-rose-500/30">
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/20 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-all">
                                            <TrendingDown size={16} />
                                        </div>
                                        <div>
                                            <p className="text-white font-black text-xs">Disable Auto Mode</p>
                                            <p className="text-white/30 text-[9px] font-bold uppercase tracking-tighter">Emergency Override</p>
                                        </div>
                                    </div>
                                    <Activity size={14} className="text-white/20 group-hover:text-rose-400" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
