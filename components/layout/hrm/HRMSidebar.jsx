'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Calendar, Clock, DollarSign, BookOpen, Shield, X, Briefcase, UserCircle, Settings, LogOut, Loader2, User, Gift, HelpCircle, ChevronRight, Network } from 'lucide-react';
import { useState } from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { createClient } from '@/lib/supabaseClient';
import Image from 'next/image';

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
        { name: 'Teams', icon: Network, path: '/hrm/teams' },
        { name: 'Jobs', icon: Briefcase, path: '/hrm/jobs' },
        { name: 'Recruitment', icon: Users, path: '/hrm/recruitment' },
        { name: 'Attendance', icon: Clock, path: '/hrm/attendance' },
        { name: 'Leaves', icon: Calendar, path: '/hrm/leaves' },
        { name: 'Salary', icon: DollarSign, path: '/hrm/salary' },
        { name: 'Incentives', icon: Gift, path: '/hrm/incentives' },
        { name: 'Training', icon: BookOpen, path: '/hrm/training' },
        { name: 'Audit Logs', icon: Shield, path: '/hrm/audit' },
        { name: 'Settings', icon: Settings, path: '/hrm/settings' },
        { name: 'Help & Support', icon: HelpCircle, path: '/hrm/help' },
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
                            <span className="font-black text-lg tracking-tight text-emerald-700">InTrust</span>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest -mt-0.5">HRM Portal</div>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 rounded-xl hover:bg-gray-100">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-hide">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path || (item.path !== '/hrm' && pathname.startsWith(`${item.path}/`));
                        const isHelp = item.path === '/hrm/help';

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => setIsOpen(false)}
                                className={`
                                    flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold transition-all duration-200 group relative text-sm
                                    ${isActive
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                                        : isHelp
                                        ? 'text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                `}
                            >
                                <Icon
                                    size={18}
                                    className={`shrink-0 transition-colors duration-200 ${isActive ? 'text-white' : isHelp ? 'text-emerald-400 group-hover:text-emerald-600' : 'text-gray-400 group-hover:text-emerald-500'}`}
                                />
                                <span className="flex-1 tracking-wide">{item.name}</span>
                                {isActive && <ChevronRight size={14} className="text-white/60" />}
                            </Link>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-gray-100 space-y-4">
                    <div className="flex flex-col space-y-1">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-1">Switch Portal</div>
                        <Link
                            href="/employee"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors group"
                        >
                            <User size={16} className="text-gray-400 group-hover:text-sky-600 transition-colors" />
                            <span className="flex-1 text-sm tracking-wide">My Portal</span>
                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
                        </Link>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-700 font-black border-2 border-white shadow-sm relative overflow-hidden shrink-0">
                            {userProfile?.avatar_url ? (
                                <Image src={userProfile.avatar_url} alt={userName} fill sizes="40px" className="object-cover" />
                            ) : (
                                getInitials(userName)
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-gray-900 font-bold text-sm truncate">{userName}</div>
                            <div className="text-emerald-600 text-[10px] font-bold truncate flex items-center gap-1.5 mt-0.5 uppercase tracking-wider">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                                {userProfile?.role ? userProfile.role.replace(/_/g, ' ') : 'HR Staff'}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/25 transition-all font-semibold text-sm disabled:opacity-60"
                    >
                        {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                        {isLoggingOut ? 'Logging out…' : 'Log Out'}
                    </button>
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
