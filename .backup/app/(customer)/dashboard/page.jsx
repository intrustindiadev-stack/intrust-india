'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import {
    Wallet, Package, TrendingUp, Gift, Heart, Star,
    Smartphone, Zap, Tv, Store, CreditCard, ScanLine, Grid,
    CheckCircle, Clock, ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';
import OpportunitiesSection from '@/components/customer/OpportunitiesSection';
import MerchantOpportunityBanner from '@/components/customer/MerchantOpportunityBanner';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import Link from 'next/link';

export default function CustomerDashboardPage() {
    const user = {
        name: 'Rahul Kumar',
        totalPurchases: 12,
        totalSavings: 2450,
        kycStatus: 'verified',
        walletBalance: 2450.00
    };

    const quickServices = [
        { id: 1, label: 'Recharge', icon: Smartphone, color: 'text-blue-600 bg-blue-50', href: '/services/recharge' },
        { id: 2, label: 'Electricity', icon: Zap, color: 'text-amber-600 bg-amber-50', href: '/services/electricity' },
        { id: 3, label: 'Fastag', icon: CreditCard, color: 'text-emerald-600 bg-emerald-50', href: '/services/fastag' },
        { id: 4, label: 'Rent Pay', icon: Store, color: 'text-indigo-600 bg-indigo-50', href: '/services/rent' },
        { id: 5, label: 'Scan & Pay', icon: ScanLine, color: 'text-rose-600 bg-rose-50', href: '/scan' },
        { id: 6, label: 'More', icon: Grid, color: 'text-slate-600 bg-slate-50', href: '/services' },
    ];

    const stats = [
        { label: 'Wallet Balance', value: `₹${user.walletBalance}`, icon: Wallet, color: 'from-blue-600 to-indigo-600' },
        { label: 'Total Savings', value: `₹${user.totalSavings}`, icon: TrendingUp, color: 'from-emerald-500 to-teal-500' },
        { label: 'Active Cards', value: '3', icon: Gift, color: 'from-purple-500 to-pink-500' },
        { label: 'Wishlist', value: '8', icon: Heart, color: 'from-rose-500 to-red-500' },
    ];

    const recentOrders = [
        { id: 1, brand: 'Flipkart', value: 500, status: 'delivered', date: '2 days ago', logo: '🛒' },
        { id: 2, brand: 'Bill Payment', value: 840, status: 'success', date: 'Yesterday', logo: '⚡' },
        { id: 3, brand: 'Swiggy', value: 300, status: 'processing', date: '1 hour ago', logo: '🍔' },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-[family-name:var(--font-outfit)]">
            <Navbar />

            <div style={{ paddingTop: '15vh' }} className="pb-24 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto">
                    <Breadcrumbs items={[{ label: 'Dashboard' }]} />

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mb-8"
                    >
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
                            Welcome back, {user.name.split(' ')[0]}! 👋
                        </h1>
                        <p className="text-slate-500 text-lg">
                            Manage your wallet, cards, and payments across the system.
                        </p>
                    </motion.div>

                    {/* Minimal Stats Grid (Replacing heavy cards) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
                        {stats.map((stat, index) => {
                            const Icon = stat.icon;
                            return (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all group"
                                >
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 shadow-lg shadow-gray-200 group-hover:scale-110 transition-transform`}>
                                        <Icon size={20} className="text-white" />
                                    </div>
                                    <div className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</div>
                                    <div className="text-sm font-medium text-slate-500">{stat.label}</div>
                                </motion.div>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                        {/* Main Content Area */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* System Services Grid */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-slate-900">Quick Services</h2>
                                    <Link href="/services" className="text-blue-600 text-sm font-bold hover:underline">View All</Link>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-6">
                                    {quickServices.map((service) => (
                                        <Link href={service.href} key={service.id} className="flex flex-col items-center gap-3 group">
                                            <div className={`w-14 h-14 rounded-2xl ${service.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                                                <service.icon size={24} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600 transition-colors">{service.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Recent Orders / Transactions */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
                                    <Link href="/my-coupons" className="text-blue-600 text-sm font-bold hover:underline">View All</Link>
                                </div>
                                <div className="space-y-4">
                                    {recentOrders.map((order) => (
                                        <div key={order.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">
                                                {order.logo}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-slate-900">{order.brand}</div>
                                                <div className="text-sm text-slate-500">₹{order.value} • {order.date}</div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${order.status === 'delivered' || order.status === 'success'
                                                    ? 'bg-green-50 text-green-700'
                                                    : 'bg-amber-50 text-amber-700'
                                                }`}>
                                                {order.status === 'processing' ? <Clock size={12} /> : <CheckCircle size={12} />}
                                                {order.status === 'delivered' ? 'Delivered' : order.status === 'success' ? 'Success' : 'Processing'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-1 space-y-8">
                            {/* KYC Banner */}
                            {user.kycStatus === 'verified' && (
                                <MerchantOpportunityBanner />
                            )}

                            {/* Quick Links Card */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                                className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm"
                            >
                                <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
                                <div className="space-y-2">
                                    <Link href="/gift-cards" className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 group transition-colors">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <Gift size={20} />
                                        </div>
                                        <div className="font-bold text-slate-700 group-hover:text-blue-700">Buy Gift Cards</div>
                                        <ChevronRight size={16} className="ml-auto text-slate-400" />
                                    </Link>
                                    <Link href="/my-coupons" className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 group transition-colors">
                                        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                            <Package size={20} />
                                        </div>
                                        <div className="font-bold text-slate-700 group-hover:text-purple-700">My Orders</div>
                                        <ChevronRight size={16} className="ml-auto text-slate-400" />
                                    </Link>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    <OpportunitiesSection />
                </div>
            </div>
            <CustomerBottomNav />
        </div>
    );
}
