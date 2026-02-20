'use client';

import { useState, useEffect } from 'react';
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
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function CustomerDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState({
        name: '',
        totalPurchases: 0,
        totalSavings: 0,
        kycStatus: 'pending',
        walletBalance: 0.00,
        activeCards: 0
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;

            try {
                const now = new Date().toISOString();

                console.log('[DASHBOARD] fetching data with 5s timeout...');

                // Create a timeout promise to reject after 5s
                const timeoutTx = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Dashboard fetch timeout')), 5000)
                );

                // Race the fetch bundle against timeout
                const mainFetch = Promise.allSettled([
                    supabase.from('user_profiles').select('full_name, role').eq('id', user.id).single(),
                    supabase.from('kyc_records').select('status').eq('user_id', user.id).single(),
                    supabase.from('coupons').select('face_value_paise, selling_price_paise, valid_until, status').eq('purchased_by', user.id).eq('status', 'sold')
                ]);

                const results = await Promise.race([mainFetch, timeoutTx]);

                // Process results (allSettled returns objects with { status, value })
                const profileResult = results[0];
                const kycResult = results[1];
                const couponsResult = results[2];

                // 1. Process Profile
                let profile = null;
                if (profileResult.status === 'fulfilled' && profileResult.value.data) {
                    profile = profileResult.value.data;
                    console.log('[DASHBOARD] Profile loaded:', profile);
                } else {
                    console.warn('[DASHBOARD] Profile fetch failed or empty:', profileResult);
                }

                // 2. Process KYC
                let kycStatus = 'pending';
                if (kycResult.status === 'fulfilled' && kycResult.value.data) {
                    kycStatus = kycResult.value.data.status;
                }

                // 3. Process Coupons
                let coupons = [];
                if (couponsResult.status === 'fulfilled' && couponsResult.value.data) {
                    coupons = couponsResult.value.data;
                }
                let totalSavings = 0;
                let activeCards = 0;
                let totalPurchases = 0;

                if (coupons) {
                    totalPurchases = coupons.length;
                    coupons.forEach(coupon => {
                        // Savings = (Face Value - Selling Price)
                        const faceValue = coupon.face_value_paise || 0;
                        const sellingPrice = coupon.selling_price_paise || 0;
                        totalSavings += (faceValue - sellingPrice);

                        // Active Check
                        if (coupon.valid_until > now) {
                            activeCards++;
                        }
                    });
                }

                // Convert savings from paise to Rupee
                totalSavings = totalSavings / 100;

                // 3. Wallet Balance (Placeholder)
                const walletBalance = 0.00;

                setUserData({
                    name: profile?.full_name || user.email?.split('@')[0] || 'User',
                    totalPurchases,
                    totalSavings,
                    kycStatus,
                    walletBalance,
                    activeCards
                });

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            console.log('[DASHBOARD] Auth finished. User:', user?.id);
            if (user) {
                console.log('[DASHBOARD] Fetching data...');
                fetchDashboardData();
            } else {
                console.log('[DASHBOARD] No user, stopping loading.');
                setLoading(false);
            }
        } else {
            console.log('[DASHBOARD] Waiting for auth...');
        }
    }, [user, authLoading]);

    const quickServices = [
        { id: 1, label: 'Recharge', icon: Smartphone, color: 'text-blue-600 bg-blue-50', href: '/services/recharge' },
        { id: 2, label: 'Electricity', icon: Zap, color: 'text-amber-600 bg-amber-50', href: '/services/electricity' },
        { id: 3, label: 'Fastag', icon: CreditCard, color: 'text-emerald-600 bg-emerald-50', href: '/services/fastag' },
        { id: 4, label: 'Rent Pay', icon: Store, color: 'text-indigo-600 bg-indigo-50', href: '/services/rent' },
        { id: 5, label: 'Scan & Pay', icon: ScanLine, color: 'text-rose-600 bg-rose-50', href: '/scan' },
        { id: 6, label: 'More', icon: Grid, color: 'text-slate-600 bg-slate-50', href: '/services' },
    ];

    const stats = [
        { label: 'Wallet Balance', value: `₹${userData.walletBalance.toFixed(2)}`, icon: Wallet, color: 'from-blue-600 to-indigo-600' },
        { label: 'Total Savings', value: `₹${userData.totalSavings.toFixed(2)}`, icon: TrendingUp, color: 'from-emerald-500 to-teal-500' },
        { label: 'Active Cards', value: userData.activeCards.toString(), icon: Gift, color: 'from-purple-500 to-pink-500' }
    ];

    const recentOrders = [
        { id: 1, brand: 'Flipkart', value: 500, status: 'delivered', date: '2 days ago', logo: '🛒' },
        { id: 2, brand: 'Bill Payment', value: 840, status: 'success', date: 'Yesterday', logo: '⚡' },
        { id: 3, brand: 'Swiggy', value: 300, status: 'processing', date: '1 hour ago', logo: '🍔' },
    ];

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 flex items-center justify-center font-[family-name:var(--font-outfit)]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 font-[family-name:var(--font-outfit)]">
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
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-gray-100 mb-2 tracking-tight">
                            Welcome back, {userData.name.split(' ')[0]}! 👋
                        </h1>
                        <p className="text-slate-500 dark:text-gray-400 text-lg">
                            Manage your wallet, cards, and payments across the system.
                        </p>
                    </motion.div>

                    {/* Minimal Stats Grid (Replacing heavy cards) */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10">
                        {stats.map((stat, index) => {
                            const Icon = stat.icon;
                            return (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-all group"
                                >
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 shadow-lg shadow-gray-200 group-hover:scale-110 transition-transform`}>
                                        <Icon size={20} className="text-white" />
                                    </div>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-gray-100 mb-1">{stat.value}</div>
                                    <div className="text-sm font-medium text-slate-500 dark:text-gray-400">{stat.label}</div>
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
                                className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-100 dark:border-gray-700 p-8 shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-gray-100">Quick Services</h2>
                                    <Link href="/services" className="text-blue-600 text-sm font-bold hover:underline">View All</Link>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-6">
                                    {quickServices.map((service) => (
                                        <Link href={service.href} key={service.id} className="flex flex-col items-center gap-3 group">
                                            <div className={`w-14 h-14 rounded-2xl ${service.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                                                <service.icon size={24} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{service.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Recent Orders / Transactions */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-100 dark:border-gray-700 p-8 shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-gray-100">Recent Activity</h2>
                                    <Link href="/my-giftcards" className="text-blue-600 text-sm font-bold hover:underline">View All</Link>
                                </div>
                                <div className="space-y-4">
                                    {recentOrders.map((order) => (
                                        <div key={order.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-gray-600">
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-gray-700 flex items-center justify-center text-2xl">
                                                {order.logo}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-slate-900 dark:text-gray-100">{order.brand}</div>
                                                <div className="text-sm text-slate-500 dark:text-gray-400">₹{order.value} • {order.date}</div>
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
                            {userData.kycStatus === 'verified' && (
                                <MerchantOpportunityBanner />
                            )}

                            {/* Quick Links Card */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                                className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-100 dark:border-gray-700 p-6 shadow-sm"
                            >
                                <h3 className="font-bold text-slate-900 dark:text-gray-100 mb-4">Quick Actions</h3>
                                <div className="space-y-2">
                                    <Link href="/gift-cards" className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 group transition-colors">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <Gift size={20} />
                                        </div>
                                        <div className="font-bold text-slate-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400">Buy Gift Cards</div>
                                        <ChevronRight size={16} className="ml-auto text-slate-400" />
                                    </Link>
                                    <Link href="/my-giftcards" className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/30 group transition-colors">
                                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                            <Package size={20} />
                                        </div>
                                        <div className="font-bold text-slate-700 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-400">My Orders</div>
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
