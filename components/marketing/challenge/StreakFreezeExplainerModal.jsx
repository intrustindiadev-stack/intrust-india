'use client';

import React from 'react';
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
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white text-slate-900 border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
                            <Snowflake size={24} className="animate-spin-slow" />
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mb-0.5">
                                <ShieldCheck size={11} />
                                <span>Streak Life Jacket</span>
                            </div>
                            <h3 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight leading-snug">
                                How Streak Freeze Works
                            </h3>
                        </div>
                    </div>

                    {/* Status Pill */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 mb-5">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-xs font-bold text-slate-700">Your Current Freeze Shield:</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-blue-600 text-white text-xs font-black shadow-xs">
                            {freezesLeft} / 1 Available
                        </span>
                    </div>

                    {/* 3-Step Visual Diagram */}
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70">
                            <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
                                1
                            </div>
                            <div className="text-xs">
                                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>Play Daily to Build Fire</span>
                                    <Flame size={13} className="fill-amber-500 text-amber-500" />
                                </h4>
                                <p className="text-slate-600 mt-0.5 leading-relaxed font-medium">
                                    Complete 10 trivia questions each day. Your streak counter increments continuously (e.g. Day 1 → Day 5).
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80">
                            <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
                                2
                            </div>
                            <div className="text-xs">
                                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>Missed a Day? Freeze Auto-Triggers!</span>
                                    <Snowflake size={13} className="text-blue-500" />
                                </h4>
                                <p className="text-slate-600 mt-0.5 leading-relaxed font-medium">
                                    Traveling, busy, or forgot? At midnight, your equipped Freeze automatically locks your streak in ice. It <strong>never resets to 0</strong>!
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                            <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
                                3
                            </div>
                            <div className="text-xs">
                                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>Resume Right Where You Left Off</span>
                                    <Sparkles size={13} className="text-emerald-600" />
                                </h4>
                                <p className="text-slate-600 mt-0.5 leading-relaxed font-medium">
                                    Play the next day to advance from Day 5 to Day 6 toward your next cashback milestone!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Refill Rule */}
                    <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                        <Calendar size={15} className="text-blue-600 shrink-0" />
                        <span>Every member gets <strong>1 free Freeze Shield per month</strong>, automatically refreshed on the 1st of each calendar month.</span>
                    </div>

                    {/* Action Button */}
                    <div className="mt-5">
                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
                        >
                            Got It, Protect My Streak!
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
