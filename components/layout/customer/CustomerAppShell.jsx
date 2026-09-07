'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutGrid, 
    ShoppingBag, 
    ShoppingCart,
    Package, 
    Trophy, 
    Gift, 
    Users, 
    Heart, 
    Layers, 
    Settings, 
    MapPin, 
    Wallet, 
    Plus, 
    Bell, 
    Sun, 
    Moon, 
    Menu, 
    X, 
    ChevronRight, 
    Store, 
    ShieldCheck, 
    User,
    Sparkles,
    Receipt,
    History,
    Crown,
    LogOut,
    LogIn,
    BadgeCheck,
    Check
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import NotificationBell from '@/components/notifications/NotificationBell';
import ConfirmModal from '@/components/ui/ConfirmModal';

const NAV_GROUPS = [
    {
        title: 'Explore & Shop',
        items: [
            { label: 'Overview', href: '/dashboard', icon: LayoutGrid },
            { label: 'Shop & Stores', href: '/shop', icon: ShoppingBag, badge: 'Deals' },
            { label: 'My Cart', href: '/shop/cart', icon: ShoppingCart, isCart: true },
            { label: 'Wishlist', href: '/wishlist', icon: Heart },
        ]
    },
    {
        title: 'Fintech & Wallet',
        items: [
            { label: 'InTrust Wallet', href: '/wallet', icon: Wallet, isWallet: true },
            { label: 'Store Credit (Udhari)', href: '/store-credits', icon: Receipt },
            { label: 'Passbook & Activity', href: '/transactions', icon: History },
            { label: 'My Gift Cards', href: '/my-giftcards', icon: Gift },
        ]
    },
    {
        title: 'Rewards & Growth',
        items: [
            { label: 'Rewards & Coins', href: '/rewards', icon: Trophy },
            { label: 'Refer & Earn', href: '/refer', icon: Users, badge: '₹50' },
            { label: 'Champions Rank', href: '/rewards/leaderboard', icon: Crown },
        ]
    },
    {
        title: 'Account & Services',
        items: [
            { label: 'Services Hub', href: '/services', icon: Layers },
            { label: 'Orders & Tracking', href: '/orders', icon: Package },
            { label: 'Settings', href: '/settings', icon: Settings },
            { label: 'Profile & KYC', href: '/profile', icon: User },
            { label: 'Partner / Merchant Apply', href: '/merchant-apply', icon: Store, badge: 'Join' },
        ]
    }
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

export default function CustomerAppShell({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, profile, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [cartCount, setCartCount] = useState(0);

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
            window.location.href = '/login';
        } catch (e) {
            console.error('Sign out error:', e);
            window.location.href = '/login';
        } finally {
            setIsSigningOut(false);
            setShowLogoutModal(false);
        }
    };

    // Real-time Wallet Balance & Cart Count Listener
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

        return () => {
            supabase.removeChannel(walletChannel);
            supabase.removeChannel(cartChannel);
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

    const isKycVerified = profile?.kyc_status === 'verified' || profile?.kyc_status === 'approved';
    const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member';
    const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-surface text-slate-900 dark:text-on-surface flex relative antialiased selection:bg-primary/20">
            {/* ── DESKTOP SIDEBAR DRAWER ── */}
            <aside className="hidden lg:flex fixed left-0 top-0 h-full w-72 bg-white dark:bg-surface-container-lowest border-r border-slate-200 dark:border-outline-variant/30 z-50 flex-col justify-between shadow-[0_2px_16px_rgba(0,0,0,0.03)] overflow-hidden">
                <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {/* Brand Header */}
                    <div className="h-20 px-6 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-outline-variant/20 shrink-0">
                        <Link href={isGuest ? "/shop" : "/dashboard"} className="flex items-center gap-3 group">
                            <div className="relative w-10 h-10 rounded-2xl bg-white dark:bg-white/10 p-1 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
                                <Image src="/icons/intrustLogo.png" alt="InTrust Logo" width={32} height={32} className="object-contain" priority />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-xl tracking-tight text-slate-900 dark:text-on-surface">InTrust</span>
                                <span className="text-[10px] font-bold text-slate-500 dark:text-brand-steel uppercase tracking-widest">{isGuest ? 'Unified Commerce' : 'Customer Portal'}</span>
                            </div>
                        </Link>
                    </div>

                    {/* Member Tier Card / Guest Welcome */}
                    <div className="px-5 py-3.5">
                        {isGuest ? (
                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-container-low border border-slate-200 dark:border-outline-variant/20 flex flex-col gap-2 shadow-xs">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-primary">
                                        <User size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 dark:text-brand-steel uppercase tracking-wider">Welcome Guest</span>
                                        <span className="text-xs font-bold text-slate-700 dark:text-on-surface">Explore Local Stores</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <Link
                                        href={`/login?next=${encodeURIComponent(pathname)}`}
                                        className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold text-center transition-colors shadow-xs"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="flex-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-container-high text-slate-800 dark:text-on-surface text-[11px] font-bold text-center transition-colors border border-slate-200 dark:border-outline-variant/20"
                                    >
                                        Sign Up
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-surface-container-low border border-slate-200 dark:border-outline-variant/20 flex items-center justify-between shadow-xs">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="relative w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-black text-blue-600 text-xs overflow-hidden shrink-0">
                                        {avatarUrl ? (
                                            <Image src={avatarUrl} alt={userName} fill className="object-cover" />
                                        ) : (
                                            userName.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-xs font-black text-slate-900 dark:text-on-surface truncate">{userName}</span>
                                            {isKycVerified && (
                                                <span title="KYC Verified" className="inline-flex shrink-0">
                                                    <svg className="w-4 h-4 text-blue-600 fill-blue-600 shrink-0" viewBox="0 0 24 24">
                                                        <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                                    </svg>
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-bold truncate ${isKycVerified ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-brand-steel'}`}>
                                            {isKycVerified ? 'Verified Member' : 'KYC Pending'}
                                        </span>
                                    </div>
                                </div>
                                {isKycVerified ? (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-xs shrink-0 flex items-center gap-0.5">
                                        <Check size={10} strokeWidth={3} /> Verified
                                    </span>
                                ) : (
                                    <Link href="/profile" className="text-[9px] font-bold text-amber-600 dark:text-amber-400 hover:underline shrink-0">
                                        Verify
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Structured Navigation Groups */}
                    <nav className="flex-1 px-4 py-1 space-y-4">
                        {NAV_GROUPS.map((group, gIdx) => (
                            <div key={gIdx} className="space-y-1">
                                <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-brand-steel">
                                    {group.title}
                                </div>
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const destHref = isGuest && item.href !== '/shop' && item.href !== '/shop/cart'
                                        ? `/login?next=${encodeURIComponent(item.href)}`
                                        : item.href;
                                    const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/shop' && pathname.startsWith(item.href));

                                    return (
                                        <Link
                                            key={item.href}
                                            href={destHref}
                                            className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                                                isActive
                                                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                                                    : 'text-slate-600 dark:text-on-surface-variant hover:bg-slate-100 dark:hover:bg-surface-container-low hover:text-slate-900 dark:hover:text-on-surface'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon size={17} className={isActive ? 'text-white' : 'text-slate-400 dark:text-brand-steel'} />
                                                <span>{item.label}</span>
                                            </div>
                                            
                                            {/* Badges */}
                                            {item.isCart && cartCount > 0 ? (
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                    isActive 
                                                        ? 'bg-white/20 text-white' 
                                                        : 'bg-rose-500 text-white'
                                                }`}>
                                                    {cartCount}
                                                </span>
                                            ) : item.badge ? (
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                    isActive 
                                                        ? 'bg-white/20 text-white' 
                                                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                }`}>
                                                    {item.badge}
                                                </span>
                                            ) : null}
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>
                </div>

                {/* Bottom Merchant Banner & Logout */}
                <div className="p-4 border-t border-slate-200 dark:border-outline-variant/20 shrink-0 space-y-2.5">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-container-low border border-slate-200 dark:border-outline-variant/20 flex flex-col gap-2.5">
                        <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-primary flex items-center justify-center shrink-0 mt-0.5">
                                <Store size={16} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-on-surface">Become a Merchant</p>
                                <p className="text-[10px] text-slate-500 dark:text-on-surface-variant leading-snug mt-0.5">Sell locally in Bhopal with zero gateway fees.</p>
                            </div>
                        </div>
                        <Link
                            href="/merchant-apply"
                            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-on-surface dark:text-surface text-xs font-bold text-center transition-all shadow-xs"
                        >
                            Register Store
                        </Link>
                    </div>

                    {!isGuest && (
                        <button
                            onClick={triggerLogoutConfirm}
                            className="w-full py-2.5 px-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-red-200/60 dark:border-red-900/30 active:scale-[0.98]"
                        >
                            <LogOut size={15} />
                            <span>Sign Out</span>
                        </button>
                    )}
                </div>
            </aside>

            {/* ── MAIN CONTENT CONTAINER ── */}
            <div className="flex-1 flex flex-col min-h-screen lg:pl-72 w-full">
                {/* ── DESKTOP HEADER ── */}
                <header className="hidden lg:flex fixed top-0 left-72 right-0 h-20 bg-white/80 dark:bg-surface-container-lowest/80 backdrop-blur-xl border-b border-slate-200 dark:border-outline-variant/20 z-50 px-8 items-center justify-between gap-6 shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
                    {/* Header Title / Breadcrumb */}
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                        <div>
                            <h2 className="text-sm font-black text-slate-900 dark:text-on-surface tracking-tight leading-none">
                                {ALL_NAV_ITEMS.find(n => n.href === pathname)?.label || 'Customer Panel'}
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
                            <span>Bhopal, MP</span>
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
                                    href="/register"
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
                <header className="lg:hidden sticky top-0 bg-white/95 dark:bg-surface-container-lowest/90 backdrop-blur-xl border-b border-slate-200 dark:border-outline-variant/20 z-50">
                    <div className="h-16 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setMobileMenuOpen(true)}
                                aria-label="Open Navigation Menu"
                                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-surface-container-low flex items-center justify-center text-slate-800 dark:text-on-surface active:scale-95"
                            >
                                <Menu size={19} />
                            </button>
                            <Link href={isGuest ? "/shop" : "/dashboard"} className="flex items-center gap-2">
                                <div className="relative w-8 h-8 rounded-xl bg-white dark:bg-white/10 p-1 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-xs overflow-hidden">
                                    <Image src="/icons/intrustLogo.png" alt="InTrust" width={24} height={24} className="object-contain" priority />
                                </div>
                                <span className="font-black text-base tracking-tight text-slate-900 dark:text-on-surface">InTrust</span>
                            </Link>
                        </div>

                        <div className="flex items-center gap-2">

                            {/* Cart */}
                            <Link
                                href="/shop/cart"
                                aria-label="Shopping Cart"
                                className="relative w-8 h-8 rounded-xl bg-slate-100 dark:bg-surface-container-low flex items-center justify-center text-slate-700 dark:text-on-surface"
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
                                    className="relative w-8 h-8 rounded-xl bg-slate-100 dark:bg-surface-container-low flex items-center justify-center text-slate-700 dark:text-on-surface"
                                />
                            )}

                            {/* Theme Toggle */}
                            <button
                                onClick={(e) => toggleTheme(e)}
                                aria-label="Toggle Theme"
                                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-surface-container-low flex items-center justify-center text-slate-800 dark:text-on-surface"
                            >
                                {isDarkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
                            </button>

                            {/* Mobile Auth / Profile / Login Button */}
                            {!isGuest ? (
                                <Link href="/profile" className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-blue-500/20 flex items-center justify-center bg-slate-200 dark:bg-surface-container-high text-xs font-bold text-slate-800 dark:text-on-surface">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                                        ) : (
                                            <span>{userName[0]?.toUpperCase() || 'U'}</span>
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

                {/* ── MOBILE DRAWER OVERLAY ── */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setMobileMenuOpen(false)}
                                className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
                            />
                            <motion.div
                                initial={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="lg:hidden fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-surface-container-lowest z-[80] flex flex-col justify-between shadow-2xl p-5 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                            >
                                <div>
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-outline-variant/20 mb-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="relative w-9 h-9 rounded-xl bg-white dark:bg-white/10 p-1 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-xs overflow-hidden">
                                                <Image src="/icons/intrustLogo.png" alt="InTrust" width={26} height={26} className="object-contain" priority />
                                            </div>
                                            <div>
                                                <h3 className="font-extrabold text-base text-slate-900 dark:text-on-surface">InTrust</h3>
                                                <p className="text-[10px] text-slate-400 dark:text-brand-steel font-bold uppercase tracking-wider">Customer Portal</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-surface-container-low flex items-center justify-center text-slate-700 dark:text-on-surface"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {/* User Mini Card */}
                                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-container-low border border-slate-200 dark:border-outline-variant/20 mb-6">
                                        {isGuest ? (
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-600 dark:text-primary flex items-center justify-center">
                                                        <User size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-900 dark:text-on-surface">Welcome Guest</p>
                                                        <p className="text-[11px] text-slate-500 dark:text-brand-steel font-medium">Sign in to unlock all features</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Link
                                                        href={`/login?next=${encodeURIComponent(pathname)}`}
                                                        className="flex-1 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold text-center"
                                                    >
                                                        Sign In
                                                    </Link>
                                                    <Link
                                                        href="/register"
                                                        className="flex-1 py-1.5 rounded-xl bg-slate-200 dark:bg-surface-container-high text-slate-800 dark:text-on-surface text-xs font-bold text-center"
                                                    >
                                                        Sign Up
                                                    </Link>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-primary font-black flex items-center justify-center overflow-hidden border border-blue-500/20 shrink-0">
                                                        {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : userName[0]?.toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <p className="font-extrabold text-sm text-slate-900 dark:text-on-surface truncate">{userName}</p>
                                                            {isKycVerified && (
                                                                <span title="KYC Verified" className="inline-flex shrink-0">
                                                                    <svg className="w-4 h-4 text-blue-600 fill-blue-600 shrink-0" viewBox="0 0 24 24">
                                                                        <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                                                    </svg>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={`text-[11px] font-bold ${isKycVerified ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-brand-steel'}`}>
                                                            {isKycVerified ? 'Verified Member' : 'KYC Pending'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isKycVerified ? (
                                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shrink-0 flex items-center gap-0.5">
                                                        <Check size={10} strokeWidth={3} /> Verified
                                                    </span>
                                                ) : (
                                                    <Link href="/profile" className="text-[9px] font-bold text-amber-600 dark:text-amber-400 hover:underline shrink-0">
                                                        Verify
                                                    </Link>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Grouped Nav Items */}
                                    <nav className="space-y-4">
                                        {NAV_GROUPS.map((group, gIdx) => (
                                            <div key={gIdx} className="space-y-1">
                                                <div className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-brand-steel">
                                                    {group.title}
                                                </div>
                                                {group.items.map((item) => {
                                                    const Icon = item.icon;
                                                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                                                    return (
                                                        <Link
                                                            key={item.href}
                                                            href={item.href}
                                                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                                                isActive
                                                                    ? 'bg-blue-600 text-white shadow-md'
                                                                    : 'text-slate-600 dark:text-on-surface-variant hover:bg-slate-100 dark:hover:bg-surface-container-low hover:text-slate-900 dark:hover:text-on-surface'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <Icon size={17} className={isActive ? 'text-white' : 'text-slate-400 dark:text-brand-steel'} />
                                                                <span>{item.label}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {item.isCart && cartCount > 0 ? (
                                                                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                                                                        isActive ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'
                                                                    }`}>
                                                                        {cartCount}
                                                                    </span>
                                                                ) : item.badge ? (
                                                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                                                                        isActive ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600'
                                                                    }`}>
                                                                        {item.badge}
                                                                    </span>
                                                                ) : null}
                                                                <ChevronRight size={13} className="opacity-40" />
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </nav>
                                </div>

                                <div className="pt-4 border-t border-slate-200 dark:border-outline-variant/20 mt-4 space-y-2">
                                    <Link
                                        href="/merchant-apply"
                                        className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-on-surface dark:text-surface text-xs font-bold flex items-center justify-center gap-2 shadow-xs"
                                    >
                                        <Store size={15} />
                                        <span>Become an InTrust Merchant</span>
                                    </Link>
                                    {!isGuest && (
                                        <button
                                            onClick={triggerLogoutConfirm}
                                            className="w-full py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-red-200/60 dark:border-red-900/30 active:scale-[0.98]"
                                        >
                                            <LogOut size={14} />
                                            <span>Sign Out</span>
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* ── PAGE VIEWPORT CONTENT ── */}
                <main className="flex-1 w-full pt-4 lg:pt-24 px-4 lg:px-8 pb-[calc(84px+env(safe-area-inset-bottom,0px))] lg:pb-16 max-w-7xl mx-auto">
                    {children}
                </main>

                {/* ── MOBILE STICKY BOTTOM NAVIGATION BAR ── */}
                {!hideBottomNav && (
                    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[calc(68px+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,4px)] bg-white/95 dark:bg-surface-container-lowest/95 backdrop-blur-xl border-t border-slate-200 dark:border-outline-variant/20 z-40 px-3 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                        {[
                            { label: isGuest ? 'Explore' : 'Home', href: isGuest ? '/shop' : '/dashboard', icon: LayoutGrid },
                            { label: 'Shop', href: '/shop', icon: ShoppingBag },
                            { label: 'Orders', href: isGuest ? `/login?next=${encodeURIComponent('/orders')}` : '/orders', icon: Package },
                            { label: 'Wallet', href: isGuest ? `/login?next=${encodeURIComponent('/wallet')}` : '/wallet', icon: Wallet },
                            { label: isGuest ? 'Login' : 'Profile', href: isGuest ? `/login?next=${encodeURIComponent(pathname)}` : '/profile', icon: isGuest ? LogIn : User },
                        ].map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/shop' && pathname.startsWith(item.href));

                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={`flex flex-col items-center justify-center w-14 h-full relative transition-all ${
                                        isActive ? 'text-blue-600 dark:text-primary' : 'text-slate-400 dark:text-brand-steel hover:text-slate-700 dark:hover:text-on-surface'
                                    }`}
                                >
                                    <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50 dark:bg-primary/10 scale-110' : ''}`}>
                                        <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                                    </div>
                                    <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-black' : 'font-semibold'}`}>
                                        {item.label}
                                    </span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="bottomNavDot"
                                            className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-primary"
                                        />
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
