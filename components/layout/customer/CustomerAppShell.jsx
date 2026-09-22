'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { 
    LayoutGrid, 
    LayoutDashboard,
    ShoppingBag, 
    ShoppingCart,
    Package, 
    Trophy, 
    Gift, 
    Users, 
    Heart, 
    Layers, 
    MapPin, 
    Wallet, 
    Plus, 
    Sun, 
    Moon, 
    Menu, 
    X, 
    Store, 
    ShieldCheck, 
    User,
    Sparkles,
    Receipt,
    History,
    Crown,
    LogOut,
    LogIn,
    FileText,
    Lock,
    Truck,
    RefreshCcw,
    ChevronDown,
    Briefcase
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';

import Image from 'next/image';
import NotificationBell from '@/components/notifications/NotificationBell';
import ConfirmModal from '@/components/ui/ConfirmModal';
import SwitchPortalSection from '@/components/layout/shared/SwitchPortalSection';
import { useCollapsibleNav } from '@/hooks/useCollapsibleNav';

const PUBLIC_HREFS = ['/', '/shop', '/shop/cart', '/about', '/contact', '/services', '/solar', '/nfc-service', '/gift-cards', '/merchant-apply', '/legal', '/search', '/career'];

const NAV_GROUPS = [
    {
        title: 'Explore & Marketplace',
        items: [
            { label: 'Home', href: '/', icon: Store },
            { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { label: 'Shop & Stores', href: '/shop', icon: ShoppingBag, badge: 'Deals' },
            { label: 'My Cart', href: '/shop/cart', icon: ShoppingCart, isCart: true },
            { label: 'Wishlist', href: '/wishlist', icon: Heart, isWishlist: true },
        ]
    },
    {
        title: 'Fintech & Wallet',
        items: [
            { label: 'InTrust Wallet', href: '/wallet', icon: Wallet, isWallet: true },
            { label: 'Store Credit (Udhari)', href: '/store-credits', icon: Receipt },
            { label: 'Passbook & Activity', href: '/transactions', icon: History },
            { label: 'My Gift Cards', href: '/gift-cards', icon: Gift },
        ]
    },
    {
        title: 'Services & Green Solutions',
        items: [
            { label: 'Services Hub', href: '/services', icon: Layers },
            { label: 'Solar Solutions', href: '/solar', icon: Sparkles },
            { label: 'Smart NFC Solutions', href: '/nfc-service', icon: ShieldCheck },
        ]
    },
    {
        title: 'Rewards & Growth',
        items: [
            { label: 'Rewards & Coins', href: '/rewards', icon: Trophy },
            { label: 'Daily Quiz & Earn', href: '/marketing/daily-challenge', icon: Sparkles, badge: 'Win ₹' },
            { label: 'Refer & Earn', href: '/refer', icon: Users, badge: '₹50' },
            { label: 'Champions Rank', href: '/rewards/leaderboard', icon: Crown },
        ]
    },
    {
        title: 'Company & Support',
        items: [
            { label: 'About Us', href: '/about', icon: Users },
            { label: 'Contact Support', href: '/contact', icon: MapPin },
            { label: 'Orders & Tracking', href: '/orders', icon: Package },
            { label: 'Profile & KYC', href: '/profile', icon: User },
            { label: 'Careers', href: '/career', icon: Briefcase, badge: 'Hiring' },
            { label: 'Partner / Merchant Apply', href: '/merchant-apply', icon: Store, badge: 'Join' },
        ]
    },
    {
        title: 'Legal & Policies',
        items: [
            { label: 'Terms & Conditions', href: '/legal?tab=terms', icon: FileText },
            { label: 'Privacy Policy', href: '/legal?tab=privacy', icon: Lock },
            { label: 'Shipping & Delivery', href: '/legal?tab=shipping', icon: Truck },
            { label: 'Refund Policy', href: '/legal?tab=refund', icon: RefreshCcw },
        ]
    }
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

export default function CustomerAppShell({ children, fullWidth = false }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, profile, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [cartCount, setCartCount] = useState(0);
    const [wishlistCount, setWishlistCount] = useState(0);

    const activeGroupTitle = NAV_GROUPS.find(g => g.items.some(item => 
        item.href === '/' ? pathname === '/' : (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)))
    ))?.title || 'Explore & Marketplace';

    const { isOpen: isGroupOpen, toggleGroup } = useCollapsibleNav({
        storageKey: 'intrust:customer:sidebar-groups-v2',
        groupTitles: NAV_GROUPS.map(g => g.title),
        activeGroupTitle
    });

    const isDarkMode = theme === 'dark';
    const isGuest = !user;
    const isCartPage = pathname === '/shop/cart';
    const isPDP = pathname.startsWith('/shop/product');
    const hideBottomNav = isCartPage || isPDP;

    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);

    const triggerLogoutConfirm = () => {
        setShowLogoutModal(true);
    };

    const confirmSignOut = async () => {
        try {
            setIsSigningOut(true);
            await signOut();
            // Navigate, then purge the Next.js client-side Router Cache so cached
            // Server Component payloads rendered under the old session are dropped
            // instantly — no stale "logged in" UI, no manual browser refresh needed.
            router.push('/login');
            router.refresh();
        } catch (e) {
            console.error('Sign out error:', e);
            router.push('/login');
            router.refresh();
        } finally {
            setIsSigningOut(false);
            setShowLogoutModal(false);
        }
    };

    // Real-time Wallet Balance, Cart Count & Wishlist Count Listener
    useEffect(() => {
        if (!user) return;

        const fetchWalletAndCart = async () => {
            try {
                // Wallet
                const { data: walletData } = await supabase
                    .from('customer_wallets')
                    .select('balance_paise')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (walletData) {
                    setWalletBalance((walletData.balance_paise || 0) / 100);
                }

                // Cart count
                const { data: cartData } = await supabase
                    .from('shopping_cart')
                    .select('id, quantity')
                    .eq('customer_id', user.id);

                if (cartData) {
                    const totalItems = cartData.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
                    setCartCount(totalItems);
                }

                // Wishlist count
                const { count: wishCount } = await supabase
                    .from('user_wishlists')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);

                if (wishCount !== null && wishCount !== undefined) {
                    setWishlistCount(wishCount);
                }
            } catch (err) {
                console.error('Shell data fetch error:', err);
            }
        };

        fetchWalletAndCart();

        // Listen for wallet changes
        const walletChannel = supabase
            .channel(`customer_shell_wallet_${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'customer_wallets', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    if (payload.new && payload.new.balance_paise !== undefined) {
                        setWalletBalance(payload.new.balance_paise / 100);
                    }
                }
            )
            .subscribe();

        // Listen for cart changes
        const cartChannel = supabase
            .channel(`customer_shell_cart_${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'shopping_cart', filter: `customer_id=eq.${user.id}` },
                () => {
                    fetchWalletAndCart();
                }
            )
            .subscribe();

        // Listen for wishlist changes
        const wishlistChannel = supabase
            .channel(`customer_shell_wishlist_${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'user_wishlists', filter: `user_id=eq.${user.id}` },
                () => {
                    fetchWalletAndCart();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(walletChannel);
            supabase.removeChannel(cartChannel);
            supabase.removeChannel(wishlistChannel);
        };
    }, [user]);

    // Close mobile drawer on route change
    const [prevPathname, setPrevPathname] = useState(pathname);
    if (prevPathname !== pathname) {
        setPrevPathname(pathname);
        if (mobileMenuOpen) {
            setMobileMenuOpen(false);
        }
    }

    // Scroll to top on route change across all customer pages (unless hash anchor is present)
    useEffect(() => {
        if (typeof window !== 'undefined' && !window.location.hash) {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
    }, [pathname]);

    const isKycVerified = profile?.kyc_status === 'verified' || profile?.kyc_status === 'approved';
    const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member';
    const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
    const initials = (userName || 'U')
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'U';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-surface text-slate-900 dark:text-on-surface flex relative antialiased selection:bg-primary/20">
            {/* ── MOBILE OVERLAY ── */}
            <div
                className={`fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-sm transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setMobileMenuOpen(false)}
            />

            {/* ── UNIFIED SIDEBAR (desktop fixed + mobile slide-in) ── */}
            <aside
                className={`fixed top-0 left-0 bottom-0 h-[100dvh] max-h-[100dvh] w-[280px] max-w-[88vw] bg-white dark:bg-[#0f1117] border-r border-black/[0.06] dark:border-white/[0.06] flex flex-col z-[70] transition-transform duration-300 ease-[cubic-bezier(0.3,1,0.3,1)] shadow-[2px_0_24px_rgba(0,0,0,0.06)] overflow-hidden ${
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
            >
                {/* ── SCROLLABLE NAV AREA ── */}
                <div className="flex flex-col flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden min-h-0">

                    {/* ── Brand Header ── */}
                    <div className="h-[64px] px-5 flex items-center gap-3 border-b border-black/[0.06] dark:border-white/[0.05] shrink-0">
                        <Link href={isGuest ? '/shop' : '/dashboard'} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 group min-w-0">
                            <div className="relative w-8 h-8 shrink-0">
                                <Image src="/icons/intrustLogo.png" alt="InTrust" fill className="object-contain" priority />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-black text-[17px] tracking-tight text-slate-900 dark:text-white leading-none">InTrust</span>
                                <span className="text-[9.5px] font-bold text-slate-400 dark:text-white/35 uppercase tracking-[0.12em] leading-none mt-0.5">
                                    {isGuest ? 'Commerce' : 'Customer'}
                                </span>
                            </div>
                        </Link>
                        {/* Close button (mobile only) */}
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="lg:hidden ml-auto w-8 h-8 rounded-xl flex items-center justify-center bg-black/[0.05] dark:bg-white/[0.06] text-slate-500 dark:text-white/50 hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition-colors shrink-0"
                        >
                            <X size={17} />
                        </button>
                        {/* Live dot (desktop only) */}
                        <span className="hidden lg:flex ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50 shrink-0" />
                    </div>

                    {/* ── Navigation Groups ── */}
                    <nav className="flex-1 px-3 py-3 space-y-1">
                        {NAV_GROUPS.map((group, gIdx) => {
                            const isOpen = isGroupOpen(group.title);
                            return (
                                <div key={gIdx} className="mb-0.5">
                                    {/* Section label button */}
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(group.title)}
                                        className="w-full px-2.5 py-1.5 flex items-center justify-between text-left rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors group/header"
                                    >
                                        <span className="text-[9.5px] font-black uppercase tracking-[0.14em] text-slate-400 group-hover/header:text-slate-600 dark:text-white/30 dark:group-hover/header:text-white/60 transition-colors">
                                            {group.title}
                                        </span>
                                        <ChevronDown 
                                            size={13} 
                                            className={`text-slate-400 dark:text-white/30 transition-transform duration-200 ${
                                                isOpen ? 'rotate-180' : ''
                                            }`} 
                                        />
                                    </button>

                                    {/* Items */}
                                    {isOpen && (
                                        <div className="space-y-0.5 mt-0.5 animate-in fade-in duration-150">
                                            {group.items.map((item) => {
                                                const Icon = item.icon;
                                                const baseHref = item.href.split('?')[0];
                                                const destHref = isGuest && !PUBLIC_HREFS.includes(baseHref)
                                                    ? `/login?next=${encodeURIComponent(item.href)}`
                                                    : item.href;
                                                const isActive = item.href === '/'
                                                    ? pathname === '/'
                                                    : (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)));

                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={destHref}
                                                        onClick={() => setMobileMenuOpen(false)}
                                                        className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150 ${
                                                            isActive
                                                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25 font-bold'
                                                                : 'text-slate-600 dark:text-white/55 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <Icon
                                                                size={15}
                                                                strokeWidth={isActive ? 2.5 : 2}
                                                                className={isActive ? 'text-white' : 'text-slate-400 dark:text-white/40 group-hover:text-slate-600 dark:group-hover:text-white/70 transition-colors'}
                                                            />
                                                            <span className="leading-none truncate">{item.label}</span>
                                                        </div>
                                                        {/* Badges */}
                                                        {item.isCart && cartCount > 0 ? (
                                                            <span className={`text-[9.5px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 ${
                                                                isActive ? 'bg-white/25 text-white' : 'bg-rose-500 text-white'
                                                            }`}>{cartCount}</span>
                                                        ) : item.isWishlist && wishlistCount > 0 ? (
                                                            <span className={`text-[9.5px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 ${
                                                                isActive ? 'bg-white/25 text-white' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-400/30'
                                                            }`}>{wishlistCount}</span>
                                                        ) : item.badge ? (
                                                            <span className={`text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                                                                isActive
                                                                    ? 'bg-white/20 text-white'
                                                                    : 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                            }`}>{item.badge}</span>
                                                        ) : null}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>
                </div>

                {/* ── Sidebar Footer ── */}
                <div className="p-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-3 border-t border-black/[0.06] dark:border-white/[0.06] shrink-0 space-y-2 bg-white/95 dark:bg-[#0f1117]/95 backdrop-blur-md">
                    <SwitchPortalSection
                        currentPortal="customer"
                        role={profile?.role}
                        isMerchant={profile?.role === 'merchant'}
                        isAdmin={profile?.role === 'admin' || profile?.role === 'super_admin'}
                        isSuperAdmin={profile?.role === 'super_admin'}
                        onNavigate={() => setMobileMenuOpen(false)}
                    />

                    {!isGuest ? (
                        <div className="bg-slate-50 dark:bg-white/[0.04] p-2.5 rounded-2xl flex items-center justify-between border border-black/[0.06] dark:border-white/[0.06] shadow-2xs transition-all hover:shadow-xs">
                            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden bg-blue-100 dark:bg-slate-800 flex items-center justify-center shrink-0 relative">
                                    {avatarUrl ? (
                                        <Image
                                            src={avatarUrl}
                                            alt={userName}
                                            fill
                                            sizes="32px"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                                            {initials}
                                        </span>
                                    )}
                                </div>
                                <div className="overflow-hidden flex-1 leading-tight">
                                    <p className="text-[11px] font-black truncate text-slate-800 dark:text-white uppercase tracking-tight">
                                        {userName}
                                    </p>
                                    <Link 
                                        href="/profile" 
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="text-[9px] text-slate-500 dark:text-slate-400 truncate block hover:text-blue-600 dark:hover:text-blue-400 font-bold transition-colors uppercase tracking-widest mt-0.5"
                                    >
                                        {isKycVerified ? 'Verified Profile' : 'View Profile'}
                                    </Link>
                                </div>
                            </div>

                            <button
                                onClick={triggerLogoutConfirm}
                                disabled={isSigningOut}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0 ml-1"
                                title="Log out"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="bg-slate-50 dark:bg-white/[0.04] p-2 rounded-2xl flex items-center gap-2 border border-black/[0.06] dark:border-white/[0.06]">
                            <Link
                                href={`/login?next=${encodeURIComponent(pathname)}`}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold text-center transition-colors shadow-xs"
                            >
                                Sign In
                            </Link>
                            <Link
                                href="/signup"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex-1 py-2 rounded-xl bg-white dark:bg-white/[0.07] text-slate-700 dark:text-white/80 text-[11px] font-bold text-center border border-black/[0.08] dark:border-white/[0.08] transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.1]"
                            >
                                Sign Up
                            </Link>
                        </div>
                    )}
                </div>
            </aside>

            {/* ── MAIN CONTENT CONTAINER ── */}
            <div className="flex-1 flex flex-col min-h-screen lg:pl-[280px] w-full">
                {/* ── DESKTOP HEADER ── */}
                <header className="hidden lg:flex fixed top-0 left-[280px] right-0 h-20 bg-white/80 dark:bg-[#0f1117]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08] z-30 px-8 items-center justify-between gap-6 shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
                    {/* Header Title / Breadcrumb */}
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                        <div>
                            <h2 className="text-sm font-black text-slate-900 dark:text-on-surface tracking-tight leading-none">
                                {(() => {
                                    if (pathname === '/') return 'Home & Marketplace';
                                    if (pathname === '/about') return 'About InTrust';
                                    if (pathname === '/contact') return 'Contact & Support';
                                    if (pathname === '/legal') return 'Legal & Compliance';
                                    if (pathname === '/search') return 'Search Products';
                                    if (pathname === '/coming-soon') return 'Coming Soon';
                                    if (pathname.startsWith('/shop/category')) return 'Categories';
                                    if (pathname.startsWith('/shop/product')) return 'Product Details';
                                    if (pathname.startsWith('/shop')) return 'InTrust Shop';
                                    const found = ALL_NAV_ITEMS.find(n => n.href === pathname);
                                    if (found) return found.label;
                                    return isGuest ? 'InTrust India' : 'Customer Panel';
                                })()}
                            </h2>
                            <p className="text-[11px] text-slate-400 dark:text-brand-steel font-bold mt-0.5">
                                InTrust India • Verified Commerce Platform
                            </p>
                        </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-3.5 shrink-0">
                        {/* Cart Button */}
                        <Link
                            href="/shop/cart"
                            className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-container-low dark:hover:bg-surface-container-high text-slate-700 dark:text-on-surface-variant transition-colors border border-slate-200/50 dark:border-outline-variant/10"
                            title="Shopping Cart"
                        >
                            <ShoppingCart size={18} />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                                    {cartCount}
                                </span>
                            )}
                        </Link>

                        {/* Location Chip */}
                        <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-container-low dark:hover:bg-surface-container-high text-slate-700 dark:text-on-surface text-xs font-semibold cursor-pointer transition-colors border border-slate-200/50 dark:border-outline-variant/10">
                            <MapPin size={15} className="text-blue-600 dark:text-primary" />
                            <span>India</span>
                        </div>

                        {/* Wallet Balance Pill (Only for Authenticated Users) */}
                        {!isGuest && (
                            <Link
                                href="/wallet"
                                className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-container-low dark:hover:bg-surface-container-high border border-slate-200 dark:border-outline-variant/20 transition-all group"
                            >
                                <div className="flex flex-col text-left">
                                    <span className="text-[9px] font-extrabold uppercase text-slate-500 dark:text-brand-steel tracking-wider">InTrust Wallet</span>
                                    <span className="text-xs font-black text-slate-900 dark:text-on-surface tabular-nums">
                                        ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <span className="p-1.5 rounded-lg bg-blue-600 dark:bg-primary text-white group-hover:scale-105 transition-transform">
                                    <Plus size={13} />
                                </span>
                            </Link>
                        )}

                        {/* Theme Toggle Button */}
                        <button
                            onClick={(e) => toggleTheme(e)}
                            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-container-low dark:hover:bg-surface-container-high text-slate-700 dark:text-on-surface-variant hover:text-slate-950 dark:hover:text-on-surface flex items-center justify-center transition-all border border-slate-200/50 dark:border-outline-variant/10 active:scale-95"
                        >
                            {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700" />}
                        </button>

                        {/* Notification Bell (Only for Authenticated Users) */}
                        {!isGuest && (
                            <NotificationBell apiPath="/api/notifications" variant="navbar" />
                        )}

                        {/* User Profile / Guest Login Action */}
                        {isGuest ? (
                            <div className="flex items-center gap-2.5">
                                <Link
                                    href={`/login?next=${encodeURIComponent(pathname)}`}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all shadow-md shadow-blue-500/20 active:scale-95"
                                >
                                    <LogIn size={15} />
                                    <span>Login</span>
                                </Link>
                                <Link
                                    href="/signup"
                                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-container-high text-slate-800 dark:text-on-surface text-xs font-bold transition-all border border-slate-200/60 dark:border-outline-variant/20"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/profile"
                                    className="flex items-center gap-2.5 pl-1.5 group cursor-pointer"
                                >
                                    <div className="w-9 h-9 rounded-full ring-2 ring-blue-500/20 group-hover:ring-blue-500 overflow-hidden flex items-center justify-center bg-slate-200 dark:bg-surface-container-high text-slate-800 dark:text-on-surface font-black text-xs transition-all">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                                        ) : (
                                            <span>{userName[0]?.toUpperCase() || 'U'}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-xs font-bold text-slate-800 dark:text-on-surface group-hover:text-blue-600 dark:group-hover:text-primary transition-colors leading-tight">{userName}</span>
                                        <span className="text-[10px] font-semibold text-slate-500 dark:text-brand-steel">
                                            {profile?.kyc_status === 'verified' ? 'Verified Account' : 'Standard Account'}
                                        </span>
                                    </div>
                                </Link>
                                <button
                                    onClick={triggerLogoutConfirm}
                                    title="Sign Out"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors ml-1"
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* ── MOBILE HEADER ── */}
                <header className="lg:hidden sticky top-0 bg-white/95 dark:bg-[#0f1117]/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08] z-30">
                    <div className="h-16 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setMobileMenuOpen(true)}
                                aria-label="Open Navigation Menu"
                                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-800 dark:text-white active:scale-95"
                            >
                                <Menu size={19} />
                            </button>
                            <Link href={isGuest ? "/" : "/dashboard"} className="flex items-center gap-2">
                                <div className="relative w-8 h-8 rounded-xl bg-white dark:bg-white/10 p-1 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-xs overflow-hidden">
                                    <Image src="/icons/intrustLogo.png" alt="InTrust" width={24} height={24} className="object-contain" priority />
                                </div>
                                <span className="font-black text-base tracking-tight text-slate-900 dark:text-white">InTrust</span>
                            </Link>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Cart */}
                            <Link
                                href="/shop/cart"
                                aria-label="Shopping Cart"
                                className="relative w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-700 dark:text-white/80"
                            >
                                <ShoppingCart size={16} />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>

                            {/* Notification Bell on Mobile */}
                            {!isGuest && (
                                <NotificationBell
                                    apiPath="/api/notifications"
                                    variant="navbar"
                                    className="relative w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-700 dark:text-white/80"
                                />
                            )}

                            {/* Theme Toggle */}
                            <button
                                onClick={(e) => toggleTheme(e)}
                                aria-label="Toggle Theme"
                                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-800 dark:text-white active:scale-95"
                            >
                                {isDarkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
                            </button>

                            {/* Mobile Auth / Profile / Login Button */}
                            {!isGuest ? (
                                <Link href="/profile" className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-blue-500/20 flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{initials}</span>
                                    )}
                                </Link>
                            ) : (
                                <Link
                                    href={`/login?next=${encodeURIComponent(pathname)}`}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs transition-all active:scale-95"
                                >
                                    <LogIn size={13} />
                                    <span>Login</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                {/* ── PAGE VIEWPORT CONTENT ── */}
                <main className={`flex-1 w-full pt-3 sm:pt-4 lg:pt-24 ${
                    fullWidth 
                        ? 'p-0 max-w-none' 
                        : `px-4 lg:px-8 ${hideBottomNav ? 'pb-6 lg:pb-16' : 'pb-[calc(76px+env(safe-area-inset-bottom,0px))] lg:pb-16'} max-w-7xl mx-auto`
                }`}>
                    {children}
                </main>

                {/* ── MOBILE STICKY BOTTOM NAVIGATION BAR ── */}
                {!hideBottomNav && (
                    <nav 
                        aria-label="Mobile Bottom Navigation"
                        className="lg:hidden fixed bottom-0 left-0 right-0 h-[calc(60px+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] bg-white/95 dark:bg-[#0f1117]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/[0.08] z-40 px-2 flex items-center justify-around shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
                    >
                        {[
                            { label: isGuest ? 'Explore' : 'Dashboard', href: isGuest ? '/' : '/dashboard', icon: isGuest ? Store : LayoutGrid },
                            { label: 'Shop', href: '/shop', icon: ShoppingBag },
                            { label: 'Orders', href: isGuest ? `/login?next=${encodeURIComponent('/orders')}` : '/orders', icon: Package },
                            { label: 'Wallet', href: isGuest ? `/login?next=${encodeURIComponent('/wallet')}` : '/wallet', icon: Wallet },
                            { label: isGuest ? 'Login' : 'Profile', href: isGuest ? `/login?next=${encodeURIComponent(pathname)}` : '/profile', icon: isGuest ? LogIn : User },
                        ].map((item) => {
                            const Icon = item.icon;
                            const isActive = item.href === '/'
                                ? pathname === '/'
                                : item.href === '/shop'
                                    ? pathname === '/shop' || pathname.startsWith('/shop/category')
                                    : item.href === '/dashboard'
                                        ? pathname === '/dashboard'
                                        : pathname === item.href || (item.href !== '/dashboard' && item.href !== '/shop' && pathname.startsWith(item.href));

                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={`flex flex-col items-center justify-center flex-1 h-full relative transition-all duration-150 active:scale-95 ${
                                        isActive 
                                            ? 'text-blue-600 dark:text-blue-400 font-bold' 
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                                    }`}
                                >
                                    <div className={`p-1 rounded-xl transition-all duration-200 ${
                                        isActive ? 'bg-blue-50 dark:bg-blue-950/50 scale-105' : ''
                                    }`}>
                                        <Icon size={19} strokeWidth={isActive ? 2.5 : 1.9} />
                                    </div>
                                    <span className="text-[10px] leading-tight mt-0.5 tracking-tight truncate max-w-[62px]">
                                        {item.label}
                                    </span>
                                    {isActive && (
                                        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                )}
            </div>

            {/* Sign Out Confirmation Modal */}
            <ConfirmModal
                isOpen={showLogoutModal}
                title="Sign Out Confirmation"
                message="Are you sure you want to log out of InTrust India? You can always log back in anytime."
                confirmLabel={isSigningOut ? "Signing Out..." : "Yes, Sign Out"}
                cancelLabel="Stay Logged In"
                onConfirm={confirmSignOut}
                onCancel={() => setShowLogoutModal(false)}
                isDestructive={true}
            />
        </div>
    );
}
