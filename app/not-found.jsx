'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
    Home, 
    LayoutGrid, 
    ShoppingCart, 
    Wallet, 
    Gift, 
    Store, 
    ChevronRight, 
    Headphones 
} from 'lucide-react';
import CustomerAppShell from '@/components/layout/customer/CustomerAppShell';

export default function NotFound() {
    const popularSections = [
        {
            title: 'InTrust Mart',
            desc: 'Shop top brands',
            href: '/shop',
            icon: ShoppingCart,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-500/10',
        },
        {
            title: 'Digital Wallet',
            desc: 'Pay, recharge & more',
            href: '/wallet',
            icon: Wallet,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        },
        {
            title: 'Gift Cards',
            desc: 'For every occasion',
            href: '/gift-cards',
            icon: Gift,
            color: 'text-pink-600 dark:text-pink-400',
            bg: 'bg-pink-50 dark:bg-pink-500/10',
        },
        {
            title: 'Become a Merchant',
            desc: 'Grow with InTrust',
            href: '/merchant-apply',
            icon: Store,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-500/10',
        },
    ];

    return (
        <CustomerAppShell fullWidth={true}>
            <div className="min-h-[90vh] bg-[#f9fbff] dark:bg-[#090d14] text-slate-900 dark:text-white pt-6 sm:pt-10 pb-36 sm:pb-28 lg:pb-16 px-4 sm:px-6 lg:px-8 flex flex-col justify-center overflow-x-hidden">
                
                {/* ── Upper Hero Section ── */}
                <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 lg:gap-14 items-center">
                    
                    {/* Left Column on Desktop / Bottom on Mobile: Typography & Actions */}
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="order-2 lg:order-1 lg:col-span-6 text-center lg:text-left space-y-4"
                    >
                        {/* OOPS! Tag */}
                        <span className="inline-block text-xs font-black tracking-widest text-blue-600 dark:text-blue-400 uppercase">
                            OOPS!
                        </span>

                        {/* 404 with Radiating Accents */}
                        <div className="relative inline-block select-none">
                            <h2 className="text-7xl sm:text-8xl lg:text-9xl font-black tracking-tight text-blue-600 dark:text-blue-500 leading-none">
                                404
                            </h2>
                            {/* Radiating Accent Lines */}
                            <div className="absolute -top-2 -right-5 sm:-right-7 flex flex-col gap-0.5 text-blue-500 select-none">
                                <span className="text-xl sm:text-2xl font-black rotate-45 transform origin-bottom-left leading-none">/</span>
                                <span className="text-xl sm:text-2xl font-black rotate-12 transform origin-bottom-left leading-none -mt-2">|</span>
                            </div>
                        </div>

                        {/* Heading & Subtitle */}
                        <div className="space-y-2 max-w-lg mx-auto lg:mx-0">
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                                Page Not Found
                            </h1>
                            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                                The page you&apos;re looking for doesn&apos;t exist or may have been moved.
                            </p>
                        </div>

                        {/* CTA Action Buttons */}
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-3.5 max-w-sm mx-auto lg:mx-0">
                            {/* Go to Home Button */}
                            <Link
                                href="/"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all"
                            >
                                <Home size={18} />
                                <span>Go to Home</span>
                            </Link>

                            {/* Explore Services Button */}
                            <Link
                                href="/services"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 text-blue-600 dark:text-blue-400 font-bold text-sm shadow-xs transition-all"
                            >
                                <LayoutGrid size={18} />
                                <span>Explore Services</span>
                            </Link>
                        </div>
                    </motion.div>

                    {/* Right Column on Desktop / Top on Mobile: 3D Robot Asset */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="order-1 lg:order-2 lg:col-span-6 flex justify-center items-center relative"
                    >
                        <div className="relative w-full max-w-[340px] sm:max-w-[420px] lg:max-w-[480px] aspect-square flex items-center justify-center">
                            <Image
                                src="/banners/404.png"
                                alt="InTrust 404 Robot pointing to signpost"
                                width={540}
                                height={540}
                                priority
                                className="object-contain w-full h-full drop-shadow-xl select-none pointer-events-none"
                            />
                        </div>
                    </motion.div>
                </div>

                {/* ── Popular Sections Strip ── */}
                <div className="max-w-6xl w-full mx-auto mt-14 sm:mt-18">
                    <h3 className="text-center font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base mb-5 select-none">
                        Or check out these popular sections
                    </h3>

                    {/* 2-col on Mobile, 4-col on Desktop matching screenshot */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {popularSections.map((sec, idx) => {
                            const Icon = sec.icon;
                            return (
                                <Link
                                    key={idx}
                                    href={sec.href}
                                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs hover:shadow-md hover:border-blue-400/50 dark:hover:border-blue-500/40 transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                                        <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${sec.bg} ${sec.color} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                                            <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {sec.title}
                                            </h4>
                                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                                                {sec.desc}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0 ml-1" />
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* ── Bottom Support Pill ── */}
                <div className="mt-10 sm:mt-12 text-center space-y-2.5">
                    <p className="text-xs text-slate-500 dark:text-slate-400 select-none">
                        Still can&apos;t find what you&apos;re looking for?
                    </p>
                    <div>
                        <Link
                            href="/contact"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-blue-500 text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all"
                        >
                            <Headphones size={15} />
                            <span>Contact Support</span>
                        </Link>
                    </div>
                </div>

            </div>
        </CustomerAppShell>
    );
}
