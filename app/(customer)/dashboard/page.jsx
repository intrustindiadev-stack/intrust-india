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
import { toast } from 'react-hot-toast';

import DashboardStats from '@/components/customer/dashboard/DashboardStats';
import QuickServices from '@/components/customer/dashboard/QuickServices';
import RecentActivity from '@/components/customer/dashboard/RecentActivity';
import QuickActions from '@/components/customer/dashboard/QuickActions';
import GoldSubscription from '@/components/customer/dashboard/GoldSubscription';
import PackageSelectionModal from '@/components/customer/dashboard/PackageSelectionModal';

function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 font-[family-name:var(--font-outfit)]">
            <Navbar />
            <div className="pt-[12vh] sm:pt-[15vh] pb-24 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto animate-pulse">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-8" />
                    <div className="h-8 sm:h-10 w-64 sm:w-80 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-10" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                        <div className="lg:col-span-2 space-y-8">
                            <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                        </div>
                        <div className="lg:col-span-1 space-y-8">
                            <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                            <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                        </div>
                    </div>
                </div>
            </div>
            <CustomerBottomNav />
        </div>
    );
}

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
    const [walletConfirmPkg, setWalletConfirmPkg] = useState(null);

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
            setWalletConfirmPkg(pkg);
            return;
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
            toast.error('Payment failed: ' + err.message);
        }
    };

    const handleWalletPayment = async (pkg) => {
        setLoading(true);
        setWalletConfirmPkg(null);
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

            toast.success('Elite Gold activated successfully via wallet!');

            // Calculate new expiry manually to update UI instantly without reload
            const monthsToAdd = pkg.id === 'GOLD_1M' ? 1 : pkg.id === 'GOLD_3M' ? 3 : 12;
            let baseDate = new Date();
            if (userData.isGoldVerified && userData.subscriptionExpiry) {
                const currentExpiry = new Date(userData.subscriptionExpiry);
                if (currentExpiry > baseDate) {
                    baseDate = currentExpiry;
                }
            }
            const newExpiryDate = new Date(baseDate);
            newExpiryDate.setMonth(newExpiryDate.getMonth() + monthsToAdd);

            setUserData(prev => ({
                ...prev,
                isGoldVerified: true,
                subscriptionExpiry: newExpiryDate.toISOString(),
                walletBalance: prev.walletBalance - pkg.price
            }));

            setShowPackages(false);
        } catch (err) {
            console.error('Wallet payment error:', err);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;

            try {
                const now = new Date().toISOString();

                // Create a timeout promise to reject after 5s
                const timeoutTx = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Dashboard fetch timeout')), 5000)
                );

                // Race the fetch bundle against timeout
                const mainFetch = Promise.allSettled([
                    supabase.from('user_profiles').select('full_name, role, is_gold_verified, subscription_expiry, kyc_status').eq('id', user.id).single(),
                    supabase.from('kyc_records').select('status, verification_status').eq('user_id', user.id).maybeSingle(),
                    supabase.from('customer_wallets').select('balance_paise').eq('user_id', user.id).maybeSingle(),
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
                } else if (walletResult.status === 'rejected' || walletResult.value?.error) {
                    // Auto-create wallet if missing (PGRST116) or throwing 403 due to RLS + no row
                    console.log('[DASHBOARD] Wallet not found. Attempting auto-creation...');
                    const { data: newWallet } = await supabase.from('customer_wallets')
                        .insert([{ user_id: user.id }])
                        .select('balance_paise')
                        .single();
                    if (newWallet) {
                        walletBalance = (newWallet.balance_paise || 0) / 100;
                    }
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

        let subscription;
        if (!authLoading) {
            console.log('[DASHBOARD] Auth finished. User:', user?.id);
            if (user) {
                fetchDashboardData();

                subscription = supabase
                    .channel('dashboard_wallet')
                    .on(
                        'postgres_changes',
                        { event: '*', schema: 'public', table: 'customer_wallets', filter: `user_id=eq.${user.id}` },
                        (payload) => {
                            if (payload.new && payload.new.balance_paise !== undefined) {
                                setUserData(prev => ({
                                    ...prev,
                                    walletBalance: payload.new.balance_paise / 100
                                }));
                            }
                        }
                    )
                    .subscribe();
            } else {
                console.log('[DASHBOARD] No user, stopping loading.');
                setLoading(false);
            }
        } else {
            console.log('[DASHBOARD] Waiting for auth...');
        }

        return () => {
            if (subscription) {
                supabase.removeChannel(subscription);
            }
        };
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
        return <DashboardSkeleton />;
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

                    <DashboardStats stats={stats} />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                        {/* Main Content Area */}
                        <div className="lg:col-span-2 space-y-8">

                            <QuickServices services={quickServices} />
                            <RecentActivity orders={recentOrders} />

                            {/* KYC Banner */}
                            {userData.kycStatus === 'verified' && (
                                <MerchantOpportunityBanner />
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-1 space-y-8">
                            <GoldSubscription
                                userData={userData}
                                timeLeft={timeLeft}
                                setShowPackages={setShowPackages}
                                paymentLoading={paymentLoading}
                            />
                            <QuickActions />
                        </div>
                    </div>

                    <OpportunitiesSection />
                </div>
            </div>
            <CustomerBottomNav />

            <PackageSelectionModal
                showPackages={showPackages}
                setShowPackages={setShowPackages}
                handleBuyPackage={handleBuyPackage}
                userData={userData}
            />

            {/* Wallet Payment Confirmation Modal */}
            <AnimatePresence>
                {walletConfirmPkg && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-950/70 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-gray-900 border border-white/10 rounded-[2rem] p-8 text-center shadow-2xl max-w-sm w-full relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none" />

                            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/5 text-blue-400 flex items-center justify-center mb-6 border border-blue-500/20 shadow-lg shadow-blue-500/10">
                                <Wallet size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2 italic tracking-tight">Confirm Wallet Pay</h3>
                            <p className="text-[13px] font-medium text-gray-400 mb-8 leading-relaxed">
                                Deduct <span className="font-bold text-white relative whitespace-nowrap"><span className="absolute -inset-1 bg-white/10 rounded-lg blur-sm"></span><span className="relative">₹{walletConfirmPkg.price}</span></span> from your wallet balance to activate the <span className="text-amber-500 font-bold">{walletConfirmPkg.label}</span> package?
                            </p>
                            <div className="flex flex-col gap-3 relative z-10">
                                <button
                                    onClick={() => handleWalletPayment(walletConfirmPkg)}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
                                    disabled={loading}
                                >
                                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm Payment'}
                                </button>
                                <button
                                    onClick={() => setWalletConfirmPkg(null)}
                                    className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-xl transition-all"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
