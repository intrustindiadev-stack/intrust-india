'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
    Home, Users, BarChart2, Briefcase, X, Settings, LogOut, 
    Loader2, User, FileText, HelpCircle, Target, ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { createClient } from '@/lib/supabaseClient';
import Image from 'next/image';

export default function CRMSidebar({ isOpen, setIsOpen, userProfile }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogout = () => setShowLogoutModal(true);

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
        if (!name) return 'C';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const userName = userProfile?.full_name || 'CRM Manager';
    const isManager = ['sales_manager', 'admin', 'super_admin'].includes(userProfile?.role);

    const menuItems = [
        { name: 'Dashboard', icon: Home, path: '/crm' },
        { name: 'Leads', icon: Users, path: '/crm/leads' },
        { name: 'Pipeline', icon: Briefcase, path: '/crm/pipeline' },
        { name: 'Tasks', icon: Target, path: '/crm/tasks' },
        { name: 'Teams', icon: Users, path: '/crm/teams' },
        { name: 'Invoice', icon: FileText, path: '/crm/invoice' },
    ];

    if (isManager) {
        menuItems.push({ name: 'Performance', icon: BarChart2, path: '/crm/analytics' });
        menuItems.push({ name: 'Reports', icon: BarChart2, path: '/crm/reports' });
    }

    menuItems.push({ name: 'Settings', icon: Settings, path: '/crm/settings' });
    menuItems.push({ name: 'My Portal', icon: User, path: '/employee' });
    menuItems.push({ name: 'Help & Support', icon: HelpCircle, path: '/crm/help' });

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
                fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-100 shadow-[4px_0_24px_rgba(0,0,0,0.04)] z-50 
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                flex flex-col font-[family-name:var(--font-outfit)]
            `}>
                {/* Logo */}
                <div className="px-6 py-6 flex items-center justify-between border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        {/* White bg logo container — shows natural logo colors */}
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
                            <span className="font-black text-lg tracking-tight text-[#1e3a5f]">InTrust</span>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest -mt-0.5">CRM Portal</div>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 rounded-xl hover:bg-gray-100">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Nav Items */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-hide">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path || (item.path !== '/crm' && pathname.startsWith(`${item.path}/`));
                        const isHelp = item.path === '/crm/help';

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => setIsOpen(false)}
                                className={`
                                    flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold transition-all duration-200 group relative text-sm
                                    ${isActive
                                        ? 'bg-[#1e3a5f] text-white shadow-lg shadow-[#1e3a5f]/25'
                                        : isHelp
                                        ? 'text-gray-400 hover:bg-blue-50 hover:text-blue-600'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                `}
                            >
                                <Icon
                                    size={18}
                                    className={`shrink-0 transition-colors duration-200 ${
                                        isActive ? 'text-white' : isHelp ? 'text-blue-400 group-hover:text-blue-600' : 'text-gray-400 group-hover:text-[#1e3a5f]'
                                    }`}
                                />
                                <span className="tracking-wide flex-1">{item.name}</span>
                                {isActive && <ChevronRight size={14} className="text-white/60" />}
                            </Link>
                        );
                    })}
                </div>

                {/* User Footer */}
                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e3a5f] to-blue-600 flex items-center justify-center text-white font-black text-sm border-2 border-white shadow-sm relative overflow-hidden shrink-0">
                            {userProfile?.avatar_url ? (
                                <Image src={userProfile.avatar_url} alt={userName} fill sizes="40px" className="object-cover" />
                            ) : (
                                getInitials(userName)
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-gray-900 font-bold text-sm truncate">{userName}</div>
                            <div className="text-[#1e3a5f] text-[10px] font-bold truncate flex items-center gap-1.5 mt-0.5 uppercase tracking-wider">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                                {userProfile?.role ? userProfile.role.replace(/_/g, ' ') : 'CRM User'}
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
                message="Are you sure you want to log out of the CRM portal?"
                confirmLabel="Logout"
                cancelLabel="Cancel"
            />
        </>
    );
}
