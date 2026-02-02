'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Package,
    PlusCircle,
    ShoppingCart,
    DollarSign,
    TrendingUp,
    User,
    Settings,
    LogOut,
    ChevronLeft
} from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/merchant/dashboard', icon: LayoutDashboard },
    { name: 'My Coupons', href: '/merchant/coupons', icon: Package },
    { name: 'Add Coupon', href: '/merchant/coupons/add', icon: PlusCircle },
    { name: 'Wholesale', href: '/merchant/wholesale', icon: ShoppingCart },
    { name: 'Earnings', href: '/merchant/earnings', icon: DollarSign },
    { name: 'Analytics', href: '/merchant/analytics', icon: TrendingUp },
    { name: 'Profile', href: '/merchant/profile', icon: User },
    { name: 'Settings', href: '/merchant/settings', icon: Settings },
];

export default function MerchantSidebar({ isOpen, setIsOpen }) {
    const pathname = usePathname();

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
                className={`fixed top-0 left-0 h-full bg-gradient-to-b from-emerald-900 via-green-800 to-emerald-900 border-r border-green-700 z-50 transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    } ${isOpen ? 'w-72' : 'lg:w-72'}`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo & Toggle */}
                    <div className="flex items-center justify-between p-6 border-b border-green-700">
                        <Link href="/merchant/dashboard" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-xl">M</span>
                            </div>
                            <div>
                                <div className="text-white font-bold text-lg">InTrust</div>
                                <div className="text-green-400 text-xs font-semibold">Merchant Panel</div>
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

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActive
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                                            : 'text-gray-400 hover:text-white hover:bg-green-800'
                                        }`}
                                >
                                    <Icon size={20} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'} />
                                    <span className="font-semibold">{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile */}
                    <div className="p-4 border-t border-green-700">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-green-800 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                                M
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-white font-semibold text-sm truncate">Merchant Name</div>
                                <div className="text-gray-400 text-xs truncate">merchant@intrust.com</div>
                            </div>
                        </div>

                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-green-800 transition-all">
                            <LogOut size={20} />
                            <span className="font-semibold">Logout</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
