"use client";

import { useWallet } from "@/hooks/useWallet";
import ThemeToggle from "@/components/ui/ThemeToggle";
import NotificationBell from "@/components/notifications/NotificationBell";
import MerchantControlCenter from "@/components/merchant/dashboard/MerchantControlCenter";

export default function Header({ setSidebarOpen }) {
    const { balance, loading } = useWallet();
    const displayBalance = loading ? "..." : (balance?.balance_paise !== undefined ? (balance.balance_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00");

    return (
        <header className="sticky top-0 h-20 merchant-glass border-b border-white/5 dark:border-white/5 flex items-center justify-between px-4 sm:px-8 z-50 w-full transition-all duration-300">
            <div className="flex items-center gap-4 flex-1">
                {/* Mobile Menu Button */}
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                    <span className="material-icons-round text-xl">menu</span>
                </button>

                {/* Control Center Trigger (replaces search bar) */}
                <MerchantControlCenter />
            </div>

            <div className="flex items-center space-x-4 sm:space-x-6">
                <ThemeToggle />

                <NotificationBell apiPath="/api/merchant/notifications" />

                <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl py-1.5 px-3">
                    <span className="material-icons-round text-amber-600 dark:text-[#D4AF37] text-base">payments</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tracking-tight">₹{displayBalance}</span>
                </div>
            </div>
        </header>
    );
}
