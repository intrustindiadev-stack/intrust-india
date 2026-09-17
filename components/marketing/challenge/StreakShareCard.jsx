'use client';

import React, { useState } from 'react';
import { Flame, Share2, Copy, Check, Trophy, Sparkles, MessageCircle } from 'lucide-react';

/**
 * @param {{
 *   streak: number;
 *   score?: number;
 *   totalQuestions?: number;
 *   shareUrl?: string;
 *   userName?: string;
 * }} props
 */
export default function StreakShareCard({
    streak = 3,
    score = 10,
    totalQuestions = 10,
    shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/marketing/daily-challenge` : 'https://intrustindia.com/marketing/daily-challenge',
    userName = 'I'
}) {
    const [copied, setCopied] = useState(false);

    const shareText = `🔥 ${userName === 'I' ? "I'm" : `${userName} is`} on a ${streak}-Day Streak on InTrust India Daily Quiz! Scored ${score}/${totalQuestions} today.\n\nCan you beat this score? Play today's challenge and earn real wallet cashback:\n${shareUrl}`;

    const handleWhatsAppShare = () => {
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Failed to copy', e);
        }
    };

    return (
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950 text-white rounded-3xl p-5 sm:p-6 border border-amber-500/30 shadow-xl space-y-5 relative overflow-hidden">
            {/* Ambient fire glow */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header / Brand */}
            <div className="flex items-center justify-between relative z-10 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                        <Flame size={18} className="text-white fill-white" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black tracking-tight text-white">InTrust Daily Quiz</h4>
                        <p className="text-[10px] font-bold text-amber-400">Play & Earn Challenge</p>
                    </div>
                </div>

                <div className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
                    Day #{streak}
                </div>
            </div>

            {/* Streak & Score Display */}
            <div className="text-center py-2 relative z-10 space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-black uppercase tracking-wider">
                    <Flame size={14} className="fill-orange-400 animate-bounce" />
                    <span>Active Streak Record</span>
                </div>
                <div className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400">
                    {streak} Days 🔥
                </div>
                <p className="text-xs font-bold text-slate-300">
                    Solved <strong className="text-emerald-400">{score}/{totalQuestions}</strong> questions correctly today.
                </p>
            </div>

            {/* Share Action Buttons */}
            <div className="flex items-center gap-2 relative z-10 pt-1">
                <button
                    onClick={handleWhatsAppShare}
                    className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all"
                >
                    <MessageCircle size={16} />
                    <span>Share on WhatsApp</span>
                </button>

                <button
                    onClick={handleCopy}
                    className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-all shrink-0"
                    title="Copy message & link"
                >
                    {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                </button>
            </div>
        </div>
    );
}
