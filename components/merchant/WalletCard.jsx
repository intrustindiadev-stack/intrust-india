"use client";

import { useWallet } from "@/hooks/useWallet";

export default function WalletCard() {
    const { balance, loading } = useWallet();

    const displayBalance = loading ? "..." : (balance?.balance_paise !== undefined ? (balance.balance_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00");

    return (
        <div className="pt-2">
            <p className="text-xs opacity-60 mb-1">Total Balance</p>
            <p className="font-display text-lg font-bold text-[#D4AF37]">₹{displayBalance}</p>
        </div>
    );
}
