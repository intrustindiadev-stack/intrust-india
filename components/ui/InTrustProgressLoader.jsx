'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

/**
 * Premium InTrust Progress Loader
 * Features:
 * - Radial Gradient Spinner (CSS Optimized)
 * - Central Brand Logo
 * - Glassmorphism Backdrop
 * - Smooth Entry/Exit Animations
 */
export default function InTrustProgressLoader({
    duration = 1200, // Default to fast/premium feel
    onComplete,
    message = 'Loading InTrust...',
    showProgress = false
}) {
    const [visible, setVisible] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / duration) * 100, 100);
            setProgress(newProgress);

            if (newProgress >= 100) {
                clearInterval(interval);
                // Small delay before unmounting to ensure smooth exit
                setTimeout(() => {
                    setVisible(false);
                    if (onComplete) onComplete();
                }, 300);
            }
        }, 16);

        return () => clearInterval(interval);
    }, [duration, onComplete]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Glassmorphism Backdrop */}
<<<<<<< HEAD
            <div className="absolute inset-0 bg-white/80 backdrop-blur-md transition-all duration-500 animate-fadeIn"></div>
=======
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md transition-all duration-500 animate-fadeIn"></div>
>>>>>>> origin/yogesh-final

            <div className="relative z-10 flex flex-col items-center gap-6 md:gap-8 animate-scaleIn max-w-[90vw]">
                {/* Logo & Spinner Container - Grid for Perfect Centering */}
                <div className="grid place-items-center relative">
                    {/* Glow Effect */}
                    <div className="col-start-1 row-start-1 w-40 h-40 bg-blue-400/20 blur-2xl rounded-full animate-pulse-slow"></div>

                    {/* CSS Radial Loader Ring - Explicit Size */}
                    <div className="loader col-start-1 row-start-1 w-32 h-32 md:w-40 md:h-40"></div>

                    {/* Central Logo - Explicit Size & Centered */}
                    <div className="col-start-1 row-start-1 relative z-20 w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
                        <Image
                            src="/icons/intrustLogo.png"
                            alt="InTrust"
                            fill
                            className="object-contain drop-shadow-md p-1"
                            priority
                            sizes="(max-width: 768px) 64px, 80px"
                        />
                    </div>
                </div>

                {/* Loading Message */}
                <div className="flex flex-col items-center gap-2 text-center">
                    <h3 className="text-xl md:text-2xl font-bold gradient-text tracking-tight">
                        InTrust
                    </h3>
<<<<<<< HEAD
                    <p className="text-gray-500 text-xs md:text-sm font-medium tracking-wide uppercase animate-pulse">
=======
                    <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium tracking-wide uppercase animate-pulse">
>>>>>>> origin/yogesh-final
                        {message}
                    </p>

                    {/* Optional Progress Indicator */}
                    {showProgress && (
                        <div className="text-xs text-blue-400 font-mono mt-1 opacity-80">
                            {Math.round(progress)}%
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Fast Loader - Quick transitions (Auth, Nav)
 */
export function FastProgressLoader({ onComplete, message }) {
    return (
        <InTrustProgressLoader
            duration={1000} // Snappy 1s
            onComplete={onComplete}
            message={message || 'Verifying...'}
        />
    );
}

/**
 * Slow Loader - Initial App Load
 */
export function SlowProgressLoader({ onComplete, message }) {
    return (
        <InTrustProgressLoader
            duration={2500}
            onComplete={onComplete}
            message={message || 'Setting up your experience...'}
            showProgress={true}
        />
    );
}
