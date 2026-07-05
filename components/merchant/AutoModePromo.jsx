"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, CheckCircle2, Power, Loader2, Sparkles } from "lucide-react";


export default function AutoModePromo({ autoMode }) {
    const router = require('next/navigation').useRouter();
    const [isAnimating, setIsAnimating] = require('react').useState(false);

    const handleRedirect = () => {
        setIsAnimating(true);
        setTimeout(() => {
            router.push('/merchant/shopping/auto-mode');
        }, 800);
    };

    if (autoMode) {
        return (
            <div className="w-full h-full min-h-[320px] bg-gradient-to-b from-[#1a1814] to-[#0a0908] p-6 flex flex-col justify-between relative overflow-hidden rounded-[2rem] border border-amber-500/20 shadow-[0_0_40px_rgba(217,160,91,0.05)]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full" />
                
                <div className="relative z-10">
                    <h2 className="text-3xl md:text-4xl font-medium text-white/90 leading-[1.15] tracking-tight mb-2">
                        Welcome to <br/>
                        <span className="text-amber-500/80">Intrust Auto</span> <br/>
                        System
                    </h2>
                </div>

                <div className="relative z-10 w-full flex flex-col items-center gap-3">
                    <div className="w-[90%] max-w-[300px] h-14 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full font-bold text-lg flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(217,160,91,0.1)]">
                        <CheckCircle2 className="w-5 h-5" />
                        Active
                    </div>
                    <Link href="/merchant/shopping/auto-mode" className="text-sm text-white/50 hover:text-amber-400 transition-colors">
                        Manage Settings
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-[380px] bg-[#0a0a0a] dark:bg-[#050505] p-2 relative overflow-hidden flex flex-col group rounded-[2.5rem]">
            
            {/* The Main Golden Area */}
            <motion.div 
                className="flex-1 bg-gradient-to-br from-[#2a2415] to-[#120f09] rounded-[2rem] p-6 sm:p-8 flex flex-col relative overflow-hidden z-10 border border-amber-900/30"
                animate={isAnimating ? { opacity: 0, scale: 0.95 } : { opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
            >
                {/* Decorative Premium Glows */}
                <div className="absolute right-0 top-0 w-48 h-48 rounded-full bg-amber-500/10 blur-[60px]" />
                <div className="absolute -left-10 bottom-0 w-40 h-40 rounded-full bg-orange-500/10 blur-[50px]" />
                
                {/* AI / Premium Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mb-6 w-fit backdrop-blur-sm">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-amber-400">AI Powered</span>
                </div>

                {/* Content */}
                <div className="relative z-10 mt-auto mb-8">
                    <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-medium text-white/90 leading-[1.15] tracking-tight mb-2">
                        Welcome to <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500 font-bold">Auto Mode</span> <br/>
                        System
                    </h2>
                </div>
                
                {/* Abstract tech lines (simulating AI traces) */}
                <div className="absolute right-8 bottom-8 w-24 h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                <div className="absolute right-20 bottom-4 w-[1px] h-24 bg-gradient-to-b from-transparent via-amber-500/30 to-transparent" />
            </motion.div>

            {/* Bottom Button Area */}
            <div className="h-[100px] shrink-0 w-full flex items-center justify-center relative z-20">
                <motion.button
                    onClick={handleRedirect}
                    whileHover={!isAnimating ? { scale: 1.05, boxShadow: "0px 0px 30px rgba(217, 160, 91, 0.4)" } : {}}
                    whileTap={!isAnimating ? { scale: 0.95 } : {}}
                    className="w-16 h-16 bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 text-slate-900 rounded-full font-bold shadow-[0_0_20px_rgba(217,160,91,0.2)] flex items-center justify-center relative z-30"
                >
                    <Power size={28} strokeWidth={2.5} />
                </motion.button>

                {/* Ripple Animations on click */}
                <AnimatePresence>
                    {isAnimating && (
                        <>
                            {/* 1. Center burst flash */}
                            <motion.div
                                initial={{ scale: 0, opacity: 1 }}
                                animate={{ scale: 3, opacity: 0 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="absolute w-16 h-16 rounded-full bg-white z-50 mix-blend-overlay"
                            />
                            
                            {/* 2. Vertical energy beam shooting UP */}
                            <motion.div
                                initial={{ height: 0, opacity: 1, bottom: "50%" }}
                                animate={{ height: 600, opacity: 0, bottom: "50%" }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="absolute w-[2px] bg-gradient-to-t from-amber-300 via-amber-100 to-transparent z-30 shadow-[0_0_15px_#fcd34d]"
                            />

                            {/* 3. Horizontal energy beams shooting LEFT and RIGHT */}
                            <motion.div
                                initial={{ width: 0, opacity: 1, right: "50%" }}
                                animate={{ width: 400, opacity: 0, right: "50%" }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="absolute h-[2px] bg-gradient-to-l from-amber-300 via-amber-100 to-transparent z-30 shadow-[0_0_15px_#fcd34d]"
                            />
                            <motion.div
                                initial={{ width: 0, opacity: 1, left: "50%" }}
                                animate={{ width: 400, opacity: 0, left: "50%" }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="absolute h-[2px] bg-gradient-to-r from-amber-300 via-amber-100 to-transparent z-30 shadow-[0_0_15px_#fcd34d]"
                            />

                            {/* 4. Diagonal particles / pixels scatter */}
                            {[...Array(8)].map((_, i) => {
                                const angle = (i * 45) * (Math.PI / 180);
                                return (
                                    <motion.div
                                        key={`particle-${i}`}
                                        initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                                        animate={{ 
                                            x: Math.cos(angle) * 150, 
                                            y: Math.sin(angle) * 150, 
                                            scale: [0, 1.5, 0],
                                            opacity: 0 
                                        }}
                                        transition={{ duration: 0.7, ease: "easeOut" }}
                                        className="absolute w-2 h-2 bg-amber-200 z-40 shadow-[0_0_10px_#fcd34d]"
                                        style={{ borderRadius: i % 2 === 0 ? '50%' : '2px' }} // Mix of circles and tiny squares (pixels)
                                    />
                                );
                            })}

                            {/* Expanding fill circle (delayed slightly to let beams show) */}
                            <motion.div
                                initial={{ scale: 1, opacity: 1 }}
                                animate={{ scale: 50, opacity: 1 }}
                                transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1], delay: 0.15 }}
                                className="absolute w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 z-20 flex items-center justify-center"
                            />
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Loading Overlay appearing over the expanded circle */}
            <AnimatePresence>
                {isAnimating && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.3 }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center"
                    >
                        <Loader2 className="w-10 h-10 text-slate-900 animate-spin mb-4" />
                        <span className="text-slate-900 font-bold uppercase tracking-widest text-xs">Initializing AI...</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
