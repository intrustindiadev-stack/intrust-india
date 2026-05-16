'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Moon, Sun, Gift, Sparkles, History, ShoppingBag, CreditCard, ScanFace, ChevronDown } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { displayInitial, displayEmail } from '@/lib/auth';

export default function MobileNav({ isOpen, onClose, isAuthenticated, profile, user, theme, toggleTheme, handleSignOut, menuItems, apiPath }) {
    const router = useRouter();
    const [orderHistoryOpen, setOrderHistoryOpen] = useState(false);

    // Menu Item Variants for Staggered Animation
    const itemVariants = {
        hidden: { opacity: 0, x: 10 },
        visible: (i) => ({
            opacity: 1,
            x: 0,
            transition: {
                delay: 0.03 + i * 0.03,
                duration: 0.2,
                ease: 'easeOut'
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
                        className="fixed inset-0 bg-black/50 z-[998] lg:hidden"
                    />

                    {/* Menu Panel - Slide from Right */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{
                            duration: 0.35,
                            ease: [0.32, 0.725, 0.32, 1] // Snappier & tight
                        }}
                        style={{ willChange: "transform" }}
                        className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white dark:bg-gray-900 z-[999] lg:hidden overflow-y-auto shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-5 flex items-center justify-between z-10 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="relative w-8 h-8">
                                    <Image
                                        src="/icon.png"
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
                            <div className="flex items-center gap-1">
                                {isAuthenticated && <NotificationBell apiPath={apiPath} variant="navbar" />}
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-90 duration-200"
                                    aria-label="Close menu"
                                >
                                    <X size={24} className="text-[#171A21] dark:text-gray-100" strokeWidth={2.5} />
                                </button>
                            </div>
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

                            {/* Order History Dropdown */}
                            {isAuthenticated && (
                                <div className="mt-4">
                                    <button
                                        onClick={() => setOrderHistoryOpen(!orderHistoryOpen)}
                                        className="
                                            w-full group flex items-center justify-between 
                                            px-4 py-4 text-[#171A21] dark:text-gray-100
                                            active:bg-gray-50 dark:active:bg-gray-800
                                            rounded-2xl font-medium text-[16px]
                                            transition-colors duration-200
                                        "
                                    >
                                        <div className="flex items-center gap-3">
                                            <History size={20} className="text-[#92BCEA]" />
                                            <span>Order History</span>
                                        </div>
                                        <motion.div
                                            animate={{ rotate: orderHistoryOpen ? 180 : 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <ChevronDown size={18} className="text-gray-400" />
                                        </motion.div>
                                    </button>

                                    <AnimatePresence>
                                        {orderHistoryOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="overflow-hidden pl-11 space-y-1"
                                            >
                                                <button
                                                    onClick={() => { router.push('/nfc-service'); onClose(); }}
                                                    className="w-full flex items-center gap-3 py-3 px-2 text-sm text-gray-600 dark:text-gray-400 hover:text-[#92BCEA] transition-colors"
                                                >
                                                    <ScanFace size={16} />
                                                    <span>NFC Orders</span>
                                                </button>
                                                <button
                                                    onClick={() => { router.push('/my-giftcards'); onClose(); }}
                                                    className="w-full flex items-center gap-3 py-3 px-2 text-sm text-gray-600 dark:text-gray-400 hover:text-[#92BCEA] transition-colors"
                                                >
                                                    <CreditCard size={16} />
                                                    <span>Gift Cards</span>
                                                </button>
                                                <button
                                                    onClick={() => { router.push('/orders'); onClose(); }}
                                                    className="w-full flex items-center gap-3 py-3 px-2 text-sm text-gray-600 dark:text-gray-400 hover:text-[#92BCEA] transition-colors"
                                                >
                                                    <ShoppingBag size={16} />
                                                    <span>Shopping</span>
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            <div className="space-y-2">

                                {/* Genz Sidebar CTA */}
                                {isAuthenticated && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 }}
                                        onClick={() => { router.push('/refer'); onClose(); }}
                                        className="mt-4 w-full p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white relative overflow-hidden group shadow-lg shadow-indigo-500/20"
                                    >
                                        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-white/20 blur-xl rounded-full" />
                                        <div className="relative flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                                <Gift size={20} className="text-white" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-black uppercase tracking-tighter">Refer & Earn</p>
                                                <p className="text-[10px] font-medium opacity-80">Earn ₹100 for every successful referral</p>
                                            </div>
                                            <ChevronRight size={16} className="ml-auto opacity-60" />
                                        </div>
                                    </motion.button>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-gray-100 dark:bg-gray-800 my-6" />

                            {/* Auth Actions */}
                            <div className="space-y-3">
                                {isAuthenticated ? (
                                    <>
                                        {/* Profile Card */}
                                        <motion.button
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.15 }}
                                            onClick={() => { router.push('/profile'); onClose(); }}
                                            className="w-full flex items-center gap-3 px-4 py-4 bg-gradient-to-r from-[#92BCEA]/10 to-[#AFB3F7]/10 rounded-2xl"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] p-[2px] flex-shrink-0">
                                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                                    {profile?.avatar_url ? (
                                                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="font-bold text-[#7A93AC] text-sm">
                                                            {displayInitial(profile, user)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                    {profile?.full_name || 'Your Profile'}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{displayEmail(user?.email) || profile?.phone || 'Phone user'}</p>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                                        </motion.button>

                                        <motion.button
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            onClick={() => { router.push('/dashboard'); onClose(); }}
                                            className="w-full flex items-center justify-between px-4 py-4 text-[#171A21] dark:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-2xl font-medium"
                                        >
                                            <span>Dashboard</span>
                                            <ChevronRight size={18} className="text-gray-400" />
                                        </motion.button>



                                        <motion.button
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.25 }}
                                            onClick={handleSignOut}
                                            className="w-full px-4 py-4 bg-[#171A21] text-white rounded-2xl font-semibold shadow-lg shadow-[#171A21]/20 active:scale-95 transition-all"
                                        >
                                            Sign Out
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
                                            <span>Login</span>
                                            <ChevronRight size={18} className="text-gray-400" />
                                        </motion.button>
                                        <motion.button
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.25 }}
                                            onClick={() => { router.push('/login'); onClose(); }}
                                            className="w-full px-4 py-4 bg-[#171A21] text-white rounded-2xl font-semibold shadow-lg shadow-[#171A21]/20 active:scale-95 transition-all"
                                        >
                                            Sign Up
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
