'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useAnimation, useMotionValue } from 'framer-motion';
import { Loader2, ArrowDown } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef(null);
    const pullY = useMotionValue(0);
    const controls = useAnimation();
    
    // Config
    const PULL_RESISTANCE = 0.5;
    const MAX_PULL = 120;
    const THRESHOLD = 80;

    // Touch state
    const touchStartY = useRef(0);
    const isDragging = useRef(false);

    const handleTouchStart = useCallback((e) => {
        if (isRefreshing) return;
        // Only allow pull to refresh when at the top of the scroll container
        if (window.scrollY > 0) return;
        
        touchStartY.current = e.touches[0].clientY;
        isDragging.current = true;
    }, [isRefreshing]);

    const handleTouchMove = useCallback((e) => {
        if (!isDragging.current || isRefreshing) return;
        if (window.scrollY > 0) {
            isDragging.current = false;
            return;
        }

        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY.current;

        // Only handle pulling down
        if (diff > 0) {
            // Prevent default behavior (like overscroll glow/refresh on some browsers)
            // Note: cancelable check is needed for passive event listeners issue,
            // but we might not be able to preventDefault if event is passive.
            // However, just applying the transform is often enough.
            if (e.cancelable) {
                e.preventDefault();
            }
            const y = diff * PULL_RESISTANCE;
            pullY.set(Math.min(y, MAX_PULL));
        } else {
            pullY.set(0);
        }
    }, [isRefreshing, pullY]);

    const handleTouchEnd = useCallback(async () => {
        if (!isDragging.current || isRefreshing) return;
        isDragging.current = false;

        const currentY = pullY.get();
        
        if (currentY >= THRESHOLD) {
            setIsRefreshing(true);
            controls.start({ y: 60, transition: { type: 'spring', stiffness: 300, damping: 20 } });
            
            // Trigger refresh
            if (onRefresh) {
                try {
                    await onRefresh();
                } catch (error) {
                    console.error('Refresh failed:', error);
                }
            }
            
            // Finish
            setIsRefreshing(false);
            controls.start({ y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } });
            pullY.set(0);
        } else {
            controls.start({ y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } });
            pullY.set(0);
        }
    }, [isRefreshing, onRefresh, controls, pullY]);

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        // We use non-passive listener for touchmove so we can preventDefault
        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd, { passive: true });
        element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
            element.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    // Calculate rotation and opacity based on pull distance
    const [pullProgress, setPullProgress] = useState(0);
    
    useEffect(() => {
        return pullY.onChange((latest) => {
            setPullProgress(Math.min(latest / THRESHOLD, 1));
        });
    }, [pullY]);

    return (
        <div ref={containerRef} className="relative w-full h-full min-h-screen overflow-hidden">
            {/* Refresh Indicator */}
            <motion.div 
                className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-50 h-16"
                initial={{ y: -60, opacity: 0 }}
                animate={{ 
                    y: isRefreshing ? 0 : -60 + (pullProgress * 60),
                    opacity: pullProgress > 0 ? pullProgress : 0
                }}
            >
                <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg p-2.5 flex items-center justify-center border border-gray-100 dark:border-gray-700">
                    {isRefreshing ? (
                        <Loader2 size={20} className="animate-spin text-blue-600" />
                    ) : (
                        <motion.div
                            animate={{ rotate: pullProgress >= 1 ? 180 : 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        >
                            <ArrowDown size={20} className={pullProgress >= 1 ? "text-blue-600" : "text-gray-400"} />
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* Draggable Content */}
            <motion.div
                animate={controls}
                className="w-full h-full min-h-screen"
                style={{ y: pullY }}
            >
                {children}
            </motion.div>
        </div>
    );
}

