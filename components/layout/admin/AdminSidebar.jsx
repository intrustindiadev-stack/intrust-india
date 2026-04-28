'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import {
    LayoutDashboard,
    Users,
    Store,
    Package,
    Receipt,
    Smartphone,
    Sun,
    TrendingUp,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Gift,
    Home,
    Banknote,
    Loader2,
    CreditCard,
    Clock,
    FileText,
    ShoppingBag,
    Image as ImageIcon,
    AlertCircle,
    ClipboardList,
    Activity,
    Trophy,
    Briefcase,
    UserCheck,
    BarChart3,
} from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';

const navigationGroups = [
    {
        title: 'Core System',
        items: [
            { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
            { name: 'Tasks', href: '/admin/tasks', icon: ClipboardList },
        ]
    },
    {
        title: 'Network Operations',
        items: [
            { name: 'Users', href: '/admin/users', icon: Users },
            { name: 'Merchants', href: '/admin/merchants', icon: Store },
            { name: 'Store Status', href: '/admin/store-status', icon: Activity },
            { name: 'Store Credit', href: '/admin/merchants/udhari', icon: CreditCard },
        ]
    },
    {
        title: 'Premium Services',
        items: [
            { name: 'Shopping Service', href: '/admin/shopping', icon: ShoppingBag },
            { name: 'Priority Takeovers', href: '/admin/shopping/orders/takeover', icon: AlertCircle },
            { name: 'Auto Mode', href: '/admin/auto-mode', icon: Sparkles },
            { name: 'NFC Service', href: '/admin/nfc', icon: Smartphone },
            { name: 'Gift Cards', href: '/admin/giftcards', icon: Gift },
            { name: 'Solar Leads', href: '/admin/solar', icon: Sun },
        ]
    },
    {
        title: 'Finance & Tools',
        items: [
            { name: 'Transactions', href: '/admin/transactions', icon: Receipt },
            { name: 'Payouts', href: '/admin/payouts', icon: Banknote },
            { name: 'Invoice Generator', href: '/admin/invoice', icon: FileText },
        ]
    },
    {
        title: 'Enterprise Portals',
        items: [
            { name: 'Career Applications', href: '/admin/careers', icon: Briefcase },
            { name: 'CRM Overview', href: '/admin/crm', icon: BarChart3 },
            { name: 'HRM Overview', href: '/admin/hrm', icon: UserCheck },
        ]
    },
    {
        title: 'Growth & Setup',
        items: [
            { name: 'Rewards', href: '/admin/rewards', icon: Trophy },
            { name: 'Partnership Growth', href: '/admin/lockin', icon: Clock },
            { name: 'Banners', href: '/admin/banners', icon: ImageIcon },
            { name: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
            { name: 'Settings', href: '/admin/settings', icon: Settings },
        ]
    }
];

export default function AdminSidebar({ isOpen, setIsOpen, adminProfile }) {
    const pathname = usePathname();
    const router = useRouter();
    const [takeoverCount, setTakeoverCount] = useState(0);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const isSuperAdmin = adminProfile?.role === 'super_admin';

    // REALTIME TAKEOVER COUNT
    useEffect(() => {
        const supabase = createClient();

        async function fetchCount() {
            const { count, error } = await supabase
                .from('shopping_order_groups')
                .select('*', { count: 'exact', head: true })
                .eq('settlement_status', 'admin_takeover');

            if (!error) setTakeoverCount(count || 0);
        }

        fetchCount();

        const channel = supabase
            .channel('takeover-count-sync')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'shopping_order_groups', filter: 'settlement_status=eq.admin_takeover' },
                () => fetchCount()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Static color maps — Tailwind v4 purges dynamic class names, so use full class strings
    const logoGradient = isSuperAdmin
        ? 'bg-gradient-to-br from-blue-900 to-indigo-950 shadow-blue-900/20 group-hover:shadow-blue-900/40'
        : 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-500/20 group-hover:shadow-blue-500/40';
    const logoLabel = isSuperAdmin ? 'text-blue-900' : 'text-blue-600';
    const activeItemBg = isSuperAdmin ? 'bg-blue-900/10 text-blue-900' : 'bg-blue-600/10 text-blue-600';
    const activeBar = isSuperAdmin
        ? 'absolute left-0 top-0 bottom-0 w-1 bg-blue-950 rounded-r-full shadow-[0_0_12px_rgba(23,37,84,0.3)]'
        : 'absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.3)]';
    const activeIcon = isSuperAdmin ? 'text-blue-950' : 'text-blue-600';
    const profileEmailColor = isSuperAdmin ? 'text-blue-900' : 'text-blue-600';

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
                className={`fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-50 transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    } ${isOpen ? 'w-72' : 'lg:w-72'}`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo & Toggle */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <Link href="/admin" className="flex items-center gap-3 group">
                                <div className="relative w-10 h-10 flex-shrink-0 overflow-hidden rounded-xl shadow-lg transition-shadow hover:shadow-xl bg-white p-0.5 border border-slate-100">
                                    <img
                                        src="/icon.png"
                                        alt="INTRUST"
                                        className="w-full h-full object-contain rounded-lg"
                                    />
                                </div>
                                <div>
                                    <div className="text-slate-900 font-bold text-lg tracking-wide">InTrust</div>
                                    <div className={`${logoLabel} text-xs font-semibold uppercase tracking-wider`}>
                                        {isSuperAdmin ? 'Super Admin' : 'Admin'}
                                    </div>
                                </div>
                            </Link>
                        </div>

                        {/* Close button for mobile */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="lg:hidden text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-lg transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 py-4 px-4 space-y-6 overflow-y-auto hide-scrollbar">
                        {navigationGroups.map((group, groupIdx) => (
                            <div key={groupIdx} className="space-y-1.5">
                                <div className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {group.title}
                                </div>
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const isNestedUdhariRoute = /^\/admin\/merchants\/[^/]+\/udhari(|-settings)$/.test(pathname || '');
                                    const isActive = item.href === '/admin'
                                        ? pathname === '/admin'
                                        : item.href === '/admin/merchants'
                                            ? (pathname === '/admin/merchants' || (pathname?.startsWith('/admin/merchants/') && !pathname?.startsWith('/admin/merchants/udhari'))) && !isNestedUdhariRoute
                                            : item.href === '/admin/merchants/udhari'
                                                ? pathname === item.href || pathname?.startsWith(item.href + '/') || isNestedUdhariRoute
                                                : item.href === '/admin/shopping'
                                                    ? pathname === '/admin/shopping' || (pathname?.startsWith('/admin/shopping/') && !pathname?.startsWith('/admin/shopping/orders/takeover'))
                                                    : pathname === item.href || pathname?.startsWith(item.href + '/');

                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={() => setIsOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group relative overflow-hidden ${isActive
                                                ? activeItemBg
                                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                                }`}
                                        >
                                            {isActive && (
                                                <div className={activeBar} />
                                            )}
                                            <Icon size={18} className={`transition-colors ${isActive ? activeIcon : 'text-slate-400 group-hover:text-slate-700'}`} />
                                            <span className="font-bold text-sm tracking-tight flex-1">{item.name}</span>
                                            {item.name === 'Priority Takeovers' && takeoverCount > 0 && (
                                                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                                                    {takeoverCount}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>

                    {/* User Profile Footer */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/60 shadow-sm">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border-2 border-white overflow-hidden shadow-sm">
                                    {adminProfile?.avatar_url ? (
                                        <img src={adminProfile.avatar_url} alt={adminName} className="w-full h-full object-cover" />
                                    ) : (
                                        getInitials(adminName)
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-slate-900 font-bold text-sm truncate">{adminName}</div>
                                    <div className={`${profileEmailColor} text-xs font-medium truncate flex items-center gap-1`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {adminProfile?.email || 'Online'}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                                {isLoggingOut ? 'Logging out...' : 'Logout'}
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            <ConfirmModal
                isOpen={showLogoutModal}
                onConfirm={confirmLogout}
                onCancel={() => setShowLogoutModal(false)}
                title="Confirm Logout"
                message="Are you sure you want to log out? You will need to log in again to access the admin panel."
                confirmLabel="Logout"
                cancelLabel="Stay Logged In"
            />
        </>
    );
}
