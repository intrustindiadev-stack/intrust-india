'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Clock, Calendar, FileText, BookOpen, User, X, LogOut, Loader2, Shield, Users, LayoutDashboard, Gift, HelpCircle, ChevronRight, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { createClient } from '@/lib/supabaseClient';
import Image from 'next/image';

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
        { name: 'Incentives', icon: Gift, path: '/employee/incentives' },
        { name: 'Training', icon: BookOpen, path: '/employee/training' },
        { name: 'Documents & KYC', icon: FolderOpen, path: '/employee/documents' },
        { name: 'My Profile', icon: User, path: '/employee/profile' },
    ];

    const role = userProfile?.role;
    if (['admin', 'super_admin'].includes(role)) {
        menuItems.push({ name: 'Admin Panel', icon: Shield, path: '/admin' });
    }
    if (['hr_manager', 'admin', 'super_admin'].includes(role)) {
        menuItems.push({ name: 'HRM Panel', icon: Users, path: '/hrm' });
    }
    if (['relationship_exec', 'relationship_manager', 'admin', 'super_admin'].includes(role)) {
        menuItems.push({ name: 'CRM Panel', icon: LayoutDashboard, path: '/crm' });
    }
    menuItems.push({ name: 'Help & Support', icon: HelpCircle, path: '/employee/help' });

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
                fixed top-0 left-0 h-full w-72 bg-white/80 backdrop-blur-3xl border-none shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-50 
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                flex flex-col font-[family-name:var(--font-outfit)]
            `}>
                <div className="px-5 py-6 flex items-center justify-between border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        {/* White bg logo — natural colors */}
                        <div className="w-11 h-11 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm overflow-hidden p-1.5">
                            <Image 
                                src="/logo.png" 
                                width={32} 
                                height={32} 
                                alt="InTrust Logo" 
                                className="object-contain w-full h-full"
                            />
                        </div>
                        <div>
                            <span className="font-black text-lg tracking-tight text-amber-600">InTrust</span>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest -mt-0.5">Employee Portal</div>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 rounded-xl hover:bg-gray-100">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-hide">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path || (item.path !== '/employee' && pathname.startsWith(`${item.path}/`));
                        const isHelp = item.path === '/employee/help';

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => setIsOpen(false)}
                                className={`
                                    flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold transition-all duration-200 group relative text-sm
                                    ${isActive
                                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                                        : isHelp
                                        ? 'text-gray-400 hover:bg-amber-50 hover:text-amber-600'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                `}
                            >
                                <Icon 
                                    size={18} 
                                    className={`shrink-0 transition-colors duration-200 ${isActive ? 'text-white' : isHelp ? 'text-amber-400 group-hover:text-amber-600' : 'text-gray-400 group-hover:text-amber-500'}`} 
                                />
                                <span className="z-10 tracking-wide text-sm">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* User Profile Footer */}
                <div className="p-6 mt-auto">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-gray-50/50 hover:bg-gray-100/50 transition-colors cursor-pointer border border-transparent hover:border-gray-200/50">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-black border-2 border-white shadow-sm relative overflow-hidden shrink-0">
                                {userProfile?.avatar_url ? (
                                    <Image src={userProfile.avatar_url || '/placeholder.png'} alt={userName} fill sizes="48px" className="object-cover" />
                                ) : (
                                    getInitials(userName)
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-gray-900 font-black text-sm truncate">{userName}</div>
                                <div className="text-blue-500 text-xs font-bold truncate flex items-center gap-1.5 mt-0.5 uppercase tracking-wider">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> 
                                    {userProfile?.role ? userProfile.role.replace('_', ' ') : 'Employee'}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-[1.25rem] text-gray-400 hover:text-white hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/30 transition-all font-bold text-sm disabled:opacity-60 mt-2"
                        >
                            {isLoggingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                            {isLoggingOut ? 'Logging out...' : 'Log out'}
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
