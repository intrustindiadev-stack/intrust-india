'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useConfetti } from './ConfettiProvider';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScratchCard({ children, onComplete, isScratched = false }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [scratched, setScratched] = useState(isScratched);
    const { trigger: triggerConfetti } = useConfetti();

    useEffect(() => {
        if (isScratched || scratched) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // Premium Geometric Pattern for the cover
        const drawPattern = () => {
            const rect = containerRef.current.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;

            // Base gradient
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#1E293B'); // Slate-900
            gradient.addColorStop(1, '#0F172A'); // Slate-950
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Subtle Pattern (Geometric Lines)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            for (let i = -canvas.width; i < canvas.width * 2; i += 40) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i + canvas.height, canvas.height);
                ctx.stroke();
            }

            // Draw Logo
            const logo = new Image();
            logo.src = '/icon.png';
            logo.onload = () => {
                const logoSize = Math.min(canvas.width, canvas.height) * 0.4;
                const x = (canvas.width - logoSize) / 2;
                const y = (canvas.height - logoSize) / 2;
                
                // Shadow for logo
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 20;
                ctx.drawImage(logo, x, y, logoSize, logoSize);
                
                // Reset shadow
                ctx.shadowBlur = 0;
            };
        };

        drawPattern();
    }, [isScratched, scratched]);

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
        ctx.lineWidth = 50; 
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

        if (percentage > 45 && !scratched) {
            setScratched(true);
            triggerConfetti();
            if (onComplete) onComplete();
        }
    };

    return (
        <div ref={containerRef} className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 select-none group">
            {/* The Hidden Content */}
            <div className="absolute inset-0 z-0">
                {children}
            </div>
            
            {/* The Scratchable Canvas */}
            <AnimatePresence>
                {!scratched && (
                    <motion.canvas
                        key="scratch-canvas"
                        ref={canvasRef}
                        exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                        transition={{ duration: 0.5 }}
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
            
            {/* Overlay Helper */}
            {!scratched && (
                <motion.div 
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute inset-0 z-20 flex items-end justify-center pointer-events-none pb-8"
                >
                    <span className="bg-white/10 backdrop-blur-xl text-white/90 px-5 py-2.5 rounded-2xl text-xs font-black tracking-widest border border-white/20 shadow-2xl uppercase">
                        ✨ Scratch to Reveal
                    </span>
                </motion.div>
            )}
        </div>
    );
}
