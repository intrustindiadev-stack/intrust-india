'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import SidebarGroup from '@/components/admin/sidebar/SidebarGroup';
import { useCollapsibleNav } from '@/hooks/useCollapsibleNav';
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
    User,
    Zap,
    Bell,
    ShieldCheck,
    BookOpen,
    ChevronDown,
    Network,
    Target,
    MessageSquare,
    Wallet,
} from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { displayEmail } from '@/lib/auth';

const navigationGroups = [
    {
        title: 'Core System',
        items: [
            { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
            { name: 'Tasks', href: '/admin/tasks', icon: ClipboardList },
            { name: 'Notifications', href: '/admin/notifications', icon: Bell },
            { name: 'WhatsApp Health', href: '/admin/whatsapp-health', icon: Activity },
        ]
    },
    {
        title: 'Network Operations',
        items: [
            { name: 'Users', href: '/admin/users', icon: Users },
            { name: 'Role Management', href: '/admin/roles', icon: ShieldCheck },
            { name: 'Merchants', href: '/admin/merchants', icon: Store },
            { name: 'Store Status', href: '/admin/store-status', icon: Activity },
            { name: 'Store Credit', href: '/admin/merchants/udhari', icon: CreditCard },
            { name: 'AI Grow', href: '/admin/investments', icon: TrendingUp },
            { name: 'AI Grow Wallets', href: '/admin/ai-grow/wallets', icon: Wallet },
            { name: 'Lockin', href: '/admin/lockin', icon: ShieldCheck },
        ]
    },
    {
        title: 'Premium Services',
        items: [
            { name: 'Shopping Service', href: '/admin/shopping', icon: ShoppingBag },
            { name: 'Order History', href: '/admin/shopping/orders', icon: Receipt },
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
            { name: 'Organization', href: '/admin/teams', icon: Network },
            { name: 'Career Applications', href: '/admin/careers', icon: Briefcase },
            { name: 'CRM Overview', href: '/admin/crm', icon: BarChart3 },
            { name: 'CRM Leads', href: '/admin/crm/leads', icon: Target },
            { name: 'Communication Logs', href: '/admin/crm/communications', icon: MessageSquare },
            { name: 'Lead Distribution', href: '/admin/crm/distribution', icon: Network },
            { name: 'HRM Overview', href: '/admin/hrm', icon: UserCheck },
            { name: 'HRM Incentives', href: '/admin/hrm/incentives', icon: Gift },
        ]
    },
    {
        title: 'Growth & Setup',
        items: [
            { name: 'Rewards', href: '/admin/rewards', icon: Trophy },
            { name: 'Flash Sale', href: '/admin/flash-sale', icon: Zap },
            { name: 'Banners', href: '/admin/banners', icon: ImageIcon },
            { name: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
            { name: 'My Profile', href: '/admin/profile', icon: User },
            { name: 'Settings', href: '/admin/settings', icon: Settings },
        ]
    }
];

const checkIsActive = (item, pathname) => {
    const isNestedUdhariRoute = /^\/admin\/merchants\/[^/]+\/udhari(|-settings)$/.test(pathname || '');
    return item.href === '/admin'
        ? pathname === '/admin'
        : item.href === '/admin/merchants'
            ? (pathname === '/admin/merchants' || (pathname?.startsWith('/admin/merchants/') && !pathname?.startsWith('/admin/merchants/udhari'))) && !isNestedUdhariRoute
            : item.href === '/admin/merchants/udhari'
                ? pathname === item.href || pathname?.startsWith(item.href + '/') || isNestedUdhariRoute
                : item.href === '/admin/shopping'
                    ? pathname === '/admin/shopping' || (pathname?.startsWith('/admin/shopping/') && !pathname?.startsWith('/admin/shopping/orders/takeover'))
                    : pathname === item.href || pathname?.startsWith(item.href + '/');
};

export default function AdminSidebar({ isOpen, setIsOpen, adminProfile }) {
    const pathname = usePathname();
    const router = useRouter();
    const [takeoverCount, setTakeoverCount] = useState(0);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const isSuperAdmin = adminProfile?.role === 'super_admin';

    const activeGroupTitle = navigationGroups.find(group => 
        group.items.some(item => checkIsActive(item, pathname))
    )?.title;

    const { isOpen: isGroupOpen, toggleGroup } = useCollapsibleNav({
        storageKey: 'intrust:admin:sidebar-groups',
        groupTitles: navigationGroups.map(g => g.title),
        activeGroupTitle
    });

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
        ? 'bg-gradient-to-br from-slate-900 to-[#1e3a5f] shadow-slate-900/20 group-hover:shadow-slate-900/40'
        : 'bg-gradient-to-br from-[#D4AF37] to-amber-600 shadow-amber-500/20 group-hover:shadow-amber-500/40';
    const logoLabel = isSuperAdmin ? 'text-slate-900' : 'text-amber-600';
    const activeItemBg = isSuperAdmin ? 'bg-slate-900/10 text-slate-900' : 'bg-[#D4AF37]/10 text-amber-600';
    const activeBar = isSuperAdmin
        ? 'absolute left-0 top-0 bottom-0 w-1 bg-slate-900 rounded-r-full shadow-[0_0_12px_rgba(15,23,42,0.3)]'
        : 'absolute left-0 top-0 bottom-0 w-1 bg-[#D4AF37] rounded-r-full shadow-[0_0_12px_rgba(212,175,55,0.3)]';
    const activeIcon = isSuperAdmin ? 'text-slate-900' : 'text-amber-600';
    const profileEmailColor = isSuperAdmin ? 'text-slate-900' : 'text-amber-600';

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
                                    <Image src="/logo.png" width={40} height={40} alt="InTrust Logo" className="object-contain" />
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

                    <nav className="flex-1 py-4 px-4 space-y-2 overflow-y-auto hide-scrollbar">
                        {navigationGroups.map((group, groupIdx) => {
                            const isGroupActive = group.items.some(item => checkIsActive(item, pathname));
                            return (
                                <SidebarGroup key={groupIdx} id={`group-${groupIdx}`} label={group.title} defaultOpen={isGroupActive}>
                                    {group.items.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = checkIsActive(item, pathname);
                                        return (
                                            <motion.li
                                                key={item.name}
                                                variants={{ open: { opacity: 1, y: 0 }, closed: { opacity: 0, y: -4 } }}
                                                transition={{ duration: 0.18, ease: 'easeOut' }}
                                                className="mb-0.5"
                                            >
                                                <Link
                                                    href={item.href}
                                                    onClick={() => setIsOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-150 group relative overflow-hidden text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                >
                                                    {isActive && (
                                                        <motion.span
                                                            layoutId="sidebar-active-pill"
                                                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                                            className={`absolute inset-0 rounded-lg ${isSuperAdmin ? 'bg-slate-900/10' : 'bg-[#D4AF37]/10'}`}
                                                        />
                                                    )}
                                                    <div className="relative z-10 flex items-center gap-3 w-full">
                                                        <Icon size={18} className={`transition-colors ${isActive ? activeIcon : 'text-slate-400 group-hover:text-slate-600'}`} />
                                                        <span className={`font-bold text-sm tracking-tight flex-1 ${isActive ? (isSuperAdmin ? 'text-slate-900' : 'text-amber-600') : ''}`}>{item.name}</span>
                                                        {item.name === 'Priority Takeovers' && takeoverCount > 0 && (
                                                            <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                                                                {takeoverCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                </Link>
                                            </motion.li>
                                        );
                                    })}
                                </SidebarGroup>
                            );
                        })}
                    </nav>

                    {/* User Profile Footer */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/60 shadow-sm">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border-2 border-white overflow-hidden shadow-sm">
                                    {adminProfile?.avatar_url ? (
                                        <div className="relative w-full h-full">
                                            <Image src={adminProfile.avatar_url || '/placeholder.png'} alt={adminName} fill sizes="40px" className="object-cover" />
                                        </div>
                                    ) : (
                                        getInitials(adminName)
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-slate-900 font-bold text-sm truncate">{adminName}</div>
                                    <div className={`${profileEmailColor} text-xs font-medium truncate flex items-center gap-1`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {displayEmail(adminProfile?.email) || 'Online'}
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