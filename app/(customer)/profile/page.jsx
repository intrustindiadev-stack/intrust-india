'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { User, Mail, Phone, MapPin, Calendar, Edit2, ShieldCheck, Package, Heart, LayoutDashboard } from 'lucide-react';
import KYCStatus from '@/components/kyc/KYCStatus';
import KYCForm from '@/components/kyc/KYCForm';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import { createClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function CustomerProfilePage() {
    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [showKYCForm, setShowKYCForm] = useState(false);
    const [kycStatus, setKycStatus] = useState('not_started');

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            setLoading(true);
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                console.error('Error fetching user:', authError);
                return;
            }

            setUser(user);

            const { data: profileData, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error('Error fetching profile:', profileError);
            }

            if (profileData) {
                setProfile(profileData);
                setKycStatus(profileData.kyc_status || 'not_started');
            } else {
                setProfile({
                    full_name: user.user_metadata?.full_name || '',
                    email: user.email,
                    phone: user.phone || '',
                    created_at: user.created_at
                });
            }

        } catch (error) {
            console.error('Unexpected error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleKYCSubmit = async (formData) => {
        try {
            if (!user) return;

            const updates = {
                full_name: formData.fullName,
                phone: formData.phone,
                date_of_birth: formData.dateOfBirth,
                gov_id: formData.panNumber,
                address: formData.address,
                kyc_status: 'pending',
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('user_profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) {
                throw error;
            }

            setKycStatus('pending');
            setShowKYCForm(false);
            setProfile(prev => ({ ...prev, ...updates }));
            showToast("KYC submitted successfully. Awaiting verification.");

        } catch (error) {
            console.error('Error submitting KYC:', error);
            alert('Failed to submit KYC. Please try again.');
        }
    };

    const [toastMsg, setToastMsg] = useState('');
    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 3000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
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
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                            My Profile
                        </h1>
                        <p className="text-gray-600">Manage your account and KYC verification</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg">
                                <div className="text-center mb-6">
                                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                        {profile?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">{profile?.full_name || 'User'}</h2>
                                    <p className="text-sm text-gray-600">Customer since {new Date(profile?.created_at || user.created_at).getFullYear()}</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm">
                                        <Mail size={18} className="text-gray-400" />
                                        <span className="text-gray-700 truncate">{user.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Phone size={18} className="text-gray-400" />
                                        <span className="text-gray-700">{profile?.phone || 'No phone added'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar size={18} className="text-gray-400" />
                                        <span className="text-gray-700">Joined {new Date(user.created_at).toLocaleDateString()}</span>
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
                            {!showKYCForm ? (
                                <KYCStatus
                                    status={kycStatus}
                                    onStartKYC={() => setShowKYCForm(true)}
                                />
                            ) : (
                                <div>
                                    <button
                                        onClick={() => setShowKYCForm(false)}
                                        className="mb-4 text-[#92BCEA] hover:text-[#7A93AC] font-semibold flex items-center gap-2"
                                    >
                                        ← Back to Profile
                                    </button>
                                    <KYCForm
                                        onSubmit={handleKYCSubmit}
                                        initialData={{
                                            fullName: profile?.full_name || '',
                                            phone: profile?.phone || '',
                                            address: profile?.address || '',
                                            panNumber: profile?.gov_id || '',
                                            dateOfBirth: profile?.date_of_birth || ''
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <CustomerBottomNav />
        </div>
    );
}
