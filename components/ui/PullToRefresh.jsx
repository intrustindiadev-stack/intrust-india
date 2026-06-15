'use client';

import { useState, useRef, useEffect } from 'react';
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

    const handleDrag = (e, info) => {
        if (isRefreshing) return;
        
        // Only allow pull to refresh when at the top of the scroll container
        if (window.scrollY > 0) return;
        
        const y = info.offset.y * PULL_RESISTANCE;
        if (y > 0) {
            pullY.set(Math.min(y, MAX_PULL));
        }
    };

    const handleDragEnd = async () => {
        if (isRefreshing) return;
        
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
    };

    // Calculate rotation and opacity based on pull distance
    const [pullProgress, setPullProgress] = useState(0);
    
    useEffect(() => {
        return pullY.onChange((latest) => {
            setPullProgress(Math.min(latest / THRESHOLD, 1));
        });
    }, [pullY]);

    return (
        <div ref={containerRef} className="relative w-full h-full overflow-hidden touch-pan-y">
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
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                animate={controls}
                className="w-full h-full min-h-screen"
                style={{ y: pullY }}
            >
                {children}
            </motion.div>
        </div>
    );
}
