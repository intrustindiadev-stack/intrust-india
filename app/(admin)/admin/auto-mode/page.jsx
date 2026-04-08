'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
    Sparkles, Users, Search, TrendingUp, Activity, Package, Building2, 
    ChevronRight, Wallet, BadgeCheck, Zap, ArrowLeft, BarChart3,
    Clock, Smartphone, Globe, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ── Stat Card Component ──────────────────────────────────────────────────────
function DashboardStat({ icon: Icon, label, value, subText, color = 'indigo' }) {
    const themes = {
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        violet: 'bg-violet-50 text-violet-600 border-violet-100',
    };
    return (
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between min-w-0">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 border ${themes[color]}`}>
                <Icon size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight mb-1 truncate">{label}</p>
                <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight truncate">{value}</p>
                {subText && <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 mt-1 truncate">{subText}</p>}
            </div>
        </div>
    );
}

export default function AutoModeAdminDashboard() {
    const [merchants, setMerchants] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedMerchantId, setSelectedMerchantId] = useState('ALL');
    const [totalSubsRevenue, setTotalSubsRevenue] = useState(0);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const res = await fetch('/api/admin/merchants', {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await res.json();
            
            const activeMerchants = (data.merchants || []).filter(m => m.auto_mode_status === 'active');
            const transformed = activeMerchants.map(m => ({
                id: m.id,
                userId: m.user_id,
                businessName: m.business_name || 'Unnamed Business',
                avatarUrl: m.avatar_url,
                phone: m.user_profiles?.phone || 'N/A',
                validUntil: m.auto_mode_valid_until,
                profitShare: m.commission_rate || 0.95
            }));

            setMerchants(transformed);
            setTotalSubsRevenue((data.totalSubscriptionRevenuePaise || 0));

            if (transformed.length > 0) {
                const { data: ordersData, error: ordersError } = await supabase
                    .from('shopping_order_groups')
                    .select('id, merchant_id, created_at, delivery_status, total_amount_paise, merchant_profit_paise, platform_cut_paise')
                    .in('merchant_id', transformed.map(m => m.id))
                    .order('created_at', { ascending: false })
                    .limit(1000);

                if (!ordersError && ordersData) {
                    setOrders(ordersData);
                }
            }
        } catch (error) {
            console.error('Admin Dash Fetch Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = useMemo(() => {
        let result = orders;
        if (selectedMerchantId !== 'ALL') {
            result = orders.filter(o => o.merchant_id === selectedMerchantId);
        }
        if (search) {
            result = result.filter(o => o.id.includes(search) || (o.total_amount_paise/100).toString().includes(search));
        }
        return result;
    }, [orders, selectedMerchantId, search]);

    const stats = useMemo(() => {
        const delivered = filteredOrders.filter(o => o.delivery_status === 'delivered');
        const revenue = delivered.reduce((s, o) => s + (o.total_amount_paise || 0), 0);
        const platformCut = delivered.reduce((s, o) => s + (o.platform_cut_paise || 0), 0);
        return {
            orderCount: filteredOrders.length,
            deliveredCount: delivered.length,
            revenue,
            platformCut,
            successRate: filteredOrders.length > 0 ? Math.round((delivered.length / filteredOrders.length) * 100) : 0
        };
    }, [filteredOrders]);

    const activeMerchant = merchants.find(m => m.id === selectedMerchantId);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                    <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
                </div>
                <p className="mt-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Initializing Control Grid</p>
            </div>
        );
    }

    const fmt = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`;

    return (
        <div className="min-h-screen bg-[#f1f5f9] pb-24">
            {/* ── Premium Hero Header ── */}
            <div className="bg-[#0f172a] pt-16 pb-40 px-6 relative overflow-hidden shadow-2xl">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img src="/automode_hub_v2.png" alt="" className="w-full h-full object-cover opacity-30 mix-blend-luminosity" />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/80 via-[#0f172a]/60 to-[#0f172a]" />
                </div>

                {/* Background Decor Props */}
                <div className="absolute top-0 right-0 w-1/3 h-full bg-indigo-500/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-emerald-500/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />
                
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="max-w-xl">
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 backdrop-blur-md rounded-full border border-indigo-400/20 text-indigo-100 mb-6">
                                <Sparkles size={12} className="text-indigo-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Global Automation Grid</span>
                            </motion.div>
                            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                className="text-5xl md:text-6xl font-black text-white tracking-tight leading-[0.9] mb-4">
                                Auto Mode Hub
                            </motion.h1>
                            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                className="text-slate-400 text-base md:text-lg font-medium leading-relaxed">
                                Monitoring {merchants.length} live merchants and handling thousands of automated transactions in real-time with zero-latency execution.
                            </motion.p>
                        </div>
                        
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                            className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-10 shadow-3xl w-full md:w-auto relative group overflow-hidden">
                            <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="text-center sm:text-left relative z-10">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 opacity-80">Network Volume</p>
                                <p className="text-3xl sm:text-4xl font-black text-white tracking-tighter">{fmt(orders.reduce((s, o) => s + (o.total_amount_paise || 0), 0))}</p>
                            </div>
                            <div className="hidden sm:block h-16 w-px bg-white/10" />
                            <div className="block sm:hidden h-px w-full bg-white/10" />
                            <div className="text-center sm:text-left relative z-10">
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1.5 opacity-80">Subs Revenue</p>
                                <p className="text-3xl sm:text-4xl font-black text-white tracking-tighter">{fmt(totalSubsRevenue)}</p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* ── Main Dashboard Content ── */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-24 relative z-20 mb-20">
                
                {/* 1. Quick Global Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    <DashboardStat icon={Users} label="Live Network" value={merchants.length} subText="Active Merchants" color="indigo" />
                    <DashboardStat icon={TrendingUp} label="Processing" value={stats.orderCount} subText="Gross Orders" color="amber" />
                    <DashboardStat icon={ShieldCheck} label="Success Rate" value={`${stats.successRate}%`} subText={`${stats.deliveredCount} Delivered`} color="emerald" />
                    <DashboardStat icon={Zap} label="Platform Fee" value={fmt(stats.platformCut)} subText="Auto Mode Commissions" color="violet" />
                </div>

                {/* 2. Primary Search & Controls (Now at Top) */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-4 md:p-6 mb-8 flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search by Order ID, amount or customer..."
                            className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs font-black text-slate-500 flex-1 md:flex-none">
                            <BarChart3 size={14} /> {filteredOrders.length} Results
                        </div>
                        {activeMerchant && (
                            <Link href={`/admin/auto-mode/${activeMerchant.id}`}
                                className="h-11 px-5 bg-indigo-600 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex-1 md:flex-none whitespace-nowrap">
                                View Profile <ChevronRight size={14} />
                            </Link>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* 3. Merchant Selector (Side Panel) */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden sticky top-8">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 uppercase tracking-wider">
                                    <Globe size={16} className="text-indigo-600" /> Merchant Grid
                                </h3>
                                <div className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{merchants.length}</div>
                            </div>
                            
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar p-3 space-y-2">
                                {/* Global Toggle */}
                                <button onClick={() => setSelectedMerchantId('ALL')}
                                    className={`w-full group flex items-center gap-4 p-4 rounded-2xl transition-all ${selectedMerchantId === 'ALL' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 active:scale-[0.98]' : 'hover:bg-slate-50 text-slate-600'}`}>
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all ${selectedMerchantId === 'ALL' ? 'bg-white/20 border-white/20' : 'bg-slate-100 border-slate-200'}`}>
                                        <Activity size={20} />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="text-sm font-black tracking-tight">Unified View</p>
                                        <p className={`text-[10px] font-bold ${selectedMerchantId === 'ALL' ? 'text-indigo-200' : 'text-slate-400'}`}>Aggregated Dashboard</p>
                                    </div>
                                    {selectedMerchantId === 'ALL' && <ChevronRight size={16} className="text-indigo-300" />}
                                </button>

                                {/* List */}
                                {merchants.map(m => (
                                    <button key={m.id} onClick={() => setSelectedMerchantId(m.id)}
                                        className={`w-full group flex items-center gap-4 p-4 rounded-2xl transition-all ${selectedMerchantId === m.id ? 'bg-slate-800 text-white shadow-lg shadow-slate-200 active:scale-[0.98]' : 'hover:bg-slate-50 text-slate-600'}`}>
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border overflow-hidden transition-all ${selectedMerchantId === m.id ? 'bg-white border-white/20' : 'bg-white border-slate-200 shadow-sm'}`}>
                                            {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : <Building2 size={18} className="text-slate-400" />}
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <p className="text-sm font-black tracking-tight truncate">{m.businessName}</p>
                                            <p className={`text-[10px] font-bold ${selectedMerchantId === m.id ? 'text-slate-400' : 'text-slate-400'}`}>
                                                {orders.filter(o => o.merchant_id === m.id).length} Orders Processed
                                            </p>
                                        </div>
                                        {selectedMerchantId === m.id && <ChevronRight size={16} className="text-slate-500" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 4. Orders Feed */}
                    <div className="lg:col-span-8 space-y-4">

                        {/* Order Grid/List */}
                        <div className="grid grid-cols-1 gap-4">
                            <AnimatePresence mode='popLayout'>
                                {filteredOrders.length === 0 ? (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-[2rem] border border-slate-200 border-dashed py-20 text-center flex flex-col items-center">
                                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                            <Package size={32} className="text-slate-200" />
                                        </div>
                                        <h3 className="font-black text-slate-700">No Orders Cached</h3>
                                        <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">Try adjusting your filters or selecting a different merchant.</p>
                                    </motion.div>
                                ) : (
                                    filteredOrders.map((order, idx) => {
                                        const m = merchants.find(mer => mer.id === order.merchant_id);
                                        const status = order.delivery_status || 'pending';
                                        const isDelivered = status === 'delivered';
                                        return (
                                            <motion.div key={order.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                                            >
                                                <Link href={`/admin/shopping/orders/${order.id}`}
                                                    className="group block bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/5 transition-all active:scale-[0.99]">
                                                    <div className="p-5 flex items-center gap-4">
                                                        {/* Status Icon */}
                                                        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border transition-colors ${isDelivered ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:border-indigo-100 group-hover:text-indigo-600'}`}>
                                                            <p className="text-[14px] font-black leading-none">#{order.id.slice(-4).toUpperCase()}</p>
                                                        </div>
                                                        
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${isDelivered ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                                    {status}
                                                                </span>
                                                                {selectedMerchantId === 'ALL' && m && (
                                                                    <span className="text-[10px] font-bold text-slate-400 truncate flex items-center gap-1">
                                                                        <Building2 size={10} /> {m.businessName}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-baseline gap-2">
                                                                <p className="text-xl font-black text-slate-800 tracking-tight">{fmt(order.total_amount_paise)}</p>
                                                                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                                                    <Clock size={10} /> {new Date(order.created_at).toLocaleDateString('en-IN', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Profit Indicator */}
                                                        <div className="text-right hidden sm:block">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Platform Fee</p>
                                                            <p className="text-sm font-black text-indigo-600">+{fmt(order.platform_cut_paise || 0)}</p>
                                                        </div>
                                                        
                                                        <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                                    </div>
                                                </Link>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
