'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

/**
 * Premium BalanceReveal Component - Simplified
 * Features:
 * 1. Cipher/Glitch Reveal intro
 * 2. Smooth Spring Numeric Counter
 * 3. Tap to Reveal / Tap to Hide (Merchant-style)
 */
export default function BalanceReveal({ value, className = "" }) {
    const [isRevealed, setIsRevealed] = useState(false);
    const [displayValue, setDisplayValue] = useState('••••••');
    
    // Extract numeric part from value (e.g., "₹1,234.56" -> 1234.56)
    const numericValue = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
    const currencySymbol = value.replace(/[0-9., ]/g, '');

    const springValue = useSpring(0, {
        stiffness: 60,
        damping: 20,
        restDelta: 0.001
    });

    useEffect(() => {
        if (isRevealed) {
            // 1. Initial Cipher Effect (0.4s)
            const chars = "0123456789$#@%&*";
            let iteration = 0;
            const cipherInterval = setInterval(() => {
                const scrambled = value.split("").map((char, index) => {
                    if (index < Math.floor(iteration)) return value[index];
                    return chars[Math.floor(Math.random() * chars.length)];
                }).join("");
                
                setDisplayValue(scrambled);
                if (iteration >= value.length) clearInterval(cipherInterval);
                iteration += 0.5;
            }, 30);

            // 2. Numeric Counter (Spring)
            springValue.set(numericValue);
            
            return () => clearInterval(cipherInterval);
        } else {
            // Reset to masked
            setDisplayValue('••••••');
            springValue.set(0);
        }
    }, [isRevealed, value, numericValue, springValue]);

    // Format the spring value back to currency string
    const counterDisplay = useTransform(springValue, (latest) => {
        return `${currencySymbol}${latest.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    });

    return (
        <div 
            className={`relative inline-flex items-center gap-3 cursor-pointer select-none group py-1.5 px-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300 ${className}`}
            onClick={(e) => {
                e.stopPropagation();
                setIsRevealed(!isRevealed);
            }}
        >
            <AnimatePresence mode="wait">
                {isRevealed ? (
                    <motion.div
                        key="revealed"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        className="relative font-black text-white whitespace-nowrap overflow-hidden"
                    >
                        <motion.span className="relative z-0">
                            {displayValue === value ? (
                                <motion.span>{counterDisplay}</motion.span>
                            ) : (
                                displayValue
                            )}
                        </motion.span>
                    </motion.div>
                ) : (
                    <motion.div
                        key="hidden"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="font-black tracking-[0.3em] text-white/40 blur-[8px] grayscale"
                    >
                        {value.replace(/./g, '•').slice(0, 8)}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Clean Interaction Icon */}
            <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-500 ${
                isRevealed 
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                : 'bg-black/5 dark:bg-white/10 text-slate-400 dark:text-slate-500'
            }`}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={isRevealed ? 'eye-off' : 'eye-on'}
                        initial={{ opacity: 0, rotate: -45, scale: 0.5 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 45, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                    </motion.div>
                </AnimatePresence>
            </div>
            
            {/* Minimal Background Shimmer when revealed */}
            {isRevealed && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 z-[-1] overflow-hidden rounded-2xl"
                >
                    <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent -translate-x-full"
                        animate={{ x: ['100%', '-100%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                </motion.div>
            )}

            {/* Accessibility Hint */}
            <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-500 transform translate-y-0 sm:translate-y-2 sm:group-hover:translate-y-0`}>
                <ShieldCheck size={10} className="text-emerald-500" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter whitespace-nowrap">
                    {isRevealed ? 'Tap to Hide' : 'Tap to Reveal'}
                </span>
            </div>
        </div>
    );
}
