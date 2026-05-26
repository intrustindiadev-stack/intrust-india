'use client';

import { useState, useEffect } from 'react';
import { Menu, X, ChevronRight, User, Moon, Sun } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { displayInitial } from '@/lib/auth';

import { useTheme } from '@/lib/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import MobileNav from './MobileNav';
import GoldBadge from '@/components/ui/GoldBadge';
import NotificationBell from '@/components/notifications/NotificationBell';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const { isAuthenticated, user, profile } = useAuth();
    const isGold = !!profile?.is_gold_verified;

    const { theme, toggleTheme } = useTheme();
    const router = useRouter();

    useEffect(() => {
        const handleScroll = () => {
            const shouldScroll = window.scrollY > 50;
            setScrolled(prev => {
                // Only update if value actually changed
                if (prev !== shouldScroll) {
                    return shouldScroll;
                }
                return prev;
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (menuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [menuOpen]);

    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = async () => {
        setShowLogoutModal(false);
        setIsLoggingOut(true);
        try {
            await fetch('/auth/logout', {
                method: 'POST',
            });
            window.location.href = '/';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/';
        } finally {
            setIsLoggingOut(false);
        }
    };

    const menuItems = [
        { label: 'Services', href: 'services' },
        { label: 'About', href: 'about' },
        { label: 'Contact', href: 'contact' },
    ];

    // Get user display info — delegates to shared helper that filters pseudo-emails

    const hasImage = profile?.avatar_url; // Assuming avatar_url might exist in future or logic update

    return (
        <>
            {/* Premium Floating Navbar */}
            <nav
                className={`fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] md:w-[85%] max-w-6xl px-0 animate-slideDown`}
            >
                <div
                    className={`
            bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-2xl md:rounded-full 
            px-4 md:px-8 py-2 md:py-2.5
            shadow-lg border border-gray-200/60 dark:border-gray-700/60
            transition-all duration-500 ease-out
            ${scrolled ? 'shadow-2xl bg-white dark:bg-gray-900 border-gray-300/80 dark:border-gray-600/80' : ''}
          `}
                >
                    <div className="flex items-center justify-between">
                        {/* Logo - Left */}
                        <a
                            href="/"
                            className="flex items-center gap-2.5 md:gap-3 z-10 group hover:scale-[1.03] active:scale-[0.97] transition-transform"
                        >
                            <div className="relative w-8 h-8 md:w-10 md:h-10 flex-shrink-0">
                                <Image
                                    src="/icon.png"
                                    alt="INTRUST"
                                    fill
                                    sizes="(max-width: 768px) 32px, 40px"
                                    className="object-contain transition-transform duration-300 group-hover:scale-110"
                                    priority
                                />
                            </div>
                            <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-[#7A93AC] via-[#92BCEA] to-[#AFB3F7] bg-clip-text text-transparent font-[family-name:var(--font-outfit)] tracking-tight">
                                INTRUST
                            </span>
                        </a>

                        {/* Desktop Menu - Center */}
                        <div className="hidden lg:flex items-center gap-8">
                            {menuItems.map((item, index) => (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    className="
                    relative px-5 py-2 text-[15px] font-medium 
                    text-[#617073] dark:text-gray-300 hover:text-[#171A21] dark:hover:text-white 
                    transition-colors duration-300 rounded-full
                    group hover:scale-105 active:scale-95
                  "
                                >
                                    <span className="relative z-10">{item.label}</span>

                                    {/* Hover background */}
                                    <div
                                        className="absolute inset-0 bg-gradient-to-r from-[#92BCEA]/10 to-[#AFB3F7]/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    />

                                    {/* Animated underline */}
                                    <span
                                        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] rounded-full group-hover:w-8 transition-all duration-300"
                                    />
                                </a>
                            ))}
                        </div>

                        {/* Actions - Right */}
                        <div className="flex items-center gap-2 md:gap-3 z-10">
                            {/* Notifications - desktop only, mobile uses sidebar */}
                            {isAuthenticated && (
                                <div
                                    className="hidden lg:flex"
                                >
                                    <NotificationBell apiPath="/api/notifications" variant="navbar" />
                                </div>
                            )}
                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="hidden lg:flex p-2 rounded-full text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            >
                                {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                            </button>



                            {isAuthenticated ? (
                                <div className="hidden lg:flex items-center gap-4">
                                    <Link href="/profile">
                                        <div className="relative">
                                            <div
                                                className={`w-10 h-10 rounded-full p-[2px] cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 ${isGold
                                                    ? 'bg-gradient-to-br from-[#FFD700] via-[#FDB931] to-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                                                    : 'bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7]'
                                                    }`}
                                            >
                                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                                    {hasImage ? (
                                                        <img
                                                            src={profile.avatar_url}
                                                            alt="Profile"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="font-bold text-[#7A93AC] text-lg">
                                                            {displayInitial(profile, user)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {isGold && (
                                                <div className="absolute -bottom-1 -right-1 z-10">
                                                    <GoldBadge size="sm" />
                                                </div>
                                            )}
                                        </div>
                                    </Link>

                                    <button
                                        onClick={handleLogout}
                                        className="
                      px-6 py-2 rounded-full font-semibold text-[15px]
                      bg-gray-100 text-gray-600 hover:bg-gray-200
                      dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700
                      transition-all duration-300 hover:scale-105 active:scale-95
                    "
                                    >
                                        Sign Out
                                    </button>
                                    {/* Mobile/Tablet Profile Icon */}
                                    <Link href="/profile" className="lg:hidden">
                                        <div
                                            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] p-[2px] cursor-pointer active:scale-95 transition-transform"
                                        >
                                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                                {hasImage ? (
                                                    <img
                                                        src={profile.avatar_url}
                                                        alt="Profile"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="font-bold text-[#7A93AC] text-sm">
                                                        {displayInitial(profile, user)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            ) : (
                                <div className="hidden lg:flex items-center gap-2">
                                    <button
                                        onClick={() => router.push('/login')}
                                        className="
                      px-5 py-2 text-[15px] font-medium 
                      text-[#617073] dark:text-gray-300 hover:text-[#171A21] dark:hover:text-white 
                      transition-colors duration-300 rounded-full
                      hover:bg-gradient-to-r hover:from-[#92BCEA]/10 hover:to-[#AFB3F7]/10
                      hover:scale-105 active:scale-95
                    "
                                    >
                                        Log In
                                    </button>
                                    <button
                                        onClick={() => router.push('/login')}
                                        className="
                      px-6 py-2 rounded-full font-semibold text-[15px]
                      bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] 
                      text-white shadow-md hover:shadow-xl 
                      transition-all duration-300 hover:scale-105 active:scale-95
                    "
                                    >
                                        Sign Up
                                    </button>
                                </div>
                            )}

                            {/* Mobile/Tablet Profile Icon - Visible only when authenticated */}
                            {isAuthenticated && (
                                <Link href="/profile" className="lg:hidden mr-2">
                                    <div className="relative">
                                        <div
                                            className={`w-9 h-9 rounded-full p-[2px] cursor-pointer transition-all duration-300 active:scale-95 ${isGold
                                                ? 'bg-gradient-to-br from-[#FFD700] via-[#FDB931] to-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                                                : 'bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7]'
                                                }`}
                                        >
                                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                                {hasImage ? (
                                                    <img
                                                        src={profile.avatar_url}
                                                        alt="Profile"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="font-bold text-[#7A93AC] text-sm">
                                                        {displayInitial(profile, user)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isGold && (
                                            <div className="absolute -bottom-1 -right-1 z-10">
                                                <GoldBadge size="sm" />
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            )}

                            {/* Mobile Menu Toggle */}
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="
                  lg:hidden p-2 md:p-2.5 rounded-full 
                  hover:bg-[#92BCEA]/10 
                  transition-colors duration-200 active:scale-90
                "
                                aria-label="Toggle menu"
                            >
                                <div
                                    style={{ transform: menuOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                                >
                                    {menuOpen ? (
                                        <X size={22} className="text-[#171A21] dark:text-gray-100" strokeWidth={2.5} />
                                    ) : (
                                        <Menu size={22} className="text-[#171A21] dark:text-gray-100" strokeWidth={2.5} />
                                    )}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            <MobileNav
                isOpen={menuOpen}
                onClose={() => setMenuOpen(false)}
                isAuthenticated={isAuthenticated}
                profile={profile}
                user={user}
                theme={theme}
                toggleTheme={toggleTheme}
                handleSignOut={handleLogout}
                menuItems={menuItems}
                apiPath="/api/notifications"
            />

            <ConfirmModal
                isOpen={showLogoutModal}
                onConfirm={confirmLogout}
                onCancel={() => setShowLogoutModal(false)}
                title="Confirm Logout"
                message="Are you sure you want to sign out from INTRUST?"
                confirmLabel={isLoggingOut ? "Signing Out..." : "Sign Out"}
                cancelLabel="Cancel"
            />
        </>
    );
}
