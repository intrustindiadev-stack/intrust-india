'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useConfetti } from './ConfettiProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Star, ShieldCheck } from 'lucide-react';

/**
 * ScratchCard
 *
 * Props:
 *   id              - card identifier
 *   children        - custom revealed content (optional)
 *   onComplete(pts) - called once when threshold is crossed (before PATCH)
 *   revealed        - externally controlled reveal flag (boolean | undefined)
 *                     When undefined, reveal is governed by the internal threshold.
 *                     When true  → show revealed state + confetti.
 *                     When false → keep canvas (or remount if was true).
 *   prizePoints     - points displayed in the revealed state
 *   coverImage      - unused, kept for API compat
 *   coverColor      - unused, kept for API compat
 */
export default function ScratchCard({
    id,
    children,
    onComplete,
    revealed,            // external control (§4.7)
    isScratched = false, // legacy compat – treated as initial revealed=true
    prizePoints = 0,
    coverImage,
    coverColor = '#0f172a',
}) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const isDrawingRef = useRef(false);
    const rafScheduledRef = useRef(false);         // §4.11 RAF throttle
    const completedRef = useRef(false);            // fire onComplete only once
    const drawCoverRef = useRef(null);             // stable ref for resize
    const coverCacheRef = useRef(null);            // §8 offscreen canvas cache

    // Internal threshold state (§4.7)
    const [thresholdReached, setThresholdReached] = useState(false);

    // Effective scratch state: external 'revealed' wins; else use local threshold
    const effectiveScratched = revealed !== undefined ? revealed : thresholdReached;

    const { trigger: triggerConfetti } = useConfetti();

    // ── Confetti: fire exactly once when effectiveScratched flips true ────────
    useEffect(() => {
        if (effectiveScratched) {
            triggerConfetti();
        }
    }, [effectiveScratched]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Reset when externally rolled back (revealed flips false) ─────────────
    useEffect(() => {
        if (revealed === false) {
            setThresholdReached(false);
            completedRef.current = false;
        }
    }, [revealed]);

    // ── §8 Offscreen canvas helpers ───────────────────────────────────────────
    /**
     * paintCoverInto(targetCtx, w, h)
     * Draws gradient + sprinkles + logo onto any 2D context of size w×h.
     * This is the only place that runs the expensive gradient/font logic.
     */
    const paintCoverInto = useCallback(async (targetCtx, w, h) => {
        // §4.13 reset composite before fill on repaint
        targetCtx.globalCompositeOperation = 'source-over';

        const gradient = targetCtx.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0,   '#1e293b');
        gradient.addColorStop(0.5, '#0f172a');
        gradient.addColorStop(1,   '#020617');
        targetCtx.fillStyle = gradient;
        targetCtx.fillRect(0, 0, w, h);

        targetCtx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
        targetCtx.lineWidth   = 0.5;
        for (let i = 0; i < 15; i++) {
            targetCtx.beginPath();
            targetCtx.moveTo(Math.random() * w, 0);
            targetCtx.lineTo(Math.random() * w, h);
            targetCtx.stroke();
        }

        for (let i = 0; i < 60; i++) {
            targetCtx.fillStyle = i % 2 === 0
                ? 'rgba(251, 191, 36, 0.3)'
                : 'rgba(16, 185, 129, 0.15)';
            targetCtx.beginPath();
            targetCtx.arc(
                Math.random() * w,
                Math.random() * h,
                0.8, 0, Math.PI * 2
            );
            targetCtx.fill();
        }

        // §4.17 Await font load before drawing text
        if (document.fonts) {
            await Promise.all([
                document.fonts.load('900 18px Outfit'),
                document.fonts.load('800 10px Outfit'),
            ]);
        }

        // Logo
        targetCtx.shadowBlur  = 15;
        targetCtx.shadowColor = 'rgba(0,0,0,0.6)';
        targetCtx.fillStyle   = '#10b981';
        const centerX = w / 2;
        const centerY = h / 2 - 20;
        targetCtx.beginPath();
        targetCtx.moveTo(centerX, centerY - 15);
        targetCtx.lineTo(centerX + 15, centerY - 5);
        targetCtx.lineTo(centerX + 15, centerY + 10);
        targetCtx.lineTo(centerX, centerY + 20);
        targetCtx.lineTo(centerX - 15, centerY + 10);
        targetCtx.lineTo(centerX - 15, centerY - 5);
        targetCtx.closePath();
        targetCtx.fill();
        targetCtx.fillStyle      = 'white';
        targetCtx.font           = '900 18px Outfit, sans-serif';
        targetCtx.textAlign      = 'center';
        targetCtx.textBaseline   = 'middle';
        targetCtx.fillText('INTRUST', w / 2, h / 2 + 15);
        targetCtx.fillStyle      = 'rgba(255, 255, 255, 0.5)';
        targetCtx.font           = '800 10px Outfit, sans-serif';
        targetCtx.fillText('INDIA PREMIUM', w / 2, h / 2 + 32);
        targetCtx.shadowBlur     = 0;
    }, []);

    /**
     * ensureCoverCache(w, h)
     * Creates (or re-creates on size change) an offscreen canvas sized w×h
     * and paints the full cover into it once.
     */
    const ensureCoverCache = useCallback(async (w, h) => {
        const cache = coverCacheRef.current;
        if (cache && cache.width === w && cache.height === h) return; // already valid

        const offscreen   = document.createElement('canvas');
        offscreen.width   = w;
        offscreen.height  = h;
        const offCtx      = offscreen.getContext('2d');
        await paintCoverInto(offCtx, w, h);
        coverCacheRef.current = offscreen;
    }, [paintCoverInto]);

    // ── Canvas: draw cover + repaint logic ────────────────────────────────────
    useEffect(() => {
        if (isScratched || effectiveScratched) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const drawCover = async () => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            canvas.width  = rect.width;
            canvas.height = rect.height;

            // Ensure offscreen cache exists at this size, then blit
            await ensureCoverCache(canvas.width, canvas.height);

            // §4.13 reset composite before blit
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(coverCacheRef.current, 0, 0, canvas.width, canvas.height);
        };

        // Store stable ref for ResizeObserver
        drawCoverRef.current = drawCover;
        drawCover();
    }, [isScratched, effectiveScratched, coverImage, coverColor, ensureCoverCache]);

    // ── §4.13 ResizeObserver + orientationchange ──────────────────────────────
    useEffect(() => {
        if (effectiveScratched || isScratched) return;
        const container = containerRef.current;
        if (!container) return;

        const handleResize = () => {
            const canvas = canvasRef.current;
            if (!canvas || effectiveScratched) return;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const rect = container.getBoundingClientRect();
            canvas.width  = rect.width;
            canvas.height = rect.height;

            // Only drawImage — no re-paint of gradient/sprinkles/logo
            if (coverCacheRef.current) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(coverCacheRef.current, 0, 0, canvas.width, canvas.height);
            } else if (drawCoverRef.current) {
                drawCoverRef.current(); // fallback if cache not ready
            }
        };

        const ro = new ResizeObserver(handleResize);
        ro.observe(container);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            ro.disconnect();
            window.removeEventListener('orientationchange', handleResize);
        };
    }, [effectiveScratched, isScratched]);

    // ── §4.12 Non-passive native touchmove to allow preventDefault ───────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handler = (e) => {
            if (isDrawingRef.current) {
                e.preventDefault();
            }
        };

        canvas.addEventListener('touchmove', handler, { passive: false });
        return () => canvas.removeEventListener('touchmove', handler);
    }, []);

    // ── §4.14 Centre-weighted pixel sampling ─────────────────────────────────
    const checkPercentage = useCallback(() => {
        rafScheduledRef.current = false;
        const canvas = canvasRef.current;
        if (!canvas || completedRef.current) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const w = canvas.width;
        const h = canvas.height;
        const inset = Math.round(Math.min(w, h) * 0.2);
        const rw = w - 2 * inset;
        const rh = h - 2 * inset;

        if (rw <= 0 || rh <= 0) return;

        // Sample only inner 60% region
        const pixels = ctx.getImageData(inset, inset, rw, rh).data;

        let transparentPixels = 0;
        const step = 4; // sample every 4th pixel (alpha channel = index 3)
        let sampled = 0;

        for (let i = 3; i < pixels.length; i += 4 * step) {
            if (pixels[i] === 0) transparentPixels++;
            sampled++;
        }

        if (sampled === 0) return;
        const percentage = (transparentPixels / sampled) * 100;

        if (percentage > 40) {
            completedRef.current = true;
            setThresholdReached(true);
            if (onComplete) onComplete(prizePoints);
        }
    }, [onComplete, prizePoints]);

    // ── Event handlers ────────────────────────────────────────────────────────
    const getCoordinates = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleScratchStart = (e) => {
        if (effectiveScratched) return;
        isDrawingRef.current = true;
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 44;
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const handleScratchMove = (e) => {
        if (!isDrawingRef.current || effectiveScratched) return;
        // §4.12 prevent scroll while scratching (also handled by native listener)
        if (e.cancelable) e.preventDefault();
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(x, y);
        ctx.stroke();

        // §4.11 RAF-throttled percentage check
        if (!rafScheduledRef.current) {
            rafScheduledRef.current = true;
            requestAnimationFrame(checkPercentage);
        }
    };

    const handleScratchEnd = () => {
        isDrawingRef.current = false;
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl select-none group bg-[#020617] border border-white/5"
        >
            {/* Hidden Content (Reward Revealed) */}
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-6 text-center">
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 via-transparent to-transparent opacity-50" />

                {children ? children : (
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                        animate={effectiveScratched ? { scale: 1, opacity: 1, rotate: 0 } : {}}
                        transition={{ type: 'spring', stiffness: 260, damping: 20, duration: 0.8 }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        <motion.div
                            animate={effectiveScratched ? {
                                scale: [1, 1.2, 1],
                                rotate: [0, 10, -10, 0],
                                filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'],
                            } : {}}
                            transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
                            className="w-20 h-20 bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-[0_0_40px_rgba(245,158,11,0.3)] border border-white/20"
                        >
                            <Trophy size={40} strokeWidth={2.5} />
                        </motion.div>

                        <div className="flex flex-col items-center">
                            <motion.span
                                initial={{ opacity: 0, y: 10 }}
                                animate={effectiveScratched ? { opacity: 1, y: 0 } : {}}
                                transition={{ delay: 0.3 }}
                                className="text-[12px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-2"
                            >
                                Empire Reward
                            </motion.span>

                            <div className="flex items-center gap-2">
                                <motion.p
                                    initial={{ scale: 0.8 }}
                                    animate={effectiveScratched ? { scale: 1 } : {}}
                                    className="text-6xl font-black text-white tracking-tighter drop-shadow-2xl"
                                >
                                    {prizePoints}
                                </motion.p>
                                <div className="flex flex-col items-start justify-center pt-2">
                                    <Star size={18} className="text-amber-400 fill-amber-400 animate-pulse" />
                                    <p className="text-[12px] font-black text-white/40 uppercase tracking-widest leading-none">Points</p>
                                </div>
                            </div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={effectiveScratched ? { opacity: 1, scale: 1 } : {}}
                            transition={{ delay: 0.6 }}
                            className="mt-8 px-6 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md flex items-center gap-2 shadow-lg"
                        >
                            <ShieldCheck size={14} className="text-emerald-400" />
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Added to Empire Wallet</p>
                        </motion.div>
                    </motion.div>
                )}
            </div>

            {/* Scratchable Canvas */}
            <AnimatePresence>
                {!effectiveScratched && (
                    <motion.canvas
                        key="scratch-canvas"
                        ref={canvasRef}
                        exit={{
                            opacity: 0,
                            scale: 1.2,
                            filter: 'blur(30px)',
                            transition: { duration: 0.8, ease: 'circOut' },
                        }}
                        className="absolute inset-0 z-10 w-full h-full cursor-crosshair touch-none"
                        onMouseDown={handleScratchStart}
                        onMouseMove={handleScratchMove}
                        onMouseUp={handleScratchEnd}
                        onMouseLeave={handleScratchEnd}
                        onTouchStart={handleScratchStart}
                        onTouchMove={handleScratchMove}
                        onTouchEnd={handleScratchEnd}
                    />
                )}
            </AnimatePresence>

            {/* Floating Hint Overlay */}
            {!effectiveScratched && (
                <motion.div
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: [0.4, 0.8, 0.4], y: [0, -8, 0], scale: [0.95, 1.05, 0.95] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                >
                    <div className="bg-black/60 backdrop-blur-2xl px-5 py-2.5 rounded-full border border-white/20 flex items-center gap-2.5 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                        <Sparkles size={14} className="text-amber-400 animate-pulse" />
                        <span className="text-[11px] text-white font-black uppercase tracking-[0.25em]">Unlock Reward</span>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
