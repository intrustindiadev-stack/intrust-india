'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
    BarChart3, 
    Flame, 
    Zap, 
    Clock, 
    Share2, 
    CheckCheck,
    Sparkles,
    Trophy,
    ArrowRight,
    Target,
    LayoutDashboard,
    ChevronDown,
    ChevronUp,
    HelpCircle,
    CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TrophyChampionVector from '@/components/marketing/graphics/TrophyChampionVector';

export default function QuizResultsView({
    quizStage = 'completed',
    score = 0,
    totalQuestions = 10,
    streakData = {},
    completionResult = null,
    todayPlay = null,
    dynamicReward = 25,
    formattedTodayDate = '',
    shareCopied = false,
    handleShareResults,
    questions = []
}) {
    const isAlreadyCompleted = quizStage === 'already_completed';
    const accuracyPercent = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 100;
    const finalStreak = streakData?.streak || 1;
    const [showQuestionsReview, setShowQuestionsReview] = useState(false);
    
    // Animated Streak Counter effect
    const [animatedStreak, setAnimatedStreak] = useState(Math.max(1, finalStreak - 1));
    const [isLevelUpGlowing, setIsLevelUpGlowing] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedStreak(finalStreak);
            setIsLevelUpGlowing(true);
        }, 400);
        return () => clearTimeout(timer);
    }, [finalStreak]);

    // Reward amount formatting
    const rewardFormatted = completionResult?.reward_paise 
        ? (completionResult.reward_paise / 100).toFixed(2) 
        : todayPlay?.cashback_awarded_paise 
        ? (todayPlay.cashback_awarded_paise / 100).toFixed(2) 
        : Number(dynamicReward || 25).toFixed(2);

    const pointsEarned = (score || 0) * 10;

    return (
        <div className="space-y-4 max-w-xl mx-auto w-full animate-fadeIn">
            {/* Header Prompt with Points Pill */}
            <div className="text-center space-y-1.5">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                        Daily Challenge Summary
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-2xs">
                        <Sparkles size={12} className="text-emerald-600" />
                        <span>+{pointsEarned} Points Added</span>
                    </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 pt-0.5">
                    Share your progress and keep earning!
                </h2>
            </div>

            {/* Celebratory Hero Card with 3D Golden Trophy & Mascot */}
            <div className="bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#0369a1] rounded-3xl p-5 sm:p-7 text-center text-white shadow-2xl relative overflow-hidden border border-white/30">
                {/* Ambient Sparkle Lights */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-900/30 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 space-y-3.5">
                    {/* Visual: Trophy + Floating Mascot Pill */}
                    <div className="relative w-32 h-32 sm:w-36 sm:h-36 mx-auto flex items-center justify-center">
                        <TrophyChampionVector animated={true} className="w-28 h-28 sm:w-32 sm:h-32" />
                        <div className="absolute -bottom-1 -right-2 w-12 h-12 rounded-2xl bg-white/90 shadow-lg border border-white/80 flex items-center justify-center overflow-hidden">
                            <Image
                                src="/robot-mascot-nobg.png"
                                alt="Robot Champion"
                                width={40}
                                height={40}
                                className="object-contain"
                            />
                        </div>
                    </div>

                    {/* Streak Level Up Flare Banner */}
                    {!isAlreadyCompleted && (
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: -6 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 220 }}
                            className={`p-2.5 sm:p-3 rounded-2xl border backdrop-blur-md flex items-center justify-center gap-2 text-white shadow-lg transition-all ${
                                isLevelUpGlowing 
                                    ? 'bg-gradient-to-r from-amber-500/40 via-orange-500/50 to-rose-500/40 border-amber-300 shadow-orange-500/30' 
                                    : 'bg-white/20 border-white/30'
                            }`}
                        >
                            <Flame className="w-5 h-5 text-amber-300 fill-amber-300 animate-bounce" />
                            <span className="text-xs sm:text-sm font-black uppercase tracking-wider">
                                Streak Level Up: Day {Math.max(1, finalStreak - 1)} → Day {finalStreak}! 🔥
                            </span>
                        </motion.div>
                    )}

                    {/* Big Congratulatory Headline */}
                    <div className="space-y-1">
                        <h3 className="text-lg sm:text-xl font-black tracking-tight drop-shadow-md">
                            {isAlreadyCompleted
                                ? "You're in the top 0.1% of InTrust learners!"
                                : "Congratulations! Challenge Solved!"}
                        </h3>
                        <p className="text-xs sm:text-sm font-semibold text-sky-100 max-w-md mx-auto">
                            {isAlreadyCompleted
                                ? "Today's challenge is completed. Come back tomorrow after midnight IST for fresh trivia!"
                                : `You scored ${score}/${totalQuestions} correct (+${pointsEarned} PTS). Your streak is actively defended!`}
                        </p>
                    </div>

                    {/* 4-Stat Metric Grid */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                        {/* Metric 1: Accuracy */}
                        <div className="bg-white/95 rounded-2xl p-3 sm:p-3.5 text-left border border-white/80 shadow-sm flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                                <BarChart3 size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                    {accuracyPercent}%
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                    Accuracy
                                </div>
                            </div>
                        </div>

                        {/* Metric 2: Best Streak with Animation */}
                        <div className="bg-white/95 rounded-2xl p-3 sm:p-3.5 text-left border border-white/80 shadow-sm flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                                <Flame size={16} className="text-orange-500 fill-orange-500 animate-pulse" />
                            </div>
                            <div className="min-w-0">
                                <motion.div 
                                    key={animatedStreak}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-xs sm:text-sm font-black text-orange-600 truncate flex items-center gap-1"
                                >
                                    <span>{animatedStreak} Days</span>
                                    <span className="text-[9px] bg-orange-100 text-orange-800 px-1 py-0.2 rounded font-bold">🔥</span>
                                </motion.div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                    Current Streak
                                </div>
                            </div>
                        </div>

                        {/* Metric 3: Cashback Earned */}
                        <div className="bg-white/95 rounded-2xl p-3 sm:p-3.5 text-left border border-white/80 shadow-sm flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                                <Zap size={16} className="fill-amber-500 text-amber-500" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                    ₹{rewardFormatted}
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                    Cashback Won
                                </div>
                            </div>
                        </div>

                        {/* Metric 4: Questions Solved */}
                        <div className="bg-white/95 rounded-2xl p-3 sm:p-3.5 text-left border border-white/80 shadow-sm flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                                <Clock size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                    {score}/{totalQuestions} Done
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                    Score Result
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Date Stamp */}
                    {formattedTodayDate && (
                        <div className="text-[10px] font-medium text-sky-100 pt-0.5">
                            InTrust Daily Challenge completed on {formattedTodayDate}
                        </div>
                    )}

                    {/* Action: SHARE MY RESULTS Button */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={handleShareResults}
                            className="w-full py-3.5 px-6 rounded-full bg-white hover:bg-slate-50 text-[#091e42] font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer border border-white/80"
                        >
                            {shareCopied ? (
                                <>
                                    <CheckCheck size={16} className="text-emerald-600" />
                                    <span>Results Copied to Clipboard!</span>
                                </>
                            ) : (
                                <>
                                    <Share2 size={16} />
                                    <span>Share My Results</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Questions Review Drawer (if questions available) */}
            {questions && questions.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowQuestionsReview(!showQuestionsReview)}
                        className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <HelpCircle size={15} />
                            </div>
                            <div>
                                <h4 className="text-xs sm:text-sm font-black text-slate-900">
                                    Review Today&apos;s 10 Questions & Answers
                                </h4>
                                <p className="text-[10px] text-slate-500 font-medium">
                                    Click to learn from the explanations and key takeaways
                                </p>
                            </div>
                        </div>
                        {showQuestionsReview ? (
                            <ChevronUp size={16} className="text-slate-400 shrink-0" />
                        ) : (
                            <ChevronDown size={16} className="text-slate-400 shrink-0" />
                        )}
                    </button>

                    <AnimatePresence>
                        {showQuestionsReview && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="border-t border-slate-100 p-3 sm:p-4 space-y-3 bg-slate-50/50"
                            >
                                {questions.map((q, qIdx) => (
                                    <div key={q.id || qIdx} className="p-3 rounded-xl bg-white border border-slate-200/80 text-xs space-y-1.5 shadow-2xs">
                                        <div className="flex items-start gap-2">
                                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                                                {qIdx + 1}
                                            </span>
                                            <p className="font-bold text-slate-900 leading-snug flex-1">
                                                {q.question}
                                            </p>
                                        </div>
                                        <div className="pl-7 space-y-1">
                                            <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                                                <CheckCircle2 size={13} className="shrink-0" />
                                                <span>Correct: {q.options?.[q.correct]}</span>
                                            </div>
                                            {q.explanation && (
                                                <p className="text-[10px] text-slate-500 leading-relaxed italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                    💡 {q.explanation}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Quick Navigation CTAs */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
                <Link
                    href="/marketing/targets"
                    className="p-3 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-between hover:border-blue-400 transition-colors shadow-2xs group"
                >
                    <div className="flex items-center gap-2">
                        <Target size={16} className="text-blue-600" />
                        <span className="text-xs font-bold text-slate-800">Milestone Targets</span>
                    </div>
                    <ArrowRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                    href="/marketing"
                    className="p-3 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-between hover:border-indigo-400 transition-colors shadow-2xs group"
                >
                    <div className="flex items-center gap-2">
                        <LayoutDashboard size={16} className="text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">Marketing Hub</span>
                    </div>
                    <ArrowRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>
        </div>
    );
}

