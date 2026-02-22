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
            className={`
                relative flex items-center justify-center
                bg-gradient-to-br from-[#FFD700] via-[#FDB931] to-[#D4AF37]
                shadow-[0_0_15px_rgba(212,175,55,0.3)]
                ${sizes[size] || sizes.sm}
                ${className}
            `}
            style={{
                clipPath: isSmall ? 'circle(50% at 50% 50%)' : 'polygon(50% 0%, 90% 20%, 100% 60%, 50% 100%, 0% 60%, 10% 20%)',
                border: '1px solid rgba(255, 255, 255, 0.4)'
            }}
            title="Gold Verified"
        >
            {/* Sparkle Particles (Disabled for noAnim) */}
            {!noAnim && !isSmall && [...Array(2)].map((_, i) => (
                <motion.div
                    key={i}
                    animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1.2, 0],
                        top: ['50%', `${Math.random() * 100}%`],
                        left: ['50%', `${Math.random() * 100}%`],
                    }}
                    transition={{
                        duration: 1.5 + i,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: i * 0.4
                    }}
                    className="absolute w-1 h-1 bg-white rounded-full blur-[1px] z-0"
                />
            ))}

            {/* Main Icon */}
            <Check
                size={iconSizes[size] || 12}
                strokeWidth={isSmall ? 5 : 4.5}
                className="relative z-10 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
            />

            {/* Sweep Shine Effect (Disabled for noAnim) */}
            {!noAnim && (
                <motion.div
                    animate={{
                        left: ['-100%', '200%'],
                    }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        repeatDelay: 5,
                        ease: "linear"
                    }}
                    className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-45 pointer-events-none z-20"
                />
            )}
        </motion.div>
    );
}
