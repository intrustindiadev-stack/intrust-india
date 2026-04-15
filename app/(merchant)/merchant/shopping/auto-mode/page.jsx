'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Power, Crown, CheckCircle2, ChevronRight, Activity, Wallet,
    ShieldCheck, Zap, Truck, Package, Clock, TrendingUp, BarChart2,
    ArrowLeft, TrendingDown, IndianRupee, Star, AlertTriangle, Sparkles, PlusCircle
} from 'lucide-react';
import Link from 'next/link';
import { useSubscription } from '@/components/merchant/SubscriptionContext';
import LiveButton from '@/components/merchant/LiveButton';

// ─── Mini Bar Chart ──────────────────────────────────────────────────────────
function MiniBarChart({ data }) {
    // Find the max value across all bars (profits and cuts) to scale correctly
    const max = Math.max(...data.flatMap(d => [d.profit, d.cut]), 1);
    const [hovered, setHovered] = useState(null);

    return (
        <div className="relative">
            <AnimatePresence>
                {hovered !== null && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10, x: '-50%' }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, scale: 0.9, y: 10, x: '-50%' }}
                        className="absolute -top-16 left-1/2 bg-slate-900 shadow-2xl text-white text-[10px] font-black px-3 py-2 rounded-xl whitespace-nowrap z-30 pointer-events-none flex flex-col items-center border border-white/10"
                    >
                        <span className="text-[8px] text-slate-400 uppercase tracking-widest leading-none mb-1.5">{data[hovered]?.label}</span>
                        <div className="flex gap-3">
                            <div className="flex flex-col items-center">
                                <span className="text-emerald-400">₹{(data[hovered]?.profit / 100).toLocaleString('en-IN')}</span>
                                <span className="text-[7px] text-slate-500 uppercase tracking-tighter">Profit</span>
                            </div>
                            <div className="w-px h-4 bg-white/10 self-center" />
                            <div className="flex flex-col items-center">
                                <span className="text-rose-400">₹{(data[hovered]?.cut / 100).toLocaleString('en-IN')}</span>
                                <span className="text-[7px] text-slate-500 uppercase tracking-tighter">Fees</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="flex items-end gap-[6px] h-28 pt-4">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 flex items-end justify-center gap-[2px] h-full cursor-pointer group"
                        onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                        {/* Profit Bar */}
                        <motion.div
                            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                            transition={{ delay: i * 0.02, duration: 0.5, ease: 'circOut' }}
                            style={{
                                height: `${Math.max((d.profit / max) * 100, 4)}%`,
                                originY: 1
                            }}
                            className={`flex-1 min-w-[4px] rounded-t-sm transition-all duration-200 bg-emerald-500 ${hovered === i ? 'opacity-100 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'opacity-60 group-hover:opacity-80'}`}
                        />
                        {/* Cut Bar */}
                        <motion.div
                            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                            transition={{ delay: i * 0.02 + 0.1, duration: 0.5, ease: 'circOut' }}
                            style={{
                                height: `${Math.max((d.cut / max) * 100, 4)}%`,
                                originY: 1
                            }}
                            className={`flex-1 min-w-[4px] rounded-t-sm transition-all duration-200 bg-rose-500 ${hovered === i ? 'opacity-100 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'opacity-40 group-hover:opacity-60'}`}
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-between mt-3 px-1 border-t border-slate-50 pt-2">
                {data.filter((_, i) => i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1).map((d, i) => (
                    <span key={i} className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{d.label}</span>
                ))}
            </div>
        </div>
    );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent = 'indigo', delay = 0, trend = null }) {
    const colors = {
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        violet: 'bg-violet-50 text-violet-600',
    };
    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
            className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colors[accent]}`}>
                <Icon size={16} />
            </div>
            {trend !== null && (
                <div className={`absolute top-4 right-4 flex items-center gap-0.5 text-[10px] font-black ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {Math.abs(trend).toFixed(0)}%
                </div>
            )}
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{label}</p>
            <p className="text-xl font-black text-slate-800 mt-1 leading-none">{value}</p>
            {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
        </motion.div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AutoModePage() {
    const { performAction } = useSubscription();
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [merchant, setMerchant] = useState(null);
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [walletBalance, setWalletBalance] = useState(0);
    const [timeLeft, setTimeLeft] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'orders'
    const [chartPeriod, setChartPeriod] = useState(7); // 7 | 14 | 30

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: merchantData } = await supabase
                .from('merchants')
                .select('*, auto_mode, auto_mode_months_paid, auto_mode_valid_until, subscription_expires_at')
                .eq('user_id', session.user.id)
                .single();

            setMerchant(merchantData);

            if (merchantData?.id) {
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                const { data: ordersData } = await supabase
                    .from('shopping_order_groups')
                    .select('id, created_at, delivery_status, payment_method, total_amount_paise, merchant_profit_paise, platform_cut_paise, customer_name, customer_phone')
                    .eq('merchant_id', merchantData.id)
                    .gte('created_at', thirtyDaysAgo)
                    .order('created_at', { ascending: false })
                    .limit(100);

                setOrders(ordersData || []);
            }

            const walletRes = await fetch('/api/wallet/balance', {
                headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store'
            });
            if (walletRes.ok) {
                const w = await walletRes.json();
                setWalletBalance(parseFloat(w.wallet?.balance || 0));
            }
        } catch (err) {
            setError('Failed to load auto mode data.');
        } finally {
            setLoading(false);
        }
    };

    const hasValidSub = merchant?.auto_mode_valid_until && new Date(merchant.auto_mode_valid_until) > new Date();

    useEffect(() => { fetchData(); }, []);

    // Countdown timer for Auto Mode feature specifically
    useEffect(() => {
        if (!merchant?.auto_mode_valid_until) return;

        const calculateTimeLeft = () => {
            const difference = new Date(merchant.auto_mode_valid_until) - new Date();
            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
            } else {
                setTimeLeft('Expired');
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [merchant?.auto_mode_valid_until]);

    // ── Derived stats ──
    const stats = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 7);
        const prevWeekStart = new Date(now); prevWeekStart.setDate(prevWeekStart.getDate() - 14);

        const delivered = orders.filter(o => o.delivery_status === 'delivered');
        const pending = orders.filter(o => ['pending', 'packed'].includes(o.delivery_status));
        const cancelled = orders.filter(o => o.delivery_status === 'cancelled');

        const totalRevenue = delivered.reduce((s, o) => s + (o.total_amount_paise || 0), 0);
        const totalProfit = delivered.reduce((s, o) => s + (o.merchant_profit_paise || 0), 0);
        const totalPlatformCut = delivered.reduce((s, o) => s + (o.platform_cut_paise || 0), 0);

        const currentWeekProfit = delivered
            .filter(o => new Date(o.created_at) >= weekStart)
            .reduce((s, o) => s + (o.merchant_profit_paise || 0), 0);

        const prevWeekProfit = delivered
            .filter(o => {
                const d = new Date(o.created_at);
                return d >= prevWeekStart && d < weekStart;
            })
            .reduce((s, o) => s + (o.merchant_profit_paise || 0), 0);

        const growth = prevWeekProfit > 0
            ? ((currentWeekProfit - prevWeekProfit) / prevWeekProfit) * 100
            : currentWeekProfit > 0 ? 100 : 0;

        const todayOrders = orders.filter(o => new Date(o.created_at) >= todayStart);
        const weekOrders = orders.filter(o => new Date(o.created_at) >= weekStart);
        const pendingRevenue = pending.reduce((s, o) => s + (o.total_amount_paise || 0), 0);

        return {
            totalOrders: orders.length,
            deliveredCount: delivered.length,
            pendingCount: pending.length,
            cancelledCount: cancelled.length,
            totalRevenue,
            totalProfit,
            totalPlatformCut,
            growth,
            todayCount: todayOrders.length,
            weekCount: weekOrders.length,
            pendingRevenue,
            successRate: orders.length > 0 ? Math.round((delivered.length / orders.length) * 100) : 0,
        };
    }, [orders]);

    // ── Chart Data ──
    const chartData = useMemo(() => {
        const days = [];
        for (let i = chartPeriod - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const next = new Date(d); next.setDate(next.getDate() + 1);
            const dayOrders = orders.filter(o => {
                const t = new Date(o.created_at);
                return t >= d && t < next;
            });
            days.push({
                label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                profit: dayOrders.reduce((s, o) => s + (o.merchant_profit_paise || 0), 0),
                cut: dayOrders.reduce((s, o) => s + (o.platform_cut_paise || 0), 0),
                count: dayOrders.length,
            });
        }
        return days;
    }, [orders, chartPeriod]);

    const isAutoModeActive = merchant?.auto_mode === true;
    const isFirstMonth = (merchant?.auto_mode_months_paid || 0) === 0;
    const subscriptionPrice = isFirstMonth ? 999 : 1999;

    const handleToggleAutoMode = async () => {
        performAction(async () => {
            if (isAutoModeActive) {
                // Turning OFF logic -> show warning modal first
                setShowWarningModal(true);
            } else {
                // Turning ON -> skip payment modal since subscription handles it now, just confirm or turn on immediately
                confirmActivation();
            }
        });
    };
    const confirmDeactivation = async () => {
        setProcessing(true);
        setShowWarningModal(false);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/auto-mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ action: 'deactivate' })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update Auto Mode status');

            setSuccess('Auto Mode has been deactivated.');
            await fetchData();
            setTimeout(() => setSuccess(null), 4000);
        } catch (err) {
            setError(err.message); setTimeout(() => setError(null), 5000);
        } finally { setProcessing(false); }
    };

    const confirmActivation = async () => {
        setProcessing(true);
        setError(null);
        setSuccess(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/auto-mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ action: 'activate' })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to update Auto Mode status');
            }

            setSuccess('Auto Mode activated successfully! Your storefront is now automated.');
            await fetchData();
            setShowPaymentModal(false);
            setTimeout(() => setSuccess(null), 4000);
        } catch (err) {
            console.error('Activation error:', err);
            setError(err.message || 'Failed to activate. Please try again.');
            setTimeout(() => setError(null), 5000);
        } finally {
            setProcessing(false);
        }
    };

    const getStatusStyle = (status) => ({
        delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        cancelled: 'bg-red-100 text-red-700 border-red-200',
        shipped: 'bg-blue-100 text-blue-700 border-blue-200',
        packed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        pending: 'bg-amber-100 text-amber-700 border-amber-200',
    }[status] || 'bg-slate-100 text-slate-600 border-slate-200');

    const fmt = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`;

    if (loading) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm font-bold">Loading Auto Mode...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-20">
            {/* Toast */}
            <AnimatePresence>
                {(error || success) && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-xs font-black shadow-xl border flex items-center gap-2 max-w-xs text-center ${error ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {error ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}{error || success}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Hero Card ── */}
            <div className={`relative rounded-[2rem] overflow-hidden flex flex-col items-center justify-center py-10 px-6 min-h-[360px] shadow-2xl transition-all duration-700 ${isAutoModeActive ? 'bg-[#0a140f]' : 'bg-[#0f111a]'}`}>
                {/* Animated bg glow */}
                {isAutoModeActive && (
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
                    </div>
                )}

                {/* Top bar */}
                <div className="absolute top-4 w-full px-5 flex justify-between items-center z-10">
                    <Link href="/merchant/dashboard" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white/60 hover:text-white backdrop-blur-md">
                        <ArrowLeft size={15} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <LiveButton />
                        <Link href="/merchant/wallet" className="flex items-center gap-1.5 bg-black/30 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 text-[11px] font-black text-white">
                            <Wallet size={12} className="text-[#D4AF37]" /> ₹{walletBalance.toFixed(2)}
                        </Link>
                        {!isAutoModeActive && (
                            <div className="flex items-center gap-1 bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] px-2.5 py-1.5 rounded-full text-[9px] font-black tracking-widest">
                                <Crown size={10} /> PRO
                            </div>
                        )}
                    </div>
                </div>

                {/* Status pulse dots */}
                <div className="flex gap-2 mb-4 mt-6">
                    {[0, 1, 2].map(i => (
                        <div key={i} className={`w-2 h-2 rounded-full ${isAutoModeActive ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-slate-700'}`}
                            style={{ animationDelay: `${i * 0.3}s` }} />
                    ))}
                </div>

                <motion.h1 key={isAutoModeActive ? 'on' : 'off'} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="text-white text-2xl font-black tracking-tight text-center">
                    {isAutoModeActive ? 'Autopilot Active' : 'Standby Mode'}
                </motion.h1>
                <p className="text-slate-400 mt-1.5 text-[11px] text-center max-w-[200px] leading-relaxed">
                    {isAutoModeActive ? 'Your shop runs on auto. Orders handled automatically.' : 'Activate to run your shop on autopilot.'}
                </p>

                {hasValidSub && (
                    <div className="mt-3 flex flex-col items-center gap-1.5 border border-white/10 p-2 px-4 rounded-xl bg-white/5 backdrop-blur-md">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${isAutoModeActive ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>
                            Plan Valid Until: {new Date(merchant.auto_mode_valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className={`${isAutoModeActive ? 'text-emerald-300' : 'text-slate-400'} font-mono text-[10px]`}>{timeLeft}</span>
                    </div>
                )}

                {/* Power toggle */}
                <div className="relative mt-7 z-10">
                    {isAutoModeActive && (
                        <>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-28 h-28 bg-emerald-500/10 rounded-full animate-ping opacity-75" style={{ animationDuration: '2.5s' }} />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-40 h-40 bg-emerald-500/5 rounded-full border border-emerald-500/10 animate-ping" style={{ animationDuration: '4s' }} />
                            </div>
                        </>
                    )}
                    <button disabled={processing}
                        onClick={() => {
                            if (isAutoModeActive) {
                                setShowWarningModal(true);
                            } else {
                                if (hasValidSub) {
                                    confirmActivation();
                                } else {
                                    setShowPaymentModal(true);
                                }
                            }
                        }}
                        className={`relative w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-70 shadow-2xl ${isAutoModeActive
                            ? 'bg-emerald-500/20 border-emerald-500 shadow-emerald-500/30'
                            : 'bg-slate-800 border-slate-600'}`}>
                        {processing
                            ? <Activity size={24} className="animate-spin text-[#D4AF37]" />
                            : <Power size={26} className={isAutoModeActive ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]' : 'text-slate-400'} />
                        }
                    </button>
                </div>
            </div>

            {/* ── Active: Stats + Chart ── */}
            {isAutoModeActive && (
                <>
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard icon={IndianRupee} label="Net Profit" value={fmt(stats.totalProfit)} sub="After fees" accent="emerald" delay={0.05} trend={stats.growth} />
                        <StatCard icon={TrendingUp} label="Gross Rev" value={fmt(stats.totalRevenue)} sub="30d Volume" accent="indigo" delay={0.1} />
                        <StatCard icon={Package} label="Today's Orders" value={stats.todayCount} sub={`${stats.weekCount} this week`} accent="amber" delay={0.15} />
                        <StatCard icon={Star} label="Success Rate" value={`${stats.successRate}%`} sub={`${stats.deliveredCount} delivered`} accent="violet" delay={0.2} />
                    </div>

                    {/* Revenue Ecosystem / Split */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
                        className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full" />
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles size={14} className="text-indigo-600" /> Revenue Ecosystem
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-1 font-medium italic">How your earnings are distributed</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div className="space-y-5">
                                <div>
                                    <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                        <span>Merchant Share</span>
                                        <span className="text-emerald-600">{((stats.totalProfit / Math.max(stats.totalRevenue, 1)) * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.totalProfit / Math.max(stats.totalRevenue, 1)) * 100}%` }}
                                            className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                                    </div>
                                    <p className="text-lg font-black text-slate-800 mt-2">{fmt(stats.totalProfit)}</p>
                                </div>
                                <div>
                                    <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                        <span>Platform Cut</span>
                                        <span className="text-rose-500">{((stats.totalPlatformCut / Math.max(stats.totalRevenue, 1)) * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.totalPlatformCut / Math.max(stats.totalRevenue, 1)) * 100}%` }}
                                            className="h-full bg-rose-500 rounded-full" />
                                    </div>
                                    <p className="text-lg font-black text-rose-500 mt-2">{fmt(stats.totalPlatformCut)}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Merchant Insights</p>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[11px] font-bold">
                                        <span className="text-slate-400">Profit Margin</span>
                                        <span className="text-slate-800">{((stats.totalProfit / Math.max(stats.totalRevenue, 1)) * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px] font-bold">
                                        <span className="text-slate-400">Avg. Order Value</span>
                                        <span className="text-slate-800">{fmt(stats.totalRevenue / Math.max(stats.totalOrders, 1))}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px] font-bold">
                                        <span className="text-slate-400">Success Integrity</span>
                                        <span className="text-emerald-600 flex items-center gap-1"><ShieldCheck size={10} /> High</span>
                                    </div>
                                    <div className="h-px bg-slate-200/50 my-1" />
                                    <p className="text-[10px] text-indigo-600 font-black italic">
                                        {stats.growth > 0
                                            ? `🚀 Profit is up ${stats.growth.toFixed(0)}% vs last week!`
                                            : stats.growth < 0
                                                ? `⚠️ Profit is down ${Math.abs(stats.growth).toFixed(0)}% vs last week.`
                                                : "✨ Steady performance this week."
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Profit Chart */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                                    <BarChart2 size={15} className="text-indigo-500" /> Daily Profit
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">Merchant earnings per day</p>
                            </div>
                            <div className="flex gap-1">
                                {[7, 14, 30].map(p => (
                                    <button key={p} onClick={() => setChartPeriod(p)}
                                        className={`text-[10px] font-black px-2.5 py-1 rounded-lg transition-all ${chartPeriod === p ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                        {p}d
                                    </button>
                                ))}
                            </div>
                        </div>
                        <MiniBarChart data={chartData} />
                        <div className="flex justify-between mt-3 pt-3">
                            <div className="text-center">
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Max Day</p>
                                <p className="text-xs font-black text-slate-700 mt-0.5">{fmt(Math.max(...chartData.map(d => d.profit), 0))}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Avg Profit</p>
                                <p className="text-xs font-black text-slate-700 mt-0.5">{fmt(chartData.reduce((s, d) => s + d.profit, 0) / Math.max(chartData.filter(d => d.profit > 0).length, 1))}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Total Profit</p>
                                <p className="text-xs font-black text-indigo-700 mt-0.5">{fmt(chartData.reduce((s, d) => s + d.profit, 0))}</p>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-4 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Merchant Profit</span>
                            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500 opacity-50" /> Platform Fees</span>
                        </div>
                    </motion.div>

                    {/* Order Status Breakdown */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h3 className="font-black text-slate-800 text-sm mb-3 flex items-center gap-2">
                            <Activity size={15} className="text-indigo-500" /> Order Status
                        </h3>
                        <div className="space-y-2.5">
                            {[
                                { label: 'Delivered', count: stats.deliveredCount, color: 'bg-emerald-500' },
                                { label: 'Pending / Packed', count: stats.pendingCount, color: 'bg-amber-400' },
                                { label: 'Cancelled', count: stats.cancelledCount, color: 'bg-red-400' },
                            ].map(({ label, count, color }) => (
                                <div key={label}>
                                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                                        <span>{label}</span><span>{count}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${(count / Math.max(stats.totalOrders, 1)) * 100}%` }}
                                            transition={{ duration: 0.7, ease: 'easeOut' }}
                                            className={`h-full rounded-full ${color}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        {stats.pendingRevenue > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
                                    <Clock size={11} className="text-amber-500" /> Pending Revenue
                                </span>
                                <span className="text-sm font-black text-amber-600">{fmt(stats.pendingRevenue)}</span>
                            </div>
                        )}
                    </motion.div>

                    {/* Tabs */}
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
                        {[{ id: 'overview', label: 'Overview' }, { id: 'orders', label: 'Orders Feed' }].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'overview' ? (
                        /* Recent activity summary */
                        <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-50">
                                <h3 className="font-black text-slate-800 text-sm">Recent Activity</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">Last 5 orders</p>
                            </div>
                            {orders.slice(0, 5).map(order => (
                                <Link key={order.id} href={`/merchant/shopping/orders/${order.id}`}
                                    className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                                    <div>
                                        <p className="text-sm font-black text-slate-800">{fmt(order.total_amount_paise || 0)}</p>
                                        <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                                            Profit: {fmt(order.merchant_profit_paise || 0)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${getStatusStyle(order.delivery_status)}`}>
                                            {order.delivery_status}
                                        </span>
                                        <ChevronRight size={13} className="text-slate-300 group-hover:text-slate-500" />
                                    </div>
                                </Link>
                            ))}
                            {orders.length === 0 && (
                                <div className="py-10 text-center">
                                    <Package size={28} className="mx-auto text-slate-200 mb-2" />
                                    <p className="text-sm font-bold text-slate-400">No orders yet</p>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        /* Full Orders Feed */
                        <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                                <h3 className="font-black text-slate-800 text-sm">All Orders</h3>
                                <span className="text-[10px] text-slate-400 font-bold">{orders.length} in last 30d</span>
                            </div>
                            {orders.length === 0 ? (
                                <div className="py-14 text-center">
                                    <Package size={32} className="mx-auto text-slate-200 mb-3" />
                                    <p className="font-bold text-slate-500">No orders yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {orders.map(order => (
                                        <Link key={order.id} href={`/merchant/shopping/orders/${order.id}`}
                                            className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                                    <Package size={15} className="text-indigo-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800">{fmt(order.total_amount_paise || 0)}</p>
                                                    <p className="text-[10px] text-emerald-600 font-bold">+{fmt(order.merchant_profit_paise || 0)} profit</p>
                                                    <p className="text-[9px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                                                        <Clock size={8} />
                                                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${getStatusStyle(order.delivery_status)}`}>
                                                    {order.delivery_status || 'pending'}
                                                </span>
                                                <ChevronRight size={13} className="text-slate-300 group-hover:text-slate-500" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </>
            )}

            {/* ── Inactive CTA ── */}
            {!isAutoModeActive && (
                <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 p-6 text-center shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                        <Zap size={22} className="text-indigo-600" />
                    </div>
                    <h3 className="font-black text-slate-800 text-base mb-1">Unlock Auto Mode</h3>
                    <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto leading-relaxed">
                        Orders, inventory and deliveries handled automatically. Zero manual work.
                    </p>
                    {hasValidSub ? (
                        <button onClick={confirmActivation} disabled={processing}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-8 py-3 rounded-xl transition-all shadow-lg shadow-emerald-200 text-sm">
                            {processing ? 'Activating...' : 'Resume Auto Mode'}
                        </button>
                    ) : (
                        <button onClick={() => setShowPaymentModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-3 rounded-xl transition-all shadow-lg shadow-indigo-200 text-sm">
                            Activate — ₹{subscriptionPrice}/mo
                        </button>
                    )}
                </div>
            )}

            {/* ── Capital Deployment CTA ── */}
            <div className={`rounded-2xl border p-5 shadow-sm relative overflow-hidden transition-all ${isAutoModeActive ? 'bg-white border-slate-100' : 'bg-slate-50 border-slate-200'}`}>
                <div className="absolute top-0 right-0 w-40 h-40 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                            <Clock size={16} className="text-amber-500" /> Growth Portfolio
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                            Back INTRUST Mart operations with your deployed capital and fuel growth powered by {merchant?.business_name || 'your business'}.
                        </p>
                    </div>
                    <Link href="/merchant/lockin"
                        className="self-start md:self-auto bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black tracking-widest px-6 py-2.5 rounded-xl uppercase transition-all shadow-md shadow-amber-500/20 whitespace-nowrap text-center">
                        View Deployments
                    </Link>
                </div>
            </div>

            {/* ── Payment Modal ── */}
            <AnimatePresence>
                {showPaymentModal && !isAutoModeActive && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex flex-col justify-end p-4 bg-black/60 backdrop-blur-sm">
                        <div className="absolute inset-0" onClick={() => !processing && setShowPaymentModal(false)} />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                            className="bg-[#1f222b] border border-white/10 rounded-[2rem] p-6 w-full max-w-sm mx-auto shadow-2xl relative z-10">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-white font-black text-lg flex items-center gap-2">
                                    Activate Auto Mode
                                    {isFirstMonth && <span className="bg-[#D4AF37]/20 text-[#D4AF37] text-[9px] uppercase font-black px-2 py-0.5 rounded">TRIAL</span>}
                                </h3>
                                <button onClick={() => setShowPaymentModal(false)} className="w-8 h-8 bg-white/5 rounded-full text-white/50 hover:text-white flex items-center justify-center">✕</button>
                            </div>
                            <div className="flex items-baseline gap-2 mb-5">
                                <span className="text-3xl font-black text-[#D4AF37]">₹{subscriptionPrice}</span>
                                <span className="text-slate-400 text-xs">/month</span>
                            </div>
                            <ul className="space-y-3 mb-6">
                                {[
                                    [ShieldCheck, 'Automated pricing & stock'],
                                    [Zap, 'Instant order acceptance'],
                                    [Activity, 'Zero manual dashboard work'],
                                    [Truck, 'Hands-free delivery routing'],
                                ].map(([Icon, text]) => (
                                    <li key={text} className="flex items-center gap-3 text-slate-300 text-xs font-medium">
                                        <Icon size={14} className="text-[#D4AF37] shrink-0" /> {text}
                                    </li>
                                ))}
                            </ul>
                            <p className="text-xs text-slate-400 mb-3">Wallet: <span className="text-white font-black">₹{walletBalance.toFixed(2)}</span></p>

                            {walletBalance < subscriptionPrice ? (
                                <Link href="/merchant/wallet"
                                    className="w-full bg-[#1e293b] hover:bg-[#334155] border border-white/10 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
                                    <PlusCircle size={16} className="text-rose-400" />
                                    Add ₹{(subscriptionPrice - walletBalance).toFixed(0)} to Wallet
                                </Link>
                            ) : (
                                <button onClick={confirmActivation} disabled={processing}
                                    className="w-full bg-[#D4AF37] hover:bg-[#c49f2d] text-black font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
                                    {processing ? <Activity size={16} className="animate-spin" /> : <>Pay & Activate <ChevronRight size={16} strokeWidth={3} /></>}
                                </button>
                            )}
                            {isFirstMonth && <p className="text-center text-slate-500 text-[10px] uppercase tracking-wider font-bold mt-3">Renews at ₹1999/month</p>}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Deactivation Modal ── */}
            <AnimatePresence>
                {showWarningModal && isAutoModeActive && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                        <div className="absolute inset-0" onClick={() => !processing && setShowWarningModal(false)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#1a1c23] border border-white/10 rounded-3xl p-6 w-full max-w-xs shadow-2xl relative z-10 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                                <Power size={20} className="text-red-400" />
                            </div>
                            <h3 className="text-white font-black text-base mb-2">Deactivate Auto Mode?</h3>
                            <p className="text-slate-400 text-xs mb-5 leading-relaxed">You'll need to manually manage all orders after this.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowWarningModal(false)}
                                    className="flex-1 bg-white/5 text-white border border-white/10 font-bold py-3 rounded-xl text-xs hover:bg-white/10 transition-all">Cancel</button>
                                <button onClick={confirmDeactivation} disabled={processing}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-xs flex justify-center items-center gap-1.5 transition-all">
                                    {processing ? <Activity size={14} className="animate-spin" /> : 'Deactivate'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

}

