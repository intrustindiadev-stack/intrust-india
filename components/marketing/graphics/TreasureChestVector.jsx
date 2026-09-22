'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

/**
 * Pure SVG 3D Isometric Treasure Chest Vector
 * Arcade / Duolingo / Fintech Aesthetic
 */
export default function TreasureChestVector({ animated = true, className = 'w-40 h-40 sm:w-48 sm:h-48' }) {
    return (
        <div className={`relative flex items-center justify-center select-none ${className}`}>
            {/* Ambient Radial Glow */}
            <motion.div
                animate={animated ? {
                    scale: [1, 1.25, 1],
                    opacity: [0.35, 0.65, 0.35],
                } : {}}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-600/35 via-indigo-500/35 to-amber-400/30 blur-2xl pointer-events-none"
            />

            {/* Sparkles */}
            {[
                { top: '12%', left: '14%', delay: 0 },
                { top: '16%', right: '12%', delay: 0.4 },
                { bottom: '18%', right: '16%', delay: 0.9 },
            ].map((pos, idx) => (
                <motion.div
                    key={idx}
                    animate={animated ? {
                        scale: [0, 1.2, 0],
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

            {/* 3D Isometric Chest Illustration */}
            <motion.div
                animate={animated ? {
                    y: [-4, 4, -4],
                    rotate: [-0.8, 0.8, -0.8]
                } : {}}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10"
            >
                <svg width="160" height="160" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        {/* Wood Body Gradient */}
                        <linearGradient id="chestWood" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#8B5CF6" />
                            <stop offset="60%" stopColor="#6D28D9" />
                            <stop offset="100%" stopColor="#4C1D95" />
                        </linearGradient>

                        {/* Gold Trim Gradient */}
                        <linearGradient id="chestGold" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#FDE047" />
                            <stop offset="50%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#B45309" />
                        </linearGradient>
                    </defs>

                    {/* Lower Chest Body */}
                    <path
                        d="M 44 96 L 156 96 L 148 152 C 148 156 144 160 140 160 L 60 160 C 56 160 52 156 52 152 Z"
                        fill="url(#chestWood)"
                        stroke="#312E81"
                        strokeWidth="2.5"
                    />

                    {/* Chest Lid Arched Dome */}
                    <path
                        d="M 40 96 C 40 68 62 52 100 52 C 138 52 160 68 160 96 Z"
                        fill="url(#chestWood)"
                        stroke="#312E81"
                        strokeWidth="2.5"
                    />

                    {/* Gold Straps Left & Right */}
                    <path d="M 64 58 C 58 70 58 84 58 96 L 68 96 L 68 58 Z" fill="url(#chestGold)" />
                    <path d="M 60 96 L 68 96 L 68 158 L 60 158 Z" fill="url(#chestGold)" />

                    <path d="M 136 58 C 142 70 142 84 142 96 L 132 96 L 132 58 Z" fill="url(#chestGold)" />
                    <path d="M 140 96 L 132 96 L 132 158 L 140 158 Z" fill="url(#chestGold)" />

                    {/* Gold Rim Band across the seam */}
                    <rect x="38" y="92" width="124" height="12" rx="3" fill="url(#chestGold)" stroke="#78350F" strokeWidth="1.5" />

                    {/* Front Escutcheon Keyhole Plate */}
                    <rect x="90" y="94" width="20" height="24" rx="4" fill="url(#chestGold)" stroke="#78350F" strokeWidth="2" />
                    <circle cx="100" cy="104" r="3" fill="#1E1B4B" />
                    <polygon points="98,104 102,104 103,112 97,112" fill="#1E1B4B" />

                    {/* Light Glow Seam */}
                    <line x1="44" y1="98" x2="156" y2="98" stroke="#FEF08A" strokeWidth="2" opacity="0.8" />
                </svg>
            </motion.div>
        </div>
    );
}
