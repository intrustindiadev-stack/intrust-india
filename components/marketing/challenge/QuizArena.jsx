'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Clock, 
    Flame, 
    Volume2, 
    VolumeX, 
    X, 
    Sparkles, 
    CheckCircle2, 
    XCircle, 
    ArrowRight, 
    AlertCircle 
} from 'lucide-react';

export default function QuizArena({
    activeQuestions = [],
    currentQuestionIndex = 0,
    selectedOption = null,
    isAnswerSubmitted = false,
    score = 0,
    timeLeft = 20,
    showFloatingPoints = false,
    soundEnabled = true,
    streakData = {},
    todaySponsor = null,
    selectedCategory = null,
    showExitConfirm = false,
    setShowExitConfirm,
    setSoundEnabled,
    handleSelectOption,
    handleConfirmSubmit,
    speakText,
    onExitQuiz
}) {
    const currentQ = activeQuestions[currentQuestionIndex];
    const optionLetters = ['A', 'B', 'C', 'D'];

    return (
        <div className="relative min-h-[580px] sm:min-h-[640px] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#0369a1] text-slate-900 border border-sky-400/30">
            {/* Ambient Arcade Cloud & Radial Glow Effects */}
            <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
                <div className="absolute -top-10 -left-10 w-72 h-72 rounded-full bg-white blur-3xl" />
                <div className="absolute top-1/3 -right-20 w-80 h-80 rounded-full bg-white blur-3xl" />
                <div className="absolute -bottom-10 left-1/4 w-96 h-96 rounded-full bg-white blur-3xl" />
            </div>

            {/* Quiz Control Top HUD */}
            <div className="w-full relative z-30 pt-3 sm:pt-4 px-3 sm:px-6">
                <div className="max-w-xl mx-auto flex items-center justify-between gap-2 text-xs font-black">
                    {/* Left: Dynamic Countdown Timer Pill */}
                    <div 
                        className={`px-3.5 py-1.5 rounded-full shadow-md backdrop-blur-md flex items-center gap-1.5 transition-all border ${
                            timeLeft <= 5 
                                ? 'bg-rose-500 text-white border-rose-400 animate-pulse shadow-rose-500/30' 
                                : timeLeft <= 10 
                                ? 'bg-amber-400 text-amber-950 border-amber-300' 
                                : 'bg-white/95 text-slate-900 border-white/80'
                        }`}
                    >
                        <Clock size={13} className={timeLeft <= 5 ? 'animate-spin' : ''} />
                        <span className="text-xs sm:text-sm font-extrabold tracking-tight">
                            00:{timeLeft.toString().padStart(2, '0')}
                        </span>
                    </div>

                    {/* Center: Persistent Sponsor Brand Pill */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-white/80 text-[11px] font-bold shadow-sm max-w-[190px] xs:max-w-[240px] truncate">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                        <span className="text-[10px] uppercase font-black text-slate-500 hidden sm:inline">Sponsor:</span>
                        <span className="font-extrabold text-slate-900 truncate">
                            {todaySponsor?.merchants?.business_name || "InTrust Partner"}
                        </span>
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1 py-0.2 rounded-full border border-blue-200/60 shrink-0">
                            ✓
                        </span>
                    </div>

                    {/* Right: Points, Streak, Sound Toggle & Exit */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Live Accumulated Points Badge */}
                        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-500/20">
                            <Sparkles size={12} className="animate-spin-slow" />
                            <span>{(score || 0) * 10} PTS</span>
                        </div>

                        {/* Streak Badge */}
                        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-orange-600 text-xs font-black border border-white/80 shadow-md">
                            <Flame size={13} className="text-orange-500 animate-bounce" />
                            <span>{streakData?.streak || 0}d</span>
                        </div>

                        {/* Sound Toggle */}
                        <button
                            type="button"
                            onClick={() => setSoundEnabled?.(prev => !prev)}
                            className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-white/80 flex items-center justify-center text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
                            title={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
                            aria-label="Toggle Sound"
                        >
                            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                        </button>

                        {/* Exit Quiz Button */}
                        <button
                            type="button"
                            onClick={() => setShowExitConfirm?.(true)}
                            className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-white/80 flex items-center justify-center text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Exit Daily Challenge"
                            aria-label="Exit Daily Challenge"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Centered Question Arena: Top Floating Card + Bottom Option Tray */}
            <div className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full px-3 sm:px-4 py-3 sm:py-5 relative z-20">
                {/* 1. Floating White Question Card */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQuestionIndex}
                        initial={{ opacity: 0, y: 15, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -15, scale: 0.98 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="relative bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/80 overflow-hidden my-auto"
                    >
                        {/* Floating +10 Points Animation */}
                        <AnimatePresence>
                            {showFloatingPoints && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                    animate={{ opacity: 1, y: -28, scale: 1.15 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute top-4 right-5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-500/30 flex items-center gap-1 z-30 pointer-events-none"
                                >
                                    <Sparkles size={12} />
                                    <span>+10 PTS</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Question Meta Header with Category & Progress Stepper */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                                {selectedCategory?.title || 'Daily Trivia'}
                            </span>

                            {/* Stepper Dots & Question Number */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    {activeQuestions.map((_, i) => (
                                        <span
                                            key={i}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                i === currentQuestionIndex 
                                                    ? 'w-5 bg-sky-600' 
                                                    : i < currentQuestionIndex 
                                                    ? 'w-1.5 bg-emerald-500' 
                                                    : 'w-1.5 bg-slate-200'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-xs font-black text-slate-500 ml-1">
                                    Q{currentQuestionIndex + 1}/{activeQuestions.length}
                                </span>
                            </div>
                        </div>

                        {/* Question Prompt with Audio Reader Button */}
                        <div className="flex items-start justify-between gap-3 my-2">
                            <h3 className="text-base sm:text-lg md:text-xl font-black text-slate-900 leading-snug tracking-tight">
                                {currentQ?.question}
                            </h3>
                            {speakText && (
                                <button
                                    type="button"
                                    onClick={(e) => speakText(currentQ?.question, e)}
                                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0 cursor-pointer"
                                    title="Read Question Aloud"
                                    aria-label="Read Question Aloud"
                                >
                                    <Volume2 size={16} />
                                </button>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* 2. Vibrant Option Tray */}
                <div className="bg-gradient-to-b from-[#0284c7] to-[#0369a1] rounded-3xl p-4 sm:p-5 shadow-2xl text-white space-y-3 border border-sky-300/40 mt-3">
                    <div className="flex items-center justify-between text-[11px] font-bold text-sky-100 uppercase tracking-wider px-1">
                        <span>Select one option</span>
                        <span className="text-[10px] text-sky-200/90 font-medium">
                            Tap to select • Submit to confirm
                        </span>
                    </div>

                    {/* Option Capsules (A, B, C, D) */}
                    <div className="space-y-2.5">
                        {currentQ?.options?.map((opt, idx) => {
                            const isSelected = selectedOption === idx;
                            const isCorrect = currentQ?.correct === idx;

                            let btnClasses = "bg-white text-slate-800 border-2 border-white hover:border-sky-300 hover:bg-sky-50/90";

                            if (isAnswerSubmitted) {
                                if (isCorrect) {
                                    btnClasses = "bg-emerald-50 text-emerald-950 border-2 border-emerald-500 font-black scale-[1.01]";
                                } else if (isSelected && !isCorrect) {
                                    btnClasses = "bg-rose-50 text-rose-950 border-2 border-rose-500 font-black animate-shake";
                                }
                            } else if (isSelected) {
                                btnClasses = "bg-sky-50 text-sky-950 border-2 border-sky-500 ring-2 ring-sky-300 font-extrabold shadow-md scale-[1.01]";
                            }

                            return (
                                <motion.button
                                    key={idx}
                                    type="button"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.15, delay: idx * 0.03 }}
                                    disabled={isAnswerSubmitted}
                                    onClick={() => handleSelectOption?.(idx)}
                                    className={`w-full p-3 sm:p-3.5 rounded-2xl text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-3 cursor-pointer shadow-sm ${btnClasses}`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                            isAnswerSubmitted && isCorrect 
                                                ? 'bg-emerald-500 text-white' 
                                                : isAnswerSubmitted && isSelected && !isCorrect 
                                                ? 'bg-rose-500 text-white' 
                                                : isSelected 
                                                ? 'bg-sky-500 text-white' 
                                                : 'bg-slate-100 text-slate-700'
                                        }`}>
                                            {optionLetters[idx]}
                                        </span>
                                        <span className="break-words whitespace-normal text-left font-semibold">
                                            {opt}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {speakText && (
                                            <button
                                                type="button"
                                                onClick={(e) => speakText(opt, e)}
                                                className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors"
                                                title="Listen"
                                                aria-label="Listen Option"
                                            >
                                                <Volume2 size={14} />
                                            </button>
                                        )}

                                        {isAnswerSubmitted && isCorrect && (
                                            <CheckCircle2 size={18} className="text-emerald-600" />
                                        )}
                                        {isAnswerSubmitted && isSelected && !isCorrect && (
                                            <XCircle size={18} className="text-rose-600" />
                                        )}
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* SUBMIT ANSWER Action Button */}
                    <button
                        type="button"
                        disabled={isAnswerSubmitted}
                        onClick={() => handleConfirmSubmit?.(selectedOption)}
                        className={`w-full py-3.5 sm:py-4 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer ${
                            isAnswerSubmitted
                                ? 'bg-slate-800 text-slate-300 opacity-90 cursor-not-allowed'
                                : selectedOption !== null
                                ? 'bg-[#091e42] hover:bg-[#061530] text-white active:scale-98 shadow-sky-950/40'
                                : 'bg-[#091e42]/85 hover:bg-[#091e42] text-white/90 active:scale-98'
                        }`}
                    >
                        <span>{isAnswerSubmitted ? 'Checking Answer...' : 'Submit Answer'}</span>
                        <ArrowRight size={14} />
                    </button>
                </div>
            </div>

            {/* Minimal Footer */}
            <div className="w-full py-2.5 text-center text-[10px] text-white/80 font-bold bg-black/10 backdrop-blur-xs relative z-20">
                InTrust Daily Challenge Arena • Sponsor unlocks instant wallet cashback upon completion
            </div>

            {/* Exit Confirmation Modal */}
            <AnimatePresence>
                {showExitConfirm && (
                    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-slate-900">Exit Daily Challenge?</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Your current question progress will not be saved if you leave now.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowExitConfirm?.(false)}
                                    className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
                                >
                                    Keep Playing
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowExitConfirm?.(false);
                                        onExitQuiz?.();
                                    }}
                                    className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                                >
                                    Exit Challenge
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
