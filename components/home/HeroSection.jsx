'use client';

import { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { CreditCard, TrendingUp, Wallet, DollarSign, Gift, Smartphone, Zap, Shield, Sun, ShoppingBag, Plane } from 'lucide-react';
import SearchBar from '@/components/ui/SearchBar';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function HeroSection() {
    const heroRef = useRef(null);
    const { t } = useLanguage();

    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ["start start", "end start"]
    });

    // Icons fade slightly on scroll (but stay visible on mobile)
    const iconOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);
    const iconY = useTransform(scrollYProgress, [0, 0.5], [0, -50]);

    const floatingIcons = [
        { Icon: CreditCard, position: 'top-20 left-10 lg:left-10', delay: 0, color: '#92BCEA', mobilePosition: 'top-32 left-4' },
        { Icon: TrendingUp, position: 'top-32 right-20 lg:right-20', delay: 0.2, color: '#AFB3F7', mobilePosition: 'top-40 right-4' },
        { Icon: Wallet, position: 'top-64 left-32 lg:left-32', delay: 0.4, color: '#7A93AC', mobilePosition: 'top-[60%] left-4' },
        { Icon: DollarSign, position: 'top-40 right-40 lg:right-40', delay: 0.6, color: '#92BCEA', mobilePosition: 'top-[50%] right-4' },
        { Icon: Gift, position: 'bottom-40 left-20 lg:left-20', delay: 0.8, color: '#AFB3F7', mobilePosition: 'bottom-32 left-4' },
        { Icon: Smartphone, position: 'bottom-32 right-32 lg:right-32', delay: 1, color: '#7A93AC', mobilePosition: 'bottom-40 right-4' },
        { Icon: Zap, position: 'top-1/2 left-16 lg:left-16', delay: 1.2, color: '#92BCEA', mobilePosition: 'top-[45%] left-2' },
        { Icon: Shield, position: 'top-1/2 right-16 lg:right-16', delay: 1.4, color: '#AFB3F7', mobilePosition: 'top-[55%] right-2' },
    ];

    // All services from BRD - now with i18n
    const prelinks = [
        { icon: Gift, label: t('prelinks.giftCards'), href: '/gift-cards' },
        { icon: CreditCard, label: t('prelinks.loans'), href: '/loans' },
        { icon: Sun, label: t('prelinks.solar'), href: '/solar' },
        { icon: Smartphone, label: t('prelinks.recharge'), href: '/recharge' },
        { icon: ShoppingBag, label: t('prelinks.shopping'), href: '/shopping' },
        { icon: Plane, label: t('prelinks.travel'), href: '/travel' },
        { icon: Zap, label: t('prelinks.bills'), href: '/bills' },
        { icon: Wallet, label: t('prelinks.wallet'), href: '/wallet' },
    ];

    return (
        <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white pt-32 pb-20">
            {/* Floating Icons - Now visible on mobile with reduced opacity */}
            <div className="absolute inset-0 pointer-events-none">
                {floatingIcons.map(({ Icon, position, delay, color, mobilePosition }, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay, duration: 0.6, type: 'spring' }}
                        style={{ opacity: iconOpacity, y: iconY }}
                        className={`absolute ${mobilePosition} lg:${position}`}
                    >
                        <motion.div
                            animate={{
                                y: [0, -15, 0],
                                rotate: [0, 5, -5, 0],
                            }}
                            transition={{
                                duration: 4 + index * 0.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="p-3 lg:p-4 rounded-2xl bg-white/80 lg:bg-white shadow-md lg:shadow-lg backdrop-blur-sm"
                            style={{
                                borderColor: color,
                                borderWidth: 2,
                                opacity: 0.4 // Reduced opacity on mobile, will be full on desktop via media query
                            }}
                        >
                            <Icon size={24} className="lg:w-8 lg:h-8" style={{ color }} strokeWidth={1.5} />
                        </motion.div>
                    </motion.div>
                ))}
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                {/* Headline */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                >
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[#171A21] mb-6 leading-tight font-[family-name:var(--font-outfit)]">
                        {t('hero.title')}
                        <br />
                        <span className="bg-gradient-to-r from-[#7A93AC] via-[#92BCEA] to-[#AFB3F7] bg-clip-text text-transparent">
                            {t('hero.subtitle')}
                        </span>
                    </h1>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="text-lg sm:text-xl text-[#617073] mb-12 max-w-2xl mx-auto leading-relaxed"
                >
                    {t('hero.description')}
                </motion.p>

                {/* Premium Search Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="max-w-3xl mx-auto mb-8"
                >
                    <SearchBar />
                </motion.div>

                {/* Premium Prelink Pills - All BRD Services with Better Spacing */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-wrap items-center justify-center gap-3 mb-16 max-w-4xl mx-auto"
                >
                    {prelinks.map((prelink, index) => {
                        const Icon = prelink.icon;
                        return (
                            <motion.a
                                key={prelink.label}
                                href={prelink.href}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                    delay: 0.7 + index * 0.08,
                                    duration: 0.5,
                                    type: 'spring',
                                    stiffness: 200
                                }}
                                whileHover={{
                                    scale: 1.05,
                                    y: -3,
                                    boxShadow: '0 10px 25px rgba(146, 188, 234, 0.2)',
                                }}
                                whileTap={{ scale: 0.95 }}
                                className="flex items-center gap-2.5 px-5 py-3 bg-white border-2 border-gray-200 rounded-full hover:border-[#92BCEA] transition-all group shadow-sm hover:shadow-md"
                            >
                                <motion.div
                                    whileHover={{ rotate: 360 }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <Icon size={18} className="text-[#617073] group-hover:text-[#92BCEA] transition-colors" strokeWidth={2.5} />
                                </motion.div>
                                <span className="text-sm font-semibold text-[#171A21]">
                                    {prelink.label}
                                </span>
                            </motion.a>
                        );
                    })}
                </motion.div>
            </div>

            {/* CSS to make icons fully visible on desktop */}
            <style jsx>{`
        @media (min-width: 1024px) {
          .absolute > div {
            opacity: 1 !important;
          }
        }
      `}</style>
        </section>
    );
}
