'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Package,
    Upload,
    Users,
    Receipt,
    FileText,
    Settings,
    LogOut,
    ChevronLeft
} from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/vendor/dashboard', icon: LayoutDashboard },
    { name: 'Inventory', href: '/vendor/inventory', icon: Package },
    { name: 'Bulk Upload', href: '/vendor/bulk-upload', icon: Upload },
    { name: 'Merchant Requests', href: '/vendor/requests', icon: Users },
    { name: 'Transactions', href: '/vendor/transactions', icon: Receipt },
    { name: 'Reports', href: '/vendor/reports', icon: FileText },
    { name: 'Settings', href: '/vendor/settings', icon: Settings },
];

export default function VendorSidebar({ isOpen, setIsOpen }) {
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
                className={`fixed top-0 left-0 h-full bg-gradient-to-b from-orange-900 via-amber-800 to-orange-900 border-r border-orange-700 z-50 transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    } ${isOpen ? 'w-72' : 'lg:w-72'}`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo & Toggle */}
                    <div className="flex items-center justify-between p-6 border-b border-orange-700">
                        <Link href="/vendor/dashboard" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-xl">V</span>
                            </div>
                            <div>
                                <div className="text-white font-bold text-lg">InTrust</div>
                                <div className="text-orange-400 text-xs font-semibold">Vendor Panel</div>
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
                                            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30'
                                            : 'text-gray-400 hover:text-white hover:bg-orange-800'
                                        }`}
                                >
                                    <Icon size={20} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'} />
                                    <span className="font-semibold">{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile */}
                    <div className="p-4 border-t border-orange-700">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-800 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold">
                                V
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-white font-semibold text-sm truncate">Vendor Name</div>
                                <div className="text-gray-400 text-xs truncate">vendor@intrust.com</div>
                            </div>
                        </div>

                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-orange-800 transition-all">
                            <LogOut size={20} />
                            <span className="font-semibold">Logout</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
