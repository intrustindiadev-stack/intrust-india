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
 * Shared wallet pill UI — rendered by MarketingBreadcrumbs and top navigation
 * so every marketing page shows the live balance with premium financial aesthetics.
 */
export function MarketingWalletPill({ className = '', compact = false, showLabel = true }) {
    const { balancePaise, walletHref } = useMarketingWallet();
    const rupees = (balancePaise / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });

    return (
        <Link
            href={walletHref}
            title="Open InTrust Wallet"
            className={`group relative inline-flex items-center gap-1.5 sm:gap-2.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500/[0.08] via-teal-500/[0.05] to-emerald-500/[0.12] dark:from-emerald-950/50 dark:via-teal-950/35 dark:to-emerald-950/60 hover:from-emerald-500/[0.14] hover:to-emerald-500/[0.18] border border-emerald-500/25 hover:border-emerald-500/50 dark:border-emerald-500/30 dark:hover:border-emerald-400/50 shadow-2xs hover:shadow-md transition-all duration-300 active:scale-[0.98] shrink-0 backdrop-blur-md ${className}`}
        >
            {/* Glowing Icon Container */}
            <div className="relative flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white shadow-xs shadow-emerald-600/30 shrink-0 group-hover:scale-105 transition-transform duration-200">
                <Wallet size={13} className="stroke-[2.5]" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
            </div>

            {/* Typography Stack */}
            <div className="flex flex-col text-left leading-none min-w-0">
                {showLabel && (
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        <span>Wallet</span>
                        <span className="hidden sm:inline text-emerald-600/60">•</span>
                        <span className="hidden sm:inline font-bold text-slate-400 dark:text-slate-500 text-xs">Live</span>
                    </div>
                )}
                <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        ₹{rupees}
                    </span>
                </div>
            </div>

            {/* Quick Action Accent */}
            <div className="hidden xs:flex items-center justify-center w-5 h-5 rounded-lg bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200 shrink-0">
                <Plus size={12} className="stroke-[2.5]" />
            </div>

            {compact && <span className="sr-only">Live wallet balance ₹{rupees}</span>}
        </Link>
    );
}
