'use client';

import { motion } from 'framer-motion';

/**
 * Pure SVG 3D Isometric Holographic Attribution Radar Vector
 * Arcade / Duolingo / Fintech Aesthetic
 */
export default function AttributionRadarVector({ animated = true, className = 'w-40 h-40 sm:w-48 sm:h-48' }) {
    return (
        <div className={`relative flex items-center justify-center select-none ${className}`}>
            {/* Ambient Radial Glow */}
            <motion.div
                animate={animated ? {
                    scale: [1, 1.25, 1],
                    opacity: [0.3, 0.6, 0.3],
                } : {}}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500/35 via-teal-400/40 to-blue-500/30 blur-2xl pointer-events-none"
            />

            {/* Radar Sweeper */}
            <motion.svg
                animate={animated ? { rotate: 360 } : {}}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                viewBox="0 0 200 200"
                className="absolute w-full h-full pointer-events-none"
            >
                <defs>
                    <linearGradient id="sweepGrad" x1="100" y1="100" x2="190" y2="100" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.4" />
                    </linearGradient>
                </defs>
                <path d="M 100 100 L 190 100 A 90 90 0 0 1 100 190 Z" fill="url(#sweepGrad)" />
            </motion.svg>

            {/* Radar Rings & Nodes */}
            <svg width="160" height="160" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
                {/* Concentric Circles */}
                <circle cx="100" cy="100" r="85" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.3" fill="none" />
                <circle cx="100" cy="100" r="60" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
                <circle cx="100" cy="100" r="35" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.5" fill="none" />
                <circle cx="100" cy="100" r="10" fill="#10B981" />

                {/* Crosshairs */}
                <line x1="100" y1="15" x2="100" y2="185" stroke="#10B981" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="4 4" />
                <line x1="15" y1="100" x2="185" y2="100" stroke="#10B981" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="4 4" />

                {/* Blip Nodes (Channels) */}
                <circle cx="65" cy="55" r="5" fill="#3B82F6" className="animate-ping" style={{ animationDuration: '2.5s' }} />
                <circle cx="65" cy="55" r="5" fill="#3B82F6" />

                <circle cx="145" cy="70" r="6" fill="#10B981" className="animate-ping" style={{ animationDuration: '3s' }} />
                <circle cx="145" cy="70" r="6" fill="#10B981" />

                <circle cx="130" cy="140" r="5" fill="#F59E0B" className="animate-ping" style={{ animationDuration: '2s' }} />
                <circle cx="130" cy="140" r="5" fill="#F59E0B" />
            </svg>
        </div>
    );
}
