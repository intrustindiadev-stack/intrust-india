'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Power, CheckCircle2, ChevronRight, Activity, Wallet,
    ShieldCheck, Zap, Truck, Package, Clock, TrendingUp, BarChart2,
    ArrowLeft, IndianRupee, AlertTriangle, Sparkles, PlusCircle,
    Check, X, RefreshCw, AlertCircle, ExternalLink, HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { useSubscription } from '@/components/merchant/SubscriptionContext';
import LiveButton from '@/components/merchant/LiveButton';
import { getPricingSettings } from '@/app/(admin)/admin/settings/actions';
import { toast } from 'react-hot-toast';
import { formatPaise, isValidOrder, isSettledOrder } from '@/lib/merchant/orderMetrics';

// ─── Stat Card Component ──────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent = 'indigo', trend = null, tooltip = null }) {
    const accents = {
        indigo: 'bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
        emerald: 'bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
        amber: 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
        violet: 'bg-violet-50/80 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/30',
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${accents[accent]}`}>
                    <Icon size={17} />
                </div>
                {trend !== null && (
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}`}>
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(0)}%
                    </span>
                )}
            </div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-tight">
                {label}
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
                {value}
            </p>
            {sub && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium truncate">
                    {sub}
                </p>
            )}
        </div>
    );
}

// ─── Mini Bar Chart Component ────────────────────────────────────────────────
function DailyVolumeChart({ orders, period = 7 }) {
    const chartData = useMemo(() => {
        const days = [];
        for (let i = period - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const next = new Date(d);
            next.setDate(next.getDate() + 1);

            const dayOrders = orders.filter(o => {
                const t = new Date(o.created_at);
                return t >= d && t < next && isValidOrder(o);
            });

            const dayProfit = dayOrders
                .filter(isSettledOrder)
                .reduce((s, o) => s + (o.merchant_profit_paise || 0), 0);

            days.push({
                label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                count: dayOrders.length,
                profit: dayProfit,
            });
        }
        return days;
    }, [orders, period]);

    const maxCount = Math.max(...chartData.map(d => d.count), 1);

    return (
        <div className="space-y-3">
            <div className="flex items-end gap-2 h-24 pt-2">
                {chartData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                        <div className="text-[8px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap absolute -top-4">
                            {d.count} ord
                        </div>
                        <div
                            style={{ height: `${Math.max((d.count / maxCount) * 100, 8)}%` }}
                            className="w-full max-w-[20px] bg-indigo-500 dark:bg-indigo-600 rounded-t-md transition-all group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500"
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2 px-1">
                {chartData.filter((_, i) => i === 0 || i === Math.floor(chartData.length / 2) || i === chartData.length - 1).map((d, i) => (
                    <span key={i} className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {d.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ─── Main Auto Mode Page ──────────────────────────────────────────────────────
export default function AutoModePage() {
    const { performAction } = useSubscription();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [merchant, setMerchant] = useState(null);
    const [pricing, setPricing] = useState({ autoFirst: 999, autoRenewal: 1999 });
    const [orders, setOrders] = useState([]);
    const [analyticsSummary, setAnalyticsSummary] = useState(null);
    const [walletBalance, setWalletBalance] = useState(0);
    const [timeLeft, setTimeLeft] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showDeactivationModal, setShowDeactivationModal] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'orders'
    const [chartPeriod, setChartPeriod] = useState(7); // 7 | 14 | 30
    const [lastUpdated, setLastUpdated] = useState(null);

    // ── Fetch Server-Authoritative State ──
    const fetchData = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            else setRefreshing(true);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // 1. Fetch Authoritative Auto Mode Status via API
            const statusRes = await fetch('/api/merchant/auto-mode', {
                headers: { Authorization: `Bearer ${session.access_token}` },
                cache: 'no-store'
            });

            if (statusRes.ok) {
                const statusData = await statusRes.json();
                setMerchant(prev => ({
                    ...prev,
                    id: statusData.merchant_id,
                    business_name: statusData.business_name,
                    auto_mode: statusData.auto_mode,
                    auto_mode_status: statusData.auto_mode_status,
                    auto_mode_valid_until: statusData.valid_until,
                    auto_mode_months_paid: statusData.months_paid,
                    is_active: statusData.is_active,
                    has_valid_sub: statusData.has_valid_sub,
                }));
                if (statusData.pricing) {
                    setPricing({
                        autoFirst: statusData.pricing.autoFirst,
                        autoRenewal: statusData.pricing.autoRenewal,
                    });
                }
                setWalletBalance(statusData.wallet_balance_paise / 100);
            } else {
                // Fallback to direct merchant query
                const { data: mData } = await supabase
                    .from('merchants')
                    .select('id, user_id, business_name, auto_mode, auto_mode_status, auto_mode_months_paid, auto_mode_valid_until, wallet_balance_paise')
                    .eq('user_id', session.user.id)
                    .single();
                if (mData) {
                    setMerchant(mData);
                    setWalletBalance((mData.wallet_balance_paise || 0) / 100);
                }
            }

            // 2. Fetch Authoritative Analytics & Orders
            const analyticsRes = await fetch('/api/merchant/auto-mode/analytics?days=90', {
                headers: { Authorization: `Bearer ${session.access_token}` },
                cache: 'no-store',
            });

            if (analyticsRes.ok) {
                const analyticsData = await analyticsRes.json();
                setOrders(analyticsData.orders || []);
                setAnalyticsSummary(analyticsData.summary || null);
            }

            // 3. Dynamic pricing fallback if not returned by status API
            const pricingSettings = await getPricingSettings();
            if (pricingSettings) {
                setPricing({
                    autoFirst: pricingSettings.autoFirst || 999,
                    autoRenewal: pricingSettings.autoRenewal || 1999
                });
            }

            setLastUpdated(new Date());
        } catch (err) {
            console.error('[AutoMode] Error fetching data:', err);
            toast.error('Failed to load Auto Mode data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── Expiration & Countdown Logic ──
    const hasValidSub = useMemo(() => {
        if (!merchant?.auto_mode_valid_until) return false;
        return new Date(merchant.auto_mode_valid_until) > new Date();
    }, [merchant?.auto_mode_valid_until]);

    const isAutoModeActive = useMemo(() => {
        return Boolean(merchant?.auto_mode === true && hasValidSub);
    }, [merchant?.auto_mode, hasValidSub]);

    const isExpired = useMemo(() => {
        if (!merchant?.auto_mode_valid_until) return false;
        return new Date(merchant.auto_mode_valid_until) <= new Date();
    }, [merchant?.auto_mode_valid_until]);

    useEffect(() => {
        if (!merchant?.auto_mode_valid_until) {
            setTimeLeft('');
            return;
        }

        const updateTimer = () => {
            const difference = new Date(merchant.auto_mode_valid_until) - new Date();
            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                setTimeLeft(`${days}d ${hours}h ${minutes}m left`);
            } else {
                setTimeLeft('Expired');
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, [merchant?.auto_mode_valid_until]);

    // ── Metric Calculations ──
    const stats = useMemo(() => {
        if (analyticsSummary) {
            return {
                todayCount: analyticsSummary.todayCount || 0,
                deliveredCount: analyticsSummary.deliveredCount || 0,
                successRate: analyticsSummary.successRate || 0,
                totalProfitPaise: analyticsSummary.settledProfit || 0,
                contingentProfitPaise: analyticsSummary.contingentProfit || 0,
                totalGrossRevenuePaise: analyticsSummary.totalGrossRevenue || 0,
                totalOrdersCount: analyticsSummary.totalOrders || 0,
                pendingCount: analyticsSummary.pendingCount || 0,
                cancelledCount: analyticsSummary.cancelledCount || 0,
                growth: analyticsSummary.growth || 0
            };
        }

        // Client fallback calculation using pure orderMetrics logic
        const validOrders = orders.filter(isValidOrder);
        const delivered = validOrders.filter(o => o.delivery_status === 'delivered');
        const settled = validOrders.filter(isSettledOrder);
        const pending = validOrders.filter(o => ['pending', 'packed', 'shipped'].includes(o.delivery_status));
        const cancelled = orders.filter(o => o.delivery_status === 'cancelled');

        const settledProfit = settled.reduce((s, o) => s + (o.merchant_profit_paise || 0), 0);
        const contingentProfit = validOrders.filter(o => !isSettledOrder(o)).reduce((s, o) => s + (o.merchant_profit_paise || 0), 0);
        const totalGrossRevenue = validOrders.reduce((s, o) => s + (o.total_amount_paise || 0), 0);

        return {
            todayCount: validOrders.filter(o => {
                const d = new Date(o.created_at);
                const today = new Date();
                return d.toDateString() === today.toDateString();
            }).length,
            deliveredCount: delivered.length,
            successRate: validOrders.length > 0 ? Math.round((delivered.length / validOrders.length) * 100) : 0,
            totalProfitPaise: settledProfit,
            contingentProfitPaise: contingentProfit,
            totalGrossRevenuePaise: totalGrossRevenue,
            totalOrdersCount: validOrders.length,
            pendingCount: pending.length,
            cancelledCount: cancelled.length,
            growth: 0
        };
    }, [analyticsSummary, orders]);

    const isFirstMonth = (merchant?.auto_mode_months_paid || 0) === 0;
    const subscriptionPrice = isFirstMonth ? pricing.autoFirst : pricing.autoRenewal;

    // ── Toggle Activation ──
    const handleActivateToggle = async () => {
        if (processing) return;

        if (hasValidSub) {
            // Re-activate existing active subscription
            await executeActivation();
        } else {
            // Needs subscription payment
            setShowPaymentModal(true);
        }
    };

    const executeActivation = async () => {
        if (processing) return;
        setProcessing(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/auto-mode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ action: 'activate' })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to activate Auto Mode');
            }

            toast.success('Auto Mode enabled');
            setShowPaymentModal(false);
            await fetchData(true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Couldn't update Auto Mode. Please try again.";
            toast.error(msg);
        } finally {
            setProcessing(false);
        }
    };

    // ── Toggle Deactivation ──
    const executeDeactivation = async () => {
        if (processing) return;
        setProcessing(true);
        setShowDeactivationModal(false);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/auto-mode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ action: 'deactivate' })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to deactivate Auto Mode');
            }

            toast.success('Auto Mode disabled');
            await fetchData(true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Couldn't update Auto Mode. Please try again.";
            toast.error(msg);
        } finally {
            setProcessing(false);
        }
    };

    // ── Helper to format order activity status badge ──
    const getDeliveryStatusBadge = (status) => {
        switch (status) {
            case 'delivered':
                return {
                    label: 'Delivered',
                    bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40',
                    icon: CheckCircle2
                };
            case 'shipped':
                return {
                    label: 'Shipped',
                    bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40',
                    icon: Truck
                };
            case 'packed':
                return {
                    label: 'Packed',
                    bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40',
                    icon: Package
                };
            case 'cancelled':
                return {
                    label: 'Cancelled',
                    bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/40',
                    icon: X
                };
            default:
                return {
                    label: 'Pending',
                    bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40',
                    icon: Clock
                };
        }
    };

    // ── Skeleton Loader ──
    if (loading) {
        return (
            <div className="space-y-6 pb-24 animate-pulse">
                <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-48" />
                <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                    ))}
                </div>
                <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
            </div>
        );
    }

    const recentOrders = orders.filter(isValidOrder).slice(0, 5);

    return (
        <div className="space-y-6 pb-24 text-slate-800 dark:text-slate-100">
            {/* ── HEADER ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link
                            href="/merchant/dashboard"
                            className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                            <ArrowLeft size={12} /> Retail Management
                        </Link>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Auto Mode
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Let your store handle eligible orders automatically with zero manual overhead.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                    <button
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        aria-label="Refresh Auto Mode Data"
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all disabled:opacity-50"
                        title={lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString('en-IN')}` : 'Refresh'}
                    >
                        <RefreshCw size={15} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
                    </button>

                    <LiveButton />

                    <Link
                        href="/merchant/wallet"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-slate-300 transition-all shadow-xs"
                    >
                        <Wallet size={13} className="text-amber-500" />
                        <span>₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </Link>
                </div>
            </div>

            {/* ── AUTOMATION STATUS CARD ── */}
            <div className={`rounded-2xl border p-5 sm:p-6 shadow-xs transition-all relative overflow-hidden ${
                isAutoModeActive
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                    : isExpired
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2 max-w-xl">
                        <div className="flex items-center gap-2.5">
                            {isAutoModeActive ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Auto Mode Active
                                </span>
                            ) : isExpired ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                    <AlertTriangle size={12} />
                                    Plan Expired
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                                    Auto Mode Off
                                </span>
                            )}

                            {hasValidSub && timeLeft && (
                                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <Clock size={12} /> {timeLeft}
                                </span>
                            )}
                        </div>

                        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                            {isAutoModeActive
                                ? 'Eligible orders are being handled automatically.'
                                : isExpired
                                    ? 'Your Auto Mode plan has expired. Renew to restore automated order handling.'
                                    : 'Auto Mode is currently paused. Activate to enable automated store fulfillment.'}
                        </h2>

                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {isAutoModeActive
                                ? 'New customer orders are instantly processed, inventory is automatically checked, and deliveries are routed to logistics partners.'
                                : 'When paused or inactive, incoming orders require manual merchant acceptance and dispatch.'}
                        </p>

                        {/* Metadata strip */}
                        <div className="pt-2 flex items-center gap-4 sm:gap-6 text-[11px] font-bold text-slate-600 dark:text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1.5">
                                <Package size={13} className="text-slate-400" />
                                {stats.todayCount} order{stats.todayCount === 1 ? '' : 's'} today
                            </span>
                            {merchant?.auto_mode_valid_until && (
                                <span className="flex items-center gap-1.5">
                                    <Clock size={13} className="text-slate-400" />
                                    Valid until: {new Date(merchant.auto_mode_valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            )}
                            <span className="flex items-center gap-1.5">
                                <ShieldCheck size={13} className="text-emerald-500" />
                                Storefront Protected
                            </span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0 flex items-center gap-3">
                        {isAutoModeActive ? (
                            <button
                                onClick={() => setShowDeactivationModal(true)}
                                disabled={processing}
                                aria-label="Turn Off Auto Mode"
                                className="px-5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-black tracking-wider uppercase transition-all shadow-xs disabled:opacity-50 flex items-center gap-2"
                            >
                                <Power size={14} />
                                Turn Off
                            </button>
                        ) : hasValidSub ? (
                            <button
                                onClick={executeActivation}
                                disabled={processing}
                                aria-label="Resume Auto Mode"
                                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black tracking-wider uppercase transition-all shadow-xs shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
                            >
                                {processing ? <Activity size={14} className="animate-spin" /> : <Power size={14} />}
                                Resume Auto Mode
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowPaymentModal(true)}
                                disabled={processing}
                                aria-label="Activate Auto Mode"
                                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black tracking-wider uppercase transition-all shadow-xs shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
                            >
                                <Zap size={14} />
                                {isExpired ? `Renew — ₹${subscriptionPrice}/mo` : `Turn On — ₹${subscriptionPrice}/mo`}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── ERROR / WARNING ALERT IF ATTENTION REQUIRED ── */}
            {stats.cancelledCount > 0 && (
                <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        <div>
                            <p className="text-xs font-black text-amber-900 dark:text-amber-200">
                                Auto Mode Notice: {stats.cancelledCount} order{stats.cancelledCount === 1 ? '' : 's'} could not be completed
                            </p>
                            <p className="text-[11px] text-amber-700 dark:text-amber-400">
                                Review recent order reasons to prevent future stock or delivery cancellations.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/merchant/shopping/orders"
                        className="text-xs font-black text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1 shrink-0"
                    >
                        View Orders <ChevronRight size={13} />
                    </Link>
                </div>
            )}

            {/* ── KEY METRICS GRID ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                    icon={Package}
                    label="Orders Today"
                    value={stats.todayCount}
                    sub="Valid orders in IST"
                    accent="amber"
                />
                <StatCard
                    icon={CheckCircle2}
                    label="Successfully Processed"
                    value={stats.deliveredCount}
                    sub={`₹${formatPaise(stats.totalGrossRevenuePaise, false)} total sales`}
                    accent="indigo"
                />
                <StatCard
                    icon={ShieldCheck}
                    label="Success Rate"
                    value={`${stats.successRate}%`}
                    sub={`${stats.deliveredCount} delivered`}
                    accent="violet"
                />
                <StatCard
                    icon={IndianRupee}
                    label="Settled Profit"
                    value={`₹${formatPaise(stats.totalProfitPaise, false)}`}
                    sub={stats.contingentProfitPaise > 0 ? `+₹${formatPaise(stats.contingentProfitPaise, false)} in-flight` : 'Credited to wallet'}
                    accent="emerald"
                    trend={stats.growth !== 0 ? stats.growth : null}
                />
            </div>

            {/* ── TWO-COLUMN OPERATIONAL DASHBOARD LAYOUT ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: Activity & Orders (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Navigation Tabs */}
                    <div className="flex gap-2 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl">
                        {[
                            { id: 'overview', label: 'Recent Activity' },
                            { id: 'orders', label: `All Orders (${orders.length})` }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'overview' ? (
                        /* Recent Activity Feed */
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                                <div>
                                    <h3 className="font-black text-slate-900 dark:text-white text-sm">
                                        Recent Live Activity
                                    </h3>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                        Real-time events processed through your storefront
                                    </p>
                                </div>
                                <Link
                                    href="/merchant/shopping/orders"
                                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                                >
                                    Full Order Feed →
                                </Link>
                            </div>

                            {recentOrders.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Package size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                        No recent Auto Mode activity
                                    </p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                                        Incoming customer orders from your store will automatically appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {recentOrders.map(order => {
                                        const badge = getDeliveryStatusBadge(order.delivery_status);
                                        const BadgeIcon = badge.icon;
                                        return (
                                            <Link
                                                key={order.id}
                                                href={`/merchant/shopping/orders/${order.id}`}
                                                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                                                        <BadgeIcon size={15} className="text-slate-600 dark:text-slate-300" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs font-black text-slate-900 dark:text-white">
                                                                Order #{order.id.slice(0, 8).toUpperCase()}
                                                            </p>
                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${badge.bg}`}>
                                                                {badge.label}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {new Date(order.created_at).toLocaleDateString('en-IN', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right flex items-center gap-3">
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 dark:text-white">
                                                            ₹{formatPaise(order.total_amount_paise || 0, false)}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                            +₹{formatPaise(order.merchant_profit_paise || 0, false)} profit
                                                        </p>
                                                    </div>
                                                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Complete Orders Tab */
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="font-black text-slate-900 dark:text-white text-sm">
                                    All Storefront Orders
                                </h3>
                                <span className="text-[11px] font-bold text-slate-400">
                                    {orders.length} orders in last 90 days
                                </span>
                            </div>

                            {orders.length === 0 ? (
                                <div className="py-14 text-center">
                                    <Package size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                                    <p className="text-sm font-bold text-slate-500">No orders recorded</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
                                    {orders.map(order => {
                                        const badge = getDeliveryStatusBadge(order.delivery_status);
                                        return (
                                            <Link
                                                key={order.id}
                                                href={`/merchant/shopping/orders/${order.id}`}
                                                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                            >
                                                <div>
                                                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                        #{order.id.slice(0, 8).toUpperCase()}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${badge.bg}`}>
                                                        {badge.label}
                                                    </span>
                                                    <span className="text-xs font-black text-slate-900 dark:text-white">
                                                        ₹{formatPaise(order.total_amount_paise || 0, false)}
                                                    </span>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: How Auto Mode Works & Volume Chart (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                    {/* How It Works Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
                            <h3 className="font-black text-slate-900 dark:text-white text-sm">
                                How Auto Mode Works
                            </h3>
                        </div>

                        <div className="space-y-3.5">
                            {[
                                {
                                    step: '1',
                                    title: 'Eligible order arrives',
                                    desc: 'A customer completes checkout on an item mapped to your store inventory.'
                                },
                                {
                                    step: '2',
                                    title: 'Availability & pricing checked',
                                    desc: 'Automated verification ensures real-time stock integrity and wholesale margin.'
                                },
                                {
                                    step: '3',
                                    title: 'Fulfillment & routing',
                                    desc: 'The order is assigned for packing, dispatch, and partner courier pickup.'
                                },
                                {
                                    step: '4',
                                    title: 'Direct wallet settlement',
                                    desc: 'Upon verified delivery, your net profit is credited automatically to your wallet.'
                                },
                            ].map(({ step, title, desc }) => (
                                <div key={step} className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-[10px] font-black text-slate-700 dark:text-slate-300">
                                        {step}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight">
                                            {title}
                                        </h4>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                            {desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Weekly Order Volume Chart */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <BarChart2 size={16} className="text-indigo-600 dark:text-indigo-400" />
                                <h3 className="font-black text-slate-900 dark:text-white text-sm">
                                    Order Volume Trend
                                </h3>
                            </div>
                            <div className="flex gap-1">
                                {[7, 14].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setChartPeriod(p)}
                                        className={`text-[10px] font-black px-2 py-0.5 rounded-md transition-all ${
                                            chartPeriod === p
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        {p}d
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-3">Daily completed and processing orders</p>
                        <DailyVolumeChart orders={orders} period={chartPeriod} />
                    </div>

                    {/* Growth Portfolio Promo Banner */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                Capital Deployment
                            </p>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                                Growth Portfolio
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                                Fuel store operations with deployed capital and secure returns.
                            </p>
                        </div>
                        <Link
                            href="/merchant/lockin"
                            className="shrink-0 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-black uppercase tracking-wider transition-all hover:opacity-90"
                        >
                            View
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── PAYMENT & ACTIVATION MODAL ── */}
            <AnimatePresence>
                {showPaymentModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
                    >
                        <div className="absolute inset-0" onClick={() => !processing && setShowPaymentModal(false)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm mx-auto shadow-2xl relative z-10"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-slate-900 dark:text-white font-black text-base flex items-center gap-2">
                                    <Zap size={18} className="text-amber-500" />
                                    Activate Auto Mode
                                </h3>
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="w-7 h-7 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-xs"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="flex items-baseline gap-1.5 mb-4">
                                <span className="text-3xl font-black text-slate-900 dark:text-white">₹{subscriptionPrice}</span>
                                <span className="text-slate-400 text-xs font-bold">/month (30 days)</span>
                                {isFirstMonth && (
                                    <span className="ml-2 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-[9px] uppercase font-black px-2 py-0.5 rounded">
                                        FIRST MONTH
                                    </span>
                                )}
                            </div>

                            <ul className="space-y-2.5 mb-5">
                                {[
                                    'Automated inventory checking and reservation',
                                    'Zero-delay order routing to logistics',
                                    'Enrolled in central Admin Auto Mode Hub',
                                    'Direct wallet credit on verified delivery'
                                ].map((text, idx) => (
                                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                                        <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{text}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3 mb-5 flex items-center justify-between text-xs">
                                <span className="text-slate-500 dark:text-slate-400 font-bold">Wallet Balance:</span>
                                <span className="font-black text-slate-900 dark:text-white">
                                    ₹{walletBalance.toFixed(2)}
                                </span>
                            </div>

                            {walletBalance < subscriptionPrice ? (
                                <Link
                                    href="/merchant/wallet"
                                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-sm"
                                >
                                    <PlusCircle size={15} />
                                    Add ₹{(subscriptionPrice - walletBalance).toFixed(0)} to Wallet
                                </Link>
                            ) : (
                                <button
                                    onClick={executeActivation}
                                    disabled={processing}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl transition-all shadow-sm shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                                >
                                    {processing ? <Activity size={15} className="animate-spin" /> : <>Pay & Activate Auto Mode</>}
                                </button>
                            )}

                            {isFirstMonth && (
                                <p className="text-center text-slate-400 dark:text-slate-500 text-[10px] mt-3 font-medium">
                                    Renews at ₹{pricing.autoRenewal}/month after 30 days
                                </p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── DEACTIVATION MODAL ── */}
            <AnimatePresence>
                {showDeactivationModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
                    >
                        <div className="absolute inset-0" onClick={() => !processing && setShowDeactivationModal(false)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xs shadow-2xl relative z-10 text-center"
                        >
                            <div className="w-11 h-11 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center mx-auto mb-3">
                                <Power size={18} className="text-rose-500" />
                            </div>
                            <h3 className="text-slate-900 dark:text-white font-black text-base mb-1.5">
                                Pause Auto Mode?
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mb-5 leading-relaxed">
                                You will need to manually accept and fulfill incoming customer orders. You can resume at any time during your active plan.
                            </p>
                            <div className="flex gap-2.5">
                                <button
                                    onClick={() => setShowDeactivationModal(false)}
                                    disabled={processing}
                                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeDeactivation}
                                    disabled={processing}
                                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs flex justify-center items-center gap-1.5 transition-all disabled:opacity-50"
                                >
                                    {processing ? <Activity size={14} className="animate-spin" /> : 'Turn Off'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
