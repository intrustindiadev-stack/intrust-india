'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import ScratchCard from '@/components/ui/ScratchCard';
import { useRewardsRealtime } from '@/lib/contexts/RewardsRealtimeContext';
import { usePathname, useSearchParams } from 'next/navigation';

export default function GlobalScratchCardPopup() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    // 1. All hooks must be at the top level
    const rewardsContext = useRewardsRealtime(); // Assume it returns null/undefined if provider missing, or handle it inside
    
    // State
    const [selectedCard, setSelectedCard] = useState(null);
    const [revealedCardIds, setRevealedCardIds] = useState(new Set());
    const [isProcessingReveal, setIsProcessingReveal] = useState(false);
    
    // Track last shown arrival to prevent loops/re-opens
    const hasShownForArrivalRef = useRef(null);

    // 2. Define derived state and logic
    const { lastArrival, markScratched } = rewardsContext || {};

    // Skip logic - Determine if we should be hidden
    const isRewardsPage = pathname === '/rewards';
    const isOrdersSuccess = pathname === '/orders' && 
                          searchParams.get('success') === 'true' && 
                          lastArrival?.event_type === 'purchase';
    
    const shouldSkip = !rewardsContext || isRewardsPage || isOrdersSuccess;

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
        setSelectedCard(lastArrival);
        toast.success("🎁 You've earned a new reward! Scratch to reveal.", { duration: 4000 });
        
    }, [lastArrival, selectedCard, shouldSkip]);

    // Scratch completion handler (mirrors rewards page but without wallet sync)
    const handleScratchComplete = useCallback(async (cardId) => {
        if (isProcessingReveal || !markScratched) return;
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
            const pts = data.pointsWon ?? 0;
            if (pts > 0) toast.success(`🎉 Won ${pts} Points!`);

            setTimeout(() => {
                markScratched(cardId);
                setRevealedCardIds(prev => { const s = new Set(prev); s.delete(cardId); return s; });
                setSelectedCard(null);
                setIsProcessingReveal(false);
            }, 2500);

        } catch (err) {
            toast.error(err.message || 'Failed to claim reward. Please try again.');
            setIsProcessingReveal(false);
        }
    }, [isProcessingReveal, markScratched]);

    if (shouldSkip) return null;

    return (
        <AnimatePresence>
            {selectedCard && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
                >
                    <motion.div
                        initial={{ scale: 0.8, y: 50, rotateX: 20 }}
                        animate={{ scale: 1, y: 0, rotateX: 0 }}
                        exit={{ scale: 0.8, y: 50, rotateX: 20 }}
                        className="relative w-full max-w-md bg-gradient-to-b from-[#0F172A] to-black rounded-[3rem] p-1 shadow-2xl border border-white/10 overflow-hidden"
                    >
                        <div className="relative bg-black/40 rounded-[2.9rem] p-8 overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
 
                            <button 
                                onClick={() => !isProcessingReveal && setSelectedCard(null)}
                                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/10 z-20 disabled:opacity-50"
                                disabled={isProcessingReveal}
                            >
                                <X size={20} />
                            </button>
 
                            <div className="text-center mb-10 relative z-10 pt-4">
                                <h3 className="text-3xl font-black text-white mb-2 tracking-tighter italic">Empire Loot Box</h3>
                                <p className="text-emerald-400 font-bold uppercase tracking-[0.3em] text-[10px]">Scratch to Reveal Prize</p>
                            </div>
 
                            <div className="relative h-72 sm:h-80 w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl ring-4 ring-emerald-500/5">
                                <ScratchCard 
                                    id={selectedCard.id}
                                    prizePoints={selectedCard.prize}
                                    onComplete={() => handleScratchComplete(selectedCard.id)}
                                    revealed={revealedCardIds.has(selectedCard.id)}
                                />
                            </div>
 
                            <div className="mt-10 text-center relative z-10">
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mb-6 italic">Verified Rewards System</p>
                                <div className="flex items-center justify-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                    <p className="text-emerald-400 text-sm font-black uppercase tracking-widest">Live Settlement</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
