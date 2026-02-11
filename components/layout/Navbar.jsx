'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Menu, X, ChevronRight, Globe, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';

import { useRouter } from 'next/navigation';
import MobileNav from './MobileNav';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const { isAuthenticated, user, profile } = useAuth();
    const { language, changeLanguage, t } = useLanguage();
    const router = useRouter();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
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

    const handleLogout = async () => {
        await fetch('/auth/logout', {
            method: 'POST',
        });

        window.location.href = '/';
    };

    const menuItems = [
        { label: t('nav.services'), href: 'services' },
        { label: t('nav.about'), href: 'about' },
        { label: t('nav.contact'), href: 'contact' },
    ];

    // Get user display info
    const getInitials = () => {
        if (profile?.full_name) return profile.full_name.charAt(0).toUpperCase();
        if (user?.email) return user.email.charAt(0).toUpperCase();
        return 'U';
    };

    const hasImage = profile?.avatar_url; // Assuming avatar_url might exist in future or logic update

    return (
        <>
            {/* Premium Floating Navbar */}
            <motion.nav
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.1
                }}
                className="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] md:w-[85%] max-w-6xl px-0"
            >
                <div
                    className={`
            bg-white/95 backdrop-blur-2xl rounded-2xl md:rounded-full 
            px-4 md:px-8 py-2 md:py-2.5
            shadow-lg border border-gray-200/60
            transition-all duration-500 ease-out
            ${scrolled ? 'shadow-2xl bg-white border-gray-300/80' : ''}
          `}
                >
                    <div className="flex items-center justify-between">
                        {/* Logo - Left */}
                        <motion.a
                            href="/"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-2.5 md:gap-3 z-10 group"
                        >
                            <div className="relative w-8 h-8 md:w-10 md:h-10 flex-shrink-0">
                                <Image
                                    src="/icons/intrustLogo.png"
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
                        </motion.a>

                        {/* Desktop Menu - Center */}
                        <div className="hidden lg:flex items-center gap-8">
                            {menuItems.map((item, index) => (
                                <motion.a
                                    key={item.label}
                                    href={item.href}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        delay: 0.3 + index * 0.1,
                                        duration: 0.4,
                                        ease: [0.22, 1, 0.36, 1]
                                    }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="
                    relative px-5 py-2 text-[15px] font-medium 
                    text-[#617073] hover:text-[#171A21] 
                    transition-colors duration-300 rounded-full
                    group
                  "
                                >
                                    <span className="relative z-10">{item.label}</span>

                                    {/* Hover background */}
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-[#92BCEA]/10 to-[#AFB3F7]/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    />

                                    {/* Animated underline */}
                                    <motion.span
                                        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] rounded-full group-hover:w-8 transition-all duration-300"
                                    />
                                </motion.a>
                            ))}
                        </div>

                        {/* Actions - Right */}
                        <div className="flex items-center gap-2 md:gap-3 z-10">
                            {/* Language Switcher - Premium iOS Style */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5, duration: 0.4 }}
                                className="hidden lg:block relative"
                            >
                                <div className="relative bg-gray-100/80 backdrop-blur-sm rounded-full p-1 flex items-center">
                                    <motion.div
                                        className="absolute top-1 bottom-1 bg-white rounded-full shadow-md"
                                        animate={{
                                            left: language === 'en' ? '4px' : '50%',
                                            width: language === 'en' ? 'calc(50% - 4px)' : 'calc(50% - 4px)'
                                        }}
                                        transition={{
                                            type: 'spring',
                                            stiffness: 400,
                                            damping: 30
                                        }}
                                    />
                                    <button
                                        onClick={() => changeLanguage('en')}
                                        className={`relative z-10 px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 min-w-[50px] text-center ${language === 'en' ? 'text-[#171A21]' : 'text-[#617073]'}`}
                                    >
                                        EN
                                    </button>
                                    <button
                                        onClick={() => changeLanguage('hi')}
                                        className={`relative z-10 px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 min-w-[50px] text-center ${language === 'hi' ? 'text-[#171A21]' : 'text-[#617073]'}`}
                                    >
                                        हिं
                                    </button>
                                </div>
                            </motion.div>

                            {isAuthenticated ? (
                                <div className="hidden lg:flex items-center gap-4">
                                    <Link href="/profile">
                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] p-[2px] cursor-pointer"
                                        >
                                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                                {hasImage ? (
                                                    <Image
                                                        src={profile.avatar_url}
                                                        alt="Profile"
                                                        width={40}
                                                        height={40}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="font-bold text-[#7A93AC] text-lg">
                                                        {getInitials()}
                                                    </span>
                                                )}
                                            </div>
                                        </motion.div>
                                    </Link>

                                    <motion.button
                                        whileHover={{ scale: 1.05, y: -1 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        onClick={handleLogout}
                                        className="
                      px-6 py-2 rounded-full font-semibold text-[15px]
                      bg-gray-100 text-gray-600 hover:bg-gray-200
                      transition-all duration-300
                    "
                                    >
                                        {t('nav.signout')}
                                    </motion.button>
                                    {/* Mobile/Tablet Profile Icon */}
                                    <Link href="/profile" className="lg:hidden">
                                        <motion.div
                                            whileTap={{ scale: 0.95 }}
                                            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] p-[2px] cursor-pointer"
                                        >
                                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                                {hasImage ? (
                                                    <Image
                                                        src={profile.avatar_url}
                                                        alt="Profile"
                                                        width={32}
                                                        height={32}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="font-bold text-[#7A93AC] text-sm">
                                                        {getInitials()}
                                                    </span>
                                                )}
                                            </div>
                                        </motion.div>
                                    </Link>
                                </div>
                            ) : (
                                <div className="hidden lg:flex items-center gap-2">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        onClick={() => router.push('/login')}
                                        className="
                      px-5 py-2 text-[15px] font-medium 
                      text-[#617073] hover:text-[#171A21] 
                      transition-colors duration-300 rounded-full
                      hover:bg-gradient-to-r hover:from-[#92BCEA]/10 hover:to-[#AFB3F7]/10
                    "
                                    >
                                        {t('nav.login')}
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05, y: -1 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        onClick={() => router.push('/login')}
                                        className="
                      px-6 py-2 rounded-full font-semibold text-[15px]
                      bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] 
                      text-white shadow-md hover:shadow-xl 
                      transition-all duration-300
                    "
                                    >
                                        {t('nav.signup')}
                                    </motion.button>
                                </div>
                            )}

                            {/* Mobile/Tablet Profile Icon - Visible only when authenticated */}
                            {isAuthenticated && (
                                <Link href="/profile" className="lg:hidden mr-2">
                                    <motion.div
                                        whileTap={{ scale: 0.95 }}
                                        className="w-9 h-9 rounded-full bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] p-[2px] cursor-pointer"
                                    >
                                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                            {hasImage ? (
                                                <Image
                                                    src={profile.avatar_url}
                                                    alt="Profile"
                                                    width={36}
                                                    height={36}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="font-bold text-[#7A93AC] text-sm">
                                                    {getInitials()}
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                </Link>
                            )}

                            {/* Mobile Menu Toggle */}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                transition={{ duration: 0.15 }}
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="
                  lg:hidden p-2 md:p-2.5 rounded-full 
                  hover:bg-[#92BCEA]/10 
                  transition-colors duration-200
                "
                                aria-label="Toggle menu"
                            >
                                <motion.div
                                    animate={menuOpen ? { rotate: 90 } : { rotate: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {menuOpen ? (
                                        <X size={22} className="text-[#171A21]" strokeWidth={2.5} />
                                    ) : (
                                        <Menu size={22} className="text-[#171A21]" strokeWidth={2.5} />
                                    )}
                                </motion.div>
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.nav>

            {/* Mobile Menu */}
            <MobileNav
                isOpen={menuOpen}
                onClose={() => setMenuOpen(false)}
                isAuthenticated={isAuthenticated}
                t={t}
                language={language}
                changeLanguage={changeLanguage}
                handleSignOut={handleLogout}
                menuItems={menuItems}
            />
        </>
    );
}
