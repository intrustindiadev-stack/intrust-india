'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

/**
 * Premium InTrust Progress Loader
 * Features:
 * - Logo fills from 0% to 100%
 * - Smooth progress animation
 * - Percentage counter
 * - Premium gradient fill effect
 */
export default function InTrustProgressLoader({
    duration = 3000, // Duration in milliseconds
    onComplete,
    message = 'Loading InTrust...'
}) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / duration) * 100, 100);

            setProgress(newProgress);

            if (newProgress >= 100) {
                clearInterval(interval);
                if (onComplete) {
                    setTimeout(onComplete, 500); // Small delay after completion
                }
            }
        }, 16); // ~60fps

        return () => clearInterval(interval);
    }, [duration, onComplete]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-white via-[#f8f9fa] to-[#e9ecef]">
            <div className="flex flex-col items-center gap-8 max-w-md w-full px-8">
                {/* Logo Container with Fill Effect */}
                <div className="relative w-48 h-48">
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] rounded-3xl opacity-20 blur-3xl animate-pulse-slow"></div>

                    {/* Logo Container */}
                    <div className="relative w-full h-full bg-white rounded-3xl shadow-2xl overflow-hidden">
                        {/* Filled Logo (Bottom Layer - Gradient) */}
                        <div
                            className="absolute inset-0 transition-all duration-300 ease-out"
                            style={{
                                clipPath: `inset(${100 - progress}% 0 0 0)`,
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-[#7A93AC] via-[#92BCEA] to-[#AFB3F7] flex items-center justify-center p-8">
                                <Image
                                    src="/icons/intrustLogo.png"
                                    alt="InTrust"
                                    width={128}
                                    height={128}
                                    className="object-contain brightness-0 invert"
                                    priority
                                />
                            </div>
                        </div>

                        {/* Unfilled Logo (Top Layer - Original) */}
                        <div className="absolute inset-0 flex items-center justify-center p-8">
                            <Image
                                src="/icons/intrustLogo.png"
                                alt="InTrust"
                                width={128}
                                height={128}
                                className="object-contain"
                                priority
                            />
                        </div>

                        {/* Shimmer Effect on Fill Line */}
                        <div
                            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-60 transition-all duration-300"
                            style={{
                                top: `${100 - progress}%`,
                                transform: 'translateY(-50%)',
                            }}
                        >
                            <div className="w-full h-full animate-shimmer-fast"></div>
                        </div>
                    </div>
                </div>

                {/* Progress Information */}
                <div className="flex flex-col items-center gap-4 w-full">
                    {/* Percentage Counter */}
                    <div className="text-6xl font-bold gradient-text tabular-nums">
                        {Math.round(progress)}%
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div
                            className="h-full bg-gradient-to-r from-[#7A93AC] via-[#92BCEA] to-[#AFB3F7] rounded-full transition-all duration-300 ease-out relative"
                            style={{ width: `${progress}%` }}
                        >
                            {/* Animated Shine on Progress Bar */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer-fast"></div>
                        </div>
                    </div>

                    {/* Loading Message */}
                    <p className="text-[#617073] font-medium text-sm tracking-wide">
                        {message}
                    </p>

                    {/* Status Text Based on Progress */}
                    <p className="text-[#7A93AC] text-xs font-medium">
                        {progress < 30 && 'Initializing...'}
                        {progress >= 30 && progress < 60 && 'Loading resources...'}
                        {progress >= 60 && progress < 90 && 'Almost ready...'}
                        {progress >= 90 && progress < 100 && 'Finalizing...'}
                        {progress >= 100 && 'Complete!'}
                    </p>
                </div>
            </div>
        </div>
    );
}

/**
 * Fast Loader - 2 second duration
 */
export function FastProgressLoader({ onComplete, message }) {
    return (
        <InTrustProgressLoader
            duration={2000}
            onComplete={onComplete}
            message={message || 'Loading...'}
        />
    );
}

/**
 * Slow Loader - 5 second duration for initial app load
 */
export function SlowProgressLoader({ onComplete, message }) {
    return (
        <InTrustProgressLoader
            duration={5000}
            onComplete={onComplete}
            message={message || 'Preparing your experience...'}
        />
    );
}
