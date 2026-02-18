'use client';

import { useState, useEffect } from 'react';
import MerchantSidebar from './MerchantSidebar';
import { Menu, Bell, Search, User } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function MerchantLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [merchantProfile, setMerchantProfile] = useState(null);
    const [notifications, setNotifications] = useState(0);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get user profile
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            setUserProfile(profile);

            // Get merchant profile
            const { data: merchant } = await supabase
                .from('merchants')
                .select('*')
                .eq('user_id', user.id)
                .single();

            setMerchantProfile(merchant);

            // TODO: Fetch actual notifications count
            setNotifications(0);
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const getInitials = (name) => {
        if (!name) return 'M';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Sidebar */}
            <MerchantSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            {/* Main Content */}
            <div className="lg:pl-72 min-h-screen">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3">
                        {/* Left: Menu + Search */}
                        <div className="flex items-center gap-4 flex-1">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                <Menu size={24} className="text-gray-700" />
                            </button>

                            {/* Search Bar */}
                            <div className="hidden md:flex items-center flex-1 max-w-md">
                                <div className="relative w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search coupons, transactions..."
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#92BCEA] focus:ring-2 focus:ring-[#92BCEA]/20 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right: Wallet + Notifications + Profile */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Wallet Balance - Desktop */}
                            {merchantProfile && (
                                <Link
                                    href="/merchant/wallet"
                                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 hover:shadow-md transition-all"
                                >
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">₹</span>
                                    </div>
                                    <span className="text-sm font-bold text-green-900">
                                        {((merchantProfile.wallet_balance_paise || 0) / 100).toLocaleString()}
                                    </span>
                                </Link>
                            )}

                            {/* Notifications */}
                            <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors">
                                <Bell size={20} className="text-gray-700" />
                                {notifications > 0 && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                )}
                            </button>

                            {/* Profile - Desktop */}
                            <Link
                                href="/merchant/profile"
                                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#92BCEA]/10 to-[#AFB3F7]/10 border border-[#92BCEA]/30 hover:shadow-md transition-all"
                            >
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                    {getInitials(userProfile?.full_name || merchantProfile?.business_name)}
                                </div>
                                <span className="text-sm font-semibold text-gray-900 max-w-[100px] truncate">
                                    {merchantProfile?.business_name || userProfile?.full_name || 'Merchant'}
                                </span>
                            </Link>

                            {/* Profile - Mobile */}
                            <Link
                                href="/merchant/profile"
                                className="sm:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                <User size={20} className="text-gray-700" />
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main>
                    {children}
                </main>
            </div>
        </div>
    );
}
