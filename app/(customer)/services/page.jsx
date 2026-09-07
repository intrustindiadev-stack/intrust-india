'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
    ShoppingBag,
    ShoppingCart,
    Gift,
    Wallet,
    TrendingUp,
    IndianRupee,
    Radio,
    Car,
    Wifi,
    Store,
    CreditCard,
    Boxes,
    Sun,
    Zap,
    FileText,
    ShieldCheck,
    CheckCircle2,
    Headphones,
    ArrowRight,
    Search,
    X,
    Check,
    Grid,
    Sparkles,
    ChevronRight,
    Lock
} from 'lucide-react';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';

export default function ServicesPage() {
    const [selectedTab, setSelectedTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const tabs = [
        { id: 'all', label: 'All Services' },
        { id: 'shopping', label: 'Shopping & Retail' },
        { id: 'payments', label: 'Payments & Wallet' },
        { id: 'connectivity', label: 'Connectivity' },
        { id: 'business', label: 'Business & Khata' },
        { id: 'energy', label: 'Energy & Utilities' },
    ];

    const serviceGroups = [
        {
            id: 'shopping',
            title: 'Shopping & Retail',
            description: 'Everyday shopping, festive deals, and brand gift vouchers.',
            icon: ShoppingBag,
            iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
            services: [
                {
                    id: 'mart',
                    title: 'InTrust Mart',
                    description: 'Shop verified local stores across India with fast pickup.',
                    icon: ShoppingCart,
                    iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30',
                    status: 'available',
                    href: '/shop',
                },
                {
                    id: 'gift-cards',
                    title: 'Brand Gift Cards',
                    description: 'Instant digital vouchers from 200+ popular national brands.',
                    icon: Gift,
                    iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100 dark:border-rose-800/30',
                    status: 'available',
                    href: '/gift-cards',
                },
            ],
        },
        {
            id: 'payments',
            title: 'Payments & Wallet',
            description: 'Simple, fast, and compliant digital financial tools.',
            icon: Wallet,
            iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
            services: [
                {
                    id: 'wallet',
                    title: 'Digital Wallet',
                    description: 'Zero-fee UPI top-ups, passbook tracking, and instant pay.',
                    icon: Wallet,
                    iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/30',
                    status: 'available',
                    href: '/wallet',
                },
                {
                    id: 'scan-pay',
                    title: 'Scan & Pay UPI',
                    description: 'Pay instantly at any partner merchant counter via QR code.',
                    icon: CreditCard,
                    iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30',
                    status: 'coming_soon',
                },
                {
                    id: 'micro-loans',
                    title: 'Credit Line & EMI',
                    description: 'Flexible retail financing and credit backed by partner NBFCs.',
                    icon: IndianRupee,
                    iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30',
                    status: 'coming_soon',
                },
                {
                    id: 'gold-savings',
                    title: 'Digital Gold & Savings',
                    description: 'Start accumulating 24K 99.9% pure gold with as little as ₹10.',
                    icon: TrendingUp,
                    iconBg: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-800/30',
                    status: 'coming_soon',
                },
            ],
        },
        {
            id: 'connectivity',
            title: 'Connectivity & Bills',
            description: 'Instant mobile recharges, FASTag top-ups, and utility payments.',
            icon: Radio,
            iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
            services: [
                {
                    id: 'mobile-recharge',
                    title: 'Mobile Prepaid / Postpaid',
                    description: 'Recharge Airtel, Jio, and Vi with instant cashbacks.',
                    icon: Radio,
                    iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100 dark:border-sky-800/30',
                    status: 'coming_soon',
                },
                {
                    id: 'fastag',
                    title: 'FASTag Recharge',
                    description: 'Toll plaza auto-recharge for all major vehicle issuing banks.',
                    icon: Car,
                    iconBg: 'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-100 dark:border-teal-800/30',
                    status: 'coming_soon',
                },
                {
                    id: 'broadband-dth',
                    title: 'Broadband & DTH',
                    description: 'Tata Play, Airtel Digital, Dish TV, and high-speed fiber.',
                    icon: Wifi,
                    iconBg: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-800/30',
                    status: 'coming_soon',
                },
            ],
        },
        {
            id: 'business',
            title: 'Business & Khata',
            description: 'Empowering local retail merchants across Madhya Pradesh.',
            icon: Store,
            iconBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20',
            services: [
                {
                    id: 'merchant-portal',
                    title: 'Merchant Storefront',
                    description: 'Launch your digital catalog and receive orders directly.',
                    icon: Store,
                    iconBg: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-100 dark:border-orange-800/30',
                    status: 'available',
                    href: '/merchant-apply',
                },
                {
                    id: 'digital-khata',
                    title: 'Digital Customer Ledger',
                    description: 'Track store credit, automated WhatsApp reminders, and settlements.',
                    icon: Boxes,
                    iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30',
                    status: 'available',
                    href: '/merchant-apply',
                },
                {
                    id: 'inventory-sync',
                    title: 'Smart Inventory Sync',
                    description: 'Multi-location barcode scanning and real-time stock alerts.',
                    icon: FileText,
                    iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30',
                    status: 'coming_soon',
                },
            ],
        },
        {
            id: 'energy',
            title: 'Energy & Utilities',
            description: 'Sustainable rooftop solar, power solutions, and utility bills.',
            icon: Sun,
            iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
            services: [
                {
                    id: 'solar-energy',
                    title: 'Rooftop Solar Solutions',
                    description: 'Residential & commercial solar plant installation with subsidies.',
                    icon: Sun,
                    iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30',
                    status: 'available',
                    href: '/solar',
                },
                {
                    id: 'electricity-bill',
                    title: 'Electricity Bill Pay',
                    description: 'MPMKVVCL and state electricity discom bill payments.',
                    icon: Zap,
                    iconBg: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-800/30',
                    status: 'coming_soon',
                },
            ],
        },
    ];

    // Filter groups and cards based on selected tab and search
    const filteredGroups = useMemo(() => {
        let groups = serviceGroups;

        if (selectedTab !== 'all') {
            groups = groups.filter(g => g.id === selectedTab);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            groups = groups.map(group => {
                const matchingServices = group.services.filter(s =>
                    s.title.toLowerCase().includes(q) ||
                    s.description.toLowerCase().includes(q) ||
                    group.title.toLowerCase().includes(q)
                );
                return {
                    ...group,
                    services: matchingServices
                };
            }).filter(g => g.services.length > 0);
        }

        return groups;
    }, [selectedTab, searchQuery]);

    // Count of currently active live services
    const totalActiveServices = useMemo(() => {
        return serviceGroups.reduce((acc, g) => acc + g.services.filter(s => s.status === 'available').length, 0);
    }, []);

    return (
        <div className="w-full space-y-6 font-body-md text-slate-900 dark:text-on-surface pb-12">
            {/* Top Breadcrumb */}
            <CustomerBreadcrumbs items={[{ label: 'Services Hub' }]} />

            {/* ── COMPACT HERO SECTION WITH INTRUST LOGO ── */}
            <div className="relative overflow-hidden rounded-3xl bg-surface-container-lowest p-5 sm:p-7 border border-outline-variant/30 dark:border-white/[0.08] shadow-xs">
                {/* Ambient Radial Glows */}
                <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                <div className="absolute left-1/4 -bottom-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Left Hero Content */}
                    <div className="md:col-span-8 space-y-4">
                        {/* Top InTrust Brand Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 dark:bg-blue-900/30 border border-blue-500/20">
                            <img
                                src="/logo.png"
                                alt="InTrust Logo"
                                className="w-4 h-4 object-contain shrink-0"
                            />
                            <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                                InTrust Ecosystem
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                <Check size={11} strokeWidth={3} /> {totalActiveServices} Services Live
                            </span>
                        </div>

                        {/* Main Headline */}
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                            Everything you need, <br className="hidden sm:inline" />
                            all in one place.
                        </h1>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-on-surface-variant font-medium max-w-xl leading-relaxed">
                            Shopping, digital payments, brand gift cards, clean solar energy, and local retail tools — built for India.
                        </p>

                        {/* 3 Compact Trust Chips */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-container-low border border-outline-variant/25 text-[11px] font-semibold text-slate-700 dark:text-on-surface">
                                <ShieldCheck size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                <span>Verified &amp; Secure</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-container-low border border-outline-variant/25 text-[11px] font-semibold text-slate-700 dark:text-on-surface">
                                <Zap size={13} className="text-amber-500 shrink-0" />
                                <span>Fast Local Delivery</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-container-low border border-outline-variant/25 text-[11px] font-semibold text-slate-700 dark:text-on-surface">
                                <Headphones size={13} className="text-emerald-500 shrink-0" />
                                <span>24/7 Dedicated Support</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Hero Visual: Compact InTrust 3D Phone Preview with Logo */}
                    <div className="md:col-span-4 hidden md:flex items-center justify-center">
                        <div className="relative w-48 h-56 flex items-center justify-center">
                            {/* Orbiting micro icons */}
                            <motion.div
                                animate={{ y: [-3, 3, -3] }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                className="absolute -top-1 left-2 w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 backdrop-blur-md flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm z-20"
                            >
                                <ShoppingCart size={15} />
                            </motion.div>

                            <motion.div
                                animate={{ y: [3, -3, 3] }}
                                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                                className="absolute top-1 -right-1 w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 backdrop-blur-md flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm z-20"
                            >
                                <Wallet size={15} />
                            </motion.div>

                            <motion.div
                                animate={{ y: [-3, 3, -3] }}
                                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                                className="absolute bottom-2 -left-1 w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 backdrop-blur-md flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm z-20"
                            >
                                <Gift size={15} />
                            </motion.div>

                            <motion.div
                                animate={{ y: [3, -3, 3] }}
                                transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                                className="absolute bottom-0 right-3 w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 backdrop-blur-md flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm z-20"
                            >
                                <Sun size={15} />
                            </motion.div>

                            {/* Compact Device Card featuring real InTrust Logo */}
                            <div className="w-36 h-48 rounded-2xl bg-white dark:bg-surface-container border-2 border-slate-200/90 dark:border-outline-variant/30 shadow-xl p-3 flex flex-col items-center justify-between text-center">
                                <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />

                                <div className="space-y-1.5 my-auto">
                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-outline-variant/20 flex items-center justify-center mx-auto shadow-sm p-2">
                                        <img
                                            src="/logo.png"
                                            alt="InTrust"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                                            InTrust India
                                        </h4>
                                        <span className="text-[10px] font-bold text-primary">
                                            Digital Hub
                                        </span>
                                    </div>
                                </div>

                                <div className="w-10 h-0.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── COMPACT TOOLBAR: CATEGORY TABS & SEARCH BAR ── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Scrollable Category Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {tabs.map((tab) => {
                        const isActive = selectedTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setSelectedTab(tab.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                                    isActive
                                        ? 'bg-primary text-white shadow-xs'
                                        : 'bg-surface-container-lowest hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline-variant/25'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Compact Search Bar */}
                <div className="relative min-w-[220px] sm:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search services..."
                        className="w-full h-9 pl-8 pr-8 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/60 text-xs font-medium border border-outline-variant/30 focus:border-primary focus:outline-none transition-all"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── CATEGORIZED SERVICE GROUPS (COMPACT RESPONSIVE GRID) ── */}
            <div className="space-y-6">
                {filteredGroups.length === 0 ? (
                    <div className="p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 text-center space-y-2.5">
                        <div className="w-10 h-10 rounded-full bg-surface-container-low mx-auto flex items-center justify-center text-on-surface-variant">
                            <Search size={18} />
                        </div>
                        <h3 className="text-sm font-black text-on-surface">
                            No matching services found
                        </h3>
                        <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                            We couldn't find any services matching "{searchQuery}". Try selecting "All Services" or clear your search query.
                        </p>
                        <button
                            onClick={() => { setSearchQuery(''); setSelectedTab('all'); }}
                            className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
                        >
                            Reset Filters
                        </button>
                    </div>
                ) : (
                    filteredGroups.map((group) => {
                        const GroupIcon = group.icon;
                        return (
                            <div key={group.id} className="space-y-3">
                                {/* Group Section Header */}
                                <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${group.iconBg}`}>
                                            <GroupIcon size={14} />
                                        </div>
                                        <div>
                                            <h2 className="text-sm sm:text-base font-black text-on-surface tracking-tight leading-tight">
                                                {group.title}
                                            </h2>
                                            <p className="text-[10px] text-on-surface-variant font-medium leading-tight hidden sm:block">
                                                {group.description}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedTab(selectedTab === group.id ? 'all' : group.id)}
                                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                                    >
                                        <span>{selectedTab === group.id ? 'Show All' : 'View Group'}</span>
                                        <ChevronRight size={12} />
                                    </button>
                                </div>

                                {/* Compact Responsive Card Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {group.services.map((service) => {
                                        const ServiceIcon = service.icon;
                                        const isAvailable = service.status === 'available';

                                        const CardContent = (
                                            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/40 shadow-xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between h-full space-y-3">
                                                <div className="space-y-2">
                                                    {/* Service Icon */}
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${service.iconBg}`}>
                                                        <ServiceIcon size={16} />
                                                    </div>

                                                    {/* Title & Description */}
                                                    <div>
                                                        <h3 className="text-xs sm:text-sm font-black text-on-surface tracking-tight group-hover:text-primary transition-colors">
                                                            {service.title}
                                                        </h3>
                                                        <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed mt-0.5 line-clamp-2">
                                                            {service.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Card Footer */}
                                                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15">
                                                    {isAvailable ? (
                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider border border-emerald-500/20">
                                                            Available
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant text-[9px] font-bold uppercase tracking-wider border border-outline-variant/20">
                                                            Coming Soon
                                                        </span>
                                                    )}

                                                    {isAvailable && (
                                                        <span className="w-6 h-6 rounded-full bg-surface-container-low group-hover:bg-primary text-on-surface-variant group-hover:text-white flex items-center justify-center transition-all">
                                                            <ArrowRight size={12} />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );

                                        if (isAvailable && service.href) {
                                            return (
                                                <Link
                                                    key={service.id}
                                                    href={service.href}
                                                    className="group block h-full select-none"
                                                >
                                                    {CardContent}
                                                </Link>
                                            );
                                        }

                                        return (
                                            <div key={service.id} className="h-full select-none opacity-85">
                                                {CardContent}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ── 4-COLUMN COMPACT TRUST FEATURE BAR ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
                <div className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <ShieldCheck size={15} />
                    </div>
                    <div>
                        <h4 className="text-[11px] font-black text-on-surface leading-tight">
                            Secure Platform
                        </h4>
                        <p className="text-[10px] text-on-surface-variant leading-tight mt-0.5">
                            Data is protected
                        </p>
                    </div>
                </div>

                <div className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Zap size={15} />
                    </div>
                    <div>
                        <h4 className="text-[11px] font-black text-on-surface leading-tight">
                            Fast &amp; Reliable
                        </h4>
                        <p className="text-[10px] text-on-surface-variant leading-tight mt-0.5">
                            Seamless checkout
                        </p>
                    </div>
                </div>

                <div className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={15} />
                    </div>
                    <div>
                        <h4 className="text-[11px] font-black text-on-surface leading-tight">
                            All India Network
                        </h4>
                        <p className="text-[10px] text-on-surface-variant leading-tight mt-0.5">
                            Verified local retail
                        </p>
                    </div>
                </div>

                <div className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Headphones size={15} />
                    </div>
                    <div>
                        <h4 className="text-[11px] font-black text-on-surface leading-tight">
                            Dedicated Support
                        </h4>
                        <p className="text-[10px] text-on-surface-variant leading-tight mt-0.5">
                            Always here to help
                        </p>
                    </div>
                </div>
            </div>

            {/* ── COMPACT SUPPORT CARD ── */}
            <div className="rounded-2xl bg-gradient-to-r from-[#0B1528] via-[#0E1E38] to-[#0A1224] text-white p-4 sm:p-5 border border-blue-900/40 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
                <div className="flex items-center gap-3 z-10">
                    <img
                        src="/logo.png"
                        alt="InTrust Logo"
                        className="w-9 h-9 object-contain bg-white/10 rounded-xl p-1.5 shrink-0"
                    />
                    <div>
                        <h3 className="text-xs sm:text-sm font-black text-white tracking-tight leading-tight">
                            Need help choosing an InTrust service?
                        </h3>
                        <p className="text-[11px] text-slate-300 font-medium leading-tight mt-0.5">
                            Our dedicated operations and customer care team is here to assist you.
                        </p>
                    </div>
                </div>

                <div className="z-10 shrink-0 w-full sm:w-auto">
                    <Link
                        href="/profile"
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#0B1528] font-black text-xs transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                    >
                        <span>Contact Support</span>
                        <ArrowRight size={12} />
                    </Link>
                </div>

                {/* Subtle blue accent glow */}
                <div className="absolute right-0 top-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            </div>
        </div>
    );
}