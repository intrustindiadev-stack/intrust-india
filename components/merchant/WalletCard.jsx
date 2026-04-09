'use client';

import { useWallet } from "@/hooks/useWallet";
import { Wallet } from "lucide-react";
import Link from 'next/link';

export default function WalletCard({ setIsOpen }) {
    const { balance, loading } = useWallet();

    const balanceRupees = loading
        ? null
        : balance?.balance_paise !== undefined
            ? balance.balance_paise / 100
            : 0;

    return (
        <Link
            href="/merchant/wallet"
            onClick={() => setIsOpen && setIsOpen(false)}
            className="block group pt-1 hover:opacity-80 transition-opacity"
        >
            <div className="flex items-center justify-between mb-0.5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5">
                    <Wallet size={10} />
                    Wallet
                </p>
                {!loading && (
                    <div className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-emerald-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Live</span>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="h-6 w-24 bg-slate-100 dark:bg-white/10 animate-pulse rounded" />
            ) : (
                <p className="text-xl font-black text-slate-900 dark:text-[#D4AF37] tracking-tight">
                    ₹{balanceRupees !== null
                        ? balanceRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '0.00'}
                </p>
            )}
        </Link>
    );
}
