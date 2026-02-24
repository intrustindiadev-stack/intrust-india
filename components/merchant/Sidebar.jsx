"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMerchant } from "@/hooks/useMerchant";
import { supabase } from "@/lib/supabaseClient";
import KycStatusCard from "./KycStatusCard";
import WalletCard from "./WalletCard";

export default function Sidebar({ isOpen, setIsOpen }) {
    const pathname = usePathname();
    const { merchant } = useMerchant();

    const menuItems = [
        { label: "Dashboard", href: "/merchant/dashboard", icon: "grid_view" },
        { label: "Inventory", href: "/merchant/inventory", icon: "inventory_2" },
        { label: "Purchase Coupons", href: "/merchant/purchase", icon: "add_shopping_cart" },
        { label: "Wallet", href: "/merchant/wallet", icon: "account_balance_wallet" },
        { label: "Analytics", href: "/merchant/analytics", icon: "analytics" },
    ];

    const preferencesItems = [
        { label: "Profile", href: "/merchant/profile", icon: "person_outline" },
        { label: "Settings", href: "/merchant/settings", icon: "settings" },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[60] lg:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                className={`fixed top-0 left-0 bottom-0 w-64 merchant-glass border-r border-black/5 dark:border-[#D4AF37]/20 flex flex-col z-[70] transition-transform duration-300 pb-24 lg:pb-0 ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                    }`}
            >
                <div className="p-6 flex items-center justify-between space-x-3">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[#D4AF37] rounded-lg flex items-center justify-center gold-glow">
                            <span className="material-icons-round text-[#020617]">diamond</span>
                        </div>
                        <div>
                            <h1 className="font-display text-xl font-bold tracking-tight text-[#D4AF37]">InTrust</h1>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]/60 font-semibold">Merchant Panel</p>
                        </div>
                    </div>
                    {/* Mobile close button */}
                    <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
                        <span className="material-icons-round">close</span>
                    </button>
                </div>

                <div className="px-6 mb-8">
                    <div className="merchant-glass bg-white/40 dark:bg-white/5 p-4 rounded-xl gold-border shadow-sm">
                        <KycStatusCard />
                        <WalletCard />
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                                    }`}
                            >
                                <span className="material-icons-round text-sm">{item.icon}</span>
                                <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                        );
                    })}

                    <div className="pt-6 pb-2 px-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Preferences</p>
                    </div>

                    {preferencesItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                                    }`}
                            >
                                <span className="material-icons-round text-sm">{item.icon}</span>
                                <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto">
                    <div className="merchant-glass bg-white/40 dark:bg-white/5 p-3 rounded-xl flex items-center space-x-3 mb-4 shadow-sm">
                        <div className="w-10 h-10 rounded-full border-2 border-[#D4AF37] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <span className="material-icons-round text-slate-400">account_circle</span>
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-100">{merchant?.business_name || "Merchant"}</p>
                            <Link href="/merchant/profile" className="text-[10px] text-slate-500 dark:text-slate-400 truncate block hover:underline">
                                View Profile
                            </Link>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl border border-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium"
                    >
                        <span className="material-icons-round text-sm">logout</span>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
