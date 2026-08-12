'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

// ── Layout & UI ──
import Navbar from '@/components/layout/Navbar';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';

import KYCStatus from '@/components/kyc/KYCStatus';
import KYCPopup from '@/components/kyc/KYCPopup';
import { useKYCPopup } from '@/hooks/useKYCPopup';
import ParticleBackground from '@/components/ui/ParticleBackground';

// ── Modular Profile Components ──
import ProfileHero from '@/components/customer/profile/ProfileHero';
import ProfileStats from '@/components/customer/profile/ProfileStats';
import PersonalInfoForm from '@/components/customer/profile/PersonalInfoForm';
import AddressSection from '@/components/customer/profile/AddressSection';
import RecentShoppingOrders from '@/components/customer/RecentShoppingOrders';
import AccountSummaryCard from '@/components/customer/profile/AccountSummaryCard';
import MerchantOpportunityBanner from '@/components/customer/MerchantOpportunityBanner';

// ── Icons & Utils ──
import { Star, Gift, ArrowRight, Trophy, MessageCircle, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { createClient } from '@/lib/supabaseClient';
import LiveButton from '@/components/merchant/LiveButton';

const supabase = createClient();

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function ProfileSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 text-gray-900 dark:text-white">
            <Navbar />
            <div style={{ paddingTop: '15vh' }} className="pb-12 px-6">
                <div className="max-w-6xl mx-auto animate-pulse">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-white/5 rounded-full mb-8" />
                    <div className="h-10 w-48 bg-gray-200 dark:bg-white/5 rounded-2xl mb-12" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-white/5 rounded-[2.5rem] h-[400px] border border-gray-100 dark:border-white/5" />
                            <div className="bg-white dark:bg-white/5 rounded-[2.5rem] h-48 border border-gray-100 dark:border-white/5" />
                        </div>
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white dark:bg-white/5 rounded-[2.5rem] h-[500px] border border-gray-100 dark:border-white/5" />
                            <div className="bg-white dark:bg-white/5 rounded-[2.5rem] h-64 border border-gray-100 dark:border-white/5" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


function CustomerProfileContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user: authUser, loading: authLoading, refreshProfile, refreshUser } = useAuth();

    const [profile, setProfile] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [udhariCount, setUdhariCount] = useState(0);
    const [udhariPaise, setUdhariPaise] = useState(0);
    const [purchaseCount, setPurchaseCount] = useState(0);
    const [merchantData, setMerchantData] = useState(null);
    const [merchantSub1mPrice, setMerchantSub1mPrice] = useState(null);
    const [totalSavedPaise, setTotalSavedPaise] = useState(0);
    const [graphData, setGraphData] = useState([]);
    const [profileLoading, setProfileLoading] = useState(true);
    const showToast = useCallback((msg, type = 'success') => {
        if (type === 'error') toast.error(msg);
        else toast.success(msg);
    }, []);

    // ── Handle URL parameters for Identity Linking ──────────────────────────────
    useEffect(() => {
        if (!searchParams) return;
        const linked = searchParams.get('linked');
        const error = searchParams.get('error');

        if (linked === 'google') {
            showToast('Identity Synced Successfully! 🎉');
            refreshUser();
            router.replace('/profile', { scroll: false });
        } else if (error === 'already_linked') {
            showToast('Identity already associated with another elite node.', 'error');
            router.replace('/profile', { scroll: false });
        }
    }, [searchParams, router, showToast, refreshUser]);

    // ── Data Fetching ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (authLoading) return;
        if (!authUser) { setProfileLoading(false); return; }

        let cancelled = false;
        (async () => {
            setProfileLoading(true);
            try {
                const results = await Promise.allSettled([
                    supabase.from('user_profiles').select('*').eq('id', authUser.id).single(),
                    supabase.from('customer_wallets').select('*').eq('user_id', authUser.id).single(),
                    supabase.from('merchants').select('status, subscription_status, subscription_expires_at').eq('user_id', authUser.id).maybeSingle(),
                    supabase.from('platform_settings').select('value').eq('key', 'merchant_sub_price_1m').maybeSingle(),
                ]);

                if (!cancelled) {
                    const profileResult  = results[0];
                    const walletResult   = results[1];
                    const merchantResult = results[2];
                    const sub1mResult    = results[3];

                    if (profileResult.status === 'fulfilled' && profileResult.value.data) {
                        setProfile(profileResult.value.data);
                    }
                    if (walletResult.status === 'fulfilled' && walletResult.value.data) {
                        setWallet(walletResult.value.data);
                    } else {
                        const { data: newWallet } = await supabase.from('customer_wallets')
                            .insert([{ user_id: authUser.id }])
                            .select('*')
                            .single();
                        if (newWallet) setWallet(newWallet);
                    }
                    if (merchantResult?.status === 'fulfilled' && merchantResult.value.data) {
                        setMerchantData(merchantResult.value.data);
                    }
                    if (sub1mResult?.status === 'fulfilled' && sub1mResult.value?.data?.value != null) {
                        const parsed = Number(sub1mResult.value.data.value);
                        if (Number.isFinite(parsed) && parsed > 0) setMerchantSub1mPrice(parsed);
                    }

                    const { data: udhariRequests } = await supabase.from('udhari_requests').select('amount_paise').eq('customer_id', authUser.id).in('status', ['pending', 'approved']);
                    if (!cancelled && udhariRequests) {
                        setUdhariCount(udhariRequests.length);
                        const totalUdhari = udhariRequests.reduce((sum, req) => sum + (req.amount_paise || 0), 0);
                        setUdhariPaise(totalUdhari);
                    }

                    // Count both coupon purchases AND shop orders
                    const [{ data: couponsData }, { data: shopOrdersData }] = await Promise.all([
                        supabase.from('coupons').select('face_value_paise, selling_price_paise, purchased_at').eq('purchased_by', authUser.id).eq('status', 'sold'),
                        supabase.from('shopping_order_groups').select('id, total_amount_paise, created_at').eq('customer_id', authUser.id).neq('delivery_status', 'cancelled')
                    ]);
                    if (!cancelled) {
                        const couponCount = couponsData?.length || 0;
                        const shopOrderCount = shopOrdersData?.length || 0;
                        setPurchaseCount(couponCount + shopOrderCount);
                        const couponSaved = (couponsData || []).reduce((sum, c) => sum + Math.max(0, (c.face_value_paise || 0) - (c.selling_price_paise || 0)), 0);
                        setTotalSavedPaise(couponSaved);

                        // Generate graph data (last 6 months aggregate of savings + orders)
                        const now = new Date();
                        const months = [];
                        for (let i = 5; i >= 0; i--) {
                            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                            months.push(d);
                        }

                        const newGraphData = months.map(date => {
                            const monthName = date.toLocaleDateString('en-US', { month: 'short' });
                            const year = date.getFullYear();
                            const monthIndex = date.getMonth();

                            // Calculate savings for this month
                            const savingsThisMonth = (couponsData || []).reduce((sum, c) => {
                                if (!c.purchased_at) return sum;
                                const d = new Date(c.purchased_at);
                                if (d.getMonth() === monthIndex && d.getFullYear() === year) {
                                    return sum + Math.max(0, ((c.face_value_paise || 0) - (c.selling_price_paise || 0)) / 100);
                                }
                                return sum;
                            }, 0);

                            // Calculate order values for this month
                            const ordersThisMonth = (shopOrdersData || []).reduce((sum, o) => {
                                if (!o.created_at) return sum;
                                const d = new Date(o.created_at);
                                if (d.getMonth() === monthIndex && d.getFullYear() === year) {
                                    return sum + ((o.total_amount_paise || 0) / 100);
                                }
                                return sum;
                            }, 0);

                            return {
                                name: monthName,
                                value: Math.round(savingsThisMonth + ordersThisMonth) // Combined value metric
                            };
                        });
                        setGraphData(newGraphData);
                    }
                }
            } catch (error) {
                console.error('Core sync failed:', error);
            } finally {
                if (!cancelled) setProfileLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [authUser, authLoading]);

    const saveField = useCallback(async (field, value) => {
        if (!authUser) return false;
        if (field === 'full_name' && !value?.trim()) {
            showToast('Legal name is required', 'error'); return false;
        }
        const { error } = await supabase.from('user_profiles').update({ [field]: value || null, updated_at: new Date().toISOString() }).eq('id', authUser.id);
        if (error) { showToast("Sync failed", 'error'); return false; }
        setProfile(prev => ({ ...prev, [field]: value }));
        refreshProfile();
        showToast('Profile Updated');
        return true;
    }, [authUser, refreshProfile, showToast]);

    const kycStatus = profile?.kyc_status || 'not_started';

    // KYC popup – auto-triggers 5–10s after login if not verified
    const { isOpen: kycPopupOpen, closeKYC } = useKYCPopup({
        kycStatus,
        enabled: !profileLoading && !!authUser
    });

    useEffect(() => {
        if (!authLoading && !authUser) router.push('/login');
    }, [authUser, authLoading, router]);

    if (authLoading || profileLoading) return <ProfileSkeleton />;
    if (!authUser) return null;

    const isGold = !!profile?.is_gold_verified;

    return (
        <div className="min-h-screen relative bg-gray-50 dark:bg-gray-950 transition-colors duration-700 selection:bg-blue-500/20">
            <ParticleBackground />
            <Navbar />

            {/* KYC auto-popup */}
            <KYCPopup
                isOpen={kycPopupOpen}
                onClose={closeKYC}
                onSubmitSuccess={async () => {
                    closeKYC();
                    router.push('/profile/kyc');
                }}
            />

            {/* Header Shade */}
            <div className="absolute top-0 left-0 right-0 h-[40vh] overflow-hidden pointer-events-none z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent opacity-50 dark:opacity-30" />
            </div>

            <main style={{ paddingTop: '15vh' }} className="relative z-10 pb-32 px-4 sm:px-8">
                <div className="max-w-5xl mx-auto space-y-8">
                    
                    {/* ══ HEADER & IDENTITY ══════════════════════════════════════ */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="flex flex-col items-center"
                    >
                        <div className="w-full text-left mb-6">
                            <Breadcrumbs items={[{ label: 'Profile' }]} />
                            <div className="flex items-center gap-4 mt-2">
                                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white">
                                    Profile
                                </h1>
                                <LiveButton />
                            </div>
                        </div>
                        <ProfileHero
                            user={authUser}
                            profile={profile}
                            onAvatarUpload={(url, err) => {
                                if (err) showToast(err, 'error');
                                else if (url) saveField('avatar_url', url);
                            }}
                            onEditClick={() => {
                                const el = document.getElementById('personal-info-form');
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                        />
                    </motion.div>

                    {/* ══ FINANCIAL SNAPSHOT ══════════════════════════════════════ */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <ProfileStats
                            walletBalance={wallet?.balance_paise}
                            udhariBalance={udhariPaise}
                            rewardsBalance={0} /* Add rewards logic if needed */
                            onWalletClick={() => router.push('/wallet')}
                            onUdhariClick={() => router.push('/store-credits')}
                            onRewardsClick={() => router.push('/rewards')}
                        />
                    </motion.div>

                    {/* ══ 2 COLUMN GRID ══════════════════════════════════════ */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        
                        {/* ══ LEFT COLUMN ══════════════════════════════════════ */}
                        <div className="space-y-8">
                            
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <KYCStatus
                                    status={kycStatus}
                                    onStartKYC={() => router.push('/profile/kyc')}
                                />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                            >
                                <PersonalInfoForm
                                    user={authUser}
                                    profile={profile}
                                    onSave={saveField}
                                    onPhoneVerified={async (phone) => {
                                        setProfile(prev => ({ ...prev, phone }));
                                        refreshProfile();
                                        await refreshUser();
                                    }}
                                    showToast={showToast}
                                    supabase={supabase}
                                    refreshUser={refreshUser}
                                />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <AddressSection
                                    address={profile?.address}
                                    onSave={v => saveField('address', v)}
                                />
                            </motion.div>
                        </div>

                        {/* ══ RIGHT COLUMN ══════════════════════════════════════ */}
                        <div className="space-y-8">
                            
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.35 }}
                            >
                                <MerchantOpportunityBanner
                                    merchantStatus={merchantData?.status}
                                    subscriptionStatus={merchantData?.subscription_status}
                                    subscriptionExpiresAt={merchantData?.subscription_expires_at}
                                    startingPriceRupees={merchantSub1mPrice ?? undefined}
                                />
                            </motion.div>
                            
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <RecentShoppingOrders userId={authUser?.id} limit={3} />
                            </motion.div>

                            {/* Quick Actions Grid */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.45 }}
                                className="grid grid-cols-2 gap-3"
                            >
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95 group"
                                >
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                        <LayoutDashboard size={18} />
                                    </div>
                                    <p className="font-semibold text-xs text-gray-900 dark:text-white text-center uppercase tracking-wider">Dashboard</p>
                                </button>

                                <button
                                    onClick={() => router.push('/refer')}
                                    className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95 group"
                                >
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                        <Gift size={18} />
                                    </div>
                                    <p className="font-semibold text-xs text-gray-900 dark:text-white text-center uppercase tracking-wider">Referrals</p>
                                </button>

                                <button
                                    onClick={() => router.push('/rewards')}
                                    className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95 group"
                                >
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-amber-500/10 text-amber-600 dark:text-amber-500">
                                        <Trophy size={18} />
                                    </div>
                                    <p className="font-semibold text-xs text-gray-900 dark:text-white text-center uppercase tracking-wider">Rewards</p>
                                </button>

                                <button
                                    onClick={() => router.push('/profile/whatsapp')}
                                    className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95 group"
                                >
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-green-500/10 text-green-600 dark:text-green-500">
                                        <MessageCircle size={18} />
                                    </div>
                                    <p className="font-semibold text-xs text-gray-900 dark:text-white text-center uppercase tracking-wider">WhatsApp</p>
                                </button>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <AccountSummaryCard
                                    purchaseCount={purchaseCount}
                                    totalSavedPaise={totalSavedPaise}
                                    graphData={graphData}
                                />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </main>

            
        </div>
    );
}

export default function CustomerProfilePage() {
    return (
        <Suspense fallback={<ProfileSkeleton />}>
            <CustomerProfileContent />
        </Suspense>
    );
}
