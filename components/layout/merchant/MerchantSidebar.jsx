'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Wallet,
    TrendingUp,
    User,
    Settings,
    LogOut,
    ChevronLeft,
    Store
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const navigation = [
    { name: 'Dashboard', href: '/merchant/dashboard', icon: LayoutDashboard },
    { name: 'Inventory', href: '/merchant/inventory', icon: Package },
    { name: 'Purchase Coupons', href: '/merchant/wholesale', icon: ShoppingCart },
    { name: 'Wallet', href: '/merchant/wallet', icon: Wallet },
    { name: 'Analytics', href: '/merchant/analytics', icon: TrendingUp },
    { name: 'Profile', href: '/merchant/profile', icon: User },
    { name: 'Settings', href: '/merchant/settings', icon: Settings },
];

export default function MerchantSidebar({ isOpen, setIsOpen }) {
    const pathname = usePathname();
    const router = useRouter();
    const [userProfile, setUserProfile] = useState(null);
    const [merchantProfile, setMerchantProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
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
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-500';
            case 'pending': return 'bg-yellow-500';
            case 'suspended': return 'bg-red-500';
            case 'rejected': return 'bg-gray-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full bg-gradient-to-b from-[#1e3a5f] via-[#2c5282] to-[#1e3a5f] border-r border-[#3d5a7f] z-50 transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    } w-72`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo & Toggle */}
                    <div className="flex items-center justify-between p-6 border-b border-[#3d5a7f]">
                        <Link href="/merchant/dashboard" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center shadow-lg">
                                <Store className="text-white" size={20} />
                            </div>
                            <div>
                                <div className="text-white font-bold text-lg">InTrust</div>
                                <div className="text-[#92BCEA] text-xs font-semibold">Merchant Panel</div>
                            </div>
                        </Link>

                        {/* Close button for mobile */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="lg:hidden text-gray-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    </div>

                    {/* Merchant Status Badge */}
                    {merchantProfile && (
                        <div className="px-4 pt-4">
                            <div className="bg-[#2c5282]/50 rounded-xl p-3 border border-[#3d5a7f]">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-400 font-semibold">Status</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${getStatusColor(merchantProfile.status)}`} />
                                        <span className="text-xs text-white font-semibold capitalize">
                                            {merchantProfile.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-300">
                                    <span className="text-xs text-gray-400">Balance: </span>
                                    <span className="font-bold text-[#92BCEA]">
                                        ₹{((merchantProfile.wallet_balance_paise || 0) / 100).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActive
                                            ? 'bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white shadow-lg shadow-[#92BCEA]/30'
                                            : 'text-gray-400 hover:text-white hover:bg-[#2c5282]'
                                        }`}
                                >
                                    <Icon size={20} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'} />
                                    <span className="font-semibold">{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile */}
                    <div className="p-4 border-t border-[#3d5a7f]">
                        {loading ? (
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#2c5282] mb-2">
                                <div className="w-10 h-10 rounded-full bg-[#3d5a7f] animate-pulse" />
                                <div className="flex-1">
                                    <div className="h-4 bg-[#3d5a7f] rounded animate-pulse mb-1" />
                                    <div className="h-3 bg-[#3d5a7f] rounded animate-pulse w-2/3" />
                                </div>
                            </div>
                        ) : (
                            <Link
                                href="/merchant/profile"
                                className="flex items-center gap-3 p-3 rounded-xl bg-[#2c5282] hover:bg-[#3d5a7f] transition-all mb-2 group"
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center text-white font-bold shadow-lg">
                                    {getInitials(userProfile?.full_name || merchantProfile?.business_name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-white font-semibold text-sm truncate">
                                        {merchantProfile?.business_name || userProfile?.full_name || 'Merchant'}
                                    </div>
                                    <div className="text-gray-400 text-xs truncate">
                                        {userProfile?.phone || 'View Profile'}
                                    </div>
                                </div>
                            </Link>
                        )}

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 border border-transparent transition-all"
                        >
                            <LogOut size={20} />
                            <span className="font-semibold">Logout</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
