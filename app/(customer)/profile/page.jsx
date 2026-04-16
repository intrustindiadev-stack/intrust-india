'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';

// ── Layout & UI ──
import Navbar from '@/components/layout/Navbar';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
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

// ── Icons & Utils ──
import { Check, X, Star } from 'lucide-react';
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

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
    return (
        <AnimatePresence>
            {msg && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    className={`fixed top-24 right-6 z-[100] px-6 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-black flex items-center gap-3 backdrop-blur-xl border uppercase tracking-widest ${type === 'error' ? 'bg-red-500/90 border-red-400/20' : 'bg-green-600/90 border-green-500/20'
                        }`}
                >
                    {type === 'error' ? <X size={16} /> : <Check size={16} />}
                    {msg}
                </motion.div>
            )}
        </AnimatePresence>
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
    const [totalSavedPaise, setTotalSavedPaise] = useState(0);
    const [graphData, setGraphData] = useState([]);
    const [profileLoading, setProfileLoading] = useState(true);
    const [toast, setToast] = useState({ msg: '', type: 'success' });

    const showToast = useCallback((msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
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
                    supabase.from('customer_wallets').select('*').eq('user_id', authUser.id).single()
                ]);

                if (!cancelled) {
                    const profileResult = results[0];
                    const walletResult = results[1];

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

                    const { data: udhariRequests } = await supabase.from('udhari_requests').select('amount_paise').eq('customer_id', authUser.id).in('status', ['pending', 'approved']);
                    if (!cancelled && udhariRequests) {
                        setUdhariCount(udhariRequests.length);
                        const totalUdhari = udhariRequests.reduce((sum, req) => sum + (req.amount_paise || 0), 0);
                        setUdhariPaise(totalUdhari);
                    }

                    // Count both coupon purchases AND shop orders
                    const [{ data: couponsData }, { data: shopOrdersData }] = await Promise.all([
                        supabase.from('coupons').select('face_value_paise, selling_price_paise, purchased_at').eq('purchased_by', authUser.id).eq('status', 'sold'),
                        supabase.from('shopping_orders').select('id, total_amount_paise, created_at').eq('customer_id', authUser.id).neq('delivery_status', 'cancelled')
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
        <div className="min-h-screen relative bg-gray-50 dark:bg-gray-950 transition-colors duration-700 selection:bg-blue-500/20 font-[family-name:var(--font-outfit)]">
            <ParticleBackground />
            <Navbar />
            <Toast msg={toast.msg} type={toast.type} />

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
                <div className="max-w-6xl mx-auto">
                    <Breadcrumbs items={[{ label: 'Profile' }]} />

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-10 mt-4 flex flex-col md:flex-row md:items-end justify-between gap-6"
                    >
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-gray-900 dark:text-white">
                                    Profile
                                </h1>
                                {isGold && (
                                    <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full flex items-center gap-2 shadow-sm">
                                        <Star size={10} className="text-amber-500 fill-amber-500" />
                                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Premium Member</span>
                                    </div>
                                )}
                                <LiveButton />
                            </div>
                            <p className="text-sm font-medium text-gray-400 dark:text-gray-500 max-w-lg leading-relaxed">
                                View and manage your personal details, linked contact numbers, and verified profile status.
                            </p>
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                        {/* ══ SIDEBAR ══════════════════════════════════════ */}
                        <div className="lg:col-span-4 space-y-6">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 }}
                            >
                                <ProfileHero
                                    user={authUser}
                                    profile={profile}
                                    onAvatarUpload={(url, err) => {
                                        if (err) showToast(err, 'error');
                                        else if (url) saveField('avatar_url', url);
                                    }}
                                />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <ProfileStats
                                    walletBalancePaise={wallet?.balance_paise}
                                    activeUdhariCount={udhariCount}
                                    activeUdhariPaise={udhariPaise}
                                    onManageWallet={() => router.push('/wallet')}
                                    onManageUdhari={() => router.push('/store-credits')}
                                />
                            </motion.div>

                            {/* Stats Summary */}
                            <AccountSummaryCard
                                purchaseCount={purchaseCount}
                                totalSavedPaise={totalSavedPaise}
                                graphData={graphData}
                            />
                        </div>

                        {/* ══ MAIN CONTENT ════════════════════════════════════════ */}
                        <div className="lg:col-span-8 space-y-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                            >
                                <RecentShoppingOrders userId={authUser?.id} limit={2} />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
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

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <KYCStatus
                                    status={kycStatus}
                                    onStartKYC={() => router.push('/profile/kyc')}
                                />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </main>

            <CustomerBottomNav />
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
