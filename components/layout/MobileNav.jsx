'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Globe, Moon, Sun } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function MobileNav({ isOpen, onClose, isAuthenticated, t, language, changeLanguage, theme, toggleTheme, handleSignOut, menuItems }) {
    const router = useRouter();

    // Menu Item Variants for Staggered Animation
    const itemVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: (i) => ({
            opacity: 1,
            x: 0,
            transition: {
                delay: 0.05 + i * 0.05,
                duration: 0.3,
                ease: [0.22, 1, 0.36, 1]
            }
        })
    };

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-[#171A21]/60 dark:bg-black/60 backdrop-blur-sm z-[998] lg:hidden"
                    />

                    {/* Menu Panel - Slide from Right */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{
                            duration: 0.5,
                            ease: [0.32, 0.725, 0.32, 1] // "Ease out cubic" - smooth & premium
                        }}
                        className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white dark:bg-gray-900 z-[999] lg:hidden overflow-y-auto shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 p-5 flex items-center justify-between z-10 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="relative w-8 h-8">
                                    <Image
                                        src="/icons/intrustLogo.png"
                                        alt="INTRUST"
                                        fill
                                        className="object-contain"
                                        priority
                                    />
                                </div>
                                <span className="text-lg font-bold bg-gradient-to-r from-[#7A93AC] to-[#92BCEA] bg-clip-text text-transparent font-[family-name:var(--font-outfit)]">
                                    INTRUST
                                </span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors active:scale-90 duration-200"
                                aria-label="Close menu"
                            >
                                <X size={24} className="text-[#171A21] dark:text-gray-100" strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Menu Content - Scrollable */}
                        <div className="p-5 flex-1 overflow-y-auto">
                            <div className="space-y-2">
                                {/* Navigation Links */}
                                {menuItems.map((item, index) => (
                                    <motion.a
                                        key={item.label}
                                        href={item.href}
                                        custom={index}
                                        variants={itemVariants}
                                        initial="hidden"
                                        animate="visible"
                                        onClick={onClose}
                                        className="
                                            group flex items-center justify-between 
                                            px-4 py-4 text-[#171A21] dark:text-gray-100
                                            active:bg-gray-50 dark:active:bg-gray-800
                                            rounded-2xl font-medium text-[16px]
                                            transition-colors duration-200
                                            border border-transparent hover:border-gray-100 dark:hover:border-gray-800
                                        "
                                    >
                                        <span>{item.label}</span>
                                        <ChevronRight
                                            size={18}
                                            className="text-gray-300 group-active:text-[#92BCEA] transition-colors"
                                            strokeWidth={2.5}
                                        />
                                    </motion.a>
                                ))}
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-gray-100 dark:bg-gray-800 my-6" />

                            {/* Auth Actions */}
                            <div className="space-y-3">
                                {isAuthenticated ? (
                                    <>
                                        <motion.button
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            onClick={() => { router.push('/dashboard'); onClose(); }}
                                            className="w-full flex items-center justify-between px-4 py-4 text-[#171A21] dark:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-2xl font-medium"
                                        >
                                            <span>{t?.('nav.dashboard') || 'Dashboard'}</span>
                                            <ChevronRight size={18} className="text-gray-400" />
                                        </motion.button>
                                        <motion.button
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.25 }}
                                            onClick={handleSignOut}
                                            className="w-full px-4 py-4 bg-[#171A21] text-white rounded-2xl font-semibold shadow-lg shadow-[#171A21]/20 active:scale-95 transition-all"
                                        >
                                            {t?.('nav.signout') || 'Sign Out'}
                                        </motion.button>
                                    </>
                                ) : (
                                    <>
                                        <motion.button
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            onClick={() => { router.push('/login'); onClose(); }}
                                            className="w-full flex items-center justify-between px-4 py-4 text-[#171A21] dark:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-2xl font-medium"
                                        >
                                            <span>{t?.('nav.login') || 'Login'}</span>
                                            <ChevronRight size={18} className="text-gray-400" />
                                        </motion.button>
                                        <motion.button
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.25 }}
                                            onClick={() => { router.push('/login'); onClose(); }}
                                            className="w-full px-4 py-4 bg-[#171A21] text-white rounded-2xl font-semibold shadow-lg shadow-[#171A21]/20 active:scale-95 transition-all"
                                        >
                                            {t?.('nav.signup') || 'Sign Up'}
                                        </motion.button>
                                    </>
                                )}
                            </div>

                            {/* Settings (Language & Theme) */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 space-y-6"
                            >
                                {/* Language Toggle */}
                                <div>
                                    <div className="flex items-center gap-2 text-gray-500 mb-4">
                                        <Globe size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">{t?.('nav.language') || 'Language'}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-xl">
                                        {['en', 'hi'].map((lang) => (
                                            <button
                                                key={lang}
                                                onClick={() => changeLanguage(lang)}
                                                className={`
                                                    py-2.5 rounded-lg text-sm font-bold transition-all
                                                    ${language === lang
                                                        ? 'bg-white dark:bg-gray-700 text-[#171A21] dark:text-white shadow-sm'
                                                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                                    }
                                                `}
                                            >
                                                {lang === 'en' ? 'English' : 'हिन्दी'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Theme Toggle */}
                                <div>
                                    <div className="flex items-center gap-2 text-gray-500 mb-4">
                                        {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                                        <span className="text-xs font-bold uppercase tracking-wider">Theme</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-xl">
                                        <button
                                            onClick={toggleTheme}
                                            className={`
                                                py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2
                                                ${theme === 'light'
                                                    ? 'bg-white text-[#171A21] shadow-sm'
                                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                                }
                                            `}
                                        >
                                            <Sun size={16} />
                                            Light
                                        </button>
                                        <button
                                            onClick={toggleTheme}
                                            className={`
                                                py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2
                                                ${theme === 'dark'
                                                    ? 'bg-gray-700 text-white shadow-sm'
                                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                                }
                                            `}
                                        >
                                            <Moon size={16} />
                                            Dark
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
