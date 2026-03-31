'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Sparkles, Package, ArrowRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

function ConfettiParticle({ index }) {
    const colors = ['#D4AF37', '#4ade80', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c'];
    const color = colors[index % colors.length];
    const size = Math.random() * 8 + 6;
    const startX = Math.random() * 100;
    const rotateEnd = Math.random() * 720 - 360;

    return (
        <motion.div
            className="absolute top-0 rounded-sm pointer-events-none"
            style={{
                left: `${startX}%`,
                width: size,
                height: size * (Math.random() > 0.5 ? 1 : 2.5),
                backgroundColor: color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
            initial={{ y: -20, opacity: 1, rotate: 0, x: 0 }}
            animate={{
                y: window.innerHeight + 100,
                opacity: [1, 1, 0],
                rotate: rotateEnd,
                x: (Math.random() - 0.5) * 200,
            }}
            transition={{
                duration: Math.random() * 2 + 1.5,
                delay: Math.random() * 0.8,
                ease: 'easeIn',
            }}
        />
    );
}

export default function SuccessAnimation({
    isVisible,
    onClose,
    title = 'Purchase Successful!',
    message = 'Your items have been added to your inventory.',
    primaryAction = { label: 'View Inventory', href: '/merchant/shopping/inventory' },
    secondaryAction = { label: 'Continue Shopping', onClick: null },
    stats = null,
}) {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        if (isVisible) {
            setParticles(Array.from({ length: 60 }, (_, i) => i));
            const timer = setTimeout(() => {
                setParticles([]);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-[2000] flex items-center justify-center p-4 overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Confetti */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {particles.map((i) => (
                            <ConfettiParticle key={i} index={i} />
                        ))}
                    </div>

                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Modal Content */}
                    <motion.div
                        className="relative z-10 bg-white dark:bg-[#0d1117] rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center border border-[#D4AF37]/20 overflow-hidden"
                        initial={{ scale: 0.7, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                    >
                        {/* Background glow */}
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-[80px] pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

                        {/* Icon */}
                        <div className="relative mb-6">
                            <motion.div
                                className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30"
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.15 }}
                            >
                                <CheckCircle2 size={44} className="text-white" strokeWidth={2.5} />
                            </motion.div>

                            {/* Sparkle ring */}
                            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                                <motion.div
                                    key={angle}
                                    className="absolute top-1/2 left-1/2"
                                    style={{
                                        transformOrigin: 'center',
                                    }}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{
                                        opacity: [0, 1, 0],
                                        scale: [0, 1, 0],
                                        x: Math.cos((angle * Math.PI) / 180) * 56,
                                        y: Math.sin((angle * Math.PI) / 180) * 56,
                                    }}
                                    transition={{ delay: 0.3 + i * 0.05, duration: 0.6 }}
                                >
                                    <Sparkles size={14} className="text-[#D4AF37] -translate-x-1/2 -translate-y-1/2" />
                                </motion.div>
                            ))}
                        </div>

                        {/* Text */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                        >
                            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2">
                                {title}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-6">
                                {message}
                            </p>
                        </motion.div>

                        {/* Stats (optional) */}
                        {stats && (
                            <motion.div
                                className="flex items-stretch gap-3 mb-6"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.45 }}
                            >
                                {stats.map((stat, i) => (
                                    <div key={i} className="flex-1 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 text-center">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                                            {stat.label}
                                        </p>
                                        <p className="text-xl font-black text-slate-900 dark:text-slate-100">
                                            {stat.value}
                                        </p>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {/* Actions */}
                        <motion.div
                            className="flex flex-col gap-3"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            {primaryAction.href ? (
                                <Link
                                    href={primaryAction.href}
                                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-amber-500 text-black font-black text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 hover:shadow-amber-500/40 transition-all active:scale-95"
                                >
                                    <Package size={18} />
                                    {primaryAction.label}
                                    <ArrowRight size={16} />
                                </Link>
                            ) : (
                                <button
                                    onClick={primaryAction.onClick}
                                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-amber-500 text-black font-black text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 hover:shadow-amber-500/40 transition-all active:scale-95"
                                >
                                    <Package size={18} />
                                    {primaryAction.label}
                                </button>
                            )}

                            <button
                                onClick={secondaryAction.onClick || onClose}
                                className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center gap-2 transition-all active:scale-95 border border-slate-200 dark:border-white/10"
                            >
                                <ShoppingBag size={16} />
                                {secondaryAction.label}
                            </button>
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
