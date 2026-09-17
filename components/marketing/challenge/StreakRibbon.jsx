'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Trophy, Snowflake, CheckCircle2, Star, Sparkles, ShieldAlert } from 'lucide-react';

/**
 * @param {{
 *   streak: number;
 *   highestStreak?: number;
 *   playedToday: boolean;
 *   freezesLeft?: number;
 *   milestones?: Array<{ days: number; bonus_paise: number; badge: string }>;
 *   onInfoClick?: () => void;
 * }} props
 */
export default function StreakRibbon({
    streak = 0,
    highestStreak = 0,
    playedToday = false,
    freezesLeft = 1,
    milestones = [
        { days: 3, bonus_paise: 1000, badge: '3-Day Flame' },
        { days: 7, bonus_paise: 3000, badge: 'Weekly Master' },
        { days: 14, bonus_paise: 7500, badge: 'Bi-Weekly Champion' },
        { days: 30, bonus_paise: 20000, badge: 'InTrust Legend' },
    ],
    onInfoClick
}) {
    // Generate the 7 days of the current week (Mon-Sun)
    const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const todayIndex = (new Date().getDay() + 6) % 7; // 0 for Monday, 6 for Sunday

    // Calculate next milestone
    const nextMilestone = milestones.find(m => m.days > streak) || milestones[milestones.length - 1];
    const daysToNext = nextMilestone ? Math.max(0, nextMilestone.days - streak) : 0;

    return (
        <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-rose-500/10 dark:from-orange-950/40 dark:via-amber-950/30 dark:to-rose-950/40 rounded-3xl p-4 sm:p-5 border border-orange-500/20 shadow-xs relative overflow-hidden">
            {/* Background ambient flame glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                {/* Left: Streak Counter & Fire Badge */}
                <div className="flex items-center gap-3.5">
                    <motion.div 
                        animate={streak > 0 ? { scale: [1, 1.08, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                            streak > 0 
                                ? 'bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white shadow-orange-500/30' 
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                        }`}
                    >
                        <Flame size={24} className={streak > 0 ? 'fill-white animate-pulse' : ''} />
                    </motion.div>

                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                {streak} Day {streak === 1 ? 'Streak' : 'Streak'}
                            </h3>
                            {playedToday ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                    <CheckCircle2 size={11} /> Saved Today
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                                    Play to Keep Streak
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                            {daysToNext > 0 ? (
                                <span>{daysToNext} {daysToNext === 1 ? 'day' : 'days'} to <strong className="text-orange-600 dark:text-orange-400 font-black">{nextMilestone.badge}</strong> (+₹{(nextMilestone.bonus_paise / 100).toFixed(0)} Extra)</span>
                            ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-black">All Streak Milestones Achieved! 🎉</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Center: 7-Day Cycle Indicators */}
                <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl border border-orange-500/15">
                    {daysOfWeek.map((day, idx) => {
                        const isPast = idx < todayIndex;
                        const isCurrent = idx === todayIndex;
                        // Completed if past days are within streak length, or current day is played
                        const isCompleted = isCurrent ? playedToday : (isPast && (todayIndex - idx) < streak);

                        return (
                            <div key={idx} className="flex flex-col items-center gap-1">
                                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                                    isCompleted 
                                        ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs' 
                                        : isCurrent 
                                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 ring-2 ring-orange-500/50 animate-pulse'
                                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400'
                                }`}>
                                    {isCompleted ? (
                                        <CheckCircle2 size={14} className="stroke-[3]" />
                                    ) : isCurrent ? (
                                        <Flame size={14} className="fill-amber-500" />
                                    ) : (
                                        <span className="text-[10px]">{day}</span>
                                    )}
                                </div>
                                <span className="text-[9px] font-bold text-slate-400">
                                    {day}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Right: Freeze Protection & Highest Streak */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-orange-500/10">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold" title="Freeze automatically protects 1 missed day per month">
                        <Snowflake size={14} className="text-blue-500 animate-spin-slow" />
                        <span>{freezesLeft} Freeze Left</span>
                    </div>

                    {highestStreak > 0 && (
                        <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Record</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-0.5 justify-end">
                                <Trophy size={12} className="text-amber-500" /> {highestStreak} Days
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
