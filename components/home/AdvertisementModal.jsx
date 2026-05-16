'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, CreditCard, Gift, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const ADS = [
    {
        id: 1,
        title: "Groceries",
        subtitle: "Get your Groceries at lower prices",
        image: "/images/ads/adv_groceries.png",
        btnText: "Shop Now",
        href: "/shop",
        icon: ShieldCheck,
        gradient: "from-green-400 to-emerald-600",
        shadow: "shadow-emerald-500/40",
    },
    {
        id: 2,
        title: "NFC Card",
        subtitle: "One Tap, Endless Connections",
        image: "/images/ads/adv_nfc_card.png",
        btnText: "Get Your Card",
        href: "/nfc-service",
        icon: CreditCard,
        gradient: "from-blue-400 to-indigo-600",
        shadow: "shadow-blue-500/40",
    },
    {
        id: 3,
        title: "Gift Card",
        subtitle: "Gift yourself the power of choice",
        image: "/images/ads/adv_gift_cards.png",
        btnText: "Browse Gifts",
        href: "/gift-cards",
        icon: Gift,
        gradient: "from-rose-400 to-pink-600",
        shadow: "shadow-rose-500/40",
    },
    {
        id: 4,
        title: "Smart Tech",
        subtitle: "High tech. Low prices. Best experience",
        image: "/images/ads/adv_smart_tech.png",
        btnText: "Explore Tech",
        href: "/shop",
        icon: ShieldCheck,
        gradient: "from-amber-400 to-orange-600",
        shadow: "shadow-amber-500/40",
    }
];

export default function AdvertisementModal() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    // Page tracking for Insta-story style direction and looping
    const [[page, direction], setPage] = useState([0, 0]);

    // JavaScript modulo fix for negative numbers wrapping correctly
    const imageIndex = ((page % ADS.length) + ADS.length) % ADS.length;
    const currentAd = ADS[imageIndex];

    const paginate = (newDirection) => {
        setPage([page + newDirection, newDirection]);
    };

    useEffect(() => {
        const hasSeenAdv = sessionStorage.getItem('intrust_adv_seen');
        if (!hasSeenAdv) {
            const timer = setTimeout(() => {
                setIsOpen(true);
                sessionStorage.setItem('intrust_adv_seen', 'true');
            }, 800);
            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            paginate(1);
        }, 6000); // Wait 6 seconds, then go next

        // Every time page changes, clear and reset interval so manual taps rest the timer
        return () => clearInterval(interval);
    }, [isOpen, page]);

    // Slide physics animations
    const variants = {
        enter: (direction) => {
            return {
                x: direction > 0 ? '100%' : '-100%',
                opacity: 0,
                scale: 0.95
            };
        },
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction) => {
            return {
                zIndex: 0,
                x: direction < 0 ? '100%' : '-100%',
                opacity: 0,
                scale: 0.95
            };
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 sm:backdrop-blur-2xl sm:p-6 pb-0"
                >
                    {/* Background Glow */}
                    <motion.div
                        key={`bg-glow-${imageIndex}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.4 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className={`absolute inset-0 bg-gradient-to-br ${currentAd.gradient} blur-[140px] pointer-events-none hidden sm:block`}
                    />

                    {/* Desktop surrounding click-away closure */}
                    <div className="absolute inset-0 sm:block hidden" onClick={() => setIsOpen(false)}></div>

                    {/* Main Story Container - Full height on mobile, boxed on desktop */}
                    <motion.div
                        initial={{ y: "100%", opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: "100%", opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="w-full h-full sm:h-auto sm:max-w-[400px] sm:aspect-[4/5] sm:max-h-[90vh] relative bg-black sm:rounded-[2rem] overflow-hidden drop-shadow-2xl"
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 sm:top-5 right-4 sm:right-5 z-50 p-2.5 sm:p-3 bg-white/10 hover:bg-white/20 backdrop-blur-2xl border border-white/10 rounded-full text-white transition-all active:scale-90"
                        >
                            <X size={20} strokeWidth={2} />
                        </button>

                        {/* Story Progress Indicators */}
                        <div className="absolute top-5 sm:top-6 inset-x-4 sm:inset-x-6 z-40 flex gap-1.5 pointer-events-none">
                            {ADS.map((_, idx) => (
                                <div key={idx} className="h-0.5 flex-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                                    <motion.div
                                        initial={{ width: imageIndex > idx ? "100%" : "0%" }}
                                        animate={{ width: imageIndex === idx ? "100%" : (imageIndex > idx ? "100%" : "0%") }}
                                        transition={imageIndex === idx ? { duration: 6, ease: "linear" } : { duration: 0 }}
                                        className="h-full bg-white shadow-sm"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Manual Tap Navigation Zones */}
                        <div
                            className="absolute inset-y-0 left-0 w-1/3 z-30"
                            onClick={() => paginate(-1)}
                        />
                        <div
                            className="absolute inset-y-0 right-0 w-1/3 z-30"
                            onClick={() => paginate(1)}
                        />

                        {/* Image Slide Area */}
                        <div className="relative w-full h-full bg-black">
                            <AnimatePresence initial={false} custom={direction}>
                                <motion.div
                                    key={page}
                                    custom={direction}
                                    variants={variants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{
                                        x: { type: "spring", stiffness: 300, damping: 30 },
                                        opacity: { duration: 0.2 },
                                        scale: { duration: 0.3 }
                                    }}
                                    className="absolute inset-0 w-full h-full"
                                >
                                    <Image
                                        src={currentAd.image}
                                        alt={currentAd.title}
                                        fill
                                        className="object-cover"
                                        priority
                                        sizes="(max-width: 640px) 100vw, 600px"
                                    />
                                    {/* Bottom gradient overlay for text readability */}
                                    <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
                                    <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
                                </motion.div>
                            </AnimatePresence>

                            {/* Pinned Content & Interactivity at Bottom */}
                            <div className="absolute inset-x-0 bottom-0 z-40 p-6 sm:p-8 flex flex-col items-center text-center pb-safe pointer-events-none">

                                <motion.div
                                    key={`badge-${imageIndex}`}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1, type: 'spring' }}
                                    className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${currentAd.gradient} text-white text-[11px] font-black uppercase tracking-widest shadow-lg ${currentAd.shadow} mb-4 flex items-center gap-1.5 border border-white/20`}
                                >
                                    <currentAd.icon size={14} className="animate-pulse" />
                                    {currentAd.title}
                                </motion.div>

                                <motion.h2
                                    key={`title-${imageIndex}`}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2, type: 'spring' }}
                                    className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-2 drop-shadow-xl"
                                >
                                    {currentAd.subtitle.split(' ').map((word, i, arr) => (
                                        <span key={i} className="inline-block">
                                            {i >= arr.length - 2 ?
                                                <span className={`text-transparent bg-clip-text bg-gradient-to-r ${currentAd.gradient} ml-1`}>{word}</span> :
                                                word + '\u00A0'}
                                        </span>
                                    ))}
                                </motion.h2>

                                {/* CTA Button (pointer-events-auto so it can be clicked over the zone) */}
                                <motion.button
                                    key={`btn-${imageIndex}`}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ delay: 0.3, type: 'spring' }}
                                    onClick={() => {
                                        setIsOpen(false);
                                        router.push(currentAd.href);
                                    }}
                                    className={`mt-6 w-full py-4 rounded-2xl bg-white text-black font-extrabold text-[15px] tracking-wide shadow-xl flex items-center justify-center gap-2 overflow-hidden relative group pointer-events-auto max-w-sm`}
                                >
                                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_ease-in-out] bg-gradient-to-r from-transparent via-black/5 to-transparent skew-x-12" />
                                    <span className="uppercase">{currentAd.btnText}</span>
                                    <motion.div
                                        animate={{ x: [0, 5, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        <ChevronRight size={18} strokeWidth={3} className="text-black" />
                                    </motion.div>
                                </motion.button>

                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                    className="mt-4 text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] cursor-pointer hover:text-white/80 transition-colors pointer-events-auto px-4 py-2"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Dismiss
                                </motion.p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
