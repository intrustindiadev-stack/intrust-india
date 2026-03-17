'use client';

import { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminBottomNav from './AdminBottomNav';
import { Menu, Search } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';

export default function AdminLayout({ children, adminProfile }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Get initials or fallback
    const getInitials = (name) => {
        if (!name) return 'A';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const adminName = adminProfile?.full_name || 'Admin System';

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
            {/* Sidebar */}
            <AdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} adminProfile={adminProfile} />
            <AdminBottomNav isSidebarOpen={sidebarOpen} />

            {/* Main Content */}
            <div className="lg:pl-72 min-h-screen flex flex-col">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-300">
                    <div className="flex items-center justify-between px-4 sm:px-6 py-4">
                        {/* Left: Menu */}
                        <div className="flex items-center gap-4 flex-1">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <Menu size={24} className="text-gray-700 dark:text-gray-300" />
                            </button>
                        </div>

                        {/* Right: Notifications + Profile */}
                        <div className="flex items-center gap-3 shrink-0">
                            {/* Notifications */}
                            <NotificationBell apiPath="/api/admin/notifications" />

                            {/* Profile Badge */}
                            <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-gray-200">
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-900 leading-tight">{adminName}</p>
                                    <p className="text-xs text-blue-600 font-medium tracking-wide uppercase">Platform Access</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 overflow-hidden shrink-0">
                                    {adminProfile?.avatar_url ? (
                                        <img src={adminProfile.avatar_url} alt={adminName} className="w-full h-full object-cover" />
                                    ) : (
                                        getInitials(adminName)
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 bg-slate-50 min-h-full pb-28 md:pb-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
