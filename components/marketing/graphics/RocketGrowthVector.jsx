'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

/**
 * Pure SVG 3D Isometric Rocket Growth Vector
 * Arcade / Duolingo / Fintech Aesthetic
 */
export default function RocketGrowthVector({ animated = true, className = 'w-44 h-44 sm:w-56 sm:h-56' }) {
    return (
        <div className={`relative flex items-center justify-center select-none ${className}`}>
            {/* Ambient Radial Glow */}
            <motion.div
                animate={animated ? {
                    scale: [1, 1.2, 1],
                    opacity: [0.35, 0.6, 0.35],
                } : {}}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600/30 via-indigo-500/40 to-amber-400/30 blur-2xl pointer-events-none"
            />

            {/* Orbital Rings */}
            <motion.svg
                animate={animated ? { rotate: 360 } : {}}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                viewBox="0 0 200 200"
                className="absolute w-full h-full text-indigo-400/20 pointer-events-none"
            >
                <ellipse cx="100" cy="100" rx="90" ry="32" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 8" transform="rotate(-25 100 100)" />
            </motion.svg>

            {/* Sparkle Emitters */}
            {[
                { top: '10%', left: '12%', delay: 0 },
                { top: '20%', right: '10%', delay: 0.5 },
                { bottom: '15%', left: '16%', delay: 1.0 },
                { bottom: '25%', right: '14%', delay: 1.5 },
            ].map((pos, idx) => (
                <motion.div
                    key={idx}
                    animate={animated ? {
                        scale: [0, 1.2, 0],
                        rotate: [0, 90, 180],
                        opacity: [0, 1, 0]
                    } : {}}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: pos.delay,
                        ease: "easeInOut"
                    }}
                    style={{ position: 'absolute', ...pos }}
                    className="text-amber-400 pointer-events-none z-20"
                >
                    <Sparkles size={16} />
                </motion.div>
            ))}

            {/* 3D Isometric Rocket Illustration */}
            <motion.div
                animate={animated ? {
                    y: [-6, 6, -6],
                    rotate: [-1, 1, -1]
                } : {}}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10"
            >
                <svg width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        {/* Rocket Body Gradient */}
                        <linearGradient id="rocketBody" x1="60" y1="40" x2="140" y2="160" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="45%" stopColor="#F1F5F9" />
                            <stop offset="85%" stopColor="#CBD5E1" />
                            <stop offset="100%" stopColor="#94A3B8" />
                        </linearGradient>

                        {/* Fin Left Gradient */}
                        <linearGradient id="finRed" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#EF4444" />
                            <stop offset="100%" stopColor="#B91C1C" />
                        </linearGradient>

                        {/* Thruster Flame Gradient */}
                        <linearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FDE047" />
                            <stop offset="40%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#EF4444" />
                        </linearGradient>

                        {/* Coin Gold Gradient */}
                        <linearGradient id="coinGold" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#FEF08A" />
                            <stop offset="50%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#B45309" />
                        </linearGradient>
                    </defs>

                    {/* Thruster Flame */}
                    <path
                        d="M 90 148 Q 100 188 100 192 Q 100 188 110 148 Z"
                        fill="url(#flameGrad)"
                        className="animate-pulse"
                    />
                    <path
                        d="M 94 148 Q 100 172 100 174 Q 100 172 106 148 Z"
                        fill="#FEF08A"
                    />

                    {/* Rocket Fins */}
                    <path d="M 68 124 C 52 135 48 152 48 155 C 60 155 80 148 84 138 Z" fill="url(#finRed)" stroke="#991B1B" strokeWidth="1.5" />
                    <path d="M 132 124 C 148 135 152 152 152 155 C 140 155 120 148 116 138 Z" fill="url(#finRed)" stroke="#991B1B" strokeWidth="1.5" />

                    {/* Main Fuselage */}
                    <path
                        d="M 100 24 C 76 68 72 120 78 148 C 92 151 108 151 122 148 C 128 120 124 68 100 24 Z"
                        fill="url(#rocketBody)"
                        stroke="#64748B"
                        strokeWidth="2"
                    />

                    {/* Nose Cone Tip */}
                    <path
                        d="M 100 24 C 88 48 83 66 82 74 C 94 77 106 77 118 74 C 117 66 112 48 100 24 Z"
                        fill="url(#finRed)"
                        stroke="#991B1B"
                        strokeWidth="1.5"
                    />

                    {/* Portal Window Outer Rim */}
                    <circle cx="100" cy="92" r="18" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="3" />
                    {/* Portal Glass */}
                    <circle cx="100" cy="92" r="14" fill="#60A5FA" />
                    <path d="M 92 86 A 14 14 0 0 1 108 86 A 14 14 0 0 0 92 86" fill="#FFFFFF" opacity="0.6" />

                    {/* Center Fin */}
                    <path d="M 98 120 L 102 120 L 103 148 L 97 148 Z" fill="#DC2626" />

                    {/* Floating Gold Reward Coin 1 */}
                    <g transform="translate(142, 60)">
                        <circle cx="12" cy="12" r="12" fill="url(#coinGold)" stroke="#78350F" strokeWidth="1.5" />
                        <circle cx="12" cy="12" r="9.5" fill="none" stroke="#FEF08A" strokeWidth="1" strokeDasharray="2 2" />
                        <text x="12" y="16" fontSize="11" fontWeight="900" textAnchor="middle" fill="#FFFFFF">₹</text>
                    </g>

                    {/* Floating Gold Reward Coin 2 */}
                    <g transform="translate(32, 88)">
                        <circle cx="9" cy="9" r="9" fill="url(#coinGold)" stroke="#78350F" strokeWidth="1.2" />
                        <circle cx="9" cy="9" r="7" fill="none" stroke="#FEF08A" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
                        <text x="9" y="12.5" fontSize="8.5" fontWeight="900" textAnchor="middle" fill="#FFFFFF">₹</text>
                    </g>
                </svg>
            </motion.div>
        </div>
    );
}
