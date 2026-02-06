'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { User, Mail, Phone, MapPin, Calendar, Edit2, ShieldCheck, Package, Heart } from 'lucide-react';
import KYCStatus from '@/components/kyc/KYCStatus';
import KYCForm from '@/components/kyc/KYCForm';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';

export default function CustomerProfilePage() {
    const [showKYCForm, setShowKYCForm] = useState(false);
    const [kycStatus, setKycStatus] = useState('not_started'); // not_started, pending, verified, rejected

    // Mock user data
    const user = {
        name: 'Rahul Kumar',
        email: 'rahul.kumar@example.com',
        phone: '+91 98765 43210',
        joinedDate: 'January 2024',
        totalPurchases: 12,
        savedAmount: '₹2,450',
        favoriteCategories: ['Shopping', 'Food', 'Entertainment']
    };

    const handleKYCSubmit = (formData) => {
        console.log('KYC Data:', formData);
        setKycStatus('pending');
        setShowKYCForm(false);
        // In real app: send to backend API
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <Navbar />

            <div style={{ paddingTop: '15vh' }} className="pb-12 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    {/* Breadcrumbs */}
                    <Breadcrumbs items={[{ label: 'Profile' }]} />

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                            My Profile
                        </h1>
                        <p className="text-gray-600">Manage your account and KYC verification</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: Profile Info */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* Profile Card */}
                            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg">
                                <div className="text-center mb-6">
                                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                        {user.name.charAt(0)}
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">{user.name}</h2>
                                    <p className="text-sm text-gray-600">Customer since {user.joinedDate}</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm">
                                        <Mail size={18} className="text-gray-400" />
                                        <span className="text-gray-700">{user.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Phone size={18} className="text-gray-400" />
                                        <span className="text-gray-700">{user.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar size={18} className="text-gray-400" />
                                        <span className="text-gray-700">Joined {user.joinedDate}</span>
                                    </div>
                                </div>

                                <button className="w-full mt-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                                    <Edit2 size={18} />
                                    Edit Profile
                                </button>
                            </div>

                            {/* Stats Card */}
                            <div className="bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] rounded-2xl p-6 text-white shadow-lg">
                                <h3 className="text-lg font-bold mb-4">Your Stats</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Package size={18} />
                                            <span>Total Purchases</span>
                                        </div>
                                        <span className="font-bold text-xl">{user.totalPurchases}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck size={18} />
                                            <span>Total Saved</span>
                                        </div>
                                        <span className="font-bold text-xl">{user.savedAmount}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: KYC Section */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* KYC Status or Form */}
                            {!showKYCForm ? (
                                <>
                                    <KYCStatus
                                        status={kycStatus}
                                        onStartKYC={() => setShowKYCForm(true)}
                                    />

                                    {/* Merchant Application CTA */}
                                    {kycStatus === 'verified' && (
                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 shadow-lg">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                                                    <ShieldCheck size={24} className="text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Become a Merchant</h3>
                                                    <p className="text-gray-600 mb-4">
                                                        Start selling gift cards and earn money. Your KYC is already verified!
                                                    </p>
                                                    <a
                                                        href="/merchant-apply"
                                                        className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg"
                                                    >
                                                        Apply as Merchant →
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Favorite Categories */}
                                    <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <Heart size={20} className="text-red-500" />
                                            Favorite Categories
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {user.favoriteCategories.map((category) => (
                                                <span
                                                    key={category}
                                                    className="px-4 py-2 bg-gradient-to-r from-[#92BCEA]/10 to-[#AFB3F7]/10 border-2 border-[#92BCEA]/20 text-gray-900 font-semibold rounded-xl"
                                                >
                                                    {category}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <button
                                        onClick={() => setShowKYCForm(false)}
                                        className="mb-4 text-[#92BCEA] hover:text-[#7A93AC] font-semibold flex items-center gap-2"
                                    >
                                        ← Back to Profile
                                    </button>
                                    <KYCForm userType="customer" onSubmit={handleKYCSubmit} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <CustomerBottomNav />
        </div>
    );
}
