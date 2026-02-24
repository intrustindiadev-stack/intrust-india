'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, Store, DollarSign, Settings, LogOut, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: Users, label: 'Users', href: '/admin/users' },
    { icon: Store, label: 'Merchants', href: '/admin/merchants' },
    { icon: DollarSign, label: 'Revenue', href: '/admin/transactions' },
    { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export default function AdminBottomNav({ isSidebarOpen }) {
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

    return (
        <>
            {/* Bottom Navigation - Mobile Only */}
            <motion.nav
                initial={{ y: 150 }}
                animate={{ y: isSidebarOpen ? 150 : 0 }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
                className="fixed bottom-6 left-4 right-4 z-50 md:hidden"
            >
                <div className="bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl shadow-blue-900/10 rounded-3xl p-1.5 flex items-center justify-around">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.href === '/admin'
                            ? pathname === '/admin'
                            : pathname === item.href || pathname?.startsWith(item.href + '/');

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative flex flex-col items-center justify-center h-14 min-w-[3.5rem] group"
                            >
                                {/* Active Pill Background */}
                                {isActive && (
                                    <motion.div
                                        layoutId="adminBottomNavActive"
                                        className="absolute inset-0 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30"
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                )}

                                {/* Icon */}
                                <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                                    <Icon
                                        size={22}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={`transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}
                                    />

                                    {/* Small dot indicator for inactive items on hover */}
                                    {!isActive && (
                                        <div className="w-1 h-1 rounded-full bg-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </div>
                            </Link>
                        );
                    })}

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="relative flex flex-col items-center justify-center h-14 min-w-[3.5rem] group disabled:opacity-60"
                    >
                        <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                            {isLoggingOut
                                ? <Loader2 size={22} strokeWidth={2} className="text-rose-500 animate-spin" />
                                : <LogOut size={22} strokeWidth={2} className="text-slate-400 group-hover:text-rose-500 transition-colors duration-300" />
                            }
                            <div className="w-1 h-1 rounded-full bg-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </button>
                </div>
            </motion.nav>
        </>
    );
}
