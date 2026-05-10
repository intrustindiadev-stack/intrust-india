'use client';

/**
 * lib/contexts/RewardsRealtimeContext.jsx
 *
 * Provider that owns a single Supabase realtime channel for
 * `reward_transactions` (event: '*', filter: user_id=eq.<uid>).
 *
 * Centralises:
 *  - Unscratched card list / count (lifted out of the page)
 *  - document.title badge "(N) Empire Rewards" when count > 0
 *  - Hydration of unscratched cards on mount
 *  - Analytics: CARD_PILE_COUNT_ON_LOAD fired once after hydration
 *
 * Consumers call useRewardsRealtime() to get:
 *   { unscratchedCards, unscratchedCount, lastArrival,
 *     removeCard(id), upsertCards(rows), markScratched(id | id[]) }
 */

import {
    createContext, useContext, useEffect, useRef,
    useState, useCallback,
} from 'react';
import { supabase }           from '@/lib/supabaseClient';
import { useAuth }            from '@/lib/contexts/AuthContext';
import { trackEvent, CARD_PILE_COUNT_ON_LOAD } from '@/lib/analytics';
import { isTodayIST }         from '@/lib/dateIst';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const mapTransactionToCard = (tx) => {
    let type    = 'Common';
    let classes = {
        bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
        text: 'text-emerald-500', dot: 'bg-emerald-500',
        glow: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
        sparkle: 'text-emerald-400', unbox: 'text-emerald-600 dark:text-emerald-400',
    };

    if (tx.points >= 200) {
        type    = 'Epic';
        classes = {
            bg: 'bg-purple-500/10', border: 'border-purple-500/20',
            text: 'text-purple-500', dot: 'bg-purple-500',
            glow: 'bg-purple-500/10 group-hover:bg-purple-500/20',
            sparkle: 'text-purple-400', unbox: 'text-purple-600 dark:text-purple-400',
        };
    } else if (tx.points >= 50) {
        type    = 'Rare';
        classes = {
            bg: 'bg-blue-500/10', border: 'border-blue-500/20',
            text: 'text-blue-500', dot: 'bg-blue-500',
            glow: 'bg-blue-500/10 group-hover:bg-blue-500/20',
            sparkle: 'text-blue-400', unbox: 'text-blue-600 dark:text-blue-400',
        };
    }

    const titleMap = {
        purchase:    'Purchase Bonus',
        signup:      'Welcome Gift',
        referral:    'Referral Bonus',
        wallet_topup:'Topup Bonus',
        daily_login: 'Daily Login',
    };

    const isStored = !isTodayIST(tx.created_at);

    return {
        id:      tx.id,
        title:   titleMap[tx.event_type] || 'Surprise Reward',
        type,
        status:  'available',
        prize:   tx.points,
        classes,
        date:    isStored
            ? new Date(tx.created_at)
                .toLocaleDateString('en-IN', { month: 'short', day: '2-digit' })
                .toUpperCase()
            : 'TODAY',
        isStored,
        event_type: tx.event_type,
        created_at: tx.created_at,
    };
};

// ─── Context ──────────────────────────────────────────────────────────────────
const RewardsRealtimeContext = createContext(null);

export function useRewardsRealtime() {
    const ctx = useContext(RewardsRealtimeContext);
    if (!ctx) throw new Error('useRewardsRealtime must be used inside RewardsRealtimeProvider');
    return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function RewardsRealtimeProvider({ children }) {
    const { user }                    = useAuth();
    const [unscratchedCards, setCards] = useState([]);
    const [lastArrival, setLastArrival] = useState(null);
    const originalTitleRef             = useRef(null);
    const hydrated                     = useRef(false);

    const unscratchedCount = unscratchedCards.length;

    // ── document.title badge ─────────────────────────────────────────────────
    useEffect(() => {
        if (originalTitleRef.current === null) {
            originalTitleRef.current = document.title;
        }

        if (unscratchedCount > 0) {
            document.title = `(${unscratchedCount}) Empire Rewards`;
        } else {
            document.title = originalTitleRef.current || 'Empire Rewards';
        }
    }, [unscratchedCount]);

    // Restore on unmount
    useEffect(() => {
        return () => {
            if (originalTitleRef.current !== null) {
                document.title = originalTitleRef.current;
            }
        };
    }, []);

    // ── Hydration: load unscratched cards on mount ────────────────────────────
    useEffect(() => {
        if (!user || hydrated.current) return;

        const hydrate = async () => {
            try {
                const { data, error } = await supabase
                    .from('reward_transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('is_scratched', false)
                    .gt('points', 0)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (!error && data) {
                    hydrated.current = true;
                    const cards = data.map(mapTransactionToCard);
                    setCards(cards);
                    const hasStored = cards.some(c => c.isStored);
                    trackEvent(CARD_PILE_COUNT_ON_LOAD, { count: cards.length, hasStored });
                }
            } catch (err) {
                console.error('[RewardsRealtime] hydration error', err);
            }
        };

        hydrate();
    }, [user]);

    // ── Realtime subscription ─────────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('rewards_rt_provider')
            .on(
                'postgres_changes',
                {
                    event:  '*',
                    schema: 'public',
                    table:  'reward_transactions',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const tx = payload.new;
                        if (tx.is_scratched === true || tx.points <= 0) return;
                        const newCard = mapTransactionToCard(tx);
                        setCards(prev =>
                            prev.some(c => c.id === newCard.id) ? prev : [newCard, ...prev]
                        );
                        setLastArrival(newCard);
                    } else if (payload.eventType === 'UPDATE') {
                        const tx = payload.new;
                        if (tx?.is_scratched === true) {
                            setCards(prev => prev.filter(c => c.id !== tx.id));
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setCards(prev => prev.filter(c => c.id !== payload.old?.id));
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    // ── Mutations exposed to consumers ────────────────────────────────────────
    const removeCard = useCallback((id) => {
        setCards(prev => prev.filter(c => c.id !== id));
    }, []);

    const upsertCards = useCallback((rows) => {
        setCards(prev => {
            const existing = new Map(prev.map(c => [c.id, c]));
            rows.forEach(r => {
                existing.set(r.id, mapTransactionToCard(r));
            });
            return [...existing.values()].sort(
                (a, b) => new Date(b.date) - new Date(a.date)
            );
        });
    }, []);

    const markScratched = useCallback((idOrIds) => {
        const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
        setCards(prev => prev.filter(c => !ids.includes(c.id)));
    }, []);

    return (
        <RewardsRealtimeContext.Provider value={{
            unscratchedCards,
            unscratchedCount,
            lastArrival,
            removeCard,
            upsertCards,
            markScratched,
        }}>
            {children}
        </RewardsRealtimeContext.Provider>
    );
}
