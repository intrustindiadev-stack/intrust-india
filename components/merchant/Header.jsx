"use client";

import { useWallet } from "@/hooks/useWallet";
import ThemeToggle from "@/components/ui/ThemeToggle";
import NotificationBell from "@/components/notifications/NotificationBell";

export default function Header({ setSidebarOpen }) {
    const { balance, loading } = useWallet();
    const displayBalance = loading ? "..." : (balance?.balance_paise !== undefined ? (balance.balance_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00");

    return (
        <header className="sticky top-0 h-20 merchant-glass border-b border-white/5 dark:border-white/5 flex items-center justify-between px-4 sm:px-8 z-10 w-full transition-all duration-300">
            <div className="flex items-center gap-4 flex-1">
                {/* Mobile Menu Button */}
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                    <span className="material-icons-round text-xl">menu</span>
                </button>

                {/* Search Bar */}
                <div className="relative w-full max-w-md hidden sm:block group">
                    <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-focus-within:text-[#D4AF37] transition-colors">search</span>
                    <input
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] placeholder:text-slate-500 transition-all outline-none"
                        placeholder="Search for coupons, transactions..."
                        type="text"
                    />
                </div>
            </div>

            <div className="flex items-center space-x-4 sm:space-x-6">
                <ThemeToggle />

                <NotificationBell apiPath="/api/merchant/notifications" />

                <div className="hidden sm:flex items-center space-x-3 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full py-1 pl-1 pr-4">
                    <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center">
                        <span className="material-icons-round text-[#020617] text-sm">payments</span>
                    </div>
                    <span className="text-sm font-bold text-[#D4AF37] tracking-wide">₹{displayBalance}</span>
                </div>
            </div>
        </header>
    );
}
