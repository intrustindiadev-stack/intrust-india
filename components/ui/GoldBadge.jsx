'use client';

import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GoldBadge({ size = 'sm', className = '', noAnim = false }) {
    const sizes = {
        sm: 'w-5 h-5',
        md: 'w-7 h-7',
        lg: 'w-10 h-10',
        xl: 'w-14 h-14'
    };

    const iconSizes = {
        sm: 10,
        md: 14,
        lg: 20,
        xl: 32
    };

    const isSmall = size === 'sm';

    return (
        <motion.div
            initial={noAnim ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={`
                relative flex items-center justify-center
                bg-gradient-to-br from-[#FFD700] via-[#FDB931] to-[#D4AF37]
                shadow-[0_0_20px_rgba(212,175,55,0.4),inset_0_0_10px_rgba(255,255,255,0.5)]
                ${sizes[size] || sizes.sm}
                ${className}
            `}
            style={{
                clipPath: isSmall ? 'circle(50% at 50% 50%)' : 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)',
                border: '1.5px solid rgba(255, 255, 255, 0.6)'
            }}
            title="Gold Verified"
        >
            {/* Pulsing Outer Glow */}
            {!noAnim && !isSmall && (
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-x-0 inset-y-0 bg-amber-400 blur-xl rounded-full z-0 opacity-40"
                />
            )}

            {/* Sparkle Particles (Enhanced) */}
            {!noAnim && !isSmall && [...Array(4)].map((_, i) => (
                <motion.div
                    key={i}
                    animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1.5, 0],
                        top: [`${Math.random() * 80 + 10}%`],
                        left: [`${Math.random() * 80 + 10}%`],
                    }}
                    transition={{
                        duration: 2 + i * 0.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.3
                    }}
                    className="absolute w-1 h-1 bg-white rounded-full blur-[0.5px] z-10"
                />
            ))}

            {/* Main Icon */}
            <Check
                size={iconSizes[size] || 12}
                strokeWidth={isSmall ? 5 : 4.5}
                className="relative z-20 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
            />

            {/* Sweep Shine Effect (Faster and more prominent) */}
            {!noAnim && (
                <motion.div
                    animate={{
                        left: ['-200%', '300%'],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatDelay: 4,
                        ease: "circOut"
                    }}
                    className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/70 to-transparent -skew-x-[60deg] pointer-events-none z-30"
                />
            )}
        </motion.div>
    );
}
