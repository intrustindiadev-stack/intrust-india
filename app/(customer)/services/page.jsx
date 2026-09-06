'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ShoppingBag,
    Gift,
    Receipt,
    Smartphone,
    Sun,
    Trophy,
    Store,
    ShieldCheck,
    PhoneCall,
    ArrowRight,
    Sparkles,
    CheckCircle2,
    Zap,
    Users,
    Search
} from 'lucide-react';

import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';

export default function ServicesPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState('all');

    const services = [
        {
            id: 'shop',
            title: 'Local Shopping & Official Store',
            category: 'retail',
            description: 'Order electronics, gadgets, groceries, and daily essentials from verified Bhopal merchants and InTrust Flagship Store with guaranteed doorstep delivery.',
            icon: ShoppingBag,
            badge: 'Fast Delivery',
            badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-primary border-blue-500/20',
            href: '/shop',
            accent: 'from-blue-600 to-indigo-600',
            highlights: ['Verified local store inventory', 'InTrust Official', '100% Genuine brand warranty']
        },
        {
            id: 'gift-cards',
            title: 'Digital Gift Cards & Vouchers',
            category: 'fintech',
            description: 'Instantly buy digital gift cards from 250+ top national and regional brands with up to 10% instant savings credited to your InTrust Wallet.',
            icon: Gift,
            badge: 'Instant Delivery',
            badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            href: '/gift-cards',
            accent: 'from-emerald-600 to-teal-600',
            highlights: ['Amazon, Flipkart, Myntra & more', 'Instant code decryption in app', 'Pay via InTrust Wallet or UPI']
        },
        {
            id: 'store-credits',
            title: 'Store Credit (Digital Khata)',
            category: 'fintech',
            description: 'Activate transparent local merchant credit lines with 0% interest for up to 15 days. Enjoy paperless billing with your favorite neighborhood shops.',
            icon: Receipt,
            badge: '0% Interest',
            badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            href: '/store-credits',
            accent: 'from-amber-600 to-orange-600',
            highlights: ['Direct credit from local merchants', 'Transparent repayment ledgers', 'Instant 60-second activation']
        },
        {
            id: 'nfc-service',
            title: 'Smart Contactless NFC Cards',
            category: 'retail',
            description: 'Premium laser-engraved NFC business cards for modern professionals. Share contact info, social handles, and direct UPI payment links in one single tap.',
            icon: Smartphone,
            badge: 'Hardware Tech',
            badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
            href: '/nfc-service',
            accent: 'from-purple-600 to-pink-600',
            highlights: ['Works with iPhone & Android without app', 'Integrated UPI QR payment code', 'Unlimited digital profile edits']
        },
        {
            id: 'solar',
            title: 'Rooftop Solar & Subsidies',
            category: 'green',
            description: 'Harness clean solar energy with government PM Surya Ghar subsidies. Calculate your home setup cost, verify panel warranties, and save up to 80% on bills.',
            icon: Sun,
            badge: 'Govt Subsidy',
            badgeColor: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
            href: '/solar',
            accent: 'from-amber-500 to-yellow-600',
            highlights: ['Up to ₹78,000 subsidy calculation', 'Verified Tier-1 solar engineers', 'Net metering & EMI assistance']
        },
        {
            id: 'rewards',
            title: 'Coin Rewards & Scratch Cards',
            category: 'fintech',
            description: 'Earn 5% InTrust Coin cashback on every purchase, unlock daily login scratch cards, and climb the community leaderboard for exclusive perks.',
            icon: Trophy,
            badge: '5% Cashback',
            badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
            href: '/rewards',
            accent: 'from-rose-600 to-red-600',
            highlights: ['Daily check-in scratch rewards', '100 Coins = ₹1 platform cash', 'Tier status discounts on all stores']
        }
    ];

    const filteredServices = services.filter(service => {
        const matchesTab = selectedTab === 'all' || service.category === selectedTab;
        const matchesQuery = searchQuery === '' || 
            service.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            service.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesQuery;
    });

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-8">
            {/* Header & Breadcrumbs */}
            <div>
                <CustomerBreadcrumbs items={[{ label: 'Services Hub' }]} className="mb-3" />
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-primary text-[10px] font-black uppercase tracking-wider">
                                All-in-One Platform
                            </span>
                            <span className="text-slate-400 text-xs">•</span>
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                <ShieldCheck size={14} /> Verified &amp; Protected
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-on-surface tracking-tight leading-tight">
                            InTrust Services &amp; Digital Utilities
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-on-surface-variant font-medium mt-1 max-w-2xl leading-relaxed">
                            Discover local store shopping, instant gift vouchers, interest-free store credit, smart NFC hardware, and green rooftop solar solutions.
                        </p>
                    </div>

                    {/* Toll-free support pill */}
                    <a
                        href="tel:18008890199"
                        className="self-start md:self-auto px-4 py-2.5 rounded-2xl bg-white dark:bg-surface-container-lowest border border-slate-200 dark:border-outline-variant/30 text-xs font-bold text-slate-800 dark:text-on-surface flex items-center gap-2 shadow-xs hover:border-blue-500 transition-colors shrink-0"
                    >
                        <PhoneCall size={14} className="text-blue-600 dark:text-primary" />
                        <span>Support: 1800-889-0199</span>
                    </a>
                </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 rounded-2xl bg-white dark:bg-surface-container-lowest border border-slate-200 dark:border-outline-variant/30 shadow-xs">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
                    {[
                        { id: 'all', label: 'All Services' },
                        { id: 'retail', label: 'Shop & Hardware' },
                        { id: 'fintech', label: 'Fintech & Credit' },
                        { id: 'green', label: 'Solar & Energy' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setSelectedTab(tab.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                selectedTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-600 dark:text-on-surface-variant hover:text-slate-900 dark:hover:text-on-surface hover:bg-slate-100 dark:hover:bg-surface-container-low'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search services..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-50 dark:bg-surface-container-low text-xs font-medium text-slate-900 dark:text-on-surface placeholder:text-slate-400 border border-slate-200 dark:border-transparent focus:border-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service) => {
                    const Icon = service.icon;
                    return (
                        <div
                            key={service.id}
                            className="p-6 rounded-3xl bg-white dark:bg-surface-container-lowest border border-slate-200 dark:border-outline-variant/30 shadow-sm hover:shadow-md hover:border-blue-500/40 transition-all flex flex-col justify-between group"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <Icon size={24} />
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${service.badgeColor}`}>
                                        {service.badge}
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-slate-900 dark:text-on-surface mb-2 group-hover:text-blue-600 dark:group-hover:text-primary transition-colors">
                                    {service.title}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-on-surface-variant leading-relaxed mb-5">
                                    {service.description}
                                </p>

                                {/* Highlights list */}
                                <div className="space-y-2 py-3 border-t border-slate-100 dark:border-outline-variant/15 mb-4">
                                    {service.highlights.map((h, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-on-surface">
                                            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                            <span>{h}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Link
                                href={service.href}
                                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-surface-container-low hover:bg-blue-600 hover:text-white dark:hover:bg-primary dark:hover:text-white text-xs font-bold text-slate-800 dark:text-on-surface flex items-center justify-between transition-all group/btn"
                            >
                                <span>Open Service</span>
                                <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    );
                })}
            </div>

            {/* Merchant Partner Spotlight Banner */}
            <div className="p-7 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-white/10 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 max-w-xl space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                            Partner Network
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-amber-400 font-bold">50,000+ Bhopal Shoppers</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                        Do You Own a Retail Store in Bhopal?
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                        Onboard your offline shop to InTrust to access local delivery, automated billing, verified customer store credit, and zero transaction fees.
                    </p>
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                    <Link
                        href="/merchant-apply"
                        className="px-6 py-3 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black text-xs text-center shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Store size={15} className="text-blue-600" />
                        <span>Register Your Store</span>
                    </Link>
                    <a
                        href="tel:18008890199"
                        className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs text-center transition-all flex items-center justify-center gap-2"
                    >
                        <PhoneCall size={14} />
                        <span>Call Partner Help</span>
                    </a>
                </div>
            </div>
        </div>
    );
}