'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Wallet } from 'lucide-react';

const MarketingWalletContext = createContext(null);

/**
 * Provides a single live wallet balance to every marketing surface.
 *
 * The balance is seeded from server-fetched props (no ₹0 flash on first paint)
 * and then kept in sync via the `walletBalanceUpdated` window event dispatched
 * by reward-earning flows (daily challenge cashback, sponsorship bookings...).
 */
export function MarketingWalletProvider({
    children,
    initialBalancePaise = 0,
    walletHref = '/wallet',
}) {
    const [balancePaise, setBalancePaise] = useState(
        Number.isFinite(initialBalancePaise) ? initialBalancePaise : 0
    );

    // Re-seed when the server layout hands us a newer authoritative value
    // (happens on every marketing route navigation).
    useEffect(() => {
        if (Number.isFinite(initialBalancePaise)) {
            setBalancePaise(initialBalancePaise);
        }
    }, [initialBalancePaise]);

    useEffect(() => {
        const handleWalletUpdated = (event) => {
            const next = event?.detail?.balance_paise;
            const parsed = Number(next);
            if (Number.isFinite(parsed)) {
                setBalancePaise(parsed);
            }
        };

        window.addEventListener('walletBalanceUpdated', handleWalletUpdated);
        return () => window.removeEventListener('walletBalanceUpdated', handleWalletUpdated);
    }, []);

    const setBalance = useCallback((nextPaise) => {
        const parsed = Number(nextPaise);
        if (Number.isFinite(parsed)) {
            setBalancePaise(parsed);
        }
    }, []);

    // Broadcast so other listeners (e.g. daily challenge sufficiency checks) sync too.
    const refresh = useCallback((nextPaise) => {
        if (nextPaise !== undefined) {
            const parsed = Number(nextPaise);
            if (Number.isFinite(parsed)) {
                setBalancePaise(parsed);
                window.dispatchEvent(
                    new CustomEvent('walletBalanceUpdated', { detail: { balance_paise: parsed } })
                );
            }
        }
    }, []);

    const value = useMemo(
        () => ({ balancePaise, setBalance, refresh, walletHref }),
        [balancePaise, setBalance, refresh, walletHref]
    );

    return (
        <MarketingWalletContext.Provider value={value}>
            {children}
        </MarketingWalletContext.Provider>
    );
}

/**
 * Access the live marketing wallet balance.
 * Falls back to a zeroed, no-op context so components can never crash when
 * rendered outside the provider (e.g. isolated stories/tests).
 */
export function useMarketingWallet() {
    const ctx = useContext(MarketingWalletContext);
    if (ctx) return ctx;

    return {
        balancePaise: 0,
        setBalance: () => {},
        refresh: () => {},
        walletHref: '/wallet',
    };
}

export function isMarketingWalletProviderPresent() {
    return useContext(MarketingWalletContext) !== null;
}

/**
 * Shared wallet pill UI — rendered by MarketingBreadcrumbs so every marketing
 * page shows the live balance without per-page changes.
 */
export function MarketingWalletPill({ className = '', compact = false }) {
    const { balancePaise, walletHref } = useMarketingWallet();
    const rupees = (balancePaise / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });

    return (
        <Link
            href={walletHref}
            title="Open InTrust Wallet"
            className={`group inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 rounded-xl sm:rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200/90 dark:border-emerald-800 transition-all shrink-0 ${className}`}
        >
            <span className="hidden sm:inline-flex p-1 rounded-lg bg-emerald-600 text-white group-hover:scale-105 transition-transform shrink-0">
                <Wallet size={11} />
            </span>
            <span className="flex flex-col text-left leading-none">
                <span className="hidden sm:block text-[8px] sm:text-[9px] font-extrabold uppercase text-emerald-700/80 dark:text-emerald-400/90 tracking-wider">
                    Wallet
                </span>
                <span className="text-[11px] sm:text-xs font-black text-emerald-900 dark:text-emerald-200 tabular-nums sm:mt-0.5">
                    ₹{rupees}
                </span>
            </span>
            <span className="hidden sm:inline-flex p-1 rounded-lg bg-emerald-600 text-white group-hover:scale-105 transition-transform shrink-0">
                <Plus size={10} />
            </span>
            {compact && <span className="sr-only">Wallet balance ₹{rupees}</span>}
        </Link>
    );
}
