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
    Share2, 
    Megaphone, 
    CreditCard, 
    Search, 
    Bell, 
    MapPin, 
    Menu, 
    X,
    Sparkles,
    CheckCircle2,
    Plus,
    Wallet,
    ArrowRight
} from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import SwitchPortalSection from '@/components/layout/shared/SwitchPortalSection';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { supabase } from '@/lib/supabaseClient';

export default function MarketingLayout({ 
    children, 
    user, 
    profile, 
    merchant, 
    customerWalletBalancePaise, 
    isMerchant, 
    isAdmin 
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const searchRef = useRef(null);

    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const displayName = merchant?.business_name || profile?.full_name || user?.email?.split('@')[0] || 'User';
    const initials = displayName
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    // Close search dropdown on outside click or Escape
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setSearchFocused(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
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
        { label: 'Product Marketing', sub: 'Share products & earn promotional cashback', href: '/marketing/products', icon: ShoppingBag, keywords: 'products items catalog share promote sell earbud inverter atta rice oil wholesale' },
        { label: 'Daily Challenge & Quiz', sub: 'Solve daily quiz, maintain streaks & win rewards', href: '/marketing/daily-challenge', icon: Trophy, keywords: 'quiz challenge streak earn win coins daily cash reward question' },
        { label: 'Growth Targets', sub: 'Milestones, progress bars & level badges', href: '/marketing/targets', icon: Target, keywords: 'goals targets milestones progression kpi tier level' },
        { label: 'Transactions & Passbook', sub: 'Track bonuses, reward credits & cashbacks', href: '/marketing/transactions', icon: ArrowLeftRight, keywords: 'payouts cashbacks wallet earnings history transactions money passbook' },
        { label: 'Growth Analytics', sub: 'Traffic insights, click-throughs & conversions', href: '/marketing/analytics', icon: BarChart3, keywords: 'charts metrics impressions clicks revenue stats conversion growth' },
        { label: 'Marketing Alerts', sub: 'Challenge rewards & sponsorship updates', href: '/marketing/notifications', icon: Bell, keywords: 'notifications alerts updates messages bell' },
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

    const advertisingItems = [
        { label: 'Meta Ads', icon: Share2 },
        { label: 'Ad Campaigns', icon: Megaphone },
        { label: 'Ad Spend', icon: CreditCard },
    ];

    const activeWalletBalance = (isMerchant || isAdmin)
        ? (merchant?.wallet_balance_paise || 0) / 100 
        : (customerWalletBalancePaise || 0) / 100;

    return (
        <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 flex flex-col antialiased">
            {/* Desktop & Tablet Sidebar */}
            <aside className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-64 xl:w-72 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 z-40">
                {/* Logo & Back Link */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 shrink-0">
                            <Image 
                                src="/icons/intrustLogo.png" 
                                alt="InTrust Logo" 
                                fill 
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
                                        {item.badge && (
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                                                isActive 
                                                    ? 'bg-white/20 text-white' 
                                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                                            }`}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Advertising Section (Visible to Merchants) */}
                    {isMerchant && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                            <div className="flex items-center justify-between px-3 mb-2">
                                <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    Advertising
                                </span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    Coming Soon
                                </span>
                            </div>
                            <div className="space-y-1">
                                {advertisingItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div
                                            key={item.label}
                                            className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-slate-400 dark:text-slate-600 cursor-not-allowed select-none"
                                        >
                                            <Icon size={17} className="text-slate-300 dark:text-slate-700" />
                                            <span>{item.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Footer Switch Portal & User Profile */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                    <SwitchPortalSection 
                        currentPortal="marketing" 
                        role={profile?.role}
                        isMerchant={isMerchant} 
                        isAdmin={isAdmin} 
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

            {/* Mobile Drawer Overlay */}
            {mobileDrawerOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 lg:hidden"
                    onClick={() => setMobileDrawerOpen(false)}
                />
            )}

            {/* Mobile Drawer */}
            <div className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 z-50 lg:hidden transform transition-transform duration-300 ease-in-out flex flex-col border-r border-slate-200 dark:border-slate-800 ${
                mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className="relative w-7 h-7 shrink-0">
                            <Image 
                                src="/icons/intrustLogo.png" 
                                alt="InTrust" 
                                fill 
                                className="object-contain" 
                                priority 
                            />
                        </div>
                        <div>
                            <span className="font-black text-base tracking-tight text-slate-900 dark:text-white leading-tight block">InTrust</span>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">Marketing</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setMobileDrawerOpen(false)}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                    {marketingNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileDrawerOpen(false)}
                                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold ${
                                    isActive 
                                        ? 'bg-blue-600 text-white font-black' 
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon size={18} />
                                    <span>{item.label}</span>
                                </div>
                                {item.badge && (
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Mobile Drawer Footer Switch Portal & User Profile */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
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
            </div>

            {/* Main Content Area */}
            <div className="lg:pl-64 xl:pl-72 flex-1 flex flex-col min-w-0">
                {/* Glassmorphic Top Header */}
                <header className="sticky top-0 z-30 h-16 sm:h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 transition-all">
                    {/* Mobile Hamburger + Search Input */}
                    <div className="flex items-center gap-3 flex-1 max-w-xl">
                        <button
                            onClick={() => setMobileDrawerOpen(true)}
                            className="lg:hidden w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200"
                        >
                            <Menu size={20} />
                        </button>

                        <div ref={searchRef} className="relative flex-1">
                            <form onSubmit={handleSearchSubmit} className="relative">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setSearchFocused(true)}
                                    placeholder="Search products, campaigns, targets or insights..."
                                    className="w-full pl-10 pr-9 py-2 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </form>

                            {/* Live Search Results Dropdown */}
                            {searchFocused && searchQuery.trim().length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-slate-100 dark:divide-slate-800/80">
                                    <div className="p-2 space-y-0.5 max-h-72 overflow-y-auto">
                                        <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            {searchFilteredItems.length > 0 ? 'Matching Features & Pages' : 'Search Products'}
                                        </div>
                                        {searchFilteredItems.map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <button
                                                    key={item.href}
                                                    type="button"
                                                    onClick={() => handleSelectSearchItem(item.href)}
                                                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-left transition-colors group"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                                            <Icon size={14} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                {item.label}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 truncate">
                                                                {item.sub}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <ArrowRight size={13} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Direct product search suggestion */}
                                    <div className="p-2 bg-slate-50 dark:bg-slate-800/40">
                                        <button
                                            type="button"
                                            onClick={() => handleSelectSearchItem(`/marketing/products?q=${encodeURIComponent(searchQuery.trim())}`)}
                                            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-left transition-colors group"
                                        >
                                            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                                                <Search size={14} />
                                                <span>Search all products for &ldquo;{searchQuery.trim()}&rdquo;</span>
                                            </div>
                                            <ArrowRight size={13} className="text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Action Icons, Live Wallet & Notifications */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* Live Wallet Balance Pill */}
                        <Link
                            href={isMerchant ? "/merchant/wallet" : "/wallet"}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60 transition-all group"
                            title="Open InTrust Wallet"
                        >
                            <div className="flex flex-col text-left">
                                <span className="text-[9px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider leading-none">Wallet</span>
                                <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                                    ₹{activeWalletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <span className="p-1 rounded-lg bg-blue-600 text-white group-hover:scale-105 transition-transform">
                                <Plus size={12} />
                            </span>
                        </Link>

                        {/* Real-time Notification Bell */}
                        <NotificationBell apiPath="/api/notifications" variant="navbar" />

                        {/* City Chip */}
                        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200/60 dark:border-slate-700/60">
                            <MapPin size={14} className="text-blue-600 dark:text-blue-400" />
                            <span>Bhopal, MP</span>
                        </div>

                        {/* Profile Badge Pill */}
                        <div className="flex items-center gap-2.5 pl-2 py-1 pr-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs overflow-hidden">
                                {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                                    <Image 
                                        src={profile?.avatar_url || user?.user_metadata?.avatar_url} 
                                        alt={displayName} 
                                        fill 
                                        className="object-cover" 
                                    />
                                ) : (
                                    <span>{initials}</span>
                                )}
                            </div>
                            <div className="hidden sm:flex flex-col text-left leading-none">
                                <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[120px]">
                                    {displayName}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                                    {isMerchant ? 'Merchant' : 'Customer'}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content Body */}
                <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 min-w-0 pb-28 lg:pb-8">
                    {children}
                </main>

                {/* Responsive Mobile Bottom Navigation */}
                <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 z-40 px-2 py-1.5 pb-[calc(6px+env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-lg">
                    <Link
                        href="/marketing"
                        className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-extrabold ${
                            pathname === '/marketing' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'
                        }`}
                    >
                        <LayoutDashboard size={18} />
                        <span className="mt-0.5">Overview</span>
                    </Link>
                    <Link
                        href="/marketing/products"
                        className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-extrabold ${
                            pathname.startsWith('/marketing/products') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'
                        }`}
                    >
                        <ShoppingBag size={18} />
                        <span className="mt-0.5">Products</span>
                    </Link>
                    <Link
                        href="/marketing/daily-challenge"
                        className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-extrabold relative ${
                            pathname.startsWith('/marketing/daily-challenge') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'
                        }`}
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center -mt-3 shadow-md shadow-blue-600/30">
                            <Trophy size={16} />
                        </div>
                        <span className="mt-0.5">Challenge</span>
                    </Link>
                    <Link
                        href="/marketing/targets"
                        className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-extrabold ${
                            pathname.startsWith('/marketing/targets') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'
                        }`}
                    >
                        <Target size={18} />
                        <span className="mt-0.5">Targets</span>
                    </Link>
                    <Link
                        href="/marketing/analytics"
                        className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-extrabold ${
                            pathname.startsWith('/marketing/analytics') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'
                        }`}
                    >
                        <BarChart3 size={18} />
                        <span className="mt-0.5">Analytics</span>
                    </Link>
                </nav>
            </div>

            <ConfirmModal
                isOpen={showLogoutModal}
                onConfirm={confirmLogout}
                onCancel={() => setShowLogoutModal(false)}
                title="Confirm Logout"
                message="Are you sure you want to log out from your InTrust account?"
                confirmLabel="Logout"
                cancelLabel="Cancel"
            />
        </div>
    );
}
