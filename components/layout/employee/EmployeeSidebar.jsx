'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Clock, Calendar, FileText, BookOpen, User, X, LogOut, Loader2, Shield, Users, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { createClient } from '@/lib/supabaseClient';

export default function EmployeeSidebar({ isOpen, setIsOpen, userProfile }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = async () => {
        setShowLogoutModal(false);
        setIsLoggingOut(true);
        try {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/login';
        } finally {
            setIsLoggingOut(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const userName = userProfile?.full_name || 'Employee';

    const menuItems = [
        { name: 'Dashboard', icon: Home, path: '/employee' },
        { name: 'Attendance', icon: Clock, path: '/employee/attendance' },
        { name: 'Leaves', icon: Calendar, path: '/employee/leaves' },
        { name: 'Payslips', icon: FileText, path: '/employee/payslips' },
        { name: 'Training', icon: BookOpen, path: '/employee/training' },
        { name: 'My Profile', icon: User, path: '/employee/profile' },
    ];

    const role = userProfile?.role;
    if (['admin', 'super_admin'].includes(role)) {
        menuItems.push({ name: 'Admin Panel', icon: Shield, path: '/admin' });
    }
    if (['hr_manager', 'admin', 'super_admin'].includes(role)) {
        menuItems.push({ name: 'HRM Panel', icon: Users, path: '/hrm' });
    }
    if (['sales_exec', 'sales_manager', 'admin', 'super_admin'].includes(role)) {
        menuItems.push({ name: 'CRM Panel', icon: LayoutDashboard, path: '/crm' });
    }

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200 z-50 
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                flex flex-col
            `}>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-bold text-xl">
                            E
                        </div>
                        <span className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                            Workspace
                        </span>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => setIsOpen(false)}
                                className={`
                                    flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 group
                                    ${isActive 
                                        ? 'bg-amber-50 text-amber-700' 
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                `}
                            >
                                <Icon 
                                    size={20} 
                                    className={`
                                        transition-colors duration-200
                                        ${isActive ? 'text-amber-600' : 'text-gray-400 group-hover:text-gray-600'}
                                    `} 
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </div>

                {/* User Profile Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/60 shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold border-2 border-white overflow-hidden shadow-sm">
                                {userProfile?.avatar_url ? (
                                    <img src={userProfile.avatar_url} alt={userName} className="w-full h-full object-cover" />
                                ) : (
                                    getInitials(userName)
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-gray-900 font-bold text-sm truncate">{userName}</div>
                                <div className="text-gray-500 text-xs font-medium truncate flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {userProfile?.email || 'Online'}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-gray-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                            {isLoggingOut ? 'Logging out...' : 'Logout'}
                        </button>
                    </div>
                </div>
            </aside>

            <ConfirmModal
                isOpen={showLogoutModal}
                onConfirm={confirmLogout}
                onCancel={() => setShowLogoutModal(false)}
                title="Confirm Logout"
                message="Are you sure you want to log out?"
                confirmLabel="Logout"
                cancelLabel="Cancel"
            />
        </>
    );
}
