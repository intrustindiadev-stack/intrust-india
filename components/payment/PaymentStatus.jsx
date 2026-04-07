import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';

export const PaymentStatusLayout = ({ children, variant = 'blue', animateBg = true }) => {
    const shouldReduceMotion = useReducedMotion();

    // Map variant to gradient colors
    const colors = {
        amber: 'bg-amber-500/10',
        indigo: 'bg-indigo-500/10',
        blue: 'bg-blue-600/20',
        purple: 'bg-purple-600/20',
        red: 'bg-red-500/10',
        gray: 'bg-gray-500/10'
    };

    const pulseClass = (animateBg && !shouldReduceMotion) ? 'animate-pulse' : '';

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 sm:p-6 font-[family-name:var(--font-outfit)] overflow-hidden relative">
            {/* Background Gradients */}
            <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] ${colors.blue} blur-[120px] rounded-full ${pulseClass}`} />
            <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] ${colors.purple} blur-[120px] rounded-full ${pulseClass}`} style={{ animationDelay: '1s' }} />

            {(variant === 'amber' || variant === 'indigo' || variant === 'red') && (
                <div className={`absolute top-[30%] ${variant === 'amber' ? 'right-[10%]' : 'left-[10%]'} w-[30%] h-[30%] ${colors[variant]} blur-[100px] rounded-full`} />
            )}

            <motion.div
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.95 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                className="max-w-lg w-full bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10"
            >
                {children}
            </motion.div>

            {/* Visual Flair */}
            <div className={`fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${variant === 'amber' ? 'amber' : variant === 'indigo' ? 'indigo' : variant === 'red' ? 'red' : 'blue'}-500/20 to-transparent`} />
        </div>
    );
};

export const StatusHeader = ({
    icon,
    title,
    description,
    variant = 'blue',
    isLoading = false
}) => {
    const shouldReduceMotion = useReducedMotion();

    const colors = {
        amber: {
            bg: 'bg-amber-500',
            grad: 'from-amber-500/20',
            text: 'text-amber-500',
            shadow: 'shadow-[0_0_40px_rgba(245,158,11,-0.3)]'
        },
        indigo: {
            bg: 'bg-indigo-600',
            grad: 'from-indigo-500/20',
            text: 'text-indigo-400',
            shadow: 'shadow-[0_0_40px_rgba(99,102,241,0.3)]'
        },
        blue: {
            bg: 'bg-blue-600',
            grad: 'from-blue-500/20',
            text: 'text-blue-500',
            shadow: 'shadow-[0_0_40px_rgba(37,99,235,0.3)]'
        },
        red: {
            bg: 'bg-red-600',
            grad: 'from-red-500/20',
            text: 'text-red-500',
            shadow: 'shadow-[0_0_40px_rgba(220,38,38,0.3)]'
        },
        gray: {
            bg: 'bg-gray-600',
            grad: 'from-gray-500/20',
            text: 'text-gray-400',
            shadow: 'shadow-[0_0_40px_rgba(75,85,99,0.3)]'
        }
    };

    const colorScheme = colors[variant] || colors.blue;

    return (
        <div className={`h-48 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b ${colorScheme.grad} to-transparent`}>
            {isLoading ? (
                <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-white/80 animate-spin mb-4" />
            ) : (
                <motion.div
                    initial={shouldReduceMotion ? { scale: 1 } : { scale: 0, rotate: -45 }}
                    animate={shouldReduceMotion ? { scale: 1 } : { scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.2 }}
                    className={`w-24 h-24 rounded-3xl ${colorScheme.bg} ${colorScheme.shadow} flex items-center justify-center mb-4 border border-white/20`}
                >
                    {icon}
                </motion.div>
            )}

            <motion.h1
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`text-3xl md:text-5xl lg:text-6xl font-black italic tracking-tighter mb-2 text-center px-4 ${colorScheme.text}`}
            >
                {title}
            </motion.h1>

            {description && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-gray-400 text-sm mt-2 font-medium"
                >
                    {description}
                </motion.p>
            )}
        </div>
    );
};

export const ReferenceBlock = ({
    amount,
    method,
    refId,
    statusLabel,
    variant = 'blue'
}) => {
    const colors = {
        amber: 'bg-amber-500/20 text-amber-500',
        indigo: 'bg-indigo-500/20 text-indigo-400',
        blue: 'bg-blue-500/20 text-blue-400',
        red: 'bg-red-500/20 text-red-400',
        gray: 'bg-gray-500/20 text-gray-400'
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-black/40 border border-white/5 rounded-3xl p-6 mb-8 text-left relative group overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8 blur-xl" />

            <div className="flex justify-between items-end mb-6 gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Amount</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-white italic tracking-tight truncate">
                        {amount != null ? `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '---'}
                    </h3>
                </div>
                {statusLabel && (
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shrink-0 ${colors[variant] || colors.blue}`}>
                        {statusLabel}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                {method && (
                    <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Method</p>
                        <p className="text-sm font-bold text-gray-200">{method}</p>
                    </div>
                )}
                {refId && (
                    <div className="text-right col-start-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Ref ID</p>
                        <p className="text-[10px] font-mono text-gray-400 truncate max-w-[120px] ml-auto">{refId}</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export const ActionRow = ({
    primary,
    secondary,
    tertiary
}) => {
    return (
        <div className="space-y-4 w-full">
            {primary && (
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Link
                        href={primary.href}
                        onClick={primary.onClick}
                        className={`font-[family-name:var(--font-outfit)] w-full py-5 rounded-2xl text-sm font-black text-white shadow-2xl transition-all block tracking-widest italic text-center
                        ${primary.variant === 'amber' ? 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-amber-500/20'
                                : primary.variant === 'indigo' ? 'bg-gradient-to-r from-indigo-600 to-purple-700 shadow-indigo-500/20'
                                    : primary.variant === 'red' ? 'bg-gradient-to-r from-red-600 to-rose-700 shadow-red-500/20'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/20'}`}
                    >
                        {primary.label}
                    </Link>
                </motion.div>
            )}

            {(secondary || tertiary) && (
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-2">
                    {secondary && (
                        <Link
                            href={secondary.href}
                            onClick={secondary.onClick}
                            className={`px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-white/5
                            ${secondary.variant === 'amber' ? 'bg-amber-500 text-black hover:bg-amber-400'
                                    : secondary.variant === 'indigo' ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
                        >
                            {secondary.label}
                        </Link>
                    )}

                    {tertiary && (
                        <Link
                            href={tertiary.href}
                            onClick={tertiary.onClick}
                            className="text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                        >
                            {tertiary.label}
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
};
