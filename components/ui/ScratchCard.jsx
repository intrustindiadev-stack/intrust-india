'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useConfetti } from './ConfettiProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Star, ShieldCheck } from 'lucide-react';

export default function ScratchCard({ 
    id, 
    children, 
    onComplete, 
    isScratched = false, 
    prizePoints = 0,
    coverImage,
    coverColor = '#0f172a' // Dark Navy
}) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [scratched, setScratched] = useState(isScratched);
    const { trigger: triggerConfetti } = useConfetti();

    useEffect(() => {
        if (isScratched || scratched) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        const drawCover = () => {
            const rect = containerRef.current.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;

            // Premium Gradient for the cover
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#1e293b'); // Slate 800
            gradient.addColorStop(0.5, '#0f172a'); // Slate 900
            gradient.addColorStop(1, '#020617'); // Slate 950
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Premium Geometric Web (Company Identity Pattern)
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)'; // Emerald
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 15; i++) {
                ctx.beginPath();
                ctx.moveTo(Math.random() * canvas.width, 0);
                ctx.lineTo(Math.random() * canvas.width, canvas.height);
                ctx.stroke();
            }

            // Draw Golden Dust sprinkles
            for (let i = 0; i < 60; i++) {
                ctx.fillStyle = i % 2 === 0 ? 'rgba(251, 191, 36, 0.3)' : 'rgba(16, 185, 129, 0.15)';
                ctx.beginPath();
                ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
            
            drawLogo();
        };

        const drawLogo = () => {
            // Draw Company Logo (Icon + Text)
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            
            // Draw a shield-like icon representing InTrust
            ctx.fillStyle = '#10b981'; // Emerald 500
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2 - 20;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - 15);
            ctx.lineTo(centerX + 15, centerY - 5);
            ctx.lineTo(centerX + 15, centerY + 10);
            ctx.lineTo(centerX, centerY + 20);
            ctx.lineTo(centerX - 15, centerY + 10);
            ctx.lineTo(centerX - 15, centerY - 5);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.font = '900 18px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('INTRUST', canvas.width / 2, canvas.height / 2 + 15);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '800 10px Outfit, sans-serif';
            ctx.fillText('INDIA PREMIUM', canvas.width / 2, canvas.height / 2 + 32);
            
            // Reset shadow
            ctx.shadowBlur = 0;
        };

        drawCover();
    }, [isScratched, scratched, coverImage, coverColor]);

    const getCoordinates = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleScratchStart = (e) => {
        if (scratched) return;
        setIsDrawing(true);
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
        if (!isDrawing || scratched) return;
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(x, y);
        ctx.stroke();
        checkPercentage();
    };

    const handleScratchEnd = () => {
        setIsDrawing(false);
    };

    const checkPercentage = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        
        let transparentPixels = 0;
        const totalPixels = pixels.length / 4;

        for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] === 0) transparentPixels++;
        }

        const percentage = (transparentPixels / totalPixels) * 100;

        // User requested: When it's scratched around 50%, then the animation should come
        if (percentage > 50 && !scratched) {
            setScratched(true);
            triggerConfetti();
            if (onComplete) onComplete(prizePoints);
        }
    };

    return (
        <div ref={containerRef} className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl select-none group bg-[#020617] border border-white/5">
            {/* The Hidden Content (Reward Revealed) */}
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-6 text-center">
                {/* Immersive background glow for reveal */}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 via-transparent to-transparent opacity-50" />
                
                {children ? children : (
                    <motion.div 
                        initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                        animate={scratched ? { scale: 1, opacity: 1, rotate: 0 } : {}}
                        transition={{ 
                            type: "spring", 
                            stiffness: 260, 
                            damping: 20,
                            duration: 0.8
                        }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        {/* Animated Trophy with Pulse */}
                        <motion.div 
                            animate={scratched ? { 
                                scale: [1, 1.2, 1],
                                rotate: [0, 10, -10, 0],
                                filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"]
                            } : {}}
                            transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                            className="w-20 h-20 bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-[0_0_40px_rgba(245,158,11,0.3)] border border-white/20"
                        >
                            <Trophy size={40} strokeWidth={2.5} />
                        </motion.div>
                        
                        <div className="flex flex-col items-center">
                            <motion.span 
                                initial={{ opacity: 0, y: 10 }}
                                animate={scratched ? { opacity: 1, y: 0 } : {}}
                                transition={{ delay: 0.3 }}
                                className="text-[12px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-2"
                            >
                                Empire Reward
                            </motion.span>
                            
                            <div className="flex items-center gap-2">
                                <motion.p 
                                    initial={{ scale: 0.8 }}
                                    animate={scratched ? { scale: 1 } : {}}
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

                        {/* Confirmation Tag */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={scratched ? { opacity: 1, scale: 1 } : {}}
                            transition={{ delay: 0.6 }}
                            className="mt-8 px-6 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md flex items-center gap-2 shadow-lg"
                        >
                            <ShieldCheck size={14} className="text-emerald-400" />
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Added to Empire Wallet</p>
                        </motion.div>
                    </motion.div>
                )}
            </div>
            
            {/* The Scratchable Canvas */}
            <AnimatePresence>
                {!scratched && (
                    <motion.canvas
                        key="scratch-canvas"
                        ref={canvasRef}
                        exit={{ 
                            opacity: 0, 
                            scale: 1.2, 
                            filter: 'blur(30px)',
                            transition: { duration: 0.8, ease: "circOut" }
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
            {!scratched && (
                <motion.div 
                    initial={{ opacity: 0.8 }}
                    animate={{ 
                        opacity: [0.4, 0.8, 0.4], 
                        y: [0, -8, 0],
                        scale: [0.95, 1.05, 0.95]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                >
                    <div className="bg-black/60 backdrop-blur-2xl px-5 py-2.5 rounded-full border border-white/20 flex items-center gap-2.5 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                        <Sparkles size={14} className="text-amber-400 animate-pulse" />
                        <span className="text-[11px] text-white font-black uppercase tracking-[0.25em]">Unlock Daily Loot</span>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
