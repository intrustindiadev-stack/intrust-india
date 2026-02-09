'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import Link from 'next/link';
import {
    Zap, Banknote, ShoppingBag, HeadphonesIcon,
    Smartphone, Tv, Car, Flame, Wallet, CreditCard,
    Landmark, Gift, FileText, Heart, HelpCircle,
    ArrowRight, Search, LayoutGrid, ChevronRight
} from 'lucide-react';

export default function ServicesPage() {
    const [activeTab, setActiveTab] = useState('bills');
    const [searchQuery, setSearchQuery] = useState('');
    const tabsContainerRef = useRef(null);

    const tabs = [
        { id: 'all', label: 'All', icon: LayoutGrid },
        { id: 'bills', label: 'Bills', icon: Zap },
        { id: 'finance', label: 'Finance', icon: Banknote },
        { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
        { id: 'support', label: 'Help', icon: HelpCircle },
    ];

    const allServices = [
        // Bills
        { id: 'mobile', category: 'bills', title: "Mobile Recharge", subtitle: "Prepaid & Postpaid", icon: Smartphone, href: "/recharge/mobile" },
        { id: 'dth', category: 'bills', title: "DTH", subtitle: "Direct to Home", icon: Tv, href: "/recharge/dth" },
        { id: 'electricity', category: 'bills', title: "Electricity", subtitle: "Pay Bills", icon: Zap, href: "/bills/electricity", highlight: true },
        { id: 'fastag', category: 'bills', title: "FASTag", subtitle: "Toll Payment", icon: Car, href: "/recharge/fastag" },
        { id: 'gas', category: 'bills', title: "Gas Booking", subtitle: "Cylinder Delivery", icon: Flame, href: "/bills/gas" },

        // Finance
        { id: 'loans', category: 'finance', title: "Instant Loans", subtitle: "Get funds instantly", icon: Banknote, href: "/loans/personal", badge: "Fast" },
        { id: 'business', category: 'finance', title: "Business Loans", subtitle: "Grow your business", icon: Landmark, href: "/loans/business" },
        { id: 'wallet', category: 'finance', title: "My Wallet", subtitle: "Add Money", icon: Wallet, href: "/wallet" },
        { id: 'cards', category: 'finance', title: "Credit Cards", subtitle: "Apply for a card", icon: CreditCard, href: "/cards" },

        // Shopping
        { id: 'gift', category: 'shopping', title: "Gift Cards", subtitle: "For your loved ones", icon: Gift, href: "/gift-cards" },
        { id: 'store', category: 'shopping', title: "Online Store", subtitle: "Exclusive Deals", icon: ShoppingBag, href: "/marketplace", badge: "New" },
        { id: 'coupons', category: 'shopping', title: "My Coupons", subtitle: "Rewards & Codes", icon: FileText, href: "/my-coupons" },
        { id: 'rewards', category: 'shopping', title: "Redeem Points", subtitle: "Use your points", icon: Heart, href: "/rewards" },

        // Support
        { id: 'chat', category: 'support', title: "Live Chat", subtitle: "Talk to us", icon: HeadphonesIcon, href: "/support" },
        { id: 'faq', category: 'support', title: "FAQs", subtitle: "Usually asked", icon: HelpCircle, href: "/faqs" },
    ];

    const filteredServices = allServices.filter(service => {
        const matchesTab = activeTab === 'all' || service.category === activeTab;
        const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-gray-50/50 font-[family-name:var(--font-outfit)] pb-28">
            <Navbar theme="light" />

            <div className="pt-28 px-4 md:px-8 max-w-7xl mx-auto">

                {/* Header Section */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-[#171A21] mb-3 tracking-tight">
                        Services
                    </h1>
                    <p className="text-slate-500 text-sm md:text-base mb-8 max-w-2xl">
                        Everything you need to manage your payments and finances.
                    </p>

                    {/* Premium Search Bar */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-[#171A21] transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Find a service (e.g., Mobile, Loan)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-11 pr-4 py-4 bg-white border-0 ring-1 ring-gray-200 rounded-2xl text-[#171A21] placeholder-gray-400 focus:ring-2 focus:ring-[#171A21]/10 focus:outline-none shadow-sm transition-all"
                        />
                    </div>
                </div>

                {/* Categories - Premium Horizontal Scroll */}
                <div className="sticky top-[4.5rem] z-20 bg-gray-50/50 backdrop-blur-xl py-4 -mx-4 px-4 md:mx-0 md:px-0 mb-6 border-b border-gray-100/50 md:border-none">
                    <div
                        ref={tabsContainerRef}
                        className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth md:flex-wrap pb-1"
                    >
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap border ${isActive
                                        ? 'bg-[#171A21] text-white border-[#171A21] shadow-lg shadow-[#171A21]/10 scale-100'
                                        : 'bg-white text-slate-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50 scale-95 hover:scale-100'
                                        }`}
                                >
                                    <tab.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Services Grid */}
                <motion.div
                    layout
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredServices.map((service) => (
                            <motion.div
                                key={service.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Link href={service.href} className="block h-full">
                                    <div className={`group h-full bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] hover:border-gray-200 transition-all duration-300 relative overflow-hidden flex items-center gap-4`}>

                                        {/* Icon Container */}
                                        <div className={`p-4 rounded-xl ${service.category === 'bills' ? 'bg-blue-50 text-blue-600' : service.category === 'finance' ? 'bg-emerald-50 text-emerald-600' : service.category === 'shopping' ? 'bg-pink-50 text-pink-600' : 'bg-gray-100 text-gray-600'} group-hover:scale-110 transition-transform duration-300`}>
                                            <service.icon size={24} strokeWidth={2} />
                                        </div>

                                        {/* Text Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="text-base font-semibold text-[#171A21] truncate">
                                                    {service.title}
                                                </h3>
                                                {service.badge && (
                                                    <span className="bg-[#171A21] text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                                                        {service.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 truncate group-hover:text-slate-700 transition-colors">
                                                {service.subtitle}
                                            </p>
                                        </div>

                                        {/* Arrow */}
                                        <div className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                            <ChevronRight size={18} className="text-gray-400" />
                                        </div>

                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>

                {/* Empty State */}
                {filteredServices.length === 0 && (
                    <div className="text-center py-32">
                        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search size={24} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-[#171A21]">No services found</h3>
                        <p className="text-slate-500">We couldn't find anything matching "{searchQuery}"</p>
                        <button
                            onClick={() => { setSearchQuery(''); setActiveTab('all'); }}
                            className="mt-4 text-sm font-semibold text-[#171A21] hover:underline"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>

            <CustomerBottomNav />
        </div>
    );
}