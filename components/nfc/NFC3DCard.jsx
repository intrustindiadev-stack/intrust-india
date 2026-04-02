'use client';

import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { Cpu, Wifi } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';

export default function NFC3DCard({ 
    name = "YOUR NAME HERE", 
    externalX = null, 
    externalY = null,
    externalRotateX = null,
    externalRotateY = null,
    isStatic = false,
    scale = 1
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const cardRef = useRef(null);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Mouse movement values for parallax (internal)
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smoothen the movement
    const mouseXSpring = useSpring(x, { stiffness: 100, damping: 30 });
    const mouseYSpring = useSpring(y, { stiffness: 100, damping: 30 });

    // Internal vs External control
    const activeRotateX = externalRotateX !== null ? externalRotateX : useTransform(mouseYSpring, [-0.5, 0.5], [15, -15]);
    const activeRotateY = externalRotateY !== null ? externalRotateY : useTransform(mouseXSpring, [-0.5, 0.5], [-15, 15]);

    // Combined rotation for flip + parallax
    const finalRotateY = useSpring(useTransform(activeRotateY, (val) => isFlipped ? val + 180 : val), {
        stiffness: 100,
        damping: 30
    });

    // Refraction/Shine effect position
    const shineX = useTransform(externalX || mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
    const shineY = useTransform(externalY || mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);
    const shineOpacity = useTransform(externalX || mouseXSpring, [-0.5, 0.5], [0.3, 0.6]);

    const handleMouseMove = (e) => {
        if (!cardRef.current || externalX !== null) return;
        const rect = cardRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;

        x.set(xPct);
        y.set(yPct);
    };

    return (
        <div 
            className="perspective-2000 w-full max-w-[420px] aspect-[1.58/1] cursor-pointer group relative"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { setIsHovered(false); x.set(0); y.set(0); }}
            onMouseEnter={() => setIsHovered(true)}
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <motion.div
                ref={cardRef}
                style={{
                    rotateX: activeRotateX,
                    rotateY: finalRotateY,
                    transformStyle: "preserve-3d",
                    scale: scale,
                    willChange: "transform",
                }}
                animate={{ 
                    y: isHovered ? -10 : [0, -15, 0],
                    rotateZ: isHovered ? 0 : [0, 0.5, 0, -0.5, 0],
                }}
                transition={{ 
                    y: { repeat: Infinity, duration: 6, ease: "easeInOut" },
                    rotateZ: { repeat: Infinity, duration: 10, ease: "easeInOut" },
                }}
                className="relative w-full h-full rounded-[24px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.5)] group-hover:shadow-blue-500/20 transition-shadow duration-700"
            >
                {/* Front Side */}
                <div 
                    className="absolute inset-0 w-full h-full rounded-[24px] overflow-hidden backface-hidden flex flex-col justify-between"
                    style={{ 
                        background: isDark 
                            ? 'linear-gradient(135deg, #0f1115 0%, #050505 100%)' 
                            : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                        backfaceVisibility: 'hidden',
                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                        boxShadow: isDark 
                            ? 'inset 0 0 100px rgba(0,0,0,0.8), inset 0 0 20px rgba(59,130,246,0.1)' 
                            : 'inset 0 0 40px rgba(255,255,255,0.8)',
                    }}
                >
                    {/* Carbon Fiber Pattern Overlay */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
                    
                    {/* Radial Center Glow */}
                    <div className={`absolute inset-0 z-0 ${isDark ? 'bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.1),transparent_70%)]' : 'bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.05),transparent_70%)]'}`} />
                    
                    {/* Atmospheric Lighting */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 pointer-events-none" />
                    
                    {/* Specular Light Refraction */}
                    <motion.div 
                        style={{ 
                            background: `radial-gradient(circle at ${shineX} ${shineY}, rgba(255,255,255,0.2) 0%, transparent 60%)`,
                            opacity: shineOpacity 
                        }}
                        className="absolute inset-0 pointer-events-none z-20" 
                    />

                    {/* Branding Overlay */}
                    <div className="relative z-30 h-full w-full flex flex-col p-8 sm:p-10">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <Wifi size={16} className="text-white rotate-90" />
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${isDark ? 'text-white' : 'text-slate-900'}`}>INTRUST</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 backdrop-blur-md border border-white/10">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[7px] font-black tracking-widest text-emerald-500">SYNC ACTIVE</span>
                            </div>
                        </div>

                        <div className="mt-auto">
                             <div className="flex flex-col gap-1.5 mb-8">
                                <span className="text-[8px] font-black uppercase tracking-[0.6em] text-white/40 drop-shadow-md">Identity Holder</span>
                                <motion.h3 
                                    className="text-3xl sm:text-4xl font-black tracking-tight uppercase text-white truncate drop-shadow-2xl"
                                    key={name}
                                >
                                    {name || "YOUR NAME HERE"}
                                </motion.h3>
                            </div>

                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-8 bg-black/40 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/10 shadow-2xl overflow-hidden">
                                        <Cpu size={22} className="text-white/40" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[6px] font-black text-white/20 uppercase tracking-widest">Protocol</span>
                                        <span className="text-[8px] font-black text-white/60 tracking-widest leading-none">20.40.X</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.45em]">InTrust One</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Back Side */}
                <div 
                    className="absolute inset-0 w-full h-full rounded-[24px] overflow-hidden flex flex-col"
                    style={{ 
                        background: isDark ? '#050505' : '#f8fafc',
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        zIndex: isFlipped ? 50 : 0,
                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
                    }}
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
                    <div className="absolute inset-0 bg-black/20" />
                    
                    {/* Magnetic Stripe */}
                    <div className="w-full h-14 bg-[#0a0a0a] mt-10 shadow-2xl flex items-center px-10 relative overflow-hidden">
                        <motion.div 
                            animate={{ x: ["-100%", "200%"] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12" 
                        />
                    </div>
                    
                    {/* Info Area */}
                    <div className="mt-auto px-10 pb-12 flex flex-col gap-6 relative z-10">
                        <div className="space-y-4">
                            <p className="text-[8px] font-bold text-white/40 leading-tight max-w-[220px] uppercase tracking-wider">
                                High-fidelity physical extension of your decentralized identity. Forged by InTrust.
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                <p className="text-[9px] font-black text-blue-500/80 tracking-[0.4em] uppercase italic">TIMLESS ARCHITECTURE</p>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-end">
                            <div className="flex flex-col">
                                <span className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-1">Encrypted Serial</span>
                                <span className="text-[12px] font-black text-white tracking-widest font-mono">ITX-SYNC-2040</span>
                            </div>
                            <div className="w-16 h-16 bg-white p-2 rounded-xl shadow-2xl hover:scale-110 transition-transform">
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center font-black text-[7px] text-black">
                                    QR SYNC
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Interaction State Hint */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
                    >
                         <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.5em] flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                            {isFlipped ? "VIEW OBVERSE" : "INSPECT REVERSE"}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx>{`
                .perspective-2000 { perspective: 2000px; }
                .backface-hidden {
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
            `}</style>
        </div>
    );
}
