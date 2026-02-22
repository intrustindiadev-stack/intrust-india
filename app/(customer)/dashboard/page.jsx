'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import {
    Wallet, Package, TrendingUp, Gift, Heart, Star,
    Smartphone, Zap, Tv, Store, CreditCard, ScanLine, Grid,
    CheckCircle, Clock, ChevronRight, Check, Lock, Calendar, AlertCircle, X, Shield, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';
import OpportunitiesSection from '@/components/customer/OpportunitiesSection';
import MerchantOpportunityBanner from '@/components/customer/MerchantOpportunityBanner';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { usePayment } from '@/hooks/usePayment';
import { supabase } from '@/lib/supabaseClient';
import GoldBadge from '@/components/ui/GoldBadge';

export default function CustomerDashboardPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { initiatePayment, loading: paymentLoading } = usePayment();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState({
        name: '',
        totalPurchases: 0,
        totalSavings: 0,
        kycStatus: 'pending',
        isGoldVerified: false,
        subscriptionExpiry: null,
        walletBalance: 0.00,
        activeCards: 0
    });

    const [showPackages, setShowPackages] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);

    // Countdown logic
    useEffect(() => {
        if (!userData.isGoldVerified || !userData.subscriptionExpiry) {
            setTimeLeft(null);
            return;
        }

        const interval = setInterval(() => {
            const now = new Date();
            const expiry = new Date(userData.subscriptionExpiry);
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeLeft('EXPIRED');
                clearInterval(interval);
            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const secs = Math.floor((diff % (1000 * 60)) / 1000);

                if (days > 0) {
                    setTimeLeft(`${days}d ${hours}h left`);
                } else {
                    setTimeLeft(`${hours}h ${mins}m ${secs}s`);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [userData.isGoldVerified, userData.subscriptionExpiry]);

    const handleBuyPackage = async (pkg) => {
        // Check if balance is sufficient for wallet payment
        if (userData.walletBalance >= pkg.price) {
            if (confirm(`Direct Wallet Pay Available! You have ₹${userData.walletBalance.toFixed(2)} in your wallet. Pay ₹${pkg.price} from wallet instead?`)) {
                return handleWalletPayment(pkg);
            }
        }

        try {
            // Sabpaisa needs exactly 10-digit mobile number
            const cleanMobile = (profile?.phone || '').replace(/\D/g, '').slice(-10);

            await initiatePayment({
                amount: pkg.price,
                payerName: userData.name,
                payerEmail: user.email,
                payerMobile: cleanMobile,
                udf1: 'GOLD_SUBSCRIPTION',
                udf2: pkg.id // e.g., GOLD_1M, GOLD_3M, GOLD_1Y
            });
        } catch (err) {
            alert('Payment failed: ' + err.message);
        }
    };

    const handleWalletPayment = async (pkg) => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Authentication session required');

            const response = await fetch('/api/payment/wallet-pay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    packageId: pkg.id,
                    amount: pkg.price
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Wallet payment failed');

            alert('Elite Gold activated successfully via wallet! Reloading...');
            window.location.reload();
        } catch (err) {
            console.error('Wallet payment error:', err);
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

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
                    supabase.from('user_profiles').select('full_name, role, is_gold_verified, subscription_expiry, kyc_status').eq('id', user.id).single(),
                    supabase.from('kyc_records').select('status, verification_status').eq('user_id', user.id).single(),
                    supabase.from('customer_wallets').select('balance_paise').eq('user_id', user.id).single(),
                    supabase.from('coupons').select('face_value_paise, selling_price_paise, valid_until, status').eq('purchased_by', user.id).eq('status', 'sold')
                ]);

                const results = await Promise.race([mainFetch, timeoutTx]);

                // Process results (allSettled returns objects with { status, value })
                const profileResult = results[0];
                const kycResult = results[1];
                const walletResult = results[2];
                const couponsResult = results[3];

                // 1. Process Profile
                let profile = null;
                if (profileResult.status === 'fulfilled' && profileResult.value.data) {
                    profile = profileResult.value.data;
                    console.log('[DASHBOARD] Profile loaded:', profile);
                } else {
                    console.warn('[DASHBOARD] Profile fetch failed or empty:', profileResult);
                }

                // 2. Process KYC (Prioritize user_profiles, fallback to kyc_records)
                let kycStatus = profile?.kyc_status || 'not_started';
                if (kycStatus === 'not_started' && kycResult.status === 'fulfilled' && kycResult.value.data) {
                    kycStatus = kycResult.value.data.verification_status || kycResult.value.data.status;
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

                // 3. Wallet Balance
                let walletBalance = 0.00;
                if (walletResult.status === 'fulfilled' && walletResult.value.data) {
                    walletBalance = (walletResult.value.data.balance_paise || 0) / 100;
                }

                setUserData({
                    name: profile?.full_name || user.email?.split('@')[0] || 'User',
                    totalPurchases,
                    totalSavings,
                    kycStatus,
                    isGoldVerified: profile?.is_gold_verified || false,
                    subscriptionExpiry: profile?.subscription_expiry || null,
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

            <div className="pt-[12vh] sm:pt-[15vh] pb-24 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-4 sm:mb-8">
                        <Breadcrumbs items={[{ label: 'Dashboard' }]} />
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mb-6 sm:mb-10"
                    >
                        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-gray-100 mb-1 tracking-tight">
                            Welcome back, {userData.name.split(' ')[0]}! 👋
                            {userData.isGoldVerified && (
                                <span className="inline-flex items-center align-middle ml-2.5">
                                    <GoldBadge size="md" />
                                </span>
                            )}
                        </h1>
                        <p className="text-slate-500 dark:text-gray-400 text-sm sm:text-lg">
                            Manage your wallet, cards, and payments across the system.
                        </p>
                    </motion.div>

                    {/* Minimal Stats Grid (Replacing heavy cards) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
                        {stats.map((stat, index) => {
                            const Icon = stat.icon;
                            return (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    onClick={() => stat.label === 'Wallet Balance' && router.push('/wallet')}
                                    className={`relative overflow-hidden group bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white dark:border-white/5 p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:hover:bg-gray-800/60 transition-all duration-500 ${stat.label === 'Wallet Balance' ? 'cursor-pointer hover:border-blue-200 dark:hover:border-blue-500/30' : ''}`}
                                >
                                    {/* Abstract background glow */}
                                    <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-[0.03] dark:opacity-[0.08] blur-3xl rounded-full group-hover:opacity-[0.1] transition-opacity`} />

                                    <div className="flex items-center justify-between relative z-10">
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg shadow-gray-200 dark:shadow-none group-hover:scale-110 transition-transform duration-500`}>
                                            <Icon size={24} className="text-white" />
                                        </div>
                                        {stat.label === 'Wallet Balance' && (
                                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ChevronRight size={18} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 sm:mt-5 relative z-10">
                                        <div className="text-[10px] sm:text-sm font-semibold text-slate-500 dark:text-gray-400 mb-0.5">{stat.label}</div>
                                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-gray-100 tracking-tight">{stat.value}</div>
                                    </div>
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
                                className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white dark:border-white/5 p-4 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                            >
                                <div className="flex items-center justify-between mb-5 sm:mb-8">
                                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-gray-100 tracking-tight">Quick Services</h2>
                                    <Link href="/services" className="text-blue-600 dark:text-blue-400 text-sm font-black hover:opacity-80 transition-opacity flex items-center gap-1 group/link">
                                        View All
                                        <ChevronRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                                    </Link>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 sm:gap-4">
                                    {quickServices.map((service) => (
                                        <Link href={service.href} key={service.id} className="flex flex-col items-center gap-3 group">
                                            <div className={`relative w-14 h-14 sm:w-14 sm:h-14 rounded-2xl ${service.color} flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg shadow-gray-200/50 dark:shadow-none`}>
                                                <service.icon size={26} className="sm:size-6" />
                                                <div className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-current transition-all opacity-20" />
                                            </div>
                                            <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white text-center line-clamp-1">{service.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Recent Orders / Transactions */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white dark:border-white/5 p-4 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                            >
                                <div className="flex items-center justify-between mb-5 sm:mb-8">
                                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-gray-100 tracking-tight">Recent Activity</h2>
                                    <Link href="/my-giftcards" className="text-blue-600 dark:text-blue-400 text-sm font-black hover:opacity-80 transition-opacity">View History</Link>
                                </div>
                                <div className="space-y-3 sm:space-y-4">
                                    {recentOrders.map((order) => (
                                        <div key={order.id} className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl group bg-slate-50/50 dark:bg-white/5 hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 border border-transparent hover:border-slate-100 dark:hover:border-white/5 hover:shadow-xl hover:shadow-gray-200/40 dark:hover:shadow-none">
                                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white dark:bg-gray-600 shadow-sm flex items-center justify-center text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-500">
                                                {order.logo}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-extrabold text-slate-900 dark:text-gray-100 truncate flex items-center gap-2">
                                                    {order.brand}
                                                </div>
                                                <div className="text-sm text-slate-500 dark:text-gray-400 font-bold">₹{order.value} <span className="mx-1 text-slate-300">•</span> {order.date}</div>
                                            </div>
                                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${order.status === 'delivered' || order.status === 'success'
                                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>
                                                {order.status === 'processing' ? <Clock size={12} strokeWidth={3} /> : <CheckCircle size={12} strokeWidth={3} />}
                                                {order.status}
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

                            {/* Gold Verification Promo */}
                            {!userData.isGoldVerified && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="group relative overflow-hidden bg-gradient-to-br from-[#1a1600] via-[#2a2200] to-[#000000] rounded-[2.5rem] p-8 text-white shadow-2xl border border-amber-500/30"
                                >
                                    {/* Premium Texture Overlay */}
                                    <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

                                    {/* Holographic Glowing Orbs */}
                                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full group-hover:bg-amber-500/20 transition-all duration-700" />
                                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-yellow-500/5 blur-[80px] rounded-full" />

                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-lg shadow-amber-900/40">
                                                    <Star className="text-white fill-white" size={28} />
                                                </div>
                                                <div>
                                                    <span className="block font-black text-2xl tracking-tight text-amber-100 italic">InTrust GOLD</span>
                                                    <span className="text-[10px] font-bold text-amber-500/60 uppercase tracking-[0.2em]">Elite Membership</span>
                                                </div>
                                            </div>
                                            <div className="w-12 h-8 bg-gradient-to-br from-amber-200 to-amber-500 rounded-md opacity-40" /> {/* Chip sim */}
                                        </div>

                                        <h3 className="text-3xl font-black mb-3 leading-tight bg-gradient-to-r from-amber-100 via-white to-amber-200 bg-clip-text text-transparent">
                                            Buy Gold Verified ✨
                                        </h3>
                                        <p className="text-amber-100/70 text-sm mb-6 font-medium max-w-[280px] leading-relaxed">
                                            Get the <span className="text-amber-400 font-bold">Elite Shield</span> tick + ₹199 Instant Cashback &
                                            <span className="text-white font-bold ml-1 text-base block mt-1">Unlock Many Premium Offers! 🎁</span>
                                        </p>

                                        <div className="flex flex-col gap-3 mb-8">
                                            {[
                                                'Elite Blue Tick Identity',
                                                '₹199 Instant Wallet Cashback',
                                                'Priority Support Access',
                                                'Exclusive Merchant Offers'
                                            ].map((feature, i) => (
                                                <div key={i} className="flex items-center gap-2.5">
                                                    <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                                        <Check size={12} className="text-amber-400" />
                                                    </div>
                                                    <span className="text-[13px] font-semibold text-amber-50/80">{feature}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-4">
                                            {userData.kycStatus === 'verified' ? (
                                                <>
                                                    {userData.isGoldVerified ? (
                                                        <div className="space-y-3">
                                                            <div className="w-full py-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col items-center justify-center gap-1">
                                                                <div className="flex items-center gap-2 text-amber-500 font-bold">
                                                                    <Shield size={18} />
                                                                    <span>ELITE GOLD ACTIVE</span>
                                                                </div>
                                                                <p className="text-[10px] text-amber-500/60 font-black tracking-widest uppercase">
                                                                    {timeLeft ? timeLeft : 'UPDATING...'}
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => setShowPackages(true)}
                                                                className="w-full py-3 bg-white/5 hover:bg-white/10 text-amber-400 text-xs font-bold rounded-xl border border-amber-500/20 transition-all flex items-center justify-center gap-2"
                                                            >
                                                                Extend Subscription
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            disabled={paymentLoading}
                                                            onClick={() => setShowPackages(true)}
                                                            className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-black font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-amber-900/40 flex items-center justify-center gap-2 group/btn"
                                                        >
                                                            {paymentLoading ? 'PROCCESSING...' : (
                                                                <>
                                                                    UNLEASH ELITE GOLD
                                                                    <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="space-y-3">
                                                    <button
                                                        disabled
                                                        className="w-full py-4 bg-white/10 text-white/40 font-bold text-lg rounded-2xl border border-white/10 cursor-not-allowed flex items-center justify-center gap-2"
                                                    >
                                                        <Lock size={18} />
                                                        Complete KYC to Unlock
                                                    </button>
                                                    <p className="text-[11px] text-center text-amber-500/60 font-medium">
                                                        Elite Gold features require a verified identity.
                                                    </p>
                                                </div>
                                            )}
                                            <p className="text-[10px] text-center font-bold text-amber-500/40 tracking-widest uppercase italic">✨ Premium Membership ✨</p>
                                        </div>
                                    </div>

                                    {/* High-End Shine effect */}
                                    <motion.div
                                        animate={{
                                            left: ['-100%', '200%'],
                                        }}
                                        transition={{
                                            duration: 3,
                                            repeat: Infinity,
                                            repeatDelay: 5,
                                            ease: "easeInOut"
                                        }}
                                        className="absolute inset-0 w-3/4 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 pointer-events-none"
                                    />
                                </motion.div>
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

            {/* Package Selection Modal */}
            <AnimatePresence>
                {showPackages && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-gray-950/40 backdrop-blur-md p-0 sm:p-4"
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="bg-gray-900 w-full max-w-3xl rounded-t-[40px] sm:rounded-[40px] border-t sm:border border-white/10 overflow-hidden relative shadow-[0_-20px_80px_rgba(0,0,0,0.5)]"
                        >
                            {/* Accent Glows */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

                            <div className="relative flex flex-col md:flex-row h-full max-h-[90vh] overflow-y-auto sm:overflow-hidden">

                                {/* Benefits Section (Left on Desktop) */}
                                <div className="hidden md:flex flex-col w-72 bg-white/5 border-r border-white/5 p-8">
                                    <div className="mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/40 mb-4">
                                            <Shield className="text-white" size={24} />
                                        </div>
                                        <h3 className="text-lg font-black text-white italic tracking-tight">ELITE BENEFITS</h3>
                                        <p className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest">Membership Perks</p>
                                    </div>

                                    <div className="space-y-6">
                                        {[
                                            { title: 'Identity Verification', desc: 'Premium blue tick profile badge', icon: CheckCircle },
                                            { title: 'Instant Cashback', desc: 'Up to ₹1499 back in wallet', icon: Wallet },
                                            { title: 'Priority Access', desc: 'Exclusive merchant offers first', icon: Star },
                                            { title: '24/7 Support', desc: 'Dedicated priority support line', icon: Smartphone }
                                        ].map((benefit, i) => (
                                            <div key={i} className="flex gap-3">
                                                <div className="mt-1 flex-shrink-0">
                                                    <benefit.icon size={16} className="text-amber-500" />
                                                </div>
                                                <div>
                                                    <div className="text-[13px] font-bold text-white leading-tight mb-0.5">{benefit.title}</div>
                                                    <div className="text-[11px] text-white/40 font-medium leading-tight">{benefit.desc}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-auto pt-8 border-t border-white/5">
                                        <p className="text-[10px] text-white/20 font-medium leading-relaxed italic">
                                            Join thousands of elite users enjoying high-value savings every day.
                                        </p>
                                    </div>
                                </div>

                                {/* Selection Section (Right) */}
                                <div className="flex-1 p-6 sm:p-10">
                                    <div className="flex items-start justify-between mb-8">
                                        <div>
                                            <h2 className="text-3xl font-black text-white italic tracking-tighter leading-none mb-2">CHOOSE YOUR PLAN</h2>
                                            <p className="text-amber-500/80 text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                                                Secure Payment via SABPAISA <Shield size={12} strokeWidth={3} />
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowPackages(false)}
                                            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all hover:bg-white/10"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {/* Mobile Benefits (Brief) */}
                                    <div className="flex md:hidden items-center gap-4 mb-8 p-4 bg-white/5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                                        {['Verified Identity', 'Instant Cashback', 'Priority Support'].map((b, i) => (
                                            <div key={i} className="flex items-center gap-2 whitespace-nowrap">
                                                <CheckCircle size={12} className="text-amber-500" />
                                                <span className="text-[10px] font-bold text-white/60 uppercase">{b}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid gap-5">
                                        {[
                                            { id: 'GOLD_1M', label: '1 MONTH ELITE', price: 299, cashback: 199, popular: false, color: 'from-blue-500/20 to-indigo-500/5' },
                                            { id: 'GOLD_3M', label: '3 MONTHS ELITE', price: 799, cashback: 499, popular: true, color: 'from-amber-500/20 to-orange-500/5' },
                                            { id: 'GOLD_1Y', label: '1 YEAR ELITE', price: 2499, cashback: 1499, popular: false, color: 'from-purple-500/20 to-pink-500/5' },
                                        ].map((pkg) => (
                                            <button
                                                key={pkg.id}
                                                onClick={() => handleBuyPackage(pkg)}
                                                className={`group relative p-6 rounded-[2rem] border transition-all duration-500 text-left ${pkg.popular
                                                    ? 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/50 shadow-[0_20px_50px_rgba(245,158,11,0.1)] ring-1 ring-amber-500/20'
                                                    : 'bg-white/5 border-white/5 hover:border-white/20'
                                                    }`}
                                            >
                                                {pkg.popular && (
                                                    <div className="absolute top-0 right-8 px-4 py-1.5 bg-amber-500 text-[10px] font-black text-black rounded-b-xl tracking-tighter uppercase shadow-lg shadow-amber-900/40">
                                                        Most Popular CHOICE
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between relative z-10">
                                                    <div>
                                                        <span className={`text-[10px] font-black tracking-[0.2em] mb-2 block uppercase ${pkg.popular ? 'text-amber-500' : 'text-white/40'}`}>
                                                            {pkg.label}
                                                        </span>
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-3xl font-black text-white italic tracking-tighter">₹{pkg.price}</span>
                                                            <span className="text-sm font-bold text-white/20 line-through">₹{Math.round(pkg.price * 1.5)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 inline-block group-hover:scale-110 transition-transform duration-500">
                                                            <div className="text-[10px] font-bold text-emerald-500 tracking-tighter uppercase mb-0.5">Instant Return</div>
                                                            <div className="text-base font-black text-emerald-400 leading-none italic">+ ₹{pkg.cashback}</div>
                                                        </div>
                                                        <p className="mt-2 text-[11px] text-white/30 font-bold tracking-tight">Net Cost: ₹{pkg.price - pkg.cashback}</p>
                                                    </div>
                                                </div>

                                                {/* Hover Glow */}
                                                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>

                                    {/* Wallet Balance Integration Intro */}
                                    <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                                <Wallet size={20} />
                                            </div>
                                            <div>
                                                <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Your Balance</div>
                                                <div className="text-lg font-black text-white italic">₹{userData.walletBalance.toFixed(2)}</div>
                                            </div>
                                        </div>
                                        {userData.walletBalance >= 299 ? (
                                            <div className="text-[10px] font-bold text-emerald-500/80 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                                                AVAILABLE FOR WALLET PAY
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest italic">
                                                Top up to pay via wallet
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
