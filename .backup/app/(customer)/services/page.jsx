'use client';

import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import Link from 'next/link';
import { ChevronRight, Smartphone, Tv, Zap, Car, Flame, ShoppingBag, Gift, Heart, Wallet, CreditCard, Banknote, Landmark, HeadphonesIcon, HelpCircle, FileText, ArrowUpRight } from 'lucide-react';

export default function ServicesPage() {
    const serviceCategories = [
        {
            title: 'Bill Payments & Recharges',
            description: 'Instant payments for all your utilities',
            gradient: 'from-blue-50 to-indigo-50',
            items: [
                { id: 'mobile', name: 'Mobile Recharge', icon: Smartphone, color: 'text-blue-600', bg: 'bg-blue-100', href: '/recharge/mobile' },
                { id: 'dth', name: 'DTH', icon: Tv, color: 'text-purple-600', bg: 'bg-purple-100', href: '/recharge/dth' },
                { id: 'electricity', name: 'Electricity', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-100', href: '/bills/electricity' },
                { id: 'fastag', name: 'FASTag', icon: Car, color: 'text-indigo-600', bg: 'bg-indigo-100', href: '/recharge/fastag' },
                { id: 'gas', name: 'Gas Booking', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-100', href: '/bills/gas' }
            ]
        },
        {
            title: 'Financial Services',
            description: 'Secure banking and loan solutions',
            gradient: 'from-emerald-50 to-teal-50',
            items: [
                { id: 'personal-loan', name: 'Instant Loan', icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-100', href: '/loans/personal' },
                { id: 'business-loan', name: 'Business Loan', icon: Landmark, color: 'text-slate-700', bg: 'bg-slate-100', href: '/loans/business' },
                { id: 'wallet', name: 'My Wallet', icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-100', href: '/wallet' },
                { id: 'cards', name: 'Credit Cards', icon: CreditCard, color: 'text-violet-600', bg: 'bg-violet-100', href: '/cards' }
            ]
        },
        {
            title: 'Shopping & Rewards',
            description: 'Shop smart and get rewarded',
            gradient: 'from-rose-50 to-pink-50',
            items: [
                { id: 'gift-cards', name: 'Gift Cards', icon: Gift, color: 'text-pink-500', bg: 'bg-pink-100', href: '/gift-cards' },
                { id: 'marketplace', name: 'Online Store', icon: ShoppingBag, color: 'text-orange-500', bg: 'bg-orange-100', href: '/marketplace', badge: 'New' },
                { id: 'coupons', name: 'My Coupons', icon: FileText, color: 'text-teal-600', bg: 'bg-teal-100', href: '/my-coupons' },
                { id: 'rewards', name: 'Rewards', icon: Heart, color: 'text-red-500', bg: 'bg-red-100', href: '/rewards' }
            ]
        },
        {
            title: 'Support & Help',
            description: 'We are here to help you 24/7',
            gradient: 'from-gray-50 to-slate-50',
            items: [
                { id: 'support', name: 'Chat Support', icon: HeadphonesIcon, color: 'text-blue-600', bg: 'bg-blue-50', href: '/support' },
                { id: 'faqs', name: 'FAQs', icon: HelpCircle, color: 'text-gray-700', bg: 'bg-gray-100', href: '/faqs' }
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-outfit)]">
            <Navbar />

            <div style={{ paddingTop: '15vh' }} className="pb-24 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Minimalist Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="mb-12 text-center sm:text-left"
                    >
                        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
                            Services
                        </h1>
                        <p className="text-gray-500 text-lg max-w-2xl font-light">
                            Everything you need to manage your digital life, all in one place.
                        </p>
                    </motion.div>

                    {/* Service Categories */}
                    <div className="space-y-12">
                        {serviceCategories.map((category, catIndex) => (
                            <motion.div
                                key={category.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: catIndex * 0.1 }}
                                className="relative"
                            >
                                {/* Section Header */}
                                <div className="flex items-end justify-between mb-6 border-b border-gray-200 pb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-1">{category.title}</h2>
                                        <p className="text-sm text-gray-500">{category.description}</p>
                                    </div>
                                </div>

                                {/* Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {category.items.map((service, index) => (
                                        <Link
                                            key={service.id}
                                            href={service.href}
                                            className="block group"
                                        >
                                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full relative overflow-hidden group-hover:border-gray-200">

                                                {/* Subtle Gradient Background Effect on Hover */}
                                                <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                                                {/* Badge */}
                                                {service.badge && (
                                                    <div className="absolute top-3 right-3 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                                                        {service.badge}
                                                    </div>
                                                )}

                                                {/* Content */}
                                                <div className="relative z-10 flex flex-col items-start h-full">
                                                    <div className={`w-12 h-12 rounded-xl ${service.bg} ${service.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                                                        <service.icon size={22} strokeWidth={2} />
                                                    </div>

                                                    <h3 className="font-bold text-gray-900 text-base mb-1 group-hover:text-gray-700 transition-colors">
                                                        {service.name}
                                                    </h3>

                                                    {/* Hover Arrow */}
                                                    <div className="mt-auto pt-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 text-gray-400">
                                                        <ArrowUpRight size={18} />
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <CustomerBottomNav />
        </div>
    );
}
