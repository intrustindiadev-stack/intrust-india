'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Snowflake, CheckCircle2, Star, Sparkles, HelpCircle } from 'lucide-react';
import StreakFreezeExplainerModal from './StreakFreezeExplainerModal';

export default function StreakRibbon({
    streak = 0,
    currentStreak,
    highestStreak = 0,
    playedToday = false,
    freezesLeft = 1,
    milestones = [
        { days: 3, bonus_paise: 1000, badge: '3-Day Flame' },
        { days: 7, bonus_paise: 3000, badge: 'Weekly Master' },
        { days: 14, bonus_paise: 7500, badge: 'Bi-Weekly Champion' },
        { days: 30, bonus_paise: 20000, badge: 'InTrust Legend' },
    ],
    onInfoClick,
    className = ''
}) {
    const [showFreezeModal, setShowFreezeModal] = useState(false);

    // Initial reactive streak states
    const initialStreakVal = Number(currentStreak !== undefined ? currentStreak : streak);
    const [liveStreak, setLiveStreak] = useState(initialStreakVal);
    const [livePlayedToday, setLivePlayedToday] = useState(Boolean(playedToday));
    const [liveHighest, setLiveHighest] = useState(Number(highestStreak || initialStreakVal));
    const [liveFreezes, setLiveFreezes] = useState(Number(freezesLeft ?? 1));

    // Keep synchronized with incoming props
    useEffect(() => {
        setLiveStreak(Number(currentStreak !== undefined ? currentStreak : streak));
    }, [currentStreak, streak]);

    useEffect(() => {
        setLivePlayedToday(Boolean(playedToday));
    }, [playedToday]);

    useEffect(() => {
        setLiveHighest(Number(highestStreak || 0));
    }, [highestStreak]);

    useEffect(() => {
        setLiveFreezes(Number(freezesLeft ?? 1));
    }, [freezesLeft]);

    // Listen to real-time custom events dispatched by submit_daily_challenge or other components
    useEffect(() => {
        const handleStreakUpdate = (e) => {
            if (e.detail) {
                if (e.detail.current_streak !== undefined) {
                    setLiveStreak(Number(e.detail.current_streak));
                }
                if (e.detail.played_today !== undefined) {
                    setLivePlayedToday(Boolean(e.detail.played_today));
                }
                if (e.detail.highest_streak !== undefined) {
                    setLiveHighest(Number(e.detail.highest_streak));
                }
                if (e.detail.freezes_left !== undefined) {
                    setLiveFreezes(Number(e.detail.freezes_left));
                }
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('marketingStreakUpdated', handleStreakUpdate);
            return () => window.removeEventListener('marketingStreakUpdated', handleStreakUpdate);
        }
    }, []);

    // Effective streak: if played today, guarantee at least 1
    const effectiveStreak = livePlayedToday ? Math.max(1, liveStreak) : liveStreak;

    // Generate the 7 days of the current week (Mon-Sun)
    const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const todayIndex = (new Date().getDay() + 6) % 7; // 0 for Monday, 6 for Sunday

    // Accurate calculation for past days completed in the current cycle
    const pastDaysCompleted = livePlayedToday ? Math.max(0, effectiveStreak - 1) : effectiveStreak;

    // Calculate next milestone and progress percentage
    const activeMilestones = milestones && milestones.length > 0 ? milestones : [
        { days: 3, bonus_paise: 1000, badge: '3-Day Flame' },
        { days: 7, bonus_paise: 3000, badge: 'Weekly Master' },
        { days: 14, bonus_paise: 7500, badge: 'Bi-Weekly Champion' },
        { days: 30, bonus_paise: 20000, badge: 'InTrust Legend' },
    ];
    const prevMilestoneDays = [...activeMilestones].reverse().find(m => m.days <= effectiveStreak)?.days || 0;
    const nextMilestone = activeMilestones.find(m => m.days > effectiveStreak) || activeMilestones[activeMilestones.length - 1];
    const daysToNext = nextMilestone ? Math.max(0, nextMilestone.days - effectiveStreak) : 0;
    const progressRange = nextMilestone ? Math.max(1, nextMilestone.days - prevMilestoneDays) : 1;
    const progressCurrent = Math.max(0, effectiveStreak - prevMilestoneDays);
    const progressPct = daysToNext === 0 ? 100 : Math.min(100, Math.round((progressCurrent / progressRange) * 100));

    return (
        <>
            <div className={`bg-gradient-to-r from-orange-50/95 via-amber-50/80 to-rose-50/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-orange-200/90 shadow-2xs relative overflow-hidden transition-all ${className}`}>
                {/* Background ambient glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-orange-200/30 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4 relative z-10">
                    {/* Top / Left: Streak Counter & Fire Badge & Milestone Progress */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 sm:gap-3.5">
                            <motion.div 
                                key={`flame-${effectiveStreak}-${livePlayedToday}`}
                                initial={{ scale: 0.85 }}
                                animate={effectiveStreak > 0 ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                                transition={{ repeat: effectiveStreak > 0 ? Infinity : 0, duration: 2.2, ease: "easeInOut" }}
                                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                                    effectiveStreak > 0 
                                        ? 'bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white shadow-orange-500/25 ring-2 ring-orange-400/30' 
                                        : 'bg-slate-200 text-slate-400'
                                }`}
                            >
                                <Flame size={22} className={effectiveStreak > 0 ? 'fill-white animate-pulse' : ''} />
                            </motion.div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <motion.h3 
                                        key={`streak-text-${effectiveStreak}`}
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-base sm:text-xl font-black text-slate-950 tracking-tight leading-none"
                                    >
                                        {effectiveStreak} Day Streak
                                    </motion.h3>
                                    {livePlayedToday ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs shrink-0 animate-fadeIn">
                                            <CheckCircle2 size={12} className="text-emerald-700 stroke-[2.5]" />
                                            <span>Saved Today</span>
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse shrink-0">
                                            Play Daily Challenge
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] sm:text-xs text-slate-600 font-semibold mt-1 truncate">
                                    {daysToNext > 0 ? (
                                        <span>{daysToNext} {daysToNext === 1 ? 'day' : 'days'} to <strong className="text-orange-600 font-black">{nextMilestone.badge}</strong> (+₹{(nextMilestone.bonus_paise / 100).toFixed(0)} Extra)</span>
                                    ) : (
                                        <span className="text-emerald-600 font-black">All Streak Milestones Achieved! 🎉</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Embedded Milestone Progress Bar */}
                        {nextMilestone && daysToNext > 0 && (
                            <div className="mt-2.5 max-w-sm sm:max-w-md">
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                                    <span className="flex items-center gap-1">
                                        <Sparkles size={10} className="text-amber-500" />
                                        Next: {nextMilestone.badge}
                                    </span>
                                    <span className="text-orange-600 font-black">{progressPct}%</span>
                                </div>
                                <div className="w-full h-1.5 sm:h-2 bg-orange-100 rounded-full overflow-hidden p-0.5 border border-orange-200/50">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPct}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Middle: 7-Day Cycle Indicators (Responsive full-width on mobile, auto on desktop) */}
                    <div className="w-full lg:w-auto flex items-center justify-between sm:justify-center gap-1 sm:gap-2 bg-white/95 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl border border-orange-200/70 shadow-2xs">
                        {daysOfWeek.map((day, idx) => {
                            const isPast = idx < todayIndex;
                            const isCurrent = idx === todayIndex;
                            const isCompleted = isCurrent ? livePlayedToday : (isPast && (todayIndex - idx) <= pastDaysCompleted);

                            return (
                                <div key={idx} className="flex-1 sm:flex-initial flex flex-col items-center gap-0.5 sm:gap-1">
                                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                                        isCompleted 
                                            ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs' 
                                            : isCurrent 
                                            ? 'bg-amber-100 text-amber-800 ring-2 ring-orange-400/60 animate-pulse' 
                                            : 'bg-slate-100 text-slate-400'
                                    }`}>
                                        {isCompleted ? (
                                            <CheckCircle2 size={13} className="stroke-[3]" />
                                        ) : isCurrent ? (
                                            <Flame size={13} className="fill-amber-500 text-amber-500" />
                                        ) : (
                                            <span className="text-[10px]">{day}</span>
                                        )}
                                    </div>
                                    <span className={`text-[9px] font-bold ${isCurrent ? 'text-orange-600 font-black' : 'text-slate-400'}`}>
                                        {day}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom / Right: Freeze Protection & Explainer CTA */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-orange-200/50">
                        <button
                            type="button"
                            onClick={() => setShowFreezeModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/90 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[11px] sm:text-xs font-bold transition-colors active:scale-95 shadow-2xs cursor-pointer"
                            title="Click to learn how Freeze Shield protects your streak"
                        >
                            <Snowflake size={13} className="text-blue-600 animate-spin-slow" />
                            <span>{liveFreezes} Freeze Shield</span>
                            <HelpCircle size={11} className="text-blue-400" />
                        </button>

                        {liveHighest > 0 && (
                            <div className="text-right shrink-0">
                                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider leading-none">Record</span>
                                <span className="text-[11px] sm:text-xs font-black text-slate-900 flex items-center gap-0.5 justify-end mt-0.5">
                                    <Trophy size={11} className="text-amber-500" /> {liveHighest} Days
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Interactive Freeze Explainer Modal */}
            <StreakFreezeExplainerModal
                isOpen={showFreezeModal}
                onClose={() => setShowFreezeModal(false)}
                freezesLeft={freezesLeft}
            />
        </>
    );
}

