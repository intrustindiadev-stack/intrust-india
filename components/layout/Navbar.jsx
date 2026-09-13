'use client';

import { useState, useEffect, useRef } from 'react';
import { 
    Menu, 
    X, 
    ChevronDown, 
    User, 
    Moon, 
    Sun, 
    Heart, 
    ShoppingCart, 
    MapPin, 
    Plus, 
    LayoutDashboard, 
    Package, 
    Wallet, 
    Settings, 
    LogOut, 
    Store,
    LogIn
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { displayInitial, displayName } from '@/lib/auth';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import MobileNav from './MobileNav';
import GoldBadge from '@/components/ui/GoldBadge';
import NotificationBell from '@/components/notifications/NotificationBell';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function Navbar() {
    const [menuOpen, setMobileMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [cartCount, setCartCount] = useState(0);
    const [walletBalance, setWalletBalance] = useState(0);
    const dropdownRef = useRef(null);

    const { isAuthenticated, user, profile } = useAuth();
    const isGold = !!profile?.is_gold_verified;
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';
    const router = useRouter();
    const pathname = usePathname();

    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Fetch Cart & Wallet count for authenticated users
    useEffect(() => {
        const fetchUserData = async () => {
            if (!user?.id) return;
            try {
                const { data: cartData } = await supabase
                    .from('shopping_cart')
                    .select('id, quantity')
                    .eq('customer_id', user.id);
                if (cartData) {
                    const total = cartData.reduce((sum, item) => sum + (item.quantity || 1), 0);
                    setCartCount(total);
                }

                const { data: walletData } = await supabase
                    .from('customer_wallets')
                    .select('balance_paise')
                    .eq('user_id', user.id)
                    .maybeSingle();
                if (walletData) {
                    setWalletBalance((walletData.balance_paise || 0) / 100);
                }
            } catch (err) {
                console.error('Error fetching navbar user data:', err);
            }
        };

        fetchUserData();

        const handleCartUpdate = () => fetchUserData();
        window.addEventListener('cartUpdated', handleCartUpdate);

        return () => window.removeEventListener('cartUpdated', handleCartUpdate);
    }, [user?.id]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close mobile drawer on route change
    useEffect(() => {
        setMobileMenuOpen(false);
        setProfileDropdownOpen(false);
    }, [pathname]);

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = async () => {
        setShowLogoutModal(false);
        setIsLoggingOut(true);
        try {
            await supabase.auth.signOut();
            await fetch('/auth/logout', { method: 'POST' });
            window.location.href = '/';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/';
        } finally {
            setIsLoggingOut(false);
        }
    };

    const navItems = [
        { label: 'Home', href: '/' },
        { label: 'Shop', href: '/shop' },
        { label: 'Services', href: '/services' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
    ];

    const hasImage = profile?.avatar_url && !avatarError;
    const userDisplayName = displayName(profile, user) || 'User';

    return (
        <>
            {/* ── DESKTOP HEADER (Identical style, height, and tokens as Customer Panel) ── */}
            <header className="fixed top-0 inset-x-0 h-20 bg-white/80 dark:bg-surface-container-lowest/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-outline-variant/20 z-50 transition-all">
                <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
                    {/* Logo & Platform Tagline */}
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative w-10 h-10 rounded-2xl bg-white dark:bg-white/10 p-1 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
                                <Image 
                                    src="/icons/intrustLogo.png" 
                                    alt="InTrust Logo" 
                                    width={32} 
                                    height={32} 
                                    className="object-contain" 
                                    priority 
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-xl tracking-tight text-slate-900 dark:text-on-surface leading-none">
                                    InTrust
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-brand-steel uppercase tracking-widest mt-1">
                                    InTrust Network • Live
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Navigation Links */}
                    <nav className="hidden md:flex items-center gap-1.5">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                        isActive
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-primary font-black shadow-xs'
                                            : 'text-slate-600 dark:text-on-surface-variant hover:text-slate-900 dark:hover:text-on-surface hover:bg-slate-100/70 dark:hover:bg-surface-container-high'
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right Utility Controls */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* Location Chip */}
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-surface-container-low text-slate-700 dark:text-on-surface text-xs font-semibold border border-slate-200/50 dark:border-outline-variant/10">
                            <MapPin size={14} className="text-blue-600 dark:text-primary" />
                            <span>India</span>
                        </div>

                        {/* Cart Button with Live Badge */}
                        <Link
                            href="/shop/cart"
                            className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-container-low dark:hover:bg-surface-container-high text-slate-700 dark:text-on-surface-variant hover:text-blue-600 dark:hover:text-primary transition-colors border border-slate-200/50 dark:border-outline-variant/10"
                            title="Shopping Cart"
                        >
                            <ShoppingCart size={18} />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                                    {cartCount}
                                </span>
                            )}
                        </Link>

                        {/* Theme Toggle Button */}
                        <button
                            onClick={(e) => toggleTheme(e)}
                            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            aria-label="Toggle Theme"
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-container-low dark:hover:bg-surface-container-high text-slate-700 dark:text-on-surface-variant hover:text-slate-950 dark:hover:text-on-surface flex items-center justify-center transition-all border border-slate-200/50 dark:border-outline-variant/10 active:scale-95"
                        >
                            {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700" />}
                        </button>

                        {/* Authenticated Controls: Live Wallet Balance Pill & Notification Bell */}
                        {isAuthenticated && (
                            <>
                                <Link
                                    href="/wallet"
                                    className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-container-low dark:hover:bg-surface-container-high border border-slate-200 dark:border-outline-variant/20 transition-all group"
                                >
                                    <div className="flex flex-col text-left">
                                        <span className="text-[9px] font-extrabold uppercase text-slate-500 dark:text-brand-steel tracking-wider leading-none">Wallet</span>
                                        <span className="text-xs font-black text-slate-900 dark:text-on-surface tabular-nums mt-0.5">
                                            ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <span className="p-1 rounded-lg bg-blue-600 dark:bg-primary text-white group-hover:scale-105 transition-transform">
                                        <Plus size={12} />
                                    </span>
                                </Link>

                                <NotificationBell apiPath="/api/notifications" variant="navbar" />
                            </>
                        )}

                        {/* Profile Dropdown / Guest Auth Buttons */}
                        {isAuthenticated ? (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setProfileDropdownOpen((prev) => !prev)}
                                    className="flex items-center gap-2 p-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-surface-container-high transition-colors focus:outline-none"
                                >
                                    <div className="relative">
                                        <div className={`w-9 h-9 rounded-full p-[2px] transition-transform ${
                                            isGold 
                                                ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 shadow-xs' 
                                                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                        }`}>
                                            <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                                                {hasImage ? (
                                                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-black text-slate-700 dark:text-on-surface">
                                                        {displayInitial(profile, user)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isGold && (
                                            <div className="absolute -bottom-1 -right-1 z-10 scale-90">
                                                <GoldBadge size="sm" />
                                            </div>
                                        )}
                                    </div>
                                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {profileDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-outline-variant/30 shadow-xl py-2 z-50 animate-fadeIn">
                                        <div className="px-4 py-2 border-b border-slate-100 dark:border-outline-variant/15">
                                            <p className="text-xs font-black text-slate-900 dark:text-on-surface truncate">{userDisplayName}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-brand-steel truncate">{user?.email}</p>
                                        </div>

                                        <div className="py-1">
                                            <Link
                                                href="/dashboard"
                                                className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-on-surface hover:bg-slate-50 dark:hover:bg-surface-container-high transition-colors"
                                            >
                                                <LayoutDashboard size={15} className="text-blue-600 dark:text-primary" />
                                                <span>Dashboard</span>
                                            </Link>
                                            <Link
                                                href="/orders"
                                                className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-on-surface hover:bg-slate-50 dark:hover:bg-surface-container-high transition-colors"
                                            >
                                                <Package size={15} className="text-emerald-500" />
                                                <span>My Orders</span>
                                            </Link>
                                            <Link
                                                href="/wallet"
                                                className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-on-surface hover:bg-slate-50 dark:hover:bg-surface-container-high transition-colors"
                                            >
                                                <Wallet size={15} className="text-amber-500" />
                                                <span>Wallet</span>
                                            </Link>
                                            <Link
                                                href="/profile"
                                                className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-on-surface hover:bg-slate-50 dark:hover:bg-surface-container-high transition-colors"
                                            >
                                                <Settings size={15} className="text-slate-400" />
                                                <span>Profile Settings</span>
                                            </Link>
                                        </div>

                                        <div className="border-t border-slate-100 dark:border-outline-variant/15 pt-1">
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                            >
                                                <LogOut size={15} />
                                                <span>Sign Out</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="hidden sm:flex items-center gap-2">
                                <Link
                                    href={`/login?next=${encodeURIComponent(pathname)}`}
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/signup"
                                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-container-low dark:hover:bg-surface-container-high text-slate-800 dark:text-on-surface text-xs font-bold transition-all border border-slate-200/60 dark:border-outline-variant/20 active:scale-95"
                                >
                                    Register
                                </Link>
                            </div>
                        )}

                        {/* Mobile Menu Hamburger Toggle */}
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="md:hidden w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-container-low dark:hover:bg-surface-container-high flex items-center justify-center text-slate-800 dark:text-on-surface transition-colors active:scale-90"
                            aria-label="Toggle navigation menu"
                        >
                            <Menu size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Spacer so page content starts below the fixed h-20 header */}
            <div className="h-20 w-full" />

            {/* Mobile Navigation Drawer */}
            <MobileNav
                isOpen={menuOpen}
                onClose={() => setMobileMenuOpen(false)}
                isAuthenticated={isAuthenticated}
                profile={profile}
                user={user}
                theme={theme}
                toggleTheme={toggleTheme}
                handleSignOut={handleLogout}
                menuItems={navItems}
                apiPath="/api/notifications"
                cartCount={cartCount}
            />

            {/* Logout Confirmation Modal */}
            <ConfirmModal
                isOpen={showLogoutModal}
                onConfirm={confirmLogout}
                onCancel={() => setShowLogoutModal(false)}
                title="Confirm Logout"
                message="Are you sure you want to sign out from InTrust?"
                confirmLabel={isLoggingOut ? "Signing Out..." : "Sign Out"}
                cancelLabel="Cancel"
            />
        </>
    );
}
