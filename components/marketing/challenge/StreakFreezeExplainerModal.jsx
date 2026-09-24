'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { 
    Snowflake, 
    Flame, 
    ShieldCheck, 
    X, 
    Calendar, 
    CheckCircle2, 
    Sparkles, 
    HelpCircle,
    ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StreakFreezeExplainerModal({ isOpen, onClose, freezesLeft = 1 }) {
    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 12 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="bg-white text-slate-900 border border-blue-100 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden"
                >
                    {/* Top ambient ice glow */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-100/60 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
                    <div className="absolute top-0 left-0 w-36 h-36 bg-cyan-100/50 rounded-full blur-2xl pointer-events-none -ml-12 -mt-12" />

                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200/90 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>

                    {/* Scrollable Body */}
                    <div className="p-5 sm:p-7 overflow-y-auto space-y-4">
                        {/* Header with Robot Mascot & Snowflake badge */}
                        <div className="flex items-center gap-3.5 pr-8">
                            <div className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                                <Image
                                    src="/robot-mascot-nobg.png"
                                    alt="InTrust AI Robot Guide"
                                    width={48}
                                    height={48}
                                    className="object-contain"
                                    priority
                                />
                                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                    <Snowflake size={11} className="animate-spin-slow" />
                                </span>
                            </div>
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 mb-1">
                                    <ShieldCheck size={11} />
                                    <span>Streak Life Jacket</span>
                                </div>
                                <h3 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight leading-snug">
                                    How Streak Freeze Protects You
                                </h3>
                            </div>
                        </div>

                        {/* Status Pill */}
                        <div className="p-3 sm:p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between gap-2 shadow-2xs">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                                <span className="text-xs font-bold text-slate-800">Your Current Freeze Shield:</span>
                            </div>
                            <span className="px-3 py-1 rounded-xl bg-blue-600 text-white text-xs font-black shadow-xs shrink-0">
                                {freezesLeft} / 1 Active Shield
                            </span>
                        </div>

                        {/* 3-Step Visual Diagram */}
                        <div className="space-y-2.5">
                            <div className="flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs mt-0.5">
                                    1
                                </div>
                                <div className="text-xs min-w-0">
                                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                        <span>Play Daily Challenge to Build Fire</span>
                                        <Flame size={13} className="fill-amber-500 text-amber-500 shrink-0" />
                                    </h4>
                                    <p className="text-slate-600 mt-0.5 leading-relaxed font-medium">
                                        Answer 10 Daily Challenge questions each day. Your streak counter increments continuously (e.g. Day 1 → Day 5) to unlock milestone rewards.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80">
                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs mt-0.5">
                                    2
                                </div>
                                <div className="text-xs min-w-0">
                                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                        <span>Missed a Day? Freeze Auto-Deploys!</span>
                                        <Snowflake size={13} className="text-blue-500 shrink-0" />
                                    </h4>
                                    <p className="text-slate-600 mt-0.5 leading-relaxed font-medium">
                                        Traveling, busy, or forgot? At midnight (12:00 AM IST), your equipped Freeze Shield automatically locks your streak in ice. It <strong>never resets to 0</strong>!
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs mt-0.5">
                                    3
                                </div>
                                <div className="text-xs min-w-0">
                                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                        <span>Resume Right Where You Left Off</span>
                                        <Sparkles size={13} className="text-emerald-600 shrink-0" />
                                    </h4>
                                    <p className="text-slate-600 mt-0.5 leading-relaxed font-medium">
                                        Play the next day to advance from Day 5 to Day 6 toward your next cashback milestone and physical gift!
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Monthly Refill Rule */}
                        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex items-start gap-2.5">
                            <Calendar size={15} className="text-blue-600 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">
                                Every member gets <strong>1 free Freeze Shield per month</strong>, automatically replenished on the 1st of each calendar month.
                            </span>
                        </div>
                    </div>

                    {/* Footer Action */}
                    <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <span>Got It, Protect My Streak!</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

