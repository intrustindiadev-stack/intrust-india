'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
    LayoutDashboard, 
    ShoppingBag, 
    Trophy, 
    Target, 
    ArrowLeftRight, 
    BarChart3, 
    Search, 
    Bell, 
    MapPin, 
    Menu, 
    X,
    Sparkles,
    CheckCircle2,
    Plus,
    Wallet,
    ArrowRight,
    Lock,
    HelpCircle,
    Store,
    Calendar,
    Command
} from 'lucide-react';
import dynamic from 'next/dynamic';
import MarketingAccessGate from '@/components/marketing/layout/MarketingAccessGate';
import { supabase } from '@/lib/supabaseClient';

const NotificationBell = dynamic(() => import('@/components/notifications/NotificationBell'), { ssr: false });
const SwitchPortalSection = dynamic(() => import('@/components/layout/shared/SwitchPortalSection'), { ssr: false });
const ConfirmModal = dynamic(() => import('@/components/ui/ConfirmModal'), { ssr: false });
const MarketingOnboardingModal = dynamic(() => import('@/components/marketing/onboarding/MarketingOnboardingModal'), { ssr: false });

export default function MarketingLayout({ 
    children, 
    user, 
    profile, 
    merchant, 
    customerWalletBalancePaise, 
    isMerchant, 
    isAdmin,
    accessGate
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const searchRef = useRef(null);

    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

    const displayName = merchant?.business_name || profile?.full_name || user?.email?.split('@')[0] || 'User';
    const initials = displayName
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    // Global keyboard shortcuts: Ctrl+K or Cmd+K opens Command Palette, Escape closes it
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setSearchFocused(false);
            }
        };
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsSearchModalOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsSearchModalOpen(false);
                setSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = async () => {
        setShowLogoutModal(false);
        setIsLoggingOut(true);
        try {
            await supabase.auth.signOut();
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/login';
        } finally {
            setIsLoggingOut(false);
        }
    };

    const marketingNavItems = [
        { label: 'Overview', href: '/marketing', icon: LayoutDashboard },
        { label: 'Product Marketing', href: '/marketing/products', icon: ShoppingBag },
        { label: 'Daily Challenge', href: '/marketing/daily-challenge', icon: Trophy, badge: 'Live' },
        { label: 'Targets', href: '/marketing/targets', icon: Target },
        { label: 'Transactions', href: '/marketing/transactions', icon: ArrowLeftRight },
        { label: 'Analytics', href: '/marketing/analytics', icon: BarChart3 },
    ];

    const searchableItems = useMemo(() => [
        { label: 'Overview', sub: 'Marketing hub & performance metrics', href: '/marketing', icon: LayoutDashboard, keywords: 'overview home summary dashboard revenue stats' },
        { label: 'Official Platform Products', sub: 'Share curated products & earn promotional cashbacks', href: '/marketing/products', icon: ShoppingBag, keywords: 'products items catalog share promote sell earbud inverter atta rice oil wholesale official platform' },
        { label: 'Daily Challenge & Quiz', sub: 'Solve 10 questions daily, maintain streaks & claim cashbacks', href: '/marketing/daily-challenge', icon: Trophy, keywords: 'quiz challenge streak earn win coins daily cash reward question play' },
        { label: 'Sponsor Billboard Slot', sub: 'Feature your store branding & products to thousands of daily quiz players', href: '/marketing/daily-challenge/sponsor', icon: Store, keywords: 'sponsor booking billboard merchant slot advertise prime tomorrow' },
        { label: 'Sponsorship History & Invoices', sub: 'Review live/completed campaign slots and print GST tax invoices', href: '/marketing/daily-challenge/sponsor/history', icon: Calendar, keywords: 'history past bookings invoices receipts gst tax merchant' },
        { label: 'Growth Targets & Prizes', sub: 'Milestones, progress bars, physical prize gifts & level badges', href: '/marketing/targets', icon: Target, keywords: 'goals targets milestones progression kpi tier level smartwatch earbuds gold coin' },
        { label: 'Transactions & Passbook', sub: 'Track bonuses, reward credits & cashbacks in real-time', href: '/marketing/transactions', icon: ArrowLeftRight, keywords: 'payouts cashbacks wallet earnings history transactions money passbook' },
        { label: 'Growth Analytics', sub: 'Traffic insights, click-throughs & conversion funnels', href: '/marketing/analytics', icon: BarChart3, keywords: 'charts metrics impressions clicks revenue stats conversion growth' },
        { label: 'Marketing Alerts', sub: 'Challenge rewards & sponsorship notifications', href: '/marketing/notifications', icon: Bell, keywords: 'notifications alerts updates messages bell' },
    ], []);

    const searchFilteredItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return [];
        return searchableItems.filter(item => 
            item.label.toLowerCase().includes(q) || 
            item.sub.toLowerCase().includes(q) || 
            item.keywords.toLowerCase().includes(q)
        );
    }, [searchQuery, searchableItems]);

    const handleSearchSubmit = (e) => {
        e?.preventDefault();
        const q = searchQuery.trim();
        if (!q) return;

        if (searchFilteredItems.length > 0) {
            router.push(searchFilteredItems[0].href);
        } else {
            router.push(`/marketing/products?q=${encodeURIComponent(q)}`);
        }
        setSearchFocused(false);
    };

    const handleSelectSearchItem = (href) => {
        router.push(href);
        setSearchFocused(false);
        setSearchQuery('');
    };

    const activeWalletBalance = (isMerchant || isAdmin)
        ? (merchant?.wallet_balance_paise || 0) / 100 
        : (customerWalletBalancePaise || 0) / 100;

    return (
        <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 flex flex-col antialiased">
            {/* Mobile Backdrop Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-xs transition-opacity duration-300 ${
                    mobileDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Unified Responsive Sidebar (Desktop fixed, Mobile sliding drawer) */}
            <aside
                className={`fixed top-0 left-0 bottom-0 h-full max-h-screen w-[280px] bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col z-[70] transition-[transform,opacity,box-shadow] duration-300 ease-[cubic-bezier(0.3,1,0.3,1)] ${
                    mobileDrawerOpen 
                        ? 'translate-x-0 shadow-[20px_0_40px_-15px_rgba(0,0,0,0.5)] opacity-100' 
                        : '-translate-x-full opacity-0 lg:opacity-100 lg:translate-x-0'
                }`}
            >
                {/* Logo & Mobile Close Header */}
                <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 shrink-0">
                            <Image 
                                src="/icons/intrustLogo.png" 
                                alt="InTrust Logo" 
                                fill 
                                sizes="32px"
                                className="object-contain" 
                                priority 
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">InTrust</span>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                Marketing Workspace
                            </p>
                        </div>
                    </div>
                    {/* Mobile close button */}
                    <button 
                        onClick={() => setMobileDrawerOpen(false)} 
                        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Close menu"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Sidebar Navigation */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
                    {/* Marketing Navigation Group */}
                    <div>
                        <div className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">
                            Marketing
                        </div>
                        <nav className="space-y-1">
                            {marketingNavItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href || (item.href !== '/marketing' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileDrawerOpen(false)}
                                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                                            isActive
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-black'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                                            <span>{item.label}</span>
                                        </div>
                                        {accessGate && item.href !== '/marketing' ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                <Lock size={10} />
                                                <span>Locked</span>
                                            </span>
                                        ) : item.badge ? (
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                                                isActive 
                                                    ? 'bg-white/20 text-white' 
                                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                                            }`}>
                                                {item.badge}
                                            </span>
                                        ) : null}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Sidebar Footer Switch Portal & User Profile */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3 shrink-0">
                    <SwitchPortalSection 
                        currentPortal="marketing" 
                        role={profile?.role}
                        isMerchant={isMerchant} 
                        isAdmin={isAdmin} 
                        onNavigate={() => setMobileDrawerOpen(false)}
                    />

                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl flex items-center justify-between border border-slate-200/60 dark:border-slate-800 transition-all">
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden bg-blue-100 dark:bg-slate-800 flex items-center justify-center shrink-0 relative">
                                {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                                    <Image 
                                        src={profile?.avatar_url || user?.user_metadata?.avatar_url} 
                                        alt={displayName} 
                                        fill 
                                        sizes="32px" 
                                        className="object-cover" 
                                    />
                                ) : (
                                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">{initials}</span>
                                )}
                            </div>
                            <div className="overflow-hidden flex-1 leading-tight">
                                <p className="text-[11px] font-black truncate text-slate-800 dark:text-white uppercase tracking-tight">
                                    {displayName}
                                </p>
                                <Link 
                                    href={isMerchant ? "/merchant/profile" : "/profile"} 
                                    onClick={() => setMobileDrawerOpen(false)}
                                    className="text-[9px] text-slate-500 dark:text-slate-400 truncate block hover:text-blue-600 dark:hover:text-blue-400 font-bold transition-colors uppercase tracking-widest mt-0.5"
                                >
                                    {isMerchant ? "Merchant Profile" : "User Profile"}
                                </Link>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
                            title="Log out"
                        >
                            <span className="material-icons-round text-base">logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="lg:pl-[280px] flex-1 flex flex-col min-w-0">
                {/* Glassmorphic Top Header */}
                <header className="sticky top-0 z-30 h-14 sm:h-16 lg:h-18 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 transition-all">
                    {/* Mobile Hamburger + Search Input */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 max-w-xl">
                        <button
                            onClick={() => setMobileDrawerOpen(true)}
                            className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0 hover:bg-slate-200 transition-colors"
                            aria-label="Open Navigation Menu"
                        >
                            <Menu size={18} />
                        </button>

                        <div ref={searchRef} className="relative flex-1 min-w-0">
                            <div 
                                onClick={() => setIsSearchModalOpen(true)}
                                className="w-full flex items-center justify-between pl-3 pr-2.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-slate-100/90 hover:bg-slate-200/60 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-400 font-semibold cursor-pointer transition-all shadow-2xs group"
                            >
                                <div className="flex items-center gap-2 min-w-0 truncate">
                                    <Search size={15} className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                                    <span className="truncate">Search workspace, challenges, products...</span>
                                </div>
                                <div className="hidden xs:flex items-center gap-1 shrink-0 ml-2">
                                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-mono font-bold text-slate-500 shadow-2xs">
                                        Ctrl+K
                                    </kbd>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Action Icons, Live Wallet & Notifications */}
                    <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                        {/* Live Wallet Balance Pill */}
                        <Link
                            href={isMerchant ? "/merchant/wallet" : "/wallet"}
                            className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60 transition-all group shrink-0"
                            title="Open InTrust Wallet"
                        >
                            <div className="flex flex-col text-left leading-none">
                                <span className="hidden sm:block text-[8px] sm:text-[9px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Wallet</span>
                                <span className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white tabular-nums sm:mt-0.5">
                                    ₹{activeWalletBalance.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <span className="hidden sm:flex p-0.5 sm:p-1 rounded-md sm:rounded-lg bg-blue-600 text-white group-hover:scale-105 transition-transform">
                                <Plus size={10} className="sm:w-3 sm:h-3" />
                            </span>
                        </Link>

                        {/* Real-time Notification Bell */}
                        <div className="shrink-0">
                            <NotificationBell apiPath="/api/notifications" variant="navbar" />
                        </div>

                        {/* Interactive Workspace Guide Button */}
                        <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-marketing-onboarding'))}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all shrink-0"
                            title="Interactive Marketing Guide & Rules"
                            aria-label="Open Workspace Guide"
                        >
                            <HelpCircle size={17} />
                        </button>

                        {/* City Chip */}
                        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                            <MapPin size={13} className="text-blue-600 dark:text-blue-400" />
                            <span>Bhopal, MP</span>
                        </div>

                        {/* Profile Badge Pill */}
                        <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 py-1 pr-2 sm:pl-2 sm:pr-3 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-2xs overflow-hidden shrink-0">
                                {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                                    <Image 
                                        src={profile?.avatar_url || user?.user_metadata?.avatar_url} 
                                        alt={displayName} 
                                        fill 
                                        sizes="32px"
                                        className="object-cover" 
                                    />
                                ) : (
                                    <span className="text-[11px] sm:text-xs">{initials}</span>
                                )}
                            </div>
                            <div className="hidden sm:flex flex-col text-left leading-none">
                                <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[100px] lg:max-w-[120px]">
                                    {displayName}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                                    {isMerchant ? 'Merchant' : 'Customer'}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content Body */}
                <main key={pathname} className="panel-page-enter flex-1 max-w-7xl w-full mx-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-7 min-w-0 pb-24 lg:pb-8">
                    {accessGate ? (
                        <MarketingAccessGate 
                            type={accessGate.type} 
                            status={accessGate.status} 
                            user={user} 
                            profile={profile} 
                            merchant={merchant} 
                        />
                    ) : (
                        children
                    )}
                </main>

                {/* Spacer to prevent content from being hidden behind bottom nav on mobile */}
                <div className="h-20 lg:hidden" />

                {/* Responsive Mobile Bottom Navigation — EXACTLY 5 BUTTONS */}
                <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-2xl pb-[env(safe-area-inset-bottom,0px)]">
                    <div className="flex items-center justify-around h-16 px-1 max-w-md mx-auto">
                        {/* 1. Overview */}
                        <Link
                            href="/marketing"
                            className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[10px] font-extrabold transition-all active:scale-95 ${
                                pathname === '/marketing' 
                                    ? 'text-blue-600 dark:text-blue-400 font-black' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            <LayoutDashboard size={20} />
                            <span className="mt-1 tracking-tight">Overview</span>
                        </Link>

                        {/* 2. Products */}
                        <Link
                            href="/marketing/products"
                            className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[10px] font-extrabold transition-all active:scale-95 ${
                                pathname.startsWith('/marketing/products') 
                                    ? 'text-blue-600 dark:text-blue-400 font-black' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            <ShoppingBag size={20} />
                            <span className="mt-1 tracking-tight">Products</span>
                        </Link>

                        {/* 3. Daily Challenge (Floating Raised Center Action) */}
                        <Link
                            href="/marketing/daily-challenge"
                            className="flex-1 flex flex-col items-center justify-center py-1 px-0.5 text-[10px] font-extrabold relative transition-all active:scale-95 group -mt-5"
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-105 ${
                                pathname.startsWith('/marketing/daily-challenge')
                                    ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/35 ring-4 ring-white dark:ring-slate-900 scale-105'
                                    : 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/25 ring-4 ring-white dark:ring-slate-900'
                            }`}>
                                <Trophy size={20} strokeWidth={2.5} />
                            </div>
                            <span className={`text-[10px] font-bold mt-1 tracking-tight ${
                                pathname.startsWith('/marketing/daily-challenge') 
                                    ? 'text-blue-600 dark:text-blue-400 font-black' 
                                    : 'text-slate-600 dark:text-slate-400'
                            }`}>
                                Challenge
                            </span>
                        </Link>

                        {/* 4. Targets */}
                        <Link
                            href="/marketing/targets"
                            className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[10px] font-extrabold transition-all active:scale-95 ${
                                pathname.startsWith('/marketing/targets') 
                                    ? 'text-blue-600 dark:text-blue-400 font-black' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            <Target size={20} />
                            <span className="mt-1 tracking-tight">Targets</span>
                        </Link>

                        {/* 5. Analytics */}
                        <Link
                            href="/marketing/analytics"
                            className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[10px] font-extrabold transition-all active:scale-95 ${
                                pathname.startsWith('/marketing/analytics') 
                                    ? 'text-blue-600 dark:text-blue-400 font-black' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            <BarChart3 size={20} />
                            <span className="mt-1 tracking-tight">Analytics</span>
                        </Link>
                    </div>
                </nav>
            </div>

            {/* Command Palette Modal */}
            {isSearchModalOpen && (
                <div className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4 p-4 animate-in fade-in duration-150">
                    <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden space-y-0 animate-in zoom-in-95 duration-150"
                    >
                        {/* Search Input Bar */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                            <Search size={18} className="text-blue-600 shrink-0" />
                            <input
                                type="text"
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSearchSubmit(e);
                                        setIsSearchModalOpen(false);
                                    }
                                }}
                                placeholder="Search pages, challenge, sponsors, products..."
                                className="flex-1 bg-transparent border-none text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
                            />
                            {searchQuery ? (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                >
                                    <X size={15} />
                                </button>
                            ) : (
                                <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                    ESC
                                </span>
                            )}
                        </div>

                        {/* Results / Navigation List */}
                        <div className="p-3 max-h-96 overflow-y-auto space-y-1">
                            <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                {searchQuery.trim() ? `Search Results (${searchFilteredItems.length})` : 'Quick Navigation'}
                            </div>

                            {(searchQuery.trim() ? searchFilteredItems : searchableItems).map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.href}
                                        type="button"
                                        onClick={() => {
                                            handleSelectSearchItem(item.href);
                                            setIsSearchModalOpen(false);
                                        }}
                                        className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-blue-50/70 dark:hover:bg-slate-800/80 text-left transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-blue-600 group-hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 transition-colors">
                                                <Icon size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {item.label}
                                                </p>
                                                <p className="text-[11px] text-slate-400 truncate">
                                                    {item.sub}
                                                </p>
                                            </div>
                                        </div>
                                        <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
                                    </button>
                                );
                            })}

                            {searchQuery.trim() && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleSelectSearchItem(`/marketing/products?q=${encodeURIComponent(searchQuery.trim())}`);
                                        setIsSearchModalOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 text-left transition-colors border border-blue-200/60 dark:border-blue-900 group cursor-pointer mt-2"
                                >
                                    <div className="flex items-center gap-2 text-xs font-black text-blue-600 dark:text-blue-400">
                                        <Search size={15} />
                                        <span>Search all catalog products for &ldquo;{searchQuery.trim()}&rdquo;</span>
                                    </div>
                                    <ArrowRight size={14} className="text-blue-600 group-hover:translate-x-1 transition-transform shrink-0" />
                                </button>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                            <div className="flex items-center gap-2">
                                <span>Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px]">Enter</kbd> to select</span>
                                <span>•</span>
                                <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px]">Esc</kbd> to close</span>
                            </div>
                            <span className="font-bold text-slate-500">InTrust Marketing Hub</span>
                        </div>
                    </div>
                    {/* Backdrop click dismiss */}
                    <div className="fixed inset-0 -z-10" onClick={() => setIsSearchModalOpen(false)} />
                </div>
            )}

            <ConfirmModal
                isOpen={showLogoutModal}
                onConfirm={confirmLogout}
                onCancel={() => setShowLogoutModal(false)}
                title="Confirm Logout"
                message="Are you sure you want to log out from your InTrust account?"
                confirmLabel="Logout"
                cancelLabel="Cancel"
            />

            {/* Global Marketing Onboarding Guide Modal */}
            <MarketingOnboardingModal />
        </div>
    );
}
