'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useConfetti } from './ConfettiProvider';
import { motion } from 'framer-motion';

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
        const img = new Image();
        img.src = '/images/scratch-texture.png'; // Premium dark-grey gold texture

        img.onload = () => {
            // Set canvas size to match container
            const rect = containerRef.current.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;

            // Fill with image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
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
        // Prevent scrolling while scratching
        if (e.type === 'touchstart') e.preventDefault();
        
        setIsDrawing(true);
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 40; // Scratch brush size
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const handleScratchMove = (e) => {
        if (!isDrawing || scratched) return;
        if (e.type === 'touchmove') e.preventDefault();

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
        const totalPixels = pixels.length / 4; // 4 channels per pixel (RGBA)

        // Check alpha channel (index 3, 7, 11...)
        for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] === 0) {
                transparentPixels++;
            }
        }

        const percentage = (transparentPixels / totalPixels) * 100;

        // If 40% is scratched, reveal the whole thing
        if (percentage > 40 && !scratched) {
            setScratched(true);
            triggerConfetti();
            if (onComplete) onComplete();
            
            // Animate canvas fading out
            canvas.style.transition = 'opacity 0.5s ease-out';
            canvas.style.opacity = '0';
        }
    };

    if (isScratched) {
        return <div className="relative w-full h-full">{children}</div>;
    }

    return (
        <div ref={containerRef} className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/10 select-none">
            {/* The Hidden Content */}
            <div className="absolute inset-0 z-0">
                {children}
            </div>
            
            {/* The Scratchable Canvas */}
            {!scratched && (
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 z-10 w-full h-full cursor-pointer touch-none"
                    onMouseDown={handleScratchStart}
                    onMouseMove={handleScratchMove}
                    onMouseUp={handleScratchEnd}
                    onMouseLeave={handleScratchEnd}
                    onTouchStart={handleScratchStart}
                    onTouchMove={handleScratchMove}
                    onTouchEnd={handleScratchEnd}
                />
            )}
            
            {/* Optional "Scratch Me" overlay helper text */}
            {!scratched && (
                <motion.div 
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                >
                    <span className="bg-black/40 backdrop-blur-md text-white/90 px-4 py-2 rounded-full text-sm font-medium tracking-wide border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                        ✨ Scratch to Reveal
                    </span>
                </motion.div>
            )}
        </div>
    );
}
