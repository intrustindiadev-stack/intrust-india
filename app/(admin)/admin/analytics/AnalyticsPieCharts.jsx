'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { createClient } from '@/lib/supabaseClient';
import { RefreshCw } from 'lucide-react';

// ── Colour Palettes ─────────────────────────────────────────────────────────
const ROLE_COLORS = ['#3b82f6', '#8b5cf6'];
const STATUS_COLORS = ['#10b981', '#ef4444', '#f59e0b'];
const MERCHANT_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#94a3b8'];

// ── Custom Tooltip ───────────────────────────────────────────────────────────
function PieTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0];
    return (
        <div className="bg-slate-900 border border-slate-700/50 px-4 py-2.5 rounded-2xl shadow-xl">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">{name}</p>
            <p className="text-white font-extrabold text-lg">{value.toLocaleString('en-IN')}</p>
        </div>
    );
}

// ── Custom Legend ────────────────────────────────────────────────────────────
function CustomLegend({ data, colors }) {
    return (
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-4">
            {data.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                    <span className="text-xs font-semibold text-slate-500">{entry.name}</span>
                    <span className="text-xs font-extrabold text-slate-800">({entry.value})</span>
                </div>
            ))}
        </div>
    );
}

// ── Single Pie Widget ─────────────────────────────────────────────────────────
function PieWidget({ title, subtitle, badge, data, colors, isLive }) {
    const total = data.reduce((s, d) => s + d.value, 0);

    return (
        <div className="bg-white dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            {/* Live pulse */}
            {isLive && (
                <span className="absolute top-4 right-4 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
            )}

            <div className="mb-4">
                <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-[family-name:var(--font-outfit)] tracking-tight">
                        {title}
                    </h3>
                    {badge && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                            {badge}
                        </span>
                    )}
                </div>
                <p className="text-slate-400 text-xs font-medium">{subtitle}</p>
            </div>

            <div className="h-52 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <defs>
                            {colors.map((c, i) => (
                                <radialGradient key={i} id={`grad-${title.replace(/\s/g, '-')}-${i}`} cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor={c} stopOpacity={0.9} />
                                    <stop offset="100%" stopColor={c} stopOpacity={0.6} />
                                </radialGradient>
                            ))}
                        </defs>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            strokeWidth={0}
                            animationBegin={0}
                            animationDuration={700}
                        >
                            {data.map((_, i) => (
                                <Cell
                                    key={i}
                                    fill={`url(#grad-${title.replace(/\s/g, '-')}-${i})`}
                                    stroke={colors[i % colors.length]}
                                    strokeWidth={1}
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                    </PieChart>
                </ResponsiveContainer>

                {/* Centre label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{total.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</p>
                </div>
            </div>

            <CustomLegend data={data} colors={colors} />
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AnalyticsPieCharts({ initialUserRoleData, initialOrderStatusData, initialMerchantStatusData }) {
    const [userRoleData, setUserRoleData] = useState(initialUserRoleData);
    const [orderStatusData, setOrderStatusData] = useState(initialOrderStatusData);
    const [merchantStatusData, setMerchantStatusData] = useState(initialMerchantStatusData);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // ── Fetch fresh data from Supabase ─────────────────────────────────────
    const refresh = useCallback(async () => {
        setRefreshing(true);
        try {
            const supabase = createClient();

            const [usersRes, ordersRes, merchantsRes] = await Promise.all([
                supabase.from('user_profiles').select('id, role'),
                supabase.from('orders').select('id, payment_status'),
                supabase.from('merchants').select('id, status'),
            ]);

            const users = usersRes.data || [];
            const orders = ordersRes.data || [];
            const merchants = merchantsRes.data || [];

            // User roles
            const nonAdmin = users.filter(u => u.role !== 'admin');
            const mCount = nonAdmin.filter(u => u.role === 'merchant').length;
            const cCount = nonAdmin.filter(u => u.role !== 'merchant').length;
            setUserRoleData([
                { name: 'Customers', value: cCount || 1 },
                { name: 'Merchants', value: mCount || 1 },
            ]);

            // Order statuses
            const paid = orders.filter(o => o.payment_status === 'paid').length;
            const failed = orders.filter(o => o.payment_status === 'failed').length;
            const pending = orders.filter(o => o.payment_status !== 'paid' && o.payment_status !== 'failed').length;
            setOrderStatusData([
                { name: 'Paid', value: paid || 1 },
                { name: 'Failed', value: failed || 1 },
                { name: 'Pending', value: pending || 1 },
            ]);

            // Merchant statuses
            const approved = merchants.filter(m => m.status === 'approved' || m.status === 'verified').length;
            const pendingM = merchants.filter(m => m.status === 'pending').length;
            const rejected = merchants.filter(m => m.status === 'rejected').length;
            const suspended = merchants.filter(m => m.status === 'suspended').length;
            setMerchantStatusData([
                { name: 'Approved', value: approved || 1 },
                { name: 'Pending', value: pendingM || 1 },
                { name: 'Rejected', value: rejected || 1 },
                { name: 'Suspended', value: suspended || 1 },
            ]);

            setLastUpdated(new Date());
        } catch (err) {
            console.error('[AnalyticsPieCharts] refresh error:', err);
        } finally {
            setRefreshing(false);
        }
    }, []);

    // ── Supabase Realtime subscriptions ────────────────────────────────────
    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel('admin-analytics-pie')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, () => refresh())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => refresh())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'merchants' }, () => refresh())
            .subscribe();

        setLastUpdated(new Date());

        return () => { supabase.removeChannel(channel); };
    }, [refresh]);

    return (
        <section className="mb-8">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white font-[family-name:var(--font-outfit)] tracking-tight">
                        Platform Distribution
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-0.5">
                        Live breakdown of users, orders &amp; merchant statuses
                    </p>
                </div>
                <button
                    onClick={refresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm disabled:opacity-50"
                >
                    <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                    {lastUpdated
                        ? `Updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                        : 'Refresh'}
                </button>
            </div>

            {/* 3-column pie grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PieWidget
                    title="User Composition"
                    subtitle="Customers vs Merchants"
                    badge="Live"
                    data={userRoleData}
                    colors={ROLE_COLORS}
                    isLive={true}
                />
                <PieWidget
                    title="Order Payment Status"
                    subtitle="All-time payment breakdown"
                    badge="Live"
                    data={orderStatusData}
                    colors={STATUS_COLORS}
                    isLive={true}
                />
                <PieWidget
                    title="Merchant Status"
                    subtitle="Approval pipeline overview"
                    badge="Live"
                    data={merchantStatusData}
                    colors={MERCHANT_COLORS}
                    isLive={true}
                />
            </div>
        </section>
    );
}
