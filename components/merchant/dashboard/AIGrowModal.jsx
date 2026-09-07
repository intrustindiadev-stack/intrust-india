'use client';

import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { X, Sparkles, TrendingUp, ShieldCheck, Zap, ArrowRight, Store, Package, ShoppingCart, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';

export default function AIGrowModal({ isOpen, onClose }) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const containerRef = useRef(null);
    const x = useMotionValue(0);

    // Dynamic background fill based on swipe
    const backgroundWidth = useTransform(x, [0, 220], ["64px", "100%"]);
    const textOpacity = useTransform(x, [0, 80], [1, 0]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            setIsSuccess(false);
            x.set(0);
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, x]);

    const handleDragEnd = (event, info) => {
        if (isSuccess) return;

        if (info.offset.x > 110) {
            setIsSuccess(true);

            // 1. Move smoothly to the right
            animate(x, 220, { 
                type: "spring", 
                stiffness: 400, 
                damping: 25 
            }).then(() => {
                // 2. Return smoothly back to the left while turning/staying green
                setTimeout(() => {
                    animate(x, 0, { 
                        type: "spring", 
                        stiffness: 320, 
                        damping: 24 
                    });
                }, 180);
            });

            // 3. Smooth redirect after the return swipe animation completes
            setTimeout(() => {
                router.push('/merchant/investments?new=true');
                onClose();
            }, 850);
        } else {
            animate(x, 0, { type: "spring", stiffness: 450, damping: 26 });
        }
    };

    const features = [
        { icon: Zap, title: "Zero Effort", desc: "AI routes orders automatically" },
        { icon: TrendingUp, title: "High Volume", desc: "Maximize capital efficiency" },
        { icon: ShieldCheck, title: "Secure", desc: "Transparent profit sharing" },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.06, delayChildren: 0.05 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } }
    };

    if (!mounted) return null;

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex flex-col justify-end pointer-events-auto">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-[100000]"
                    />

                    {/* Bottom Sheet Modal - Smooth, Fast Entrance Animation */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ 
                            type: "spring", 
                            damping: 28, 
                            stiffness: 380, 
                            mass: 0.5 
                        }}
                        className="relative w-full max-w-2xl mx-auto h-[82vh] sm:h-[80vh] min-h-[520px] bg-white dark:bg-slate-900 rounded-t-[2.5rem] shadow-[0_-16px_60px_rgba(0,0,0,0.3)] z-[100001] overflow-hidden flex flex-col border-t border-slate-200 dark:border-white/10"
                    >
                        {/* Pull Handle Bar */}
                        <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                            <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/20 rounded-full" />
                        </div>

                        {/* Top Header with Prominent Cross (X) Button */}
                        <div className="flex items-center justify-between px-6 sm:px-8 py-2 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider border border-amber-500/20">
                                    <Sparkles size={13} className="text-amber-500 animate-pulse" />
                                    InTrust AI Grow
                                </span>
                            </div>

                            {/* Accessible Cross Button */}
                            <button
                                onClick={onClose}
                                aria-label="Close AI Grow modal"
                                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xs"
                            >
                                <X size={18} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Modal Body Content */}
                        <div className="flex-1 overflow-y-auto no-scrollbar px-6 sm:px-10 pb-36">
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="space-y-6 pt-2 text-center"
                            >
                                {/* Planetary Orbit Micro Animation */}
                                <motion.div variants={itemVariants} className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto">
                                    {/* Central AI Node */}
                                    <div className="absolute inset-0 m-auto w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-[#D4AF37] to-[#b5952f] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)] z-10 border border-white/25">
                                        <Sparkles className="text-white w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                    
                                    {/* Orbital Ring */}
                                    <div className="absolute inset-0 m-auto w-full h-full border border-slate-200 dark:border-white/10 rounded-full border-dashed animate-[spin_12s_linear_infinite]" />
                                    
                                    {/* Rotating Store Nodes */}
                                    <motion.div 
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 m-auto w-full h-full z-20"
                                    >
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-7 h-7 bg-white dark:bg-slate-800 rounded-full shadow-md flex items-center justify-center border border-slate-100 dark:border-slate-700">
                                            <ShoppingCart className="w-3.5 h-3.5 text-emerald-500" />
                                        </div>
                                        <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-7 h-7 bg-white dark:bg-slate-800 rounded-full shadow-md flex items-center justify-center border border-slate-100 dark:border-slate-700">
                                            <Package className="w-3.5 h-3.5 text-indigo-500" />
                                        </div>
                                        <div className="absolute bottom-1 left-2 w-7 h-7 bg-white dark:bg-slate-800 rounded-full shadow-md flex items-center justify-center border border-slate-100 dark:border-slate-700">
                                            <Store className="w-3.5 h-3.5 text-orange-500" />
                                        </div>
                                    </motion.div>
                                </motion.div>

                                {/* Headline & Subtitle */}
                                <div className="space-y-2 max-w-md mx-auto">
                                    <motion.h2 variants={itemVariants} className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                        Automate Your Store Growth.
                                    </motion.h2>
                                    
                                    <motion.p variants={itemVariants} className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium leading-relaxed max-w-sm mx-auto">
                                        Deploy smart working capital. Our neural routing algorithm drives orders to your catalog and distributes profits automatically.
                                    </motion.p>
                                </div>

                                {/* 3 Mini Benefit Cards */}
                                <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                                    {features.map((feat, idx) => {
                                        const Icon = feat.icon;
                                        return (
                                            <div 
                                                key={idx}
                                                className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center shadow-xs"
                                            >
                                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5">
                                                    <Icon size={16} />
                                                </div>
                                                <h4 className="text-slate-900 dark:text-white font-bold text-[11px] leading-tight mb-0.5">{feat.title}</h4>
                                                <p className="text-slate-500 dark:text-slate-400 text-[10px] leading-tight font-medium">{feat.desc}</p>
                                            </div>
                                        );
                                    })}
                                </motion.div>
                            </motion.div>
                        </div>

                        {/* Swipe to Activate Footer Bar */}
                        <div className="absolute bottom-0 left-0 w-full p-6 pb-8 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-slate-900 dark:via-slate-900/95">
                            <div 
                                ref={containerRef}
                                className={`relative w-full max-w-md mx-auto h-16 rounded-full overflow-hidden shadow-inner flex items-center justify-center touch-none border transition-all duration-400 ${
                                    isSuccess 
                                        ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]' 
                                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10'
                                }`}
                            >
                                {/* Fill Background (Smooth Transition to Emerald Green) */}
                                <motion.div 
                                    style={{ width: isSuccess ? '100%' : backgroundWidth }}
                                    className={`absolute left-0 top-0 bottom-0 rounded-full z-0 origin-left transition-all duration-400 ${
                                        isSuccess 
                                            ? 'bg-emerald-500 w-full' 
                                            : 'bg-gradient-to-r from-[#D4AF37] to-[#b5952f]'
                                    }`}
                                />
                                
                                {/* Status Text */}
                                <motion.p 
                                    className={`absolute z-10 text-[12px] sm:text-[13px] font-black uppercase tracking-widest pointer-events-none transition-all duration-300 ${
                                        isSuccess 
                                            ? 'text-white opacity-100 drop-shadow-sm scale-100' 
                                            : 'text-slate-600 dark:text-slate-300'
                                    }`}
                                    style={isSuccess ? {} : { opacity: textOpacity }}
                                >
                                    {isSuccess ? 'Success! Activating InTrust AI Grow...' : 'Slide to Activate AI Grow'}
                                </motion.p>

                                {/* Drag Handle Button */}
                                <motion.div
                                    drag={isSuccess ? false : "x"}
                                    dragConstraints={containerRef}
                                    dragElastic={0.05}
                                    dragMomentum={false}
                                    onDragEnd={handleDragEnd}
                                    style={{ x }}
                                    whileTap={isSuccess ? {} : { scale: 0.95 }}
                                    className={`absolute left-1.5 top-1.5 bottom-1.5 w-13 aspect-square rounded-full shadow-lg flex items-center justify-center z-20 cursor-grab active:cursor-grabbing border transition-colors duration-300 ${
                                        isSuccess 
                                            ? 'bg-white text-emerald-600 border-emerald-100 shadow-md' 
                                            : 'bg-white dark:bg-slate-100 text-slate-800 border-slate-200'
                                    }`}
                                >
                                    {isSuccess ? (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", stiffness: 450, damping: 22 }}
                                        >
                                            <Check size={22} className="text-emerald-600 stroke-[3]" />
                                        </motion.div>
                                    ) : (
                                        <ArrowRight size={22} className="text-slate-800" />
                                    )}
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
}
