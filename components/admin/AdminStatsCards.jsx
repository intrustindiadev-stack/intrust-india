'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';

function formatPrice(paise) {
    if (paise === null || paise === undefined) return '₹0.00';
    return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function LiveDot({ flashing }) {
    return (
        <span className="relative flex h-2 w-2">
            {flashing && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${flashing ? 'bg-emerald-500' : 'bg-emerald-400'}`} />
        </span>
    );
}

function StatCard({ href, color, bgDecor, iconBg, iconText, badge, badgeBg, label, value, subtext, subtextFlash, delay, flashKey }) {
    const [flashing, setFlashing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const prevValue = useRef(value);

    useEffect(() => {
        if (prevValue.current !== value && prevValue.current !== undefined) {
            setFlashing(true);
            setLastUpdated(Date.now());
            const t = setTimeout(() => setFlashing(false), 1800);
            return () => clearTimeout(t);
        }
        prevValue.current = value;
    }, [value, flashKey]);

    const secondsAgo = lastUpdated ? Math.floor((Date.now() - lastUpdated) / 1000) : null;

    return (
        <Link
            href={href}
            style={{ animationDelay: `${delay}ms` }}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards snap-center shrink-0 w-[85vw] sm:w-auto relative group overflow-hidden bg-white backdrop-blur-xl rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
        >
            {/* Decor blob */}
            <div className={`absolute top-0 right-0 w-32 h-32 ${bgDecor} rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500`} />

            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center ${iconText}`}>
                    {/* Icon passed as SVG child via props — not included here; parent renders */}
                </div>
                <div className="flex items-center gap-1.5">
                    <LiveDot flashing={flashing} />
                    <span className={`text-[10px] font-black ${badgeBg} px-2.5 py-1 rounded-full uppercase tracking-widest`}>{badge}</span>
                </div>
            </div>

            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>

            <h3
                className={`text-2xl sm:text-3xl font-black text-gray-950 tracking-tighter transition-all duration-500 ${flashing ? 'scale-105 text-emerald-700' : 'scale-100'}`}
            >
                {value}
            </h3>

            {subtext && (
                <p className={`text-[10px] font-black mt-1 uppercase tracking-tighter ${subtextFlash ? 'text-amber-600 animate-pulse' : 'text-gray-400'}`}>
                    {subtext}
                </p>
            )}

            {lastUpdated && secondsAgo !== null && secondsAgo < 10 && (
                <p className="text-[9px] font-bold text-emerald-500 mt-1.5 uppercase tracking-widest">
                    Live update just now
                </p>
            )}
        </Link>
    );
}

export default function AdminStatsCards({ initialData }) {
    const [stats, setStats] = useState(initialData);
    const debounceRef = useRef({});
    const supabaseRef = useRef(null);

    const fetchGroup = useCallback(async (group) => {
        try {
            const res = await fetch(`/api/admin/stats?group=${group}`);
            if (!res.ok) return;
            const data = await res.json();
            setStats(prev => ({ ...prev, ...data, _updated: { ...(prev._updated || {}), [group]: Date.now() } }));
        } catch (e) { console.error('Stats fetch error:', e); }
    }, []);

    const debouncedFetch = useCallback((group) => {
        if (debounceRef.current[group]) clearTimeout(debounceRef.current[group]);
        debounceRef.current[group] = setTimeout(() => fetchGroup(group), 3000);
    }, [fetchGroup]);

    useEffect(() => {
        const supabase = createClient();
        supabaseRef.current = supabase;

        const channels = [
            supabase.channel('admin-stats-txns')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => debouncedFetch('revenue'))
                .subscribe(),

            supabase.channel('admin-stats-orders')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_order_groups' }, () => {
                    debouncedFetch('revenue');
                    debouncedFetch('shopping');
                })
                .subscribe(),

            supabase.channel('admin-stats-merchants')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'merchants' }, () => debouncedFetch('merchants'))
                .subscribe(),

            supabase.channel('admin-stats-coupons')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, () => debouncedFetch('coupons'))
                .subscribe(),

            supabase.channel('admin-stats-leads')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => debouncedFetch('crm'))
                .subscribe(),
        ];

        return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
    }, [debouncedFetch]);

    const {
        grossRevenue = 0, todayRevenue = 0, todayOrders = 0,
        activeMerchantsCount = 0, totalCouponsCount = 0,
        shoppingStats = {}, totalLeadsCount = 0, totalEmployeesCount = 0,
    } = stats;

    const cards = [
        {
            id: 'today_revenue',
            href: '/admin/transactions',
            color: 'green',
            bgDecor: 'bg-green-500/10',
            iconBg: 'bg-green-50',
            iconText: 'text-green-600',
            badge: 'Today',
            badgeBg: 'text-green-600 bg-green-50',
            label: "Today's Revenue",
            value: formatPrice(todayRevenue),
            delay: 0,
            flashKey: todayRevenue,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            id: 'gross_revenue',
            href: '/admin/transactions',
            color: 'blue',
            bgDecor: 'bg-blue-500/10',
            iconBg: 'bg-blue-50',
            iconText: 'text-blue-600',
            badge: 'Total',
            badgeBg: 'text-blue-600 bg-blue-50',
            label: 'Gross Revenue',
            value: formatPrice(grossRevenue),
            delay: 80,
            flashKey: grossRevenue,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            id: 'active_merchants',
            href: '/admin/merchants',
            color: 'purple',
            bgDecor: 'bg-purple-500/10',
            iconBg: 'bg-purple-50',
            iconText: 'text-purple-600',
            badge: 'Merchants',
            badgeBg: 'text-purple-600 bg-purple-50',
            label: 'Active Merchants',
            value: activeMerchantsCount,
            delay: 160,
            flashKey: activeMerchantsCount,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        },
        {
            id: 'total_coupons',
            href: '/admin/giftcards',
            color: 'emerald',
            bgDecor: 'bg-emerald-500/10',
            iconBg: 'bg-emerald-50',
            iconText: 'text-emerald-600',
            badge: 'Inventory',
            badgeBg: 'text-emerald-600 bg-emerald-50',
            label: 'Total Coupons Listed',
            value: totalCouponsCount,
            delay: 240,
            flashKey: totalCouponsCount,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
            )
        },
        {
            id: 'orders_today',
            href: '/admin/shopping/orders',
            color: 'orange',
            bgDecor: 'bg-orange-500/10',
            iconBg: 'bg-orange-50',
            iconText: 'text-orange-600',
            badge: 'Live',
            badgeBg: 'text-orange-600 bg-orange-50',
            label: 'Orders Today',
            value: todayOrders,
            delay: 320,
            flashKey: todayOrders,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            )
        },
        {
            id: 'shopping_revenue',
            href: '/admin/shopping/orders',
            color: 'amber',
            bgDecor: 'bg-amber-500/10',
            iconBg: 'bg-amber-50',
            iconText: 'text-amber-600',
            badge: 'E-comm',
            badgeBg: 'text-amber-600 bg-amber-50',
            label: 'Shopping Revenue',
            value: formatPrice(shoppingStats.revenue || 0),
            subtext: (shoppingStats.pendingOrders || 0) > 0 ? `${shoppingStats.pendingOrders} orders pending` : null,
            subtextFlash: (shoppingStats.pendingOrders || 0) > 0,
            delay: 400,
            flashKey: shoppingStats.revenue || 0,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
            )
        },
        {
            id: 'crm_leads',
            href: '/crm/pipeline',
            color: 'indigo',
            bgDecor: 'bg-indigo-500/10',
            iconBg: 'bg-indigo-50',
            iconText: 'text-indigo-600',
            badge: 'Pipeline',
            badgeBg: 'text-indigo-600 bg-indigo-50',
            label: 'Total CRM Leads',
            value: totalLeadsCount,
            delay: 480,
            flashKey: totalLeadsCount,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        },
        {
            id: 'employees',
            href: '/admin/users',
            color: 'pink',
            bgDecor: 'bg-pink-500/10',
            iconBg: 'bg-pink-50',
            iconText: 'text-pink-600',
            badge: 'Staff',
            badgeBg: 'text-pink-600 bg-pink-50',
            label: 'Active Employees',
            value: totalEmployeesCount,
            delay: 560,
            flashKey: totalEmployeesCount,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            )
        }
    ];

    return (
        <div className="flex overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-6 hide-scrollbar snap-x snap-mandatory">
            {cards.map(card => (
                <StatCard 
                    key={card.id}
                    {...card}
                >
                    {card.icon}
                </StatCard>
            ))}
        </div>
    );
}
