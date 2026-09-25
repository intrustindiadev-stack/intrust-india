'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight, Flame, Sparkles, Wallet, CheckCircle2,
    Trophy, Share2, CheckCheck, Copy, Check,
    MessageCircle, HelpCircle, ChevronDown, ChevronUp,
    Zap, BarChart3, Clock, Target, LayoutDashboard
} from 'lucide-react';
import QuizSponsorShowcase from '@/components/marketing/challenge/QuizSponsorShowcase';

// ─── Step pill progress indicator ───────────────────────────────────────────
const STEP_LABELS = ['Sponsor', 'Reward', 'Streak', 'Results'];

function StepPills({ current }) {
    return (
        <div className="flex items-center justify-center gap-1.5 py-2">
            {STEP_LABELS.map((label, i) => (
                <div key={label} className="flex items-center gap-1.5">
                    <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                            i < current
                                ? 'w-5 bg-emerald-400'
                                : i === current
                                ? 'w-7 bg-blue-600'
                                : 'w-3 bg-slate-200'
                        }`}
                    />
                </div>
            ))}
        </div>
    );
}

// ─── Step 0 — Sponsor Showcase ───────────────────────────────────────────────
function SponsorStep({ todaySponsor, score, totalQuestions, dynamicReward, copiedProductId, handleShareProductDeal, isMerchant, onNext }) {
    return (
        <motion.div
            key="sponsor"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-4 max-w-xl mx-auto w-full"
        >
            <StepPills current={0} />

            <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    ✅ Quiz Complete — {score}/{totalQuestions} Correct
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    ⚡ +{score * 10} Points Earned
                </span>
            </div>

            <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">Today&apos;s Sponsor Deals 🛍️</h2>
                <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1 max-w-xs mx-auto">
                    Explore exclusive deals — your cashback unlocks when you claim below.
                </p>
            </div>

            <QuizSponsorShowcase
                todaySponsor={todaySponsor}
                copiedProductId={copiedProductId}
                handleShareProductDeal={handleShareProductDeal}
                isMerchant={isMerchant}
                score={score}
                totalQuestions={totalQuestions}
                rewardAmountRupees={dynamicReward}
                onClaimCashback={onNext}
            />

            {/* Skip sponsor → go straight to reward */}
            <button
                type="button"
                onClick={onNext}
                className="w-full min-h-[50px] py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
                <Wallet size={18} />
                <span>Claim ₹{Number(dynamicReward || 25).toFixed(2)} Cashback →</span>
            </button>
        </motion.div>
    );
}

// ─── Step 1 — Reward Animation ───────────────────────────────────────────────
function RewardStep({ rewardRupees, completionResult, onNext }) {
    const target = parseFloat(rewardRupees) || 25;
    const [counted, setCounted] = useState(0);
    const rafRef = useRef(null);

    useEffect(() => {
        const duration = 1400;
        let start = null;
        const tick = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setCounted(parseFloat((eased * target).toFixed(2)));
            if (p < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [target]);

    return (
        <motion.div
            key="reward"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center min-h-[58vh] space-y-6 max-w-sm mx-auto text-center px-4"
        >
            <StepPills current={1} />

            {/* Animated coin burst */}
            <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/25 to-emerald-400/25 blur-3xl scale-[2]" />
                {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: [0, 1, 0], scale: [0, 1.3, 0] }}
                        transition={{ delay: i * 0.09 + 0.2, duration: 1.2, repeat: Infinity, repeatDelay: 2.5 }}
                        className="absolute w-2.5 h-2.5 rounded-full bg-amber-400 shadow-md"
                        style={{ transform: `rotate(${deg}deg) translateX(64px)` }}
                    />
                ))}
                <motion.div
                    animate={{ scale: [1, 1.07, 1], rotate: [0, 3, -3, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center shadow-2xl shadow-amber-400/35 z-10"
                >
                    <Wallet size={48} className="text-white" />
                </motion.div>
            </div>

            <div className="space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200 inline-block">
                    Cashback Credited to Wallet
                </div>
                <div className="text-5xl sm:text-6xl font-black tracking-tight text-slate-900 tabular-nums">
                    ₹{counted.toFixed(2)}
                </div>
                <p className="text-sm sm:text-base text-slate-600 font-bold">Added instantly to your InTrust wallet 🎉</p>
                {completionResult?.new_balance_paise !== undefined && (
                    <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200">
                        <Wallet size={15} className="text-slate-500" />
                        <span>New Balance: ₹{(Number(completionResult.new_balance_paise) / 100).toFixed(2)}</span>
                    </div>
                )}
            </div>

            <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={onNext}
                className="w-full max-w-xs min-h-[50px] py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-sm shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
                <Flame size={18} />
                <span>View Your Streak →</span>
            </motion.button>
        </motion.div>
    );
}

// ─── Step 2 — Streak Reveal ──────────────────────────────────────────────────
function StreakStep({ streakData, onNext }) {
    const finalStreak = Number(streakData?.streak || 1);
    const highestStreak = Number(streakData?.highestStreak || finalStreak);
    const freezesLeft = Number(streakData?.freezesLeft ?? 1);

    const [animStreak, setAnimStreak] = useState(Math.max(0, finalStreak - 1));
    const [fired, setFired] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => { setAnimStreak(finalStreak); setFired(true); }, 500);
        return () => clearTimeout(t);
    }, [finalStreak]);

    const milestones = [3, 7, 14, 21, 30];
    const hitMilestone = milestones.find(m => m === finalStreak);
    const todayIndex = (new Date().getDay() + 6) % 7; // 0=Mon
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return (
        <motion.div
            key="streak"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-4 max-w-sm mx-auto text-center px-4"
        >
            <StepPills current={2} />

            <AnimatePresence>
                {hitMilestone && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-2xl shadow-lg shadow-amber-500/30 text-xs font-black"
                    >
                        <Trophy size={16} />
                        <span>🎉 {hitMilestone}-Day Milestone Unlocked!</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">Your Streak 🔥</h2>
                <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">Keep playing daily to grow your streak multiplier.</p>
            </div>

            <div className="relative flex flex-col items-center justify-center py-6 rounded-3xl bg-gradient-to-b from-orange-50 to-amber-50 border border-amber-100">
                <motion.div
                    key={animStreak}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                    className="flex flex-col items-center"
                >
                    <Flame
                        size={52}
                        className={`mb-1 transition-colors duration-700 ${fired ? 'text-orange-500 fill-orange-500' : 'text-slate-300 fill-slate-200'}`}
                    />
                    <div className="text-7xl font-black tracking-tight bg-gradient-to-b from-orange-500 to-amber-600 bg-clip-text text-transparent">
                        {animStreak}
                    </div>
                    <div className="text-sm font-black text-slate-700 uppercase tracking-widest mt-1">Day Streak</div>
                </motion.div>
            </div>

            {/* 7-day strip */}
            <div className="flex items-center justify-center gap-1.5">
                {dayLabels.map((d, i) => {
                    const streakDays = Math.min(finalStreak, 7);
                    const daysSinceToday = todayIndex - i;
                    const isActive = daysSinceToday >= 0 && daysSinceToday < streakDays;
                    const isToday = i === todayIndex;
                    return (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <motion.div
                                initial={{ scale: 0.7 }}
                                animate={{ scale: isActive ? 1 : 0.85 }}
                                transition={{ delay: isActive ? (todayIndex - i) * 0.06 : 0 }}
                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs sm:text-sm font-black border-2 ${
                                    isToday
                                        ? 'bg-orange-500 border-orange-400 text-white shadow-md'
                                        : isActive
                                        ? 'bg-amber-100 border-amber-300 text-amber-700'
                                        : 'bg-slate-100 border-slate-200 text-slate-400'
                                }`}
                            >
                                {isActive ? (isToday ? '🔥' : '✓') : d}
                            </motion.div>
                            <span className={`text-xs font-black ${isToday ? 'text-orange-500' : isActive ? 'text-amber-600' : 'text-slate-400'}`}>
                                {d}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: 'Current', value: finalStreak, color: 'text-orange-600' },
                    { label: 'Best', value: highestStreak, color: 'text-amber-600' },
                    { label: 'Freezes', value: freezesLeft, color: 'text-sky-600' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white rounded-2xl border border-slate-200 p-3 text-center shadow-sm">
                        <div className={`text-base sm:text-lg font-black ${color}`}>{value}</div>
                        <div className="text-xs font-black text-slate-500 uppercase">{label}</div>
                    </div>
                ))}
            </div>

            <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={onNext}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
                <Trophy size={18} />
                See Full Results →
            </motion.button>
        </motion.div>
    );
}

// ─── Step 3 — Quiz Results ───────────────────────────────────────────────────
function ResultsStep({
    score, totalQuestions, streakData, completionResult, todayPlay, dynamicReward,
    formattedTodayDate, shareCopied, handleShareResults, questions, profile, onBack
}) {
    const [showReview, setShowReview] = useState(false);
    const [copied, setCopied] = useState(false);

    const accuracy = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 100;
    const finalStreak = streakData?.streak || 1;

    const rewardFormatted = completionResult?.reward_paise
        ? (completionResult.reward_paise / 100).toFixed(2)
        : todayPlay?.cashback_awarded_paise
        ? (todayPlay.cashback_awarded_paise / 100).toFixed(2)
        : Number(dynamicReward || 25).toFixed(2);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://intrustindia.com';
    const challengeUrl = `${origin}/marketing/daily-challenge`;
    const shareBody = `🎯 ${profile?.full_name || 'I'} scored ${score}/${totalQuestions} on InTrust Daily Quiz!\n🔥 ${finalStreak}-Day Streak!\n\nEarn real wallet cashback daily:`;
    const fullShareText = `${shareBody}\n${challengeUrl}`;

    const handleWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(fullShareText)}`, '_blank');
    const handleCopy = async () => {
        try { await navigator.clipboard.writeText(fullShareText); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch {}
    };

    return (
        <motion.div
            key="results"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-4 max-w-xl mx-auto w-full px-3 sm:px-0"
        >
            <StepPills current={3} />

            {/* Hero score card */}
            <div className="bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#0369a1] rounded-3xl p-5 sm:p-7 text-center text-white shadow-2xl relative overflow-hidden border border-white/20">
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/15 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 space-y-3.5">
                    {/* Trophy illustration */}
                    <div className="w-20 h-20 mx-auto bg-white/20 rounded-2xl flex items-center justify-center shadow-lg border border-white/30">
                        <Trophy size={40} className="text-amber-300 fill-amber-300/50" />
                    </div>

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.25, type: 'spring' }}
                        className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/40 to-rose-500/40 border border-amber-300/50 flex items-center justify-center gap-2"
                    >
                        <Flame className="w-5 h-5 text-amber-300 fill-amber-300 animate-bounce" />
                        <span className="text-xs font-black uppercase tracking-wider">Challenge Complete! 🎉</span>
                    </motion.div>

                    <h3 className="text-lg sm:text-xl font-black">You&apos;re in the top 0.1% of InTrust learners!</h3>
                    <p className="text-xs text-sky-100 font-medium">
                        Scored {score}/{totalQuestions} correct • +{score * 10} Points • Streak Defended!
                    </p>

                    {/* 4-stat grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                        {[
                            { icon: BarChart3, label: 'Accuracy', value: `${accuracy}%`, color: 'text-purple-600' },
                            { icon: Flame, label: 'Streak', value: `${finalStreak} Days 🔥`, color: 'text-orange-500', fill: true },
                            { icon: Zap, label: 'Cashback Won', value: `₹${rewardFormatted}`, color: 'text-amber-600' },
                            { icon: Clock, label: 'Score', value: `${score}/${totalQuestions}`, color: 'text-sky-600' },
                        ].map(({ icon: Icon, label, value, color, fill }) => (
                            <div key={label} className="bg-white/95 rounded-2xl p-3 text-left border border-white/70 shadow-sm flex items-center gap-2.5">
                                <div className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm`}>
                                    <Icon size={18} className={`${color} ${fill ? 'fill-orange-500' : ''}`} />
                                </div>
                                <div>
                                    <div className="text-xs sm:text-sm font-black text-slate-900">{value}</div>
                                    <div className="text-xs font-black text-slate-500 uppercase">{label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {formattedTodayDate && (
                        <p className="text-xs text-sky-200 font-semibold">Completed on {formattedTodayDate}</p>
                    )}

                    {/* Share row */}
                    <div className="flex gap-2.5 pt-1">
                        <button onClick={handleWhatsApp} className="flex-1 min-h-[48px] py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-md">
                            <MessageCircle size={18} /> <span>Share on WhatsApp</span>
                        </button>
                        <button onClick={handleCopy} className="min-h-[48px] py-3.5 px-5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-white/20 active:scale-95 transition-all cursor-pointer">
                            {copied ? <Check size={18} className="text-emerald-300" /> : <Copy size={18} />}
                            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Questions review drawer */}
            {questions?.length > 0 && (
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowReview(v => !v)}
                        className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <HelpCircle size={18} />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-black text-slate-900">Review Questions &amp; Answers</div>
                                <div className="text-xs font-semibold text-slate-500">Learn from detailed explanations</div>
                            </div>
                        </div>
                        {showReview ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                    </button>
                    <AnimatePresence>
                        {showReview && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="border-t border-slate-100 p-3 sm:p-4 space-y-3 bg-slate-50/50"
                            >
                                {questions.map((q, i) => (
                                    <div key={q.id || i} className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 text-xs sm:text-sm space-y-2 shadow-sm">
                                        <div className="flex items-start gap-2.5">
                                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-black shrink-0">{i + 1}</span>
                                            <p className="font-black text-slate-900 leading-snug">{q.question}</p>
                                        </div>
                                        <div className="pl-8 space-y-1.5">
                                            {(() => {
                                                const correctIdx = q.correct ?? q.correct_option_index ?? 0;
                                                const correctAns = Array.isArray(q.options)
                                                    ? q.options[correctIdx] || q.options[0]
                                                    : typeof q.options === 'object' && q.options !== null
                                                    ? (q.options[correctIdx] || Object.values(q.options)[0])
                                                    : (q.correct_answer || '');
                                                return (
                                                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs sm:text-sm">
                                                        <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                                                        <span>{correctAns}</span>
                                                    </div>
                                                );
                                            })()}
                                            {q.explanation && (
                                                <p className="text-xs text-slate-600 font-medium italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
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

            {/* Nav CTAs */}
            <div className="grid grid-cols-2 gap-3">
                <Link href="/marketing/targets" className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between hover:border-blue-400 transition-colors shadow-sm group">
                    <div className="flex items-center gap-2.5">
                        <Target size={18} className="text-blue-600" />
                        <span className="text-xs sm:text-sm font-black text-slate-900">Milestone Targets</span>
                    </div>
                    <ArrowRight size={15} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link href="/marketing" className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between hover:border-indigo-400 transition-colors shadow-sm group">
                    <div className="flex items-center gap-2.5">
                        <LayoutDashboard size={18} className="text-indigo-600" />
                        <span className="text-xs sm:text-sm font-black text-slate-900">Marketing Hub</span>
                    </div>
                    <ArrowRight size={15} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>

            <button
                type="button"
                onClick={onBack}
                className="w-full min-h-[44px] py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs sm:text-sm transition-all active:scale-95 cursor-pointer"
            >
                ← Back to Challenge Lobby
            </button>
        </motion.div>
    );
}

// ─── Main PostQuizFlow orchestrator ─────────────────────────────────────────
/**
 * PostQuizFlow — drives the 4-step post-quiz experience:
 *   Step 0 → Sponsor Showcase  (explore deals, CTA unlocks cashback)
 *   Step 1 → Reward Animation  (animated ₹ counter, wallet credit confirmation)
 *   Step 2 → Streak Reveal     (animated fire, 7-day strip, milestone badge)
 *   Step 3 → Quiz Results      (hero score card, review drawer, share, nav)
 */
export default function PostQuizFlow({
    todaySponsor,
    score,
    totalQuestions,
    streakData,
    completionResult,
    todayPlay,
    dynamicReward,
    formattedTodayDate,
    shareCopied,
    handleShareResults,
    questions,
    copiedProductId,
    handleShareProductDeal,
    isMerchant,
    profile,
    onGoBack,
}) {
    const [step, setStep] = useState(0);
    const next = () => setStep(s => Math.min(s + 1, 3));

    const rewardRupees = completionResult?.reward_paise
        ? completionResult.reward_paise / 100
        : dynamicReward;

    return (
        <div className="min-h-[60vh] py-4 animate-fadeIn">
            <AnimatePresence mode="wait">
                {step === 0 && (
                    <SponsorStep
                        todaySponsor={todaySponsor}
                        score={score}
                        totalQuestions={totalQuestions}
                        dynamicReward={dynamicReward}
                        copiedProductId={copiedProductId}
                        handleShareProductDeal={handleShareProductDeal}
                        isMerchant={isMerchant}
                        onNext={next}
                    />
                )}
                {step === 1 && (
                    <RewardStep
                        rewardRupees={rewardRupees}
                        completionResult={completionResult}
                        onNext={next}
                    />
                )}
                {step === 2 && (
                    <StreakStep
                        streakData={streakData}
                        onNext={next}
                    />
                )}
                {step === 3 && (
                    <ResultsStep
                        score={score}
                        totalQuestions={totalQuestions}
                        streakData={streakData}
                        completionResult={completionResult}
                        todayPlay={todayPlay}
                        dynamicReward={dynamicReward}
                        formattedTodayDate={formattedTodayDate}
                        shareCopied={shareCopied}
                        handleShareResults={handleShareResults}
                        questions={questions}
                        profile={profile}
                        onBack={onGoBack}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
