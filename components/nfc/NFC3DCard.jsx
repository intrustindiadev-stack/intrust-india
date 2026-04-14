'use client';

import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useTheme } from '@/lib/contexts/ThemeContext';

/**
 * NFC3DCard
 * ──────────
 * Front face: /nfc/front.png  (personalized side — name overlay rendered on top)
 * Back face:  /nfc/back.png   (INTRUST SMART CARD brand side)
 * 
 * To update card visuals: replace /public/nfc/front.png and /public/nfc/back.png — no code changes needed.
 */
export default function NFC3DCard({
    name = "YOUR NAME",
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

    const mouseXSpring = useSpring(x, { stiffness: 100, damping: 30 });
    const mouseYSpring = useSpring(y, { stiffness: 100, damping: 30 });

    const activeRotateX = externalRotateX !== null ? externalRotateX : useTransform(mouseYSpring, [-0.5, 0.5], [15, -15]);
    const activeRotateY = externalRotateY !== null ? externalRotateY : useTransform(mouseXSpring, [-0.5, 0.5], [-15, 15]);

    const finalRotateY = useSpring(useTransform(activeRotateY, (val) => isFlipped ? val + 180 : val), {
        stiffness: 100,
        damping: 30
    });

    // Specular shine follows mouse
    const shineX = useTransform(externalX || mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
    const shineY = useTransform(externalY || mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);
    const shineOpacity = useTransform(externalX || mouseXSpring, [-0.5, 0.5], [0.15, 0.4]);

    const handleMouseMove = (e) => {
        if (!cardRef.current || externalX !== null) return;
        const rect = cardRef.current.getBoundingClientRect();
        const xPct = (e.clientX - rect.left) / rect.width - 0.5;
        const yPct = (e.clientY - rect.top) / rect.height - 0.5;
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
                {/* ── FRONT FACE ── */}
                <div
                    className="absolute inset-0 w-full h-full rounded-[24px] overflow-hidden"
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                    }}
                >
                    {/* Card image base */}
                    <Image
                        src="/nfc/front.png"
                        alt="INTRUST NFC Smart Card – front"
                        fill
                        sizes="420px"
                        className="object-cover object-center"
                        priority
                        draggable={false}
                    />

                    {/* Specular light refraction overlay */}
                    <motion.div
                        style={{
                            background: `radial-gradient(circle at ${shineX} ${shineY}, rgba(255,255,255,0.35) 0%, transparent 55%)`,
                            opacity: shineOpacity,
                        }}
                        className="absolute inset-0 pointer-events-none z-10"
                    />
                </div>

                <div
                    className="absolute inset-0 w-full h-full rounded-[24px] overflow-hidden"
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                    }}
                >
                    {/* Card image base */}
                    <Image
                        src="/nfc/back.png"
                        alt="INTRUST NFC Smart Card – back"
                        fill
                        sizes="420px"
                        className="object-cover object-center"
                        draggable={false}
                    />

                    {/* Specular shine on back too */}
                    <motion.div
                        style={{
                            background: `radial-gradient(circle at ${shineX} ${shineY}, rgba(255,255,255,0.25) 0%, transparent 55%)`,
                            opacity: shineOpacity,
                        }}
                        className="absolute inset-0 pointer-events-none z-10"
                    />
                </div>
            </motion.div>

            {/* Persistent Flip Hint (Mobile First) */}
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-2">
                <div className="flex bg-white/10 dark:bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-black/5 dark:border-white/10 shadow-lg items-center gap-2">
                    <span className="material-icons-round text-sm text-blue-500 animate-bounce">touch_app</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                        Tap Card to Flip
                    </p>
                </div>
            </div>

            <style jsx>{`
                .perspective-2000 { perspective: 2000px; }
            `}</style>
        </div>
    );
}
