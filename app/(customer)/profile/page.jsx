'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { User, Mail, Phone, MapPin, Calendar, Edit2, ShieldCheck, Package, Heart, LayoutDashboard } from 'lucide-react';
import KYCStatus from '@/components/kyc/KYCStatus';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import { createClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function CustomerProfilePage() {
    const supabase = createClient();
    const router = useRouter();
    const { user: authUser, profile: authProfile, loading: authLoading } = useAuth();

    const [profile, setProfile] = useState(null);
    const [kycStatus, setKycStatus] = useState('not_started');

    // Sync local state with AuthContext
    useEffect(() => {
        if (!authLoading && authUser) {
            if (authProfile) {
                setProfile(authProfile);
                setKycStatus(authProfile.kyc_status || 'not_started');
            } else {
                // Fallback if profile doesn't exist yet
                setProfile({
                    full_name: authUser.user_metadata?.full_name || '',
                    email: authUser.email,
                    phone: authUser.phone || '',
                    created_at: authUser.created_at
                });
            }
        }
    }, [authLoading, authUser, authProfile]);

    const [toastMsg, setToastMsg] = useState('');
    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 3000);
    };

    if (authLoading) {
        return (
<<<<<<< HEAD
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
=======
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
>>>>>>> origin/yogesh-final
            </div>
        );
    }

    if (!authUser) {
        router.push('/login');
        return null;
    }

    return (
<<<<<<< HEAD
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
=======
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
>>>>>>> origin/yogesh-final
            <Navbar />

            {toastMsg && (
                <div className="fixed top-24 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-xl z-50 animate-bounce">
                    {toastMsg}
                </div>
            )}

            <div style={{ paddingTop: '15vh' }} className="pb-12 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <Breadcrumbs items={[{ label: 'Profile' }]} />

                    <div className="mb-8">
<<<<<<< HEAD
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                            My Profile
                        </h1>
                        <p className="text-gray-600">Manage your account and KYC verification</p>
=======
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2 font-[family-name:var(--font-outfit)]">
                            My Profile
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">Manage your account and KYC verification</p>
>>>>>>> origin/yogesh-final
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-6">
<<<<<<< HEAD
                            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg">
=======
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6 shadow-lg">
>>>>>>> origin/yogesh-final
                                <div className="text-center mb-6">
                                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                        {profile?.full_name?.charAt(0) || authUser.email?.charAt(0) || 'U'}
                                    </div>
<<<<<<< HEAD
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">{profile?.full_name || 'User'}</h2>
                                    <p className="text-sm text-gray-600">Customer since {new Date(profile?.created_at || authUser.created_at).getFullYear()}</p>
=======
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{profile?.full_name || 'User'}</h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Customer since {new Date(profile?.created_at || authUser.created_at).getFullYear()}</p>
>>>>>>> origin/yogesh-final
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm">
                                        <Mail size={18} className="text-gray-400" />
<<<<<<< HEAD
                                        <span className="text-gray-700 truncate">{authUser.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Phone size={18} className="text-gray-400" />
                                        <span className="text-gray-700">{profile?.phone || 'No phone added'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar size={18} className="text-gray-400" />
                                        <span className="text-gray-700">Joined {new Date(authUser.created_at).toLocaleDateString()}</span>
=======
                                        <span className="text-gray-700 dark:text-gray-300 truncate">{authUser.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Phone size={18} className="text-gray-400" />
                                        <span className="text-gray-700 dark:text-gray-300">{profile?.phone || 'No phone added'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar size={18} className="text-gray-400" />
                                        <span className="text-gray-700 dark:text-gray-300">Joined {new Date(authUser.created_at).toLocaleDateString()}</span>
>>>>>>> origin/yogesh-final
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] rounded-2xl p-6 text-white shadow-lg">
                                <h3 className="text-lg font-bold mb-4">Your Stats</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Package size={18} />
                                            <span>Total Purchases</span>
                                        </div>
                                        <span className="font-bold text-xl">0</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck size={18} />
                                            <span>Total Saved</span>
                                        </div>
                                        <span className="font-bold text-xl">₹0</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="w-full mt-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    Go to Dashboard
                                    <LayoutDashboard size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            <KYCStatus
                                status={kycStatus}
                                onStartKYC={() => router.push('/profile/kyc')}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <CustomerBottomNav />
        </div>
    );
}
