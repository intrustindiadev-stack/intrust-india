'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
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
    Gift,
    Home,
    Banknote,
    Loader2
} from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Merchants', href: '/admin/merchants', icon: Store },
    { name: 'Gift Cards', href: '/admin/giftcards', icon: Gift },
    { name: 'Payouts', href: '/admin/payouts', icon: Banknote },
    { name: 'Transactions', href: '/admin/transactions', icon: Receipt },
    { name: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminSidebar({ isOpen, setIsOpen, adminProfile }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
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
        if (!name) return 'A';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const adminName = adminProfile?.full_name || 'System Admin';

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full bg-[#0B1120] border-r border-slate-800 z-50 transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    } ${isOpen ? 'w-72' : 'lg:w-72'}`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo & Toggle */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <Link href="/admin" className="flex items-center gap-3 group">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                                    <Sparkles className="text-white w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-white font-bold text-lg tracking-wide">InTrust</div>
                                    <div className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Admin</div>
                                </div>
                            </Link>
                        </div>

                        {/* Close button for mobile */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="lg:hidden text-slate-400 hover:text-white bg-slate-800 p-2 rounded-lg transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto hide-scrollbar">
                        <div className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Menu
                        </div>
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            // Exact match for root dashboard '/admin', partial for others
                            const isActive = item.href === '/admin'
                                ? pathname === '/admin'
                                : pathname === item.href || pathname?.startsWith(item.href + '/');

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative overflow-hidden ${isActive
                                        ? 'bg-blue-600/10 text-blue-500'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                        }`}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                                    )}
                                    <Icon size={20} className={`transition-colors ${isActive ? 'text-blue-500' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                    <span className="font-semibold">{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile Footer */}
                    <div className="p-4 border-t border-slate-800 bg-[#0B1120]">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold border-2 border-slate-600 overflow-hidden shadow-inner">
                                    {adminProfile?.avatar_url ? (
                                        <img src={adminProfile.avatar_url} alt={adminName} className="w-full h-full object-cover" />
                                    ) : (
                                        getInitials(adminName)
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-slate-200 font-bold text-sm truncate">{adminName}</div>
                                    <div className="text-blue-400/80 text-xs font-medium truncate flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {adminProfile?.email || 'Online'}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                                {isLoggingOut ? 'Logging out...' : 'Logout'}
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
