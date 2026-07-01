'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FeatureAdvertiser from '@/components/ui/FeatureAdvertiser';
import {
    Zap, ShoppingBag, Smartphone, Car, Flame,
    Landmark, Gift, ChevronRight, Sun, Wallet
} from 'lucide-react';

export default function ServicesPage() {
    const router = useRouter();

    const serviceSections = [
        {
            title: "Recharge & Pay Bills",
            items: [
                { id: 'electricity', title: "Electricity", icon: Zap, href: "/recharge/electricity", color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" },
                { id: 'fastag', title: "FASTag", icon: Car, href: "/recharge/fastag", color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
                { id: 'gas', title: "Gas Booking", icon: Flame, href: "/recharge/gas", color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
                { id: 'water', title: "Water", icon: Zap, href: "/recharge/water", color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" }
            ]
        },
        {
            title: "Loans & Credit",
            items: [
                { id: 'loan', title: "Personal Loan", icon: Landmark, href: "/cibil", color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
                { id: 'credit', title: "Credit Cards", icon: Wallet, href: "#", color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" }
            ]
        },
        {
            title: "Explore Intrust",
            items: [
                { id: 'store', title: "Intrust Shop", icon: ShoppingBag, href: "/shop", color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400", badge: "New" },
                { id: 'gift', title: "Gift Cards", icon: Gift, href: "/gift-cards", color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" },
                { id: 'nfc', title: "Smart Card", icon: Smartphone, href: "/nfc-service", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
                { id: 'solar', title: "Solar Power", icon: Sun, href: "/solar", color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50/80 dark:bg-gray-950 font-[family-name:var(--font-outfit)] pb-28">
            <Navbar theme="light" />

            <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto">

                {/* Header Section */}
                <div className="mb-6">
                    <nav className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
                        <button onClick={() => router.push('/dashboard')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Dashboard</button>
                        <ChevronRight size={14} />
                        <span className="text-gray-900 dark:text-white font-bold">Services</span>
                    </nav>

                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        All Services
                    </h1>
                </div>

                {/* Ad Banner */}
                <div className="mb-8">
                    <FeatureAdvertiser />
                </div>

                {/* Categorized Sections */}
                <div className="space-y-6">
                    {serviceSections.map((section, idx) => (
                        <motion.div
                            key={section.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white dark:bg-gray-900 rounded-3xl p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-gray-800"
                        >
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 tracking-tight">{section.title}</h2>
                            
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-y-6 gap-x-2">
                                {section.items.map(item => (
                                    <Link key={item.id} href={item.href} className="group flex flex-col items-center text-center focus-visible:outline-none">
                                        <div className="relative mb-2">
                                            <div className={`w-14 h-14 md:w-16 md:h-16 rounded-[1.25rem] md:rounded-3xl flex items-center justify-center ${item.color} group-hover:scale-105 group-active:scale-95 transition-transform shadow-sm`}>
                                                <item.icon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={1.5} />
                                            </div>
                                            {item.badge && (
                                                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm border border-white dark:border-gray-900 z-10">
                                                    {item.badge}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors px-1 leading-tight max-w-[80px]">
                                            {item.title}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <CustomerBottomNav />
        </div>
    );
}