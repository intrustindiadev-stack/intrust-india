'use client';

import { useState } from 'react';
import EmployeeSidebar from './EmployeeSidebar';
import EmployeeBottomNav from './EmployeeBottomNav';
import { Menu } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';

export default function EmployeeLayout({ children, userProfile }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const getInitials = (name) => {
        if (!name) return 'E';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const userName = userProfile?.full_name || 'Employee';
    
    // Employee uses Amber/Orange colors
    const accentText = 'text-amber-600';
    const accentBg = 'bg-amber-500';
    const accentShadow = 'shadow-amber-500/20';

    return (
        <div className="min-h-screen bg-[#F8FAFC] transition-colors duration-300">
            {/* Sidebar */}
            <EmployeeSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} userProfile={userProfile} />
            <EmployeeBottomNav isSidebarOpen={sidebarOpen} userProfile={userProfile} />

            {/* Main Content */}
            <div className="lg:pl-72 min-h-screen flex flex-col">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm transition-colors duration-300">
                    <div className="flex items-center justify-between px-4 sm:px-6 py-4">
                        {/* Left: Menu */}
                        <div className="flex items-center gap-4 flex-1">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                <Menu size={24} className="text-gray-700" />
                            </button>
                        </div>

                        {/* Right: Profile */}
                        <div className="flex items-center gap-3 shrink-0">
                            {/* Notifications */}
                            <NotificationBell apiPath="/api/employee/notifications" />

                            {/* Profile Badge */}
                            <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-gray-200">
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-900 leading-tight">{userName}</p>
                                    <p className={`text-xs ${accentText} font-medium tracking-wide uppercase`}>
                                        Employee Portal
                                    </p>
                                </div>
                                <div className={`w-10 h-10 rounded-xl ${accentBg} flex items-center justify-center text-white font-bold shadow-lg ${accentShadow} overflow-hidden shrink-0`}>
                                    {userProfile?.avatar_url ? (
                                        <img src={userProfile.avatar_url} alt={userName} className="w-full h-full object-cover" />
                                    ) : (
                                        getInitials(userName)
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
