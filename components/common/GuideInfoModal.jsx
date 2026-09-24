'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    Lightbulb, 
    CheckCircle2, 
    Sparkles, 
    ArrowRight,
    HelpCircle,
    Compass
} from 'lucide-react';

export default function GuideInfoModal({ guide, open, onClose }) {
    const [mounted, setMounted] = useState(false);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { 
            if (e.key === 'Escape') onClose?.(); 
        };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev || 'unset';
        };
    }, [open, onClose]);

    if (!mounted || typeof document === 'undefined') return null;

    const badge = (tone) => tone === 'green'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
        : tone === 'red' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
        : tone === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
        : tone === 'indigo' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';

    const modalContent = (
        <AnimatePresence>
            {open && guide && (
                <div 
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-hidden" 
                    role="dialog" 
                    aria-modal="true"
                >
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" 
                        onClick={onClose} 
                    />

                    {/* Clean Light-Blue & White Compact Guide Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: 12 }}
                        animate={{ 
                            opacity: 1, 
                            scale: 1, 
                            y: 0,
                            transition: {
                                type: 'spring',
                                stiffness: 320,
                                damping: 26
                            }
                        }}
                        exit={{ 
                            opacity: 0, 
                            scale: 0.94, 
                            y: 10,
                            transition: { duration: 0.18, ease: 'easeOut' }
                        }}
                        className="relative w-full max-w-[460px] bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl border border-blue-100 dark:border-slate-800 overflow-hidden z-10 flex flex-col my-auto max-h-[88dvh]"
                    >
                        {/* ── Top Header with 3D Robot Mascot Explaining ── */}
                        <div className="relative p-5 pb-4 bg-gradient-to-br from-blue-50 via-sky-50/50 to-white dark:from-slate-800/80 dark:via-blue-950/30 dark:to-[#0f172a] border-b border-blue-100/80 dark:border-slate-800/80 shrink-0">
                            {/* Ambient Top Glow */}
                            <div className="absolute top-0 right-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

                            {/* Close Button Top Right */}
                            <button 
                                onClick={onClose} 
                                aria-label="Close guide modal" 
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-2xs flex items-center justify-center transition-colors cursor-pointer z-20"
                            >
                                <X size={15} strokeWidth={2.5} />
                            </button>

                            {/* Header Content: Robo Mascot + Title & Speech */}
                            <div className="flex items-start gap-3.5 pr-8">
                                {/* 3D Robot Mascot Avatar */}
                                <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 drop-shadow-md">
                                    <Image
                                        src="/robot-mascot-nobg.png"
                                        alt="InTrust Robo Assistant"
                                        fill
                                        sizes="64px"
                                        className="object-contain"
                                        priority
                                    />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-600/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-600/20">
                                            <Sparkles size={10} className="text-blue-600 dark:text-blue-400" />
                                            Robo Guide
                                        </span>
                                    </div>
                                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                                        {guide.title}
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-1">
                                        {guide.overview}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── Scrollable Body Content (Clean Light Blue & White) ── */}
                        <div 
                            ref={scrollContainerRef}
                            className="p-4 sm:p-5 overflow-y-auto space-y-4 select-text [scrollbar-width:thin] [scrollbar-color:#3b82f6_transparent]"
                        >
                            {/* Key Actions Section */}
                            {guide.keyActions?.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                                        <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                            How It Works
                                        </h3>
                                    </div>
                                    <div className="space-y-2">
                                        {guide.keyActions.map((a, i) => (
                                            <div 
                                                key={i} 
                                                className="p-3 rounded-2xl bg-blue-50/50 dark:bg-slate-800/40 border border-blue-100/70 dark:border-slate-800 flex items-start gap-2.5 transition-colors hover:bg-blue-50/80"
                                            >
                                                <span className="w-5 h-5 rounded-lg bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-xs shadow-blue-600/20">
                                                    {i + 1}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-[13px] block leading-tight">
                                                        {a.label}
                                                    </span>
                                                    <span className="text-slate-500 dark:text-slate-400 mt-0.5 block text-xs leading-normal font-medium">
                                                        {a.description}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Terminology / Glossary */}
                            {guide.glossary?.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                                        <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                            Key Terms
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 gap-1.5">
                                        {guide.glossary.map((g, i) => (
                                            <div key={i} className="p-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 shadow-2xs">
                                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black border ${badge(g.badgeTone)}`}>
                                                    {g.term}
                                                </span>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-snug font-medium">
                                                    {g.meaning}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pro Tip Box */}
                            {guide.tips?.length > 0 && (
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 dark:from-blue-950/30 dark:to-indigo-950/20 rounded-2xl p-3 sm:p-3.5 border border-blue-200/70 dark:border-blue-900/40">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <Lightbulb size={14} className="text-amber-500 shrink-0" />
                                        <h4 className="text-xs font-black text-blue-950 dark:text-blue-300">Robo Pro Tip</h4>
                                    </div>
                                    <ul className="space-y-1">
                                        {guide.tips.map((t, i) => (
                                            <li key={i} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium flex items-start gap-1.5">
                                                <span className="text-blue-500 font-bold shrink-0">•</span>
                                                <span>{t}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* ── Compact Footer with CTA ── */}
                        <div className="p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 shrink-0">
                            <button 
                                type="button"
                                onClick={onClose} 
                                className="w-full py-2.5 sm:py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-black transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
                            >
                                <CheckCircle2 size={16} />
                                <span>Got It, Thanks!</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
}
