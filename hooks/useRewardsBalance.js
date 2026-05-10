/**
 * hooks/useRewardsBalance.js
 *
 * Single-source-of-truth hook for the user's reward point balance and tier.
 * Modelled after hooks/useWallet.js.
 *
 * Exposes:
 *   balance          - current_balance (number)
 *   tier             - tier string e.g. 'bronze' | 'silver' | 'gold' | 'platinum'
 *   currentBalance   - alias for balance (convenience)
 *   totalEarned      - total_earned from reward_points_balance
 *   loading          - boolean
 *   refresh()        - re-fetches from server
 *   applyServerBalance(newBalance, tier) - pushes authoritative numbers into
 *                      state without a round-trip (called after server reveal)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useRewardsBalance() {
    const [balance, setBalance]         = useState(0);
    const [tier, setTier]               = useState('bronze');
    const [totalEarned, setTotalEarned] = useState(0);
    const [loading, setLoading]         = useState(true);
    const channelRef                    = useRef(null);
    const mountedRef                    = useRef(true);

    // ── Fetch from /api/rewards/balance (existing GET route) ─────────────────
    const fetchBalance = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const res = await fetch('/api/rewards/balance', {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });

            if (!res.ok) return;

            const json = await res.json();
            const b = json.balance;

            if (!mountedRef.current) return;
            setBalance(b?.current_balance  ?? 0);
            setTier(b?.tier               ?? 'bronze');
            setTotalEarned(b?.total_earned ?? 0);
        } catch (err) {
            console.error('[useRewardsBalance] fetch error', err);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, []);

    // ── Push authoritative numbers from server reveal response ───────────────
    const applyServerBalance = useCallback((newBalance, newTier) => {
        if (!mountedRef.current) return;
        if (newBalance !== undefined) setBalance(newBalance);
        if (newTier    !== undefined) setTier(newTier);
    }, []);

    // ── Optional realtime subscription on reward_points_balance ──────────────
    // Guarded by try/catch since the table may not be in the publication yet.
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || cancelled) return;

                const channel = supabase
                    .channel(`rpb_realtime_${user.id}`)
                    .on(
                        'postgres_changes',
                        {
                            event:  'UPDATE',
                            schema: 'public',
                            table:  'reward_points_balance',
                            filter: `user_id=eq.${user.id}`,
                        },
                        (payload) => {
                            if (cancelled) return;
                            const n = payload.new;
                            if (n?.current_balance !== undefined) setBalance(n.current_balance);
                            if (n?.tier            !== undefined) setTier(n.tier);
                            if (n?.total_earned    !== undefined) setTotalEarned(n.total_earned);
                        }
                    )
                    .subscribe();

                channelRef.current = channel;
            } catch {
                // Table not in publication yet — silently skip
            }
        })();

        return () => {
            cancelled = true;
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, []);

    // ── Initial fetch ─────────────────────────────────────────────────────────
    useEffect(() => {
        mountedRef.current = true;
        fetchBalance();
        return () => { mountedRef.current = false; };
    }, [fetchBalance]);

    return {
        balance,
        tier,
        currentBalance: balance,   // convenience alias
        totalEarned,
        loading,
        refresh: fetchBalance,
        applyServerBalance,
    };
}
