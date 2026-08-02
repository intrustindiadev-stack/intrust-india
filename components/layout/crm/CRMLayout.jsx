'use client';

import { useState } from 'react';
import CRMSidebar from './CRMSidebar';
import CRMBottomNav from './CRMBottomNav';
import { Menu, LogOut } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import { createClient } from '@/lib/supabaseClient';
import LiveClock from '@/components/shared/LiveClock';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Image from 'next/image';

export default function CRMLayout({ children, userProfile }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const getInitials = (name) => {
        if (!name) return 'S';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const userName = userProfile?.full_name || 'Sales User';

    const handleLogout = () => setShowLogoutModal(true);

    const confirmLogout = async () => {
        setShowLogoutModal(false);
        setIsLoggingOut(true);
        try {
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = '/login';
        } catch {
            window.location.href = '/login';
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] transition-colors duration-300">
            <CRMSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} userProfile={userProfile} />
            <CRMBottomNav isSidebarOpen={sidebarOpen} userProfile={userProfile} />

            <div className="lg:pl-72 min-h-screen flex flex-col">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm transition-colors duration-300">
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3.5">
                        {/* Left: Hamburger + Live Clock */}
                        <div className="flex items-center gap-4 flex-1">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                <Menu size={22} className="text-gray-700" />
                            </button>
                            {/* Live Clock */}
                            <LiveClock />
                        </div>

                        {/* Right: Notifications + Profile + Logout */}
                        <div className="flex items-center gap-2 shrink-0">
                            <NotificationBell apiPath="/api/crm/notifications" />

                            {/* Logout with confirmation */}
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="p-2 rounded-xl text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100 disabled:opacity-60"
                                title="Logout"
                            >
                                <LogOut size={18} />
                            </button>

                            {/* Profile Badge */}
                            <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-gray-200">
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-900 leading-tight">{userName}</p>
                                    <p className="text-[10px] text-[#1e3a5f] font-bold tracking-wide uppercase">
                                        CRM Portal
                                    </p>
                                </div>
                                <div className="w-9 h-9 rounded-xl bg-[#1e3a5f] flex items-center justify-center text-white font-bold shadow-md shadow-[#1e3a5f]/25 overflow-hidden shrink-0 text-sm">
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

            {/* Logout Confirmation Modal */}
            <ConfirmModal
                isOpen={showLogoutModal}
                onConfirm={confirmLogout}
                onCancel={() => setShowLogoutModal(false)}
                title="Confirm Logout"
                message="Are you sure you want to log out of the CRM portal?"
                confirmLabel="Logout"
                cancelLabel="Cancel"
            />
        </div>
    );
}
