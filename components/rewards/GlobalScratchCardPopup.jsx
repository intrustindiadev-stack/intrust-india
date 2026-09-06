'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Trophy, Star, ShieldCheck, CheckCircle2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import ScratchCard from '@/components/ui/ScratchCard';
import { useRewardsRealtime } from '@/lib/contexts/RewardsRealtimeContext';
import { usePathname, useSearchParams } from 'next/navigation';

export default function GlobalScratchCardPopup() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // 1. All hooks at top level
    const rewardsContext = useRewardsRealtime();

    // State
    const [selectedCard, setSelectedCard] = useState(null);
    const [revealedCardIds, setRevealedCardIds] = useState(new Set());
    const [isProcessingReveal, setIsProcessingReveal] = useState(false);
    const [scratchProgress, setScratchProgress] = useState(0);
    const [revealResult, setRevealResult] = useState(null); // { status: 'success' | 'already_scratched', pointsWon: number, newBalance?: number, tier?: string }

    // Track last shown arrival to prevent loops/re-opens
    const hasShownForArrivalRef = useRef(null);
    const autoDismissTimeoutRef = useRef(null);

    // 2. Define derived state and logic
    const { lastArrival, markScratched } = rewardsContext || {};

    // Skip logic - Determine if we should be hidden
    const isRewardsPage = pathname === '/rewards';
    const isOrdersSuccess = pathname === '/orders' &&
                          searchParams.get('success') === 'true' &&
                          lastArrival?.event_type === 'purchase';

    const shouldSkip = !rewardsContext || isRewardsPage || isOrdersSuccess;

    // Body scroll locking while modal is open
    useEffect(() => {
        if (selectedCard) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [selectedCard]);

    // Keyboard Escape listener
    useEffect(() => {
        if (!selectedCard) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !isProcessingReveal) {
                handleDismiss();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedCard, isProcessingReveal]);

    // Auto-open effect
    useEffect(() => {
        if (shouldSkip || !lastArrival) return;

        // Already shown this specific arrival
        if (hasShownForArrivalRef.current === lastArrival.id) return;

        if (selectedCard !== null) {
            // If already showing a card, show a clickable toast to queue the next one
            toast((t) => (
                <div
                    onClick={() => {
                        hasShownForArrivalRef.current = lastArrival.id;
                        setRevealResult(null);
                        setScratchProgress(0);
                        setSelectedCard(lastArrival);
                        toast.dismiss(t.id);
                    }}
                    className="cursor-pointer font-medium"
                >
                    🎁 New reward arrived — tap to scratch
                </div>
            ), { duration: 5000, style: { background: '#10B981', color: '#fff' } });
            return;
        }

        // Open the modal
        hasShownForArrivalRef.current = lastArrival.id;
        setRevealResult(null);
        setScratchProgress(0);
        setSelectedCard(lastArrival);
        toast.success("🎁 You've earned a new reward! Scratch to reveal.", { duration: 4000 });

    }, [lastArrival, selectedCard, shouldSkip]);

    // Cleanup auto-dismiss timer on unmount
    useEffect(() => {
        return () => {
            if (autoDismissTimeoutRef.current) {
                clearTimeout(autoDismissTimeoutRef.current);
            }
        };
    }, []);

    // Dismiss & close handler
    const handleDismiss = useCallback(() => {
        if (isProcessingReveal) return;

        if (autoDismissTimeoutRef.current) {
            clearTimeout(autoDismissTimeoutRef.current);
        }

        if (selectedCard) {
            markScratched?.(selectedCard.id);
        }

        setSelectedCard(null);
        setRevealResult(null);
        setScratchProgress(0);
        setRevealedCardIds(new Set());
        setIsProcessingReveal(false);
    }, [isProcessingReveal, selectedCard, markScratched]);

    // Scratch completion handler
    const handleScratchComplete = useCallback(async (cardId) => {
        if (isProcessingReveal || !cardId) return;
        setIsProcessingReveal(true);

        try {
            const res = await fetch(`/api/rewards/scratch/${cardId}`, {
                method: 'POST',
            });

            const data = await res.json();

            if (!res.ok && data.code !== 'already_scratched') {
                throw new Error(data.code || 'Failed to claim reward');
            }

            setRevealedCardIds(prev => new Set(prev).add(cardId));

            const isAlreadyScratched = data.code === 'already_scratched';
            const pts = data.pointsWon ?? selectedCard?.prize ?? 0;

            setRevealResult({
                status: isAlreadyScratched ? 'already_scratched' : 'success',
                pointsWon: pts,
                newBalance: data.newBalance,
                tier: data.tier,
            });

            if (!isAlreadyScratched && pts > 0) {
                toast.success(`🎉 Won ${pts} Points!`, { id: `scratch-${cardId}` });
            }

            // Set a generous 15-second fallback auto-dismiss timeout if user leaves screen
            autoDismissTimeoutRef.current = setTimeout(() => {
                markScratched?.(cardId);
                setSelectedCard(null);
                setRevealResult(null);
                setScratchProgress(0);
                setRevealedCardIds(new Set());
                setIsProcessingReveal(false);
            }, 15000);

        } catch (err) {
            const friendlyMessages = {
                not_found: 'Reward card not found or already claimed.',
                rate_limited: 'Please wait a moment before revealing another card.',
                server_error: "We couldn't reveal your reward right now. Please try again.",
                unauthorized: 'Please sign in to reveal your reward.',
                bad_request: 'Invalid reward card request.',
            };
            toast.error(friendlyMessages[err.message] || err.message || 'Failed to claim reward. Please try again.');
        } finally {
            setIsProcessingReveal(false);
        }
    }, [isProcessingReveal, selectedCard, markScratched]);

    // Accessible manual reveal trigger
    const handleManualReveal = useCallback(() => {
        if (isProcessingReveal || !selectedCard || revealResult) return;
        handleScratchComplete(selectedCard.id);
    }, [isProcessingReveal, selectedCard, revealResult, handleScratchComplete]);

    if (shouldSkip) return null;

    return (
        <AnimatePresence>
            {selectedCard && (
                <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="scratch-card-title"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto"
                >
                    <motion.div
                        initial={{ scale: 0.88, y: 24, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.92, y: 16, opacity: 0 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                        className="relative w-full max-w-[390px] sm:max-w-md bg-gradient-to-b from-[#0F172A] via-[#090D1A] to-black rounded-[2.5rem] p-1 shadow-2xl border border-white/10 overflow-hidden my-auto"
                    >
                        <div className="relative bg-black/40 rounded-[2.4rem] p-6 sm:p-8 overflow-hidden">
                            {/* Ambient background glows */}
                            <div className="absolute top-0 right-0 w-56 h-56 bg-emerald-500/15 blur-[90px] rounded-full pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-56 h-56 bg-amber-500/15 blur-[90px] rounded-full pointer-events-none" />

                            {/* Accessible Close Button */}
                            <button
                                type="button"
                                onClick={handleDismiss}
                                aria-label="Close reward modal"
                                disabled={isProcessingReveal}
                                className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-white/50 hover:text-white transition-all border border-white/10 z-30 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                            >
                                <X size={20} />
                            </button>

                            {/* Modal Header */}
                            <div className="text-center mb-6 relative z-10 pt-2">
                                {/* Badge */}
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3 shadow-inner">
                                    <Sparkles size={11} className="text-emerald-400 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                                        {selectedCard.type || 'Loot Box'} • {selectedCard.title || 'InTrust Reward'}
                                    </span>
                                </div>

                                <h2
                                    id="scratch-card-title"
                                    className="text-2xl sm:text-3xl font-black text-white tracking-tight italic"
                                >
                                    Empire Loot Box
                                </h2>

                                {/* Dynamic Instruction Subtitle */}
                                <p className="text-emerald-400 text-xs font-semibold tracking-wider mt-1 transition-all">
                                    {revealResult?.status === 'already_scratched'
                                        ? 'Reward Already Claimed'
                                        : revealResult?.status === 'success'
                                        ? '🎉 Reward Unlocked!'
                                        : isProcessingReveal
                                        ? '✨ Unlocking reward...'
                                        : scratchProgress >= 30
                                        ? 'Almost there! ✨'
                                        : scratchProgress > 0
                                        ? 'Keep scratching...'
                                        : 'Scratch to reveal your reward'}
                                </p>
                            </div>

                            {/* Card Content: Scratch Surface or Success Reveal Screen */}
                            {revealResult ? (
                                /* ── REVEAL RESULT SUCCESS STATE ── */
                                <motion.div
                                    initial={{ scale: 0.85, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: 'spring', damping: 20, stiffness: 260 }}
                                    className="relative flex flex-col items-center justify-center py-8 px-4 rounded-[2rem] bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 shadow-2xl text-center overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

                                    {/* Animated Trophy / Coin Icon */}
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.08, 1],
                                            rotate: [0, 4, -4, 0],
                                        }}
                                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                        className="relative w-20 h-20 rounded-[1.75rem] bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 flex items-center justify-center text-white mb-5 shadow-[0_0_35px_rgba(245,158,11,0.4)] border border-white/25"
                                    >
                                        <Trophy size={40} strokeWidth={2.5} />
                                    </motion.div>

                                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-1">
                                        {revealResult.status === 'already_scratched' ? 'Notice' : 'You Won!'}
                                    </span>

                                    {/* Large Points Count */}
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <span className="text-5xl sm:text-6xl font-black text-white tracking-tighter drop-shadow-lg">
                                            {revealResult.status === 'already_scratched' ? '' : '+'}
                                            {revealResult.pointsWon}
                                        </span>
                                        <div className="flex flex-col items-start pt-2">
                                            <Star size={18} className="text-amber-400 fill-amber-400" />
                                            <span className="text-[11px] font-black text-white/50 uppercase tracking-widest leading-none">
                                                Coins
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-white/60 text-xs font-medium max-w-xs mb-6">
                                        {revealResult.status === 'already_scratched'
                                            ? 'This reward was previously revealed and credited to your InTrust Wallet.'
                                            : 'Credited directly to your InTrust Wallet balance.'}
                                    </p>

                                    {/* Action Button */}
                                    <button
                                        type="button"
                                        onClick={handleDismiss}
                                        className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-white font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                                    >
                                        <CheckCircle2 size={18} />
                                        <span>Awesome! Continue</span>
                                    </button>
                                </motion.div>
                            ) : (
                                /* ── SCRATCH CARD ACTIVE STATE ── */
                                <div>
                                    <div className="relative h-64 sm:h-72 w-full max-w-[340px] sm:max-w-[360px] mx-auto rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl ring-4 ring-emerald-500/10">
                                        <ScratchCard
                                            id={selectedCard.id}
                                            prizePoints={selectedCard.prize}
                                            onProgress={setScratchProgress}
                                            onComplete={() => handleScratchComplete(selectedCard.id)}
                                            revealed={revealedCardIds.has(selectedCard.id)}
                                        />
                                    </div>

                                    {/* Processing Indicator or Accessible Quick Reveal Button */}
                                    <div className="mt-4 flex flex-col items-center justify-center min-h-[32px]">
                                        {isProcessingReveal ? (
                                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider animate-pulse">
                                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                                <span>Unlocking Reward...</span>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleManualReveal}
                                                className="inline-flex items-center gap-1.5 py-1.5 px-4 rounded-full text-[11px] font-bold text-white/50 hover:text-white hover:bg-white/5 border border-white/10 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                                            >
                                                <Zap size={12} className="text-amber-400" />
                                                <span>Tap to Reveal Instantly</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Trust Badge Footer */}
                            <div className="mt-6 text-center relative z-10">
                                <div className="flex items-center justify-center gap-2">
                                    <ShieldCheck size={14} className="text-emerald-400/80" />
                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.25em]">
                                        Verified Rewards • Live Settlement
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
