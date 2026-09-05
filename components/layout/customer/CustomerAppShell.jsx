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
    Search, 
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
    Crown
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

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

export default function CustomerAppShell({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, profile } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [walletBalance, setWalletBalance] = useState(0);
    const [cartCount, setCartCount] = useState(0);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Synchronize theme on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('intrust_theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDarkMode(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        if (isDarkMode) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('intrust_theme', 'light');
            setIsDarkMode(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('intrust_theme', 'dark');
            setIsDarkMode(true);
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
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member';
    const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-surface text-slate-900 dark:text-on-surface flex relative antialiased selection:bg-primary/20">
            {/* ── DESKTOP SIDEBAR DRAWER ── */}
            <aside className="hidden lg:flex fixed left-0 top-0 h-full w-72 bg-white dark:bg-surface-container-lowest border-r border-slate-200 dark:border-outline-variant/30 z-50 flex-col justify-between shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
                <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar">
                    {/* Brand Header */}
                    <div className="h-20 px-6 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-outline-variant/20 shrink-0">
                        <Link href="/dashboard" className="flex items-center gap-3 group">
                            <div className="relative w-10 h-10 rounded-2xl bg-white dark:bg-white/10 p-1 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
                                <Image src="/icons/intrustLogo.png" alt="InTrust Logo" width={32} height={32} className="object-contain" priority />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-xl tracking-tight text-slate-900 dark:text-on-surface">InTrust</span>
                                <span className="text-[10px] font-bold text-slate-500 dark:text-brand-steel uppercase tracking-widest">Customer Portal</span>
                            </div>
                        </Link>
                    </div>

                    {/* Member Tier Card */}
                    <div className="px-5 py-3.5">
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-surface-container-low border border-slate-200 dark:border-outline-variant/20 flex items-center justify-between shadow-xs">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#D4AF37]">
                                    <ShieldCheck size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 dark:text-brand-steel uppercase tracking-wider">Tier Status</span>
                                    <span className="text-xs font-bold text-amber-600 dark:text-[#D4AF37]">Gold Elite Member</span>
                                </div>
                            </div>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-[#D4AF37] border border-amber-500/30">
                                VIP
                            </span>
                        </div>
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
                                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
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

                {/* Bottom Merchant Banner */}
                <div className="p-4 border-t border-slate-200 dark:border-outline-variant/20 shrink-0">
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
                            className="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-on-surface dark:text-surface text-xs font-bold text-center transition-all shadow-xs"
                        >
                            Register Store
                        </Link>
                    </div>
                </div>
            </aside>

            {/* ── MAIN CONTENT CONTAINER ── */}
            <div className="flex-1 flex flex-col min-h-screen lg:pl-72 w-full">
                {/* ── DESKTOP HEADER ── */}
                <header className="hidden lg:flex fixed top-0 left-72 right-0 h-20 bg-white/80 dark:bg-surface-container-lowest/80 backdrop-blur-xl border-b border-slate-200 dark:border-outline-variant/20 z-40 px-8 items-center justify-between gap-6 shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
                    {/* Omnibox Search */}
                    <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg">
                        <div className="relative flex items-center w-full">
                            <Search size={17} className="absolute left-4 text-slate-400 dark:text-brand-steel pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search products, verified stores, electronics, brands..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 pl-11 pr-14 rounded-2xl bg-slate-100/80 dark:bg-surface-container-low text-slate-900 dark:text-on-surface text-sm placeholder:text-slate-400 dark:placeholder:text-brand-steel border border-slate-200/60 dark:border-transparent focus:border-blue-500 dark:focus:border-primary focus:bg-white dark:focus:bg-surface-container-lowest outline-none transition-all shadow-inner"
                            />
                            <div className="absolute right-3 px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-surface-container-high/60 text-slate-500 dark:text-brand-steel text-[11px] font-semibold pointer-events-none">
                                ⌘K
                            </div>
                        </div>
                    </form>

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

                        {/* Wallet Balance Pill */}
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

                        {/* Theme Toggle Button */}
                        <button
                            onClick={toggleTheme}
                            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-container-low dark:hover:bg-surface-container-high text-slate-700 dark:text-on-surface-variant hover:text-slate-950 dark:hover:text-on-surface flex items-center justify-center transition-all border border-slate-200/50 dark:border-outline-variant/10 active:scale-95"
                        >
                            {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700" />}
                        </button>

                        {/* Notification Bell */}
                        <button 
                            className="relative w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-container-low dark:hover:bg-surface-container-high text-slate-700 dark:text-on-surface-variant hover:text-slate-950 dark:hover:text-on-surface flex items-center justify-center transition-all border border-slate-200/50 dark:border-outline-variant/10"
                            title="Notifications"
                        >
                            <Bell size={18} />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500" />
                        </button>

                        {/* User Profile Mini Dropdown */}
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
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-brand-steel">Verified Account</span>
                            </div>
                        </Link>
                    </div>
                </header>

                {/* ── MOBILE HEADER ── */}
                <header className="lg:hidden sticky top-0 h-16 bg-white/95 dark:bg-surface-container-lowest/90 backdrop-blur-xl border-b border-slate-200 dark:border-outline-variant/20 z-40 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-surface-container-low flex items-center justify-center text-slate-800 dark:text-on-surface"
                        >
                            <Menu size={19} />
                        </button>
                        <Link href="/dashboard" className="flex items-center gap-2">
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
                            className="relative w-8 h-8 rounded-xl bg-slate-100 dark:bg-surface-container-low flex items-center justify-center text-slate-700 dark:text-on-surface"
                        >
                            <ShoppingCart size={16} />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center">
                                    {cartCount}
                                </span>
                            )}
                        </Link>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-surface-container-low flex items-center justify-center text-slate-800 dark:text-on-surface"
                        >
                            {isDarkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
                        </button>

                        {/* Mini Wallet */}
                        <Link
                            href="/wallet"
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-surface-container-low border border-slate-200 dark:border-outline-variant/20 text-xs font-bold text-slate-800 dark:text-on-surface"
                        >
                            <Wallet size={13} className="text-blue-600 dark:text-primary" />
                            <span>₹{Math.floor(walletBalance).toLocaleString('en-IN')}</span>
                        </Link>

                        {/* Profile Avatar */}
                        <Link href="/profile" className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-blue-500/20 flex items-center justify-center bg-slate-200 dark:bg-surface-container-high text-xs font-bold text-slate-800 dark:text-on-surface">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                            ) : (
                                <span>{userName[0]?.toUpperCase() || 'U'}</span>
                            )}
                        </Link>
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
                                className="lg:hidden fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-surface-container-lowest z-[80] flex flex-col justify-between shadow-2xl p-5 overflow-y-auto"
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

                                    {/* Member info */}
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-container-low border border-slate-200 dark:border-outline-variant/20 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-primary font-bold flex items-center justify-center overflow-hidden">
                                                {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : userName[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-900 dark:text-on-surface">{userName}</p>
                                                <p className="text-xs text-amber-600 dark:text-[#D4AF37] font-semibold">Gold Elite Member</p>
                                            </div>
                                        </div>
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

                                <div className="pt-4 border-t border-slate-200 dark:border-outline-variant/20 mt-4">
                                    <Link
                                        href="/merchant-apply"
                                        className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-on-surface dark:text-surface text-xs font-bold flex items-center justify-center gap-2 shadow-xs"
                                    >
                                        <Store size={15} />
                                        <span>Become an InTrust Merchant</span>
                                    </Link>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* ── PAGE VIEWPORT CONTENT ── */}
                <main className="flex-1 w-full pt-4 lg:pt-24 px-4 lg:px-8 pb-28 lg:pb-16 max-w-7xl mx-auto">
                    {children}
                </main>

                {/* ── MOBILE STICKY BOTTOM NAVIGATION BAR ── */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-white/95 dark:bg-surface-container-lowest/95 backdrop-blur-xl border-t border-slate-200 dark:border-outline-variant/20 z-40 px-3 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                    {[
                        { label: 'Home', href: '/dashboard', icon: LayoutGrid },
                        { label: 'Shop', href: '/shop', icon: ShoppingBag },
                        { label: 'Orders', href: '/orders', icon: Package },
                        { label: 'Wallet', href: '/wallet', icon: Wallet },
                        { label: 'Profile', href: '/profile', icon: User },
                    ].map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
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
            </div>
        </div>
    );
}
