'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

/**
 * Pure SVG 3D Isometric Golden Trophy Vector
 * Arcade / Duolingo / Fintech Aesthetic
 */
export default function TrophyChampionVector({ animated = true, className = 'w-40 h-40 sm:w-48 sm:h-48' }) {
    return (
        <div className={`relative flex items-center justify-center select-none ${className}`}>
            {/* Ambient Radial Glow */}
            <motion.div
                animate={animated ? {
                    scale: [1, 1.25, 1],
                    opacity: [0.4, 0.7, 0.4],
                } : {}}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400/40 via-yellow-300/50 to-orange-500/30 blur-2xl pointer-events-none"
            />

            {/* Sparkles */}
            {[
                { top: '10%', left: '16%', delay: 0 },
                { top: '14%', right: '14%', delay: 0.4 },
                { bottom: '22%', left: '18%', delay: 0.8 },
                { bottom: '26%', right: '16%', delay: 1.2 },
            ].map((pos, idx) => (
                <motion.div
                    key={idx}
                    animate={animated ? {
                        scale: [0, 1.3, 0],
                        rotate: [0, 90, 180],
                        opacity: [0, 1, 0]
                    } : {}}
                    transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        delay: pos.delay,
                        ease: "easeInOut"
                    }}
                    style={{ position: 'absolute', ...pos }}
                    className="text-amber-300 pointer-events-none z-20"
                >
                    <Sparkles size={18} />
                </motion.div>
            ))}

            {/* 3D Isometric Trophy Illustration */}
            <motion.div
                animate={animated ? {
                    y: [-5, 5, -5],
                    rotate: [-1, 1, -1]
                } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10"
            >
                <svg width="160" height="160" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        {/* Gold Cup Gradient */}
                        <linearGradient id="cupGold" x1="40" y1="30" x2="160" y2="130" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#FFF275" />
                            <stop offset="35%" stopColor="#FFD422" />
                            <stop offset="70%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#B45309" />
                        </linearGradient>

                        {/* Base Plinth Gradient */}
                        <linearGradient id="basePlinth" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#475569" />
                            <stop offset="100%" stopColor="#0F172A" />
                        </linearGradient>

                        {/* Golden Plate Gradient */}
                        <linearGradient id="plateGold" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#FDE68A" />
                            <stop offset="50%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#B45309" />
                        </linearGradient>
                    </defs>

                    {/* Plinth Base */}
                    <rect x="68" y="152" width="64" height="24" rx="4" fill="url(#basePlinth)" stroke="#020617" strokeWidth="2" />
                    <rect x="76" y="156" width="48" height="16" rx="2" fill="url(#plateGold)" stroke="#78350F" strokeWidth="1" />
                    <text x="100" y="168" fontSize="8" fontWeight="900" textAnchor="middle" fill="#78350F">INTRUST</text>

                    {/* Stem Riser */}
                    <path d="M 94 116 L 106 116 L 108 152 L 92 152 Z" fill="#D97706" stroke="#78350F" strokeWidth="1.5" />

                    {/* Trophy Handles */}
                    <path
                        d="M 64 48 C 38 48 38 90 68 94 L 70 82 C 50 80 50 58 66 58 Z"
                        fill="url(#cupGold)"
                        stroke="#92400E"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M 136 48 C 162 48 162 90 132 94 L 130 82 C 150 80 150 58 134 58 Z"
                        fill="url(#cupGold)"
                        stroke="#92400E"
                        strokeWidth="1.5"
                    />

                    {/* Main Cup Bowl */}
                    <path
                        d="M 64 40 L 136 40 C 136 82 120 118 100 118 C 80 118 64 82 64 40 Z"
                        fill="url(#cupGold)"
                        stroke="#92400E"
                        strokeWidth="2"
                    />

                    {/* Rim Ellipse */}
                    <ellipse cx="100" cy="40" rx="36" ry="10" fill="#FFF275" stroke="#B45309" strokeWidth="2" />
                    <ellipse cx="100" cy="40" rx="28" ry="6" fill="#B45309" />

                    {/* Embossed Center Star */}
                    <path
                        d="M 100 60 L 103 69 L 112 70 L 105 76 L 108 85 L 100 80 L 92 85 L 95 76 L 88 70 L 97 69 Z"
                        fill="#FFFFFF"
                        stroke="#D97706"
                        strokeWidth="1"
                    />
                </svg>
            </motion.div>
        </div>
    );
}
