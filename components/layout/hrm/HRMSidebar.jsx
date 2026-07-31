'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Calendar, Clock, DollarSign, BookOpen, Shield, X, Briefcase, UserCircle, Settings, LogOut, Loader2, User, Gift } from 'lucide-react';
import { useState } from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { createClient } from '@/lib/supabaseClient';
import Image from 'next/image';
import { displayEmail } from '@/lib/auth';

export default function HRMSidebar({ isOpen, setIsOpen, userProfile }) {
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
        if (!name) return 'H';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const userName = userProfile?.full_name || 'HR Manager';

    const menuItems = [
        { name: 'Dashboard', icon: Home, path: '/hrm' },
        { name: 'Employees', icon: Users, path: '/hrm/employees' },
        { name: 'Jobs', icon: Briefcase, path: '/hrm/jobs' },
        { name: 'Recruitment', icon: Users, path: '/hrm/recruitment' },
        { name: 'Attendance', icon: Clock, path: '/hrm/attendance' },
        { name: 'Leaves', icon: Calendar, path: '/hrm/leaves' },
        { name: 'Salary', icon: DollarSign, path: '/hrm/salary' },
        { name: 'Incentives', icon: Gift, path: '/hrm/incentives' },
        { name: 'Training', icon: BookOpen, path: '/hrm/training' },
        { name: 'Audit Logs', icon: Shield, path: '/hrm/audit' },
        { name: 'Settings', icon: Settings, path: '/hrm/settings' },
        { name: 'My Portal', icon: User, path: '/employee' },
    ];

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
                <div className="p-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-[1rem] bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 overflow-hidden">
                            <Image src="/logo.png" width={24} height={24} alt="InTrust Logo" className="object-contain brightness-0 invert" />
                        </div>
                        <span className="font-black text-2xl tracking-tight text-gray-900">
                            HRM
                        </span>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 rounded-xl hover:bg-gray-100">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-1.5 scrollbar-hide">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => setIsOpen(false)}
                                className={`
                                    flex items-center gap-4 px-5 py-3.5 rounded-[1.25rem] font-bold transition-all duration-300 group relative overflow-hidden
                                    ${isActive 
                                        ? 'text-white shadow-md shadow-emerald-500/20' 
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                `}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-[1.25rem] -z-10" />
                                )}
                                <Icon 
                                    size={18} 
                                    className={`
                                        transition-colors duration-200 z-10
                                        ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-emerald-500'}
                                    `} 
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
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-700 font-black border-2 border-white shadow-sm relative overflow-hidden shrink-0">
                                {userProfile?.avatar_url ? (
                                    <Image src={userProfile.avatar_url || '/placeholder.png'} alt={userName} fill sizes="48px" className="object-cover" />
                                ) : (
                                    getInitials(userName)
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-gray-900 font-black text-sm truncate">{userName}</div>
                                <div className="text-emerald-500 text-xs font-bold truncate flex items-center gap-1.5 mt-0.5 uppercase tracking-wider">
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
