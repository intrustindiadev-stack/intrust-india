'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

/**
 * Pure SVG 3D Isometric Megaphone & Sponsor Broadcast Vector
 * Arcade / Duolingo / Fintech Aesthetic
 */
export default function MegaphoneSponsorVector({ animated = true, className = 'w-44 h-44 sm:w-52 sm:h-52' }) {
    return (
        <div className={`relative flex items-center justify-center select-none ${className}`}>
            {/* Ambient Radial Glow */}
            <motion.div
                animate={animated ? {
                    scale: [1, 1.25, 1],
                    opacity: [0.35, 0.65, 0.35],
                } : {}}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/35 via-yellow-400/40 to-blue-500/30 blur-2xl pointer-events-none"
            />

            {/* Pulsing Broadcast Soundwaves */}
            {[
                { r: 70, delay: 0 },
                { r: 88, delay: 0.4 },
                { r: 104, delay: 0.8 },
            ].map((wave, idx) => (
                <motion.div
                    key={idx}
                    animate={animated ? {
                        scale: [0.85, 1.15, 0.85],
                        opacity: [0.15, 0.45, 0.15]
                    } : {}}
                    transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        delay: wave.delay,
                        ease: "easeInOut"
                    }}
                    style={{ width: wave.r * 2, height: wave.r * 2 }}
                    className="absolute rounded-full border-2 border-dashed border-amber-400/30 pointer-events-none"
                />
            ))}

            {/* Sparkles */}
            {[
                { top: '12%', left: '15%', delay: 0 },
                { top: '18%', right: '12%', delay: 0.3 },
                { bottom: '15%', right: '15%', delay: 0.7 },
            ].map((pos, idx) => (
                <motion.div
                    key={idx}
                    animate={animated ? {
                        scale: [0, 1.25, 0],
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
                    className="text-amber-400 pointer-events-none z-20"
                >
                    <Sparkles size={18} />
                </motion.div>
            ))}

            {/* 3D Isometric Megaphone Illustration */}
            <motion.div
                animate={animated ? {
                    y: [-5, 5, -5],
                    rotate: [-1.5, 1.5, -1.5]
                } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10"
            >
                <svg width="170" height="170" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        {/* Horn Cone Gradient */}
                        <linearGradient id="hornCone" x1="40" y1="60" x2="160" y2="140" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#3B82F6" />
                            <stop offset="50%" stopColor="#2563EB" />
                            <stop offset="100%" stopColor="#1D4ED8" />
                        </linearGradient>

                        {/* Horn Rim Gradient */}
                        <linearGradient id="hornRim" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#60A5FA" />
                            <stop offset="100%" stopColor="#1E40AF" />
                        </linearGradient>

                        {/* Gold Coin Gradient */}
                        <linearGradient id="goldCoinMega" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#FFF275" />
                            <stop offset="45%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#B45309" />
                        </linearGradient>

                        {/* Handle Gradient */}
                        <linearGradient id="handleGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#D97706" />
                        </linearGradient>
                    </defs>

                    {/* Handle */}
                    <path
                        d="M 68 116 L 54 148 C 52 153 56 158 62 158 C 65 158 68 156 70 152 L 82 124 Z"
                        fill="url(#handleGrad)"
                        stroke="#B45309"
                        strokeWidth="2"
                    />

                    {/* Back Housing */}
                    <path
                        d="M 44 86 C 44 76 52 70 62 70 L 74 70 L 74 122 L 62 122 C 52 122 44 116 44 106 Z"
                        fill="#1E293B"
                        stroke="#0F172A"
                        strokeWidth="2"
                    />

                    {/* Main Horn Cone */}
                    <path
                        d="M 74 74 L 140 44 L 140 148 L 74 118 Z"
                        fill="url(#hornCone)"
                        stroke="#1E40AF"
                        strokeWidth="2"
                    />

                    {/* Front Bell Ellipse Rim */}
                    <ellipse
                        cx="140"
                        cy="96"
                        rx="14"
                        ry="52"
                        fill="url(#hornRim)"
                        stroke="#1E3A8A"
                        strokeWidth="2.5"
                    />

                    {/* Inner Bell Cavity */}
                    <ellipse
                        cx="142"
                        cy="96"
                        rx="9"
                        ry="44"
                        fill="#0F172A"
                    />

                    {/* Decorative Stripes on Horn */}
                    <path d="M 96 64 L 102 61 L 102 131 L 96 128 Z" fill="#F59E0B" opacity="0.9" />

                    {/* Sound Waves & Erupting Stars */}
                    <g transform="translate(150, 68)">
                        <path d="M 8 -12 C 16 -6 16 18 8 24" fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
                        <path d="M 18 -20 C 30 -10 30 32 18 42" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
                    </g>

                    {/* Floating Erupting Coin 1 */}
                    <g transform="translate(154, 46)">
                        <circle cx="12" cy="12" r="12" fill="url(#goldCoinMega)" stroke="#78350F" strokeWidth="1.5" />
                        <circle cx="12" cy="12" r="9" fill="none" stroke="#FEF08A" strokeWidth="1" strokeDasharray="2 2" />
                        <text x="12" y="16" fontSize="11" fontWeight="900" textAnchor="middle" fill="#FFFFFF">₹</text>
                    </g>

                    {/* Floating Erupting Coin 2 */}
                    <g transform="translate(162, 114)">
                        <circle cx="9" cy="9" r="9" fill="url(#goldCoinMega)" stroke="#78350F" strokeWidth="1.2" />
                        <circle cx="9" cy="9" r="7" fill="none" stroke="#FEF08A" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
                        <text x="9" y="12.5" fontSize="8.5" fontWeight="900" textAnchor="middle" fill="#FFFFFF">₹</text>
                    </g>
                </svg>
            </motion.div>
        </div>
    );
}
