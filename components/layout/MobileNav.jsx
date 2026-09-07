'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    ChevronRight, 
    Moon, 
    Sun, 
    Home, 
    Store, 
    Zap, 
    Info, 
    Phone, 
    ShoppingBag, 
    Heart, 
    LayoutDashboard, 
    Package, 
    Wallet, 
    User, 
    LogOut,
    ShoppingCart
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { displayName, displayInitial } from '@/lib/auth';
import GoldBadge from '@/components/ui/GoldBadge';

export default function MobileNav({ 
    isOpen, 
    onClose, 
    isAuthenticated, 
    profile, 
    user, 
    theme, 
    toggleTheme, 
    handleSignOut, 
    menuItems = [],
    cartCount = 0
}) {
    const pathname = usePathname();
    const isDarkMode = theme === 'dark';
    const isGold = !!profile?.is_gold_verified;
    const userDisplayName = displayName(profile, user) || 'Member';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[998] md:hidden"
                    />

                    {/* Drawer Panel — slide from left */}
                    <motion.aside
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                        className="fixed top-0 left-0 bottom-0 w-[82vw] max-w-sm bg-white dark:bg-surface-container-lowest z-[999] md:hidden flex flex-col justify-between shadow-2xl p-5 overflow-y-auto no-scrollbar border-r border-slate-200 dark:border-outline-variant/30"
                    >
                        <div className="space-y-4">
                            {/* Drawer Header with Logo & Close */}
                            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-outline-variant/20 shrink-0">
                                <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
                                    <div className="relative w-9 h-9 rounded-xl bg-white dark:bg-white/10 p-1 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-xs overflow-hidden">
                                        <Image src="/icons/intrustLogo.png" alt="InTrust" width={26} height={26} className="object-contain" priority />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-base text-slate-900 dark:text-on-surface leading-none">InTrust</h3>
                                        <p className="text-[9px] text-slate-400 dark:text-brand-steel font-bold uppercase tracking-wider mt-1">InTrust Network • Live</p>
                                    </div>
                                </Link>
                                <button
                                    onClick={onClose}
                                    aria-label="Close navigation menu"
                                    className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-surface-container-low flex items-center justify-center text-slate-600 dark:text-on-surface hover:bg-slate-200 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* User Status Card or Guest Sign In */}
                            {isAuthenticated ? (
                                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-container-low border border-slate-200/80 dark:border-outline-variant/20 flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative shrink-0">
                                            <div className={`w-10 h-10 rounded-full p-[2px] ${
                                                isGold 
                                                    ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600' 
                                                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                            }`}>
                                                <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                                                    {profile?.avatar_url ? (
                                                        <img src={profile.avatar_url} alt={userDisplayName} className="w-full h-full object-cover" />
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
                                        <div className="min-w-0">
                                            <p className="text-xs font-extrabold text-slate-900 dark:text-on-surface truncate">{userDisplayName}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-brand-steel truncate">{user?.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => toggleTheme(e)}
                                        aria-label="Toggle Theme"
                                        className="w-8 h-8 rounded-xl bg-white dark:bg-surface-container-high border border-slate-200/60 dark:border-outline-variant/20 flex items-center justify-center text-slate-700 dark:text-on-surface"
                                    >
                                        {isDarkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
                                    </button>
                                </div>
                            ) : (
                                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-container-low border border-slate-200/80 dark:border-outline-variant/20 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-brand-steel tracking-wider">Welcome</span>
                                            <p className="text-xs font-bold text-slate-800 dark:text-on-surface">Sign in for exclusive member perks</p>
                                        </div>
                                        <button
                                            onClick={(e) => toggleTheme(e)}
                                            aria-label="Toggle Theme"
                                            className="w-8 h-8 rounded-xl bg-white dark:bg-surface-container-high border border-slate-200/60 dark:border-outline-variant/20 flex items-center justify-center text-slate-700 dark:text-on-surface shrink-0"
                                        >
                                            {isDarkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href="/login"
                                            onClick={onClose}
                                            className="flex-1 py-2 text-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                                        >
                                            Sign In
                                        </Link>
                                        <Link
                                            href="/signup"
                                            onClick={onClose}
                                            className="flex-1 py-2 text-center rounded-xl bg-white dark:bg-surface-container-high text-slate-800 dark:text-on-surface font-bold text-xs border border-slate-200 dark:border-outline-variant/20"
                                        >
                                            Register
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Main Navigation Links */}
                            <nav className="space-y-1">
                                <Link
                                    href="/"
                                    onClick={onClose}
                                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                        pathname === '/'
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-primary font-black'
                                            : 'text-slate-700 dark:text-on-surface hover:bg-slate-100 dark:hover:bg-surface-container-low'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Home size={17} className={pathname === '/' ? 'text-blue-600 dark:text-primary' : 'text-slate-400'} />
                                        <span>Home</span>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-400" />
                                </Link>

                                <Link
                                    href="/shop"
                                    onClick={onClose}
                                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                        pathname.startsWith('/shop') && !pathname.includes('/cart')
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-primary font-black'
                                            : 'text-slate-700 dark:text-on-surface hover:bg-slate-100 dark:hover:bg-surface-container-low'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Store size={17} className={pathname.startsWith('/shop') ? 'text-blue-600 dark:text-primary' : 'text-slate-400'} />
                                        <span>InTrust Mart & Shop</span>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-400" />
                                </Link>

                                <Link
                                    href="/services"
                                    onClick={onClose}
                                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                        pathname === '/services'
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-primary font-black'
                                            : 'text-slate-700 dark:text-on-surface hover:bg-slate-100 dark:hover:bg-surface-container-low'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Zap size={17} className={pathname === '/services' ? 'text-blue-600 dark:text-primary' : 'text-slate-400'} />
                                        <span>Services & Solar</span>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-400" />
                                </Link>

                                <Link
                                    href="/about"
                                    onClick={onClose}
                                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                        pathname === '/about'
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-primary font-black'
                                            : 'text-slate-700 dark:text-on-surface hover:bg-slate-100 dark:hover:bg-surface-container-low'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Info size={17} className={pathname === '/about' ? 'text-blue-600 dark:text-primary' : 'text-slate-400'} />
                                        <span>About InTrust</span>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-400" />
                                </Link>

                                <Link
                                    href="/contact"
                                    onClick={onClose}
                                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                        pathname === '/contact'
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-primary font-black'
                                            : 'text-slate-700 dark:text-on-surface hover:bg-slate-100 dark:hover:bg-surface-container-low'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Phone size={17} className={pathname === '/contact' ? 'text-blue-600 dark:text-primary' : 'text-slate-400'} />
                                        <span>Contact Support</span>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-400" />
                                </Link>

                                <Link
                                    href="/shop/cart"
                                    onClick={onClose}
                                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-on-surface hover:bg-slate-100 dark:hover:bg-surface-container-low transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <ShoppingCart size={17} className="text-slate-400" />
                                        <span>Shopping Cart</span>
                                    </div>
                                    {cartCount > 0 ? (
                                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                                            {cartCount}
                                        </span>
                                    ) : (
                                        <ChevronRight size={14} className="text-slate-400" />
                                    )}
                                </Link>

                                <Link
                                    href="/wishlist"
                                    onClick={onClose}
                                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-on-surface hover:bg-slate-100 dark:hover:bg-surface-container-low transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <Heart size={17} className="text-rose-500" />
                                        <span>Saved Wishlist</span>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-400" />
                                </Link>

                                {isAuthenticated && (
                                    <>
                                        <div className="pt-2 pb-1">
                                            <div className="h-px bg-slate-200/70 dark:bg-outline-variant/20" />
                                        </div>

                                        <Link
                                            href="/dashboard"
                                            onClick={onClose}
                                            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-on-surface hover:bg-slate-100 dark:hover:bg-surface-container-low transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <LayoutDashboard size={17} className="text-blue-600 dark:text-primary" />
                                                <span>Customer Dashboard</span>
                                            </div>
                                            <ChevronRight size={14} className="text-slate-400" />
                                        </Link>

                                        <Link
                                            href="/orders"
                                            onClick={onClose}
                                            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-on-surface hover:bg-slate-100 dark:hover:bg-surface-container-low transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Package size={17} className="text-emerald-500" />
                                                <span>My Orders</span>
                                            </div>
                                            <ChevronRight size={14} className="text-slate-400" />
                                        </Link>

                                        <Link
                                            href="/wallet"
                                            onClick={onClose}
                                            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-on-surface hover:bg-slate-100 dark:hover:bg-surface-container-low transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Wallet size={17} className="text-amber-500" />
                                                <span>InTrust Wallet</span>
                                            </div>
                                            <ChevronRight size={14} className="text-slate-400" />
                                        </Link>

                                        <Link
                                            href="/profile"
                                            onClick={onClose}
                                            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-on-surface hover:bg-slate-100 dark:hover:bg-surface-container-low transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <User size={17} className="text-slate-400" />
                                                <span>Profile & Settings</span>
                                            </div>
                                            <ChevronRight size={14} className="text-slate-400" />
                                        </Link>
                                    </>
                                )}
                            </nav>
                        </div>

                        {/* Drawer Bottom CTA: Merchant Partner & Sign Out */}
                        <div className="pt-4 border-t border-slate-200 dark:border-outline-variant/20 space-y-3 shrink-0">
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-surface-container-low border border-slate-200/80 dark:border-outline-variant/20">
                                <p className="text-xs font-extrabold text-slate-900 dark:text-on-surface">Become a Merchant</p>
                                <p className="text-[10px] text-slate-500 dark:text-brand-steel mt-0.5">Sell locally across India with zero gateway fees.</p>
                                <Link
                                    href="/merchant-apply"
                                    onClick={onClose}
                                    className="mt-2 block w-full py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-center font-bold text-xs transition-opacity hover:opacity-90"
                                >
                                    Register Store
                                </Link>
                            </div>

                            {isAuthenticated && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        handleSignOut();
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200/60 dark:border-red-900/30 transition-colors"
                                >
                                    <LogOut size={15} />
                                    <span>Sign Out</span>
                                </button>
                            )}
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
