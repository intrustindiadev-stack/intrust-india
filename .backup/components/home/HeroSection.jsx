'use client';

import { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { CreditCard, TrendingUp, Wallet, DollarSign, Gift, Smartphone, Zap, Shield, Sun, ShoppingBag, Plane } from 'lucide-react';
import SearchBar from '@/components/ui/SearchBar';
import Pills from '@/components/ui/Pills';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import PartnerLoop from '@/components/home/PartnerLoop';

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
        { Icon: CreditCard, position: 'top-24 left-[5%] lg:left-[5%]', delay: 0, color: '#92BCEA', mobilePosition: 'top-20 -left-4 opacity-40' },
        { Icon: TrendingUp, position: 'top-32 right-[8%] lg:right-[8%]', delay: 0.2, color: '#AFB3F7', mobilePosition: 'top-24 -right-4 opacity-40' },
        { Icon: Wallet, position: 'bottom-32 left-[8%] lg:left-[8%]', delay: 0.4, color: '#7A93AC', mobilePosition: 'bottom-40 left-0 opacity-30' },
        { Icon: DollarSign, position: 'bottom-40 right-[10%] lg:right-[10%]', delay: 0.6, color: '#92BCEA', mobilePosition: 'bottom-48 right-0 opacity-30' },
        { Icon: Gift, position: 'top-[40%] left-[2%] lg:left-[2%]', delay: 0.8, color: '#AFB3F7', mobilePosition: 'top-[40%] -left-4 opacity-30' },
        { Icon: Smartphone, position: 'top-[45%] right-[3%] lg:right-[3%]', delay: 1, color: '#7A93AC', mobilePosition: 'top-[45%] -right-4 opacity-30' },
        { Icon: Zap, position: 'hidden lg:block top-20 right-[25%]', delay: 1.2, color: '#92BCEA', mobilePosition: 'hidden' }, // Moved away from center
        { Icon: Shield, position: 'hidden lg:block bottom-20 left-[25%]', delay: 1.4, color: '#AFB3F7', mobilePosition: 'hidden' }, // Moved away from center
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
        <section ref={heroRef} className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden pt-20 md:pt-32 pb-2 md:pb-10">
            {/* ... Background ... */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/images/hero-bg-flow.png"
                    alt="Background"
                    fill
                    className="object-cover opacity-90"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/70 to-white/90 backdrop-blur-[2px]" />
            </div>

            {/* ... Floating Icons ... */}
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
                                duration: 6 + index * 0.5, // Slower, more gentle
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="p-3 lg:p-4 rounded-3xl bg-white/40 shadow-lg backdrop-blur-xl border border-white/50"
                            style={{
                                boxShadow: `0 8px 32px 0 ${color}20`,
                                opacity: 0.6
                            }}
                        >
                            <Icon size={24} className="lg:w-8 lg:h-8" style={{ color }} strokeWidth={1.5} />
                        </motion.div>
                    </motion.div>
                ))}
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-5xl mx-auto px-6 text-center flex-grow flex flex-col justify-center gap-4 md:gap-8">
                {/* Headline - Balanced */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                >
                    <h1 className="text-[2.5rem] sm:text-5xl lg:text-7xl font-bold text-[#171A21] leading-[1.1] font-[family-name:var(--font-outfit)] mt-8 md:mt-0">
                        {t('hero.title')}
                        <br />
                        <span className="bg-gradient-to-r from-[#7A93AC] via-[#92BCEA] to-[#AFB3F7] bg-clip-text text-transparent">
                            {t('hero.subtitle')}
                        </span>
                    </h1>
                </motion.div>

                {/* Subtitle - Cleaner */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="text-base sm:text-xl text-[#617073] max-w-2xl mx-auto leading-relaxed"
                >
                    {t('hero.description')}
                </motion.p>

                {/* Premium Search Bar - Centered */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-2xl mx-auto"
                >
                    <SearchBar />
                </motion.div>

                {/* Premium Prelink Pills - Justified */}
                <Pills items={prelinks} className="" />
            </div>

            {/* Integrated Partner Loop at Bottom */}
            <div className="relative w-full mt-4 md:mt-0 pb-2 md:pb-6 lg:absolute lg:bottom-0 lg:left-0 lg:z-20 pointer-events-auto">
                <PartnerLoop className="bg-transparent py-2 md:py-4" showBorder={false} />
            </div>

            {/* CSS to make icons fully visible on desktop */}
            <style jsx>{`
        @media (min-width: 1024px) {
          .absolute > div {
            opacity: 1 !important;
          }
        }
      `}</style>
        </section >
    );
}
