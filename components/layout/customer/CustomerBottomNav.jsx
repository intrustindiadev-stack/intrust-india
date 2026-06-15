'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname }                       from 'next/navigation';
import Link                                  from 'next/link';
import { Home, Wallet, Smartphone, Gift, Sun, ShoppingBag, LayoutGrid, User, Trophy } from 'lucide-react';
import { motion, AnimatePresence }           from 'framer-motion';
import ActiveOrdersOverlay                   from './ActiveOrdersOverlay';
import RatingPromptModal                     from './RatingPromptModal';
import { useRewardsRealtime }                from '@/lib/contexts/RewardsRealtimeContext';

const servicesList = [
    { id: 'shop', title: 'Store', icon: ShoppingBag, href: '/shop', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-500/10', shadow: 'shadow-pink-500/30' },
    { id: 'nfc', title: 'NFC Pass', icon: Smartphone, href: '/nfc-service', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', shadow: 'shadow-blue-500/30' },
    { id: 'gift', title: 'Gift Cards', icon: Gift, href: '/gift-cards', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', shadow: 'shadow-purple-500/30' },
    { id: 'solar', title: 'Solar', icon: Sun, href: '/solar', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10', shadow: 'shadow-orange-500/30' },
    { id: 'all', title: 'All Services', icon: LayoutGrid, href: '/services', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', shadow: 'shadow-emerald-500/30' },
];

const navItems = [
    { icon: Home,         label: 'Home',      href: '/dashboard'   },
    { icon: Wallet,       label: 'Wallet',    href: '/wallet'      },
    { icon: LayoutGrid,   label: 'Services',  isMenu: true         },
    { icon: Trophy,       label: 'Rewards',   href: '/rewards'     },
    { icon: User,         label: 'Profile',   href: '/profile'     },
];

export default function CustomerBottomNav() {
    const pathname = usePathname();
    return <CustomerBottomNavInner pathname={pathname} />;
}

function CustomerBottomNavInner({ pathname }) {
    let unscratchedCount = 0;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const ctx = useRewardsRealtime();
        unscratchedCount = ctx.unscratchedCount;
    } catch {
        // Outside provider
    }

    const hiddenRoutes = ['/merchant-apply'];
    const shouldHide = hiddenRoutes.some(route => pathname?.startsWith(route));
    if (shouldHide) return null;

    const badgeLabel = unscratchedCount > 9 ? '9+' : String(unscratchedCount);
    const [isServicesOpen, setIsServicesOpen] = useState(false);

    // Close menu when clicking outside
    const menuRef = useRef(null);
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsServicesOpen(false);
            }
        }
        if (isServicesOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isServicesOpen]);

    // Determine active service
    const activeService = servicesList.find(s => pathname === s.href || pathname?.startsWith(s.href + '/')) || {
        title: 'Services',
        icon: LayoutGrid,
        color: 'text-white',
        bg: 'bg-gradient-to-tr from-indigo-500 to-blue-500',
        shadow: 'shadow-blue-500/30'
    };

    return (
        <>
            {/* Spacer */}
            <div className="h-24 md:hidden" />

            {/* Premium Bottom Navigation */}
            <motion.nav
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe flex flex-col justify-end pointer-events-none"
            >
                <div className="pointer-events-auto w-full px-4 mb-2">
                    <RatingPromptModal />
                </div>

                {!pathname?.startsWith('/shop') && (
                    <div className="pointer-events-auto w-full px-4 mb-4">
                        <ActiveOrdersOverlay />
                    </div>
                )}

                <div className="mx-4 mb-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[2rem] p-2 pointer-events-auto">
                    <div className="flex items-center justify-between relative z-10 w-full">
                        {navItems.map((item) => {
                            const isMenu = item.isMenu;
                            
                            // Determine active state for standard items
                            const isActive = isMenu 
                                ? isServicesOpen || (activeService.title !== 'Services') 
                                : (pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href)));
                                
                            const showBadge = item.href === '/rewards' && unscratchedCount > 0;
                            const Icon = isMenu ? activeService.icon : item.icon;

                            if (isMenu) {
                                return (
                                    <div
                                        key="services-menu"
                                        onClick={() => setIsServicesOpen(prev => !prev)}
                                        className="relative flex-1 flex flex-col items-center justify-center py-3 px-1 cursor-pointer select-none group"
                                        ref={menuRef}
                                    >
                                        <motion.div 
                                            whileTap={{ scale: 0.9 }}
                                            animate={{ rotate: isServicesOpen ? 45 : 0 }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                            className={`absolute -top-6 w-[52px] h-[52px] ${activeService.title !== 'Services' ? 'bg-gradient-to-tr from-[#171A21] to-gray-800' : 'bg-gradient-to-tr from-indigo-500 to-blue-500'} rounded-[1.3rem] flex items-center justify-center shadow-lg ${activeService.shadow} border-4 border-[#f7f8fa] dark:border-[#080a10] z-20 transition-colors group-hover:scale-105`}
                                        >
                                            <motion.div animate={{ rotate: isServicesOpen ? -45 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
                                                <Icon size={22} strokeWidth={2.5} className="text-white" />
                                            </motion.div>
                                        </motion.div>
                                        <div className="mt-8">
                                            <span className={`text-[10px] font-black tracking-wide ${isActive || activeService.title !== 'Services' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-gray-500'}`}>
                                                {activeService.title}
                                            </span>
                                        </div>

                                        <AnimatePresence>
                                            {isServicesOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 24, scale: 0.9 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 16, scale: 0.95 }}
                                                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                                                    className="absolute bottom-[88px] left-1/2 -translate-x-1/2 w-[340px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-[2rem] shadow-[0_24px_60px_rgba(0,0,0,0.2)] border border-white/60 dark:border-white/10 overflow-hidden flex flex-col p-5 z-50 origin-bottom"
                                                >
                                                    <div className="text-center mb-4">
                                                        <span className="text-[10px] font-black tracking-widest text-slate-400 dark:text-gray-500 uppercase">Explore Services</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {servicesList.map(s => (
                                                            <Link 
                                                                key={s.id} 
                                                                href={s.href} 
                                                                onClick={() => setIsServicesOpen(false)} 
                                                                className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group/item active:scale-95"
                                                            >
                                                                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center ${s.color} shadow-sm group-hover/item:scale-110 transition-transform`}>
                                                                    <s.icon size={20} strokeWidth={2.5} />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-slate-700 dark:text-gray-300 text-center leading-tight">
                                                                    {s.title}
                                                                </span>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="relative flex-1 flex flex-col items-center justify-center py-3 px-1 cursor-pointer select-none group"
                                    aria-label={`${item.label}${showBadge ? `, ${unscratchedCount} pending rewards` : ''}`}
                                >
                                    <motion.div
                                        whileTap={{ scale: 0.9 }}
                                        className="relative flex flex-col items-center gap-1 z-10 w-full h-full justify-center"
                                    >
                                        <div className={`relative transition-all duration-300 group-hover:-translate-y-0.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-gray-500'}`}>
                                            <Icon
                                                size={24}
                                                strokeWidth={isActive ? 2.5 : 2}
                                                className="relative z-10"
                                            />

                                            {showBadge && (
                                                <motion.span
                                                    key={unscratchedCount}
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0, opacity: 0 }}
                                                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center leading-none z-20 shadow-sm shadow-emerald-500/40"
                                                >
                                                    {badgeLabel}
                                                </motion.span>
                                            )}

                                            {isActive && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="absolute inset-0 bg-blue-400/20 blur-lg rounded-full"
                                                />
                                            )}
                                        </div>

                                        <motion.span
                                            initial={false}
                                            animate={{
                                                height:  isActive ? 'auto' : 0,
                                                opacity: isActive ? 1 : 0,
                                                y:       isActive ? 0 : 4,
                                            }}
                                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 overflow-hidden whitespace-nowrap"
                                        >
                                            {item.label}
                                        </motion.span>
                                    </motion.div>
                                    
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-capsule"
                                            className="absolute inset-0 bg-gradient-to-tr from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-[1.5rem]"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                        >
                                            <div className="absolute inset-0 border border-blue-100/50 dark:border-blue-500/20 rounded-[1.5rem]" />
                                        </motion.div>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </motion.nav>
        </>
    );
}
