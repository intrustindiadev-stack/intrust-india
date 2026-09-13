'use client';

import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import PullToRefresh from '@/components/ui/PullToRefresh';
import {
    Wallet, Package, TrendingUp, Gift, Heart, Star,
    CheckCircle, Clock, ChevronRight, Check, Lock, Calendar, AlertCircle, X, Shield, Sparkles, Sun,
    CreditCard as CreditCardIcon, ShoppingBag, Zap as ZapIcon, Coins, Smartphone, ShoppingCart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';
import dynamic from 'next/dynamic';

import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { PayerContactError, usePayment } from '@/hooks/usePayment';
import { usePayerContact } from '@/hooks/usePayerContact';
import { supabase } from '@/lib/supabaseClient';
import GoldBadge from '@/components/ui/GoldBadge';
import { displayName } from '@/lib/auth';

// ── E-Commerce First Dashboard Components ──
import EcomHeroCarousel, { DEFAULT_SLIDES as HERO_BANNERS } from '@/components/customer/dashboard/EcomHeroCarousel';
import CategoryQuickPills from '@/components/customer/dashboard/CategoryQuickPills';
import TrendingProductsGrid from '@/components/customer/dashboard/TrendingProductsGrid';
import VerifiedStoresNearby from '@/components/customer/dashboard/VerifiedStoresNearby';
import ActiveOrdersSnapshot from '@/components/customer/dashboard/ActiveOrdersSnapshot';
import FintechWalletCard from '@/components/customer/dashboard/FintechWalletCard';
import FintechGrowthSection from '@/components/customer/dashboard/FintechGrowthSection';
import PromoBanners from '@/components/customer/dashboard/PromoBanners';
import KYCPopup from '@/components/kyc/KYCPopup';
import { useKYCPopup } from '@/hooks/useKYCPopup';
import MerchantApplyPopup from '@/components/merchant/MerchantApplyPopup';
import { useMerchantApplyPopup } from '@/hooks/useMerchantApplyPopup';
import MerchantOpportunityBanner from '@/components/customer/MerchantOpportunityBanner';

const DisclaimerNote = dynamic(() => import('@/components/customer/dashboard/DisclaimerNote'), { ssr: false });
const RecentActivity = dynamic(() => import('@/components/customer/dashboard/RecentActivity'), { ssr: false });
const PackageSelectionModal = dynamic(() => import('@/components/customer/dashboard/PackageSelectionModal'), { ssr: false });
const OnboardingModal = dynamic(() => import('@/components/customer/dashboard/OnboardingModal'), { ssr: false });

function DashboardSkeleton() {
    return (
        <div className="w-full space-y-8 animate-pulse">
            <div className="h-10 w-64 bg-surface-container-high rounded-2xl" />
            <div className="h-72 w-full bg-surface-container-high rounded-3xl" />
            <div className="flex gap-3 overflow-hidden">
                {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className="h-10 w-32 bg-surface-container-high rounded-2xl shrink-0" />
                ))}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-64 bg-surface-container-high rounded-3xl" />
                ))}
            </div>
        </div>
    );
}

// In-memory client cache to preserve dashboard state across back navigation
let dashboardMemoryCache = null;

export default function CustomerDashboardPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { initiatePayment, loading: paymentLoading } = usePayment();
    const payerContact = usePayerContact({ requireMerchant: false });
    
    // If we have cached dashboard data, start with loading=false for instantaneous render on back navigation
    const [loading, setLoading] = useState(() => !dashboardMemoryCache);
    const [userData, setUserData] = useState(() => dashboardMemoryCache?.userData || {
        name: '',
        totalPurchases: 0,
        totalSavings: 0,
        kycStatus: 'pending',
        isGoldVerified: false,
        subscriptionExpiry: null,
        walletBalance: 0.00,
        activeCards: 0,
        completedOnboarding: true,
        referralCode: null,
        merchantStatus: null,
        merchantSub1mPrice: null,
    });

    const [topMerchants, setTopMerchants] = useState(() => dashboardMemoryCache?.topMerchants || []);
    const [recentActivity, setRecentActivity] = useState(() => dashboardMemoryCache?.recentActivity || []);
    const [showPackages, setShowPackages] = useState(false);
    const [walletConfirmPkg, setWalletConfirmPkg] = useState(null);

    // KYC Popup
    const { isOpen: kycPopupOpen, closeKYC } = useKYCPopup({
        kycStatus: userData.kycStatus,
        enabled: !loading && !!user
    });

    // Merchant Apply Popup
    const { isOpen: merchantPopupOpen, closeMerchantPopup, closePopup } = useMerchantApplyPopup({
        merchantStatus: userData.merchantStatus,
        enabled: !loading && !!user
    });



    const processActivityFeed = (coupons, walletTxs) => {
        const normalizedCoupons = (coupons || []).map(c => ({
            id: `coupon-${c.id}`,
            rawDate: new Date(c.purchased_at).getTime(),
            brand: c.brand || 'Gift Card',
            description: c.title || 'Gift Card Purchase',
            value: ((c.face_value_paise || 0) / 100).toFixed(2),
            status: 'success',
            type: 'COUPON',
            logo: <Gift size={20} />
        }));

        const normalizedWallet = (walletTxs || []).map(w => {
            let logo = <Wallet size={20} />;
            if (w.type === 'CASHBACK') logo = <TrendingUp size={20} />;
            if (w.type === 'DEBIT') logo = <Package size={20} />;

            return {
                id: `wallet-${w.id}`,
                rawDate: new Date(w.created_at).getTime(),
                brand: w.type === 'TOPUP' ? 'Wallet Added' : (w.type === 'CASHBACK' ? 'Cashback Earned' : 'Wallet Paid'),
                description: w.description || w.type,
                value: ((w.amount_paise || 0) / 100).toFixed(2),
                status: 'success',
                type: 'WALLET',
                logo
            };
        });

        const combined = [...normalizedCoupons, ...normalizedWallet]
            .sort((a, b) => b.rawDate - a.rawDate)
            .slice(0, 5)
            .map(item => {
                const now = new Date();
                const diffTime = Math.abs(now - new Date(item.rawDate));
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
                let dateStr = 'Just now';
                if (diffHours < 24) {
                    dateStr = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                } else if (diffDays === 1) {
                    dateStr = 'Yesterday';
                } else {
                    dateStr = `${diffDays} days ago`;
                }

                return {
                    ...item,
                    date: dateStr
                };
            });

        setRecentActivity(combined);
        return combined;
    };

    const fetchDashboardData = useCallback(async () => {
        if (!user) return;
        try {
            const timeoutTx = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Dashboard fetch timeout')), 5000)
            );

            const mainFetch = Promise.allSettled([
                supabase.from('user_profiles').select('full_name, role, is_gold_verified, subscription_expiry, kyc_status, completed_onboarding, referral_code').eq('id', user.id).single(),
                supabase.from('kyc_records').select('status, verification_status').eq('user_id', user.id).maybeSingle(),
                supabase.from('customer_wallets').select('balance_paise').eq('user_id', user.id).maybeSingle(),
                supabase.from('orders').select(`
                    id, amount, created_at,
                    coupons:coupons!orders_giftcard_id_fkey (
                        id, brand, title, face_value_paise, selling_price_paise, status, purchased_at, valid_until
                    )
                `).eq('user_id', user.id).eq('payment_status', 'paid').order('created_at', { ascending: false }),
                supabase.from('customer_wallet_transactions').select('id, type, amount_paise, description, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
                supabase.from('merchants').select('status, subscription_status').eq('user_id', user.id).maybeSingle(),
                supabase.from('reward_points_balance').select('total_earned').eq('user_id', user.id).maybeSingle(),
                supabase.from('platform_settings').select('value').eq('key', 'merchant_sub_price_1m').maybeSingle(),
                supabase.from('merchants')
                    .select('id, slug, business_name, business_address, shopping_banner_url, is_open, subscription_status, subscription_expires_at, business_phone')
                    .eq('status', 'approved')
                    .eq('subscription_status', 'active')
                    .or(`subscription_expires_at.is.null,subscription_expires_at.gt.${new Date().toISOString()}`)
                    .order('business_name', { ascending: true })
                    .limit(6),
            ]);

            const results = await Promise.race([mainFetch, timeoutTx]);

            const profileResult = results[0];
            const kycResult = results[1];
            const walletResult = results[2];
            const couponsResult = results[3];
            const walletTxResult = results[4];
            const merchantResult = results[5];
            const rewardsResult = results[6];
            const sub1mResult = results[7];
            const topMerchantsResult = results[8];

            let profileData = null;
            if (profileResult.status === 'fulfilled' && profileResult.value.data) {
                profileData = profileResult.value.data;
            }

            let kycStatus = profileData?.kyc_status || 'not_started';
            if (kycStatus === 'not_started' && kycResult.status === 'fulfilled' && kycResult.value.data) {
                kycStatus = kycResult.value.data.verification_status || kycResult.value.data.status;
            }

            let coupons = [];
            if (couponsResult.status === 'fulfilled' && couponsResult.value.data) {
                coupons = couponsResult.value.data
                    .filter(order => order.coupons)
                    .map(order => ({
                        ...order.coupons,
                        order_amount: order.amount,
                        purchased_at: order.coupons.purchased_at || order.created_at,
                    }));
            }

            let totalSavings = 0;
            let activeCards = 0;
            let totalPurchases = 0;

            if (coupons.length > 0) {
                totalPurchases = coupons.length;
                coupons.forEach(coupon => {
                    const faceValue = coupon.face_value_paise || 0;
                    const sellingPrice = coupon.selling_price_paise || 0;
                    totalSavings += (faceValue - sellingPrice);

                    const isExpired = new Date(coupon.valid_until) < new Date();
                    if (coupon.status === 'sold' && !isExpired) {
                        activeCards++;
                    }
                });
            }

            totalSavings = totalSavings / 100;

            let walletBalance = 0.00;
            if (walletResult.status === 'fulfilled' && walletResult.value.data) {
                walletBalance = (walletResult.value.data.balance_paise || 0) / 100;
            }

            let walletTxs = [];
            if (walletTxResult.status === 'fulfilled' && walletTxResult.value.data) {
                walletTxs = walletTxResult.value.data;
            }
            const activityFeed = processActivityFeed(coupons.slice(0, 5), walletTxs);

            const rewardPoints = rewardsResult.status === 'fulfilled' && rewardsResult.value.data ? rewardsResult.value.data.total_earned : 0;

            if (topMerchantsResult && topMerchantsResult.status === 'fulfilled' && topMerchantsResult.value.data) {
                setTopMerchants(topMerchantsResult.value.data);
            }

            const finalUserData = {
                name: displayName(profileData, user),
                totalPurchases,
                totalSavings,
                kycStatus,
                isGoldVerified: profileData?.is_gold_verified || false,
                subscriptionExpiry: profileData?.subscription_expiry || null,
                walletBalance,
                rewardPoints,
                activeCards,
                completedOnboarding: profileData?.completed_onboarding ?? true,
                referralCode: profileData?.referral_code || null,
                merchantStatus: merchantResult.status === 'fulfilled' && merchantResult.value.data ? merchantResult.value.data.status : null,
                merchantSubscriptionStatus: merchantResult.status === 'fulfilled' && merchantResult.value.data ? merchantResult.value.data.subscription_status : null,
                merchantSubscriptionExpiresAt: merchantResult.status === 'fulfilled' && merchantResult.value.data ? merchantResult.value.data.subscription_expires_at : null,
                merchantSub1mPrice: sub1mResult?.status === 'fulfilled' && sub1mResult.value?.data?.value != null
                    ? Number(sub1mResult.value.data.value) || null
                    : null,
            };

            setUserData(finalUserData);

            // Update memory cache
            dashboardMemoryCache = {
                userData: finalUserData,
                topMerchants: (topMerchantsResult && topMerchantsResult.status === 'fulfilled' && topMerchantsResult.value.data) ? topMerchantsResult.value.data : topMerchants,
                recentActivity: activityFeed || []
            };

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }, [user, topMerchants]);

    // Zero-jump scroll restoration: execute synchronously before browser paints
    const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

    useIsomorphicLayoutEffect(() => {
        if (typeof window === 'undefined') return;
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }

        const savedY = sessionStorage.getItem('customer_dashboard_scroll');
        let isRestoring = false;

        if (savedY) {
            const targetY = parseInt(savedY, 10);
            if (!isNaN(targetY) && targetY > 0) {
                isRestoring = true;
                // Immediate pre-paint scroll
                window.scrollTo(0, targetY);

                // Follow up in next ticks to ensure layout expansion doesn't clamp it
                requestAnimationFrame(() => {
                    window.scrollTo(0, targetY);
                    setTimeout(() => {
                        window.scrollTo(0, targetY);
                        isRestoring = false;
                    }, 50);
                });
            }
        }

        let saveTimeout;
        const handleSaveScroll = () => {
            if (isRestoring) return; // Protect saved spot while restoring
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                if (window.scrollY > 0) {
                    sessionStorage.setItem('customer_dashboard_scroll', window.scrollY.toString());
                }
            }, 80);
        };

        window.addEventListener('scroll', handleSaveScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleSaveScroll);
            clearTimeout(saveTimeout);
        };
    }, []);

    useEffect(() => {
        let walletSub;
        let activitySub;
        if (!authLoading) {
            if (user) {
                fetchDashboardData();

                walletSub = supabase
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

                activitySub = supabase
                    .channel('dashboard_activity')
                    .on(
                        'postgres_changes',
                        { event: '*', schema: 'public', table: 'reward_points_balance', filter: `user_id=eq.${user.id}` },
                        (payload) => {
                            if (payload.new && payload.new.total_earned !== undefined) {
                                setUserData(prev => ({
                                    ...prev,
                                    rewardPoints: payload.new.total_earned || 0
                                }));
                            }
                        }
                    )
                    .on(
                        'postgres_changes',
                        { event: 'INSERT', schema: 'public', table: 'customer_wallet_transactions', filter: `user_id=eq.${user.id}` },
                        () => fetchDashboardData()
                    )
                    .subscribe();
            } else {
                router.push('/login');
            }
        }

        return () => {
            if (walletSub) supabase.removeChannel(walletSub);
            if (activitySub) supabase.removeChannel(activitySub);
        };
    }, [authLoading, user, fetchDashboardData, router]);

    const handleBuyPackage = async (pkg) => {
        setShowPackages(false);
        if (userData.walletBalance >= pkg.price) {
            setWalletConfirmPkg(pkg);
            return;
        }
        try {
            await initiatePayment({
                amount: pkg.price,
                payerName: payerContact.payerName || userData.name || 'User',
                payerEmail: payerContact.payerEmail,
                payerMobile: payerContact.payerPhone,
                udf1: 'SUBSCRIPTION_UPGRADE',
                udf2: pkg.duration.toString()
            });
        } catch (err) {
            if (err instanceof PayerContactError) {
                alert('Please update your contact details to proceed: ' + err.message);
                router.push('/profile');
                return;
            }
            alert('Payment initialization failed: ' + err.message);
        }
    };

    const handleWalletPayment = async (pkg) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('process_wallet_subscription_payment', {
                p_user_id: user.id,
                p_amount: pkg.price,
                p_duration_months: pkg.duration
            });

            if (error) throw error;

            if (data && data.success) {
                alert('Subscription activated successfully using Wallet Balance!');
                setWalletConfirmPkg(null);
                fetchDashboardData();
            } else {
                throw new Error(data?.message || 'Transaction failed.');
            }
        } catch (err) {
            alert(err.message || 'Payment via wallet failed.');
        } finally {
            setLoading(false);
        }
    };

    // Only show full skeleton on initial cold load when no memory cache exists
    if ((authLoading || loading) && !dashboardMemoryCache) return <DashboardSkeleton />;

    return (
        <div className="w-full space-y-8 font-body-md text-on-surface">
            <KYCPopup isOpen={kycPopupOpen} onClose={closeKYC} />
            <MerchantApplyPopup isOpen={merchantPopupOpen} onClose={closeMerchantPopup || closePopup} />

            {!userData.completedOnboarding && user && (
                <OnboardingModal
                    userId={user.id}
                    onComplete={() => {
                        setUserData(prev => ({ ...prev, completedOnboarding: true }));
                    }}
                />
            )}

            <PullToRefresh onRefresh={fetchDashboardData}>
                <div className="w-full space-y-8">
                    {/* Welcome Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                                <span className="text-[11px] font-bold text-brand-steel uppercase tracking-widest">Marketplace Hub • Live</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-on-surface tracking-tight flex items-center gap-2">
                                <span>Welcome back, {userData.name.split(' ')[0]}!</span>
                                {userData.isGoldVerified && (
                                    <span className="inline-flex items-center">
                                        <GoldBadge size="sm" />
                                    </span>
                                )}
                            </h1>
                            <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-1">
                                Verified local commerce, essentials, and digital wallet services across India.
                            </p>
                        </div>
                    </div>

                    {/* ── 1. Creative Hero Showcase: 8-col Banner Carousel + 4-col Wallet Hub on Laptop/Desktop ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        <div className="lg:col-span-8 w-full">
                            <EcomHeroCarousel banners={HERO_BANNERS} />
                        </div>
                        <div className="lg:col-span-4 w-full flex flex-col">
                            <FintechWalletCard userData={userData} />
                        </div>
                    </div>

                    {/* ── 2. Category Quick Action Pills & Top 4 Categories ── */}
                    <CategoryQuickPills />

                    {/* ── 3. Trending Flash Deals ── */}
                    <TrendingProductsGrid />

                    {/* ── 4. Active Logistics Tracking ── */}
                    <ActiveOrdersSnapshot userId={user?.id} />

                    {/* ── 5. Nearby Verified Stores ── */}
                    <VerifiedStoresNearby merchants={topMerchants} />

                    {/* ── 6. Discovery & Partner Ecosystem (2-Column Grid) ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Left Column: Merchant Opportunity Card + Growth Stats */}
                        <div className="lg:col-span-6 space-y-6">
                            <MerchantOpportunityBanner
                                merchantStatus={userData.merchantStatus}
                                subscriptionStatus={userData.subscriptionStatus}
                                subscriptionExpiresAt={userData.subscriptionExpiry}
                                startingPriceRupees={userData.merchantSub1mPrice}
                            />
                            <FintechGrowthSection userData={userData} />
                        </div>

                        {/* Right Column: Recent Activity Stream + Minimal Promo Carousel */}
                        <div className="lg:col-span-6 space-y-6">
                            <RecentActivity orders={recentActivity} />
                            <PromoBanners />
                        </div>
                    </div>
                </div>
            </PullToRefresh>

            <DisclaimerNote />

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
                        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-7 text-center shadow-2xl max-w-sm w-full relative overflow-hidden"
                        >
                            <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-500/10 text-primary flex items-center justify-center mb-5">
                                <Wallet size={28} />
                            </div>
                            <h3 className="text-xl font-extrabold text-on-surface mb-2">Confirm Wallet Payment</h3>
                            <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                                Deduct <strong className="text-on-surface font-bold">₹{walletConfirmPkg.price}</strong> from your wallet balance to activate the <span className="text-[#D4AF37] font-bold">{walletConfirmPkg.label}</span> package?
                            </p>
                            <div className="flex flex-col gap-2.5">
                                <button
                                    onClick={() => handleWalletPayment(walletConfirmPkg)}
                                    className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all disabled:opacity-50"
                                    disabled={loading}
                                >
                                    {loading ? 'Processing...' : 'Confirm & Pay'}
                                </button>
                                <button
                                    onClick={() => setWalletConfirmPkg(null)}
                                    className="w-full bg-surface-container-low hover:bg-surface-container-high text-on-surface font-semibold py-2.5 rounded-xl transition-all text-xs"
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
