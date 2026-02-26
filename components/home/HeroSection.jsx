'use client';

import { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { CreditCard, TrendingUp, Wallet, DollarSign, Gift, Smartphone, Zap, Shield, Sun, ShoppingBag, Plane } from 'lucide-react';
import SearchBar from '@/components/ui/SearchBar';
import Pills from '@/components/ui/Pills';
import Image from 'next/image';

import PartnerLoop from '@/components/home/PartnerLoop';

export default function HeroSection() {
    const heroRef = useRef(null);


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

    // All services from BRD
    const prelinks = [
        { icon: Gift, label: 'Gift Cards', href: '/gift-cards' },
        { icon: CreditCard, label: 'Loans', href: '/coming-soon', comingSoon: true },
        { icon: Sun, label: 'Solar', href: '/coming-soon', comingSoon: true },
        { icon: Smartphone, label: 'Recharge', href: '/coming-soon', comingSoon: true },
        { icon: ShoppingBag, label: 'Shopping', href: '/coming-soon', comingSoon: true },
        { icon: Plane, label: 'Travel', href: '/coming-soon', comingSoon: true },
        { icon: Zap, label: 'Bills', href: '/coming-soon', comingSoon: true },
        { icon: Wallet, label: 'Wallet', href: '/coming-soon', comingSoon: true },
    ];

    return (
        <section ref={heroRef} className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/images/hero-bg-flow.png"
                    alt="Background"
                    fill
                    className="object-cover opacity-90"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/80 to-white/95 dark:from-gray-900/95 dark:via-gray-900/80 dark:to-gray-900/95" />
            </div>

            {/* Floating Icons */}
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
                                duration: 6 + index * 0.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="p-3 lg:p-4 rounded-3xl bg-white/40 dark:bg-gray-800/40 shadow-lg backdrop-blur-xl border border-white/50 dark:border-gray-700/50"
                            style={{
                                boxShadow: `0 8px 32px 0 ${color}20`,
                                opacity: 0.5
                            }}
                        >
                            <Icon size={20} className="lg:w-8 lg:h-8" style={{ color }} strokeWidth={1.5} />
                        </motion.div>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Container - Full Height Flex */}
            <div className="relative z-10 w-full h-full max-w-6xl mx-auto px-6 flex flex-col items-center justify-center pt-16 md:pt-20 pb-4 md:pb-6">

                {/* Content Wrapper */}
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 md:gap-8 max-w-4xl">

                    {/* INTRUST - Multi-Color Wordmark */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <h1 className="text-7xl sm:text-7xl md:text-7xl font-extrabold leading-tight tracking-tight font-[family-name:var(--font-poppins)]">

                            <span className="letter-i">I</span>
                            <span className="letter-n">N</span>
                            <span className="letter-t">T</span>
                            <span className="letter-r">R</span>
                            <span className="letter-u">U</span>
                            <span className="letter-s">S</span>
                            <span className="letter-t2">T</span>
                        </h1>
                    </motion.div>

                    {/* Premium Search Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full max-w-2xl mx-auto mt-2 md:mt-4"
                    >
                        <SearchBar />
                    </motion.div>

                    {/* Premium Prelink Pills */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="mt-2 md:mt-4"
                    >
                        <Pills items={prelinks} />
                    </motion.div>
                </div>

                {/* Partner Loop - Pushed to Bottom */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="w-full mt-auto pt-6 md:pt-8"
                >
                    <PartnerLoop className="bg-transparent py-2 md:py-3" showBorder={false} />
                </motion.div>
            </div>

            {/* Custom Styles */}
            <style jsx>{`
                /* Clean Fintech INTRUST Gradients */
                .letter-i {
                    background: linear-gradient(135deg, #5B7C99 0%, #7A93AC 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    display: inline-block;
                }

                .letter-n {
                    background: linear-gradient(135deg, #7A93AC 0%, #92BCEA 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    display: inline-block;
                }

                .letter-t {
                    background: linear-gradient(135deg, #92BCEA 0%, #AFB3F7 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    display: inline-block;
                }

                .letter-r {
                    background: linear-gradient(135deg, #AFB3F7 0%, #C5C9FF 50%, #92BCEA 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    display: inline-block;
                }

                .letter-u {
                    background: linear-gradient(135deg, #92BCEA 0%, #AFB3F7 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    display: inline-block;
                }

                .letter-s {
                    background: linear-gradient(135deg, #7A93AC 0%, #92BCEA 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    display: inline-block;
                }

                .letter-t2 {
                    background: linear-gradient(135deg, #5B7C99 0%, #7A93AC 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    display: inline-block;
                }

                /* Elegant hover effect with subtle glow */
                h1:hover span {
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }

                h1:hover .letter-i { 
                    transform: translateY(-5px) scale(1.03); 
                    transition-delay: 0s;
                    filter: drop-shadow(0 0 12px rgba(122, 147, 172, 0.5));
                }
                h1:hover .letter-n { 
                    transform: translateY(-5px) scale(1.03); 
                    transition-delay: 0.05s;
                    filter: drop-shadow(0 0 12px rgba(146, 188, 234, 0.5));
                }
                h1:hover .letter-t { 
                    transform: translateY(-5px) scale(1.03); 
                    transition-delay: 0.1s;
                    filter: drop-shadow(0 0 12px rgba(175, 179, 247, 0.5));
                }
                h1:hover .letter-r { 
                    transform: translateY(-5px) scale(1.03); 
                    transition-delay: 0.15s;
                    filter: drop-shadow(0 0 12px rgba(146, 188, 234, 0.5));
                }
                h1:hover .letter-u { 
                    transform: translateY(-5px) scale(1.03); 
                    transition-delay: 0.2s;
                    filter: drop-shadow(0 0 12px rgba(175, 179, 247, 0.5));
                }
                h1:hover .letter-s { 
                    transform: translateY(-5px) scale(1.03); 
                    transition-delay: 0.25s;
                    filter: drop-shadow(0 0 12px rgba(146, 188, 234, 0.5));
                }
                h1:hover .letter-t2 { 
                    transform: translateY(-5px) scale(1.03); 
                    transition-delay: 0.3s;
                    filter: drop-shadow(0 0 12px rgba(122, 147, 172, 0.5));
                }

                @media (min-width: 1024px) {
                    .absolute > div {
                        opacity: 1 !important;
                    }
                }
            `}</style>
        </section>
    );
}