'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Store,
    Package,
    Receipt,
    TrendingUp,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Gift
} from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Merchants', href: '/admin/merchants', icon: Store },
    { name: 'Vendors', href: '/admin/vendors', icon: Package },
    { name: 'Gift Cards', href: '/admin/giftcards', icon: Gift },
    { name: 'Coupons', href: '/admin/coupons', icon: Sparkles },
    { name: 'Transactions', href: '/admin/transactions', icon: Receipt },
    { name: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminSidebar({ isOpen, setIsOpen }) {
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
                className={`fixed top-0 left-0 h-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-r border-gray-700 z-50 transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    } ${isOpen ? 'w-72' : 'lg:w-72'}`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo & Toggle */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-700">
                        <Link href="/admin/dashboard" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-xl">A</span>
                            </div>
                            <div>
                                <div className="text-white font-bold text-lg">InTrust</div>
                                <div className="text-purple-400 text-xs font-semibold">Admin Panel</div>
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
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                        }`}
                                >
                                    <Icon size={20} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'} />
                                    <span className="font-semibold">{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile */}
                    <div className="p-4 border-t border-gray-700">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                                A
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-white font-semibold text-sm truncate">Admin User</div>
                                <div className="text-gray-400 text-xs truncate">admin@intrust.com</div>
                            </div>
                        </div>

                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all">
                            <LogOut size={20} />
                            <span className="font-semibold">Logout</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
