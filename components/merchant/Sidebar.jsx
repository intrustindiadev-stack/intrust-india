"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMerchant } from "@/hooks/useMerchant";
import { supabase } from "@/lib/supabaseClient";
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useState } from 'react';
import KycStatusCard from "./KycStatusCard";
import WalletCard from "./WalletCard";

export default function Sidebar({ isOpen, setIsOpen }) {
    const pathname = usePathname();
    const { merchant } = useMerchant();

    const menuItems = [
        { label: "Dashboard", href: "/merchant/dashboard", icon: "grid_view" },
        { label: "Inventory", href: "/merchant/inventory", icon: "inventory_2" },
        { label: "Purchase Coupons", href: "/merchant/purchase", icon: "add_shopping_cart" },
        { label: "Store Credits", href: "/merchant/udhari", icon: "credit_score" },
        { label: "NFC Card", href: "/merchant/nfc-service", icon: "contactless" },
        { label: "Lockin Portfolio", href: "/merchant/lockin", icon: "lock_clock" },
        { label: "Wallet", href: "/merchant/wallet", icon: "account_balance_wallet" },
        { label: "Shopping Orders", href: "/merchant/shopping/orders", icon: "shopping_basket" },
        { label: "Auto Mode", href: "/merchant/shopping/auto-mode", icon: "offline_bolt" },
        { label: "Ratings", href: "/merchant/ratings", icon: "star" },
        { label: "Analytics", href: "/merchant/analytics", icon: "analytics" },
    ];

    const preferencesItems = [
        { label: "Profile", href: "/merchant/profile", icon: "person_outline" },
        { label: "Settings", href: "/merchant/settings", icon: "settings" },
    ];

    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = async () => {
        setShowLogoutModal(false);
        setIsLoggingOut(true);
        try {
            await supabase.auth.signOut();
            window.location.href = "/login";
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = "/login";
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={`fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-sm transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            />

            <aside
                className={`fixed top-0 left-0 bottom-0 w-[280px] bg-white/90 dark:bg-[#0f111a]/95 backdrop-blur-2xl border-r border-black/5 dark:border-white/5 flex flex-col z-[70] transition-[transform,opacity,box-shadow] duration-500 ease-[cubic-bezier(0.3,1,0.3,1)] pb-24 lg:pb-0 ${isOpen ? "translate-x-0 shadow-[20px_0_40px_-15px_rgba(0,0,0,0.5)] opacity-100" : "-translate-x-full opacity-0 lg:opacity-100 lg:translate-x-0"
                    }`}
            >
                {/* Decorative glow in dark mode */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-[-1] hidden dark:block">
                    <div className="absolute top-[-5%] left-[-15%] w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-[80px]" />
                    <div className="absolute bottom-[20%] right-[-10%] w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]" />
                </div>

                <div className="p-6 flex items-center justify-between space-x-3 relative z-10 shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-tr from-[#b5952f] to-[#f3e5ab] rounded-xl flex items-center justify-center shadow-[0_4px_15px_rgba(212,175,55,0.3)] relative overflow-hidden">
                            <span className="material-icons-round text-[#020617] text-xl font-bold">diamond</span>
                        </div>
                        <div>
                            <h1 className="font-display text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-[#D4AF37] dark:to-[#f3e5ab]">InTrust</h1>
                            <p className="text-[9px] uppercase tracking-[0.3em] text-slate-500 dark:text-[#D4AF37]/70 font-black">Merchant Pro</p>
                        </div>
                    </div>
                    {/* Mobile close button */}
                    <button onClick={() => setIsOpen(false)} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                        <span className="material-icons-round text-sm">close</span>
                    </button>
                </div>

                <div className="px-6 mb-8 shrink-0">
                    <div className="bg-white/60 dark:bg-white/5 p-4 rounded-xl border border-black/5 dark:border-[#D4AF37]/30 shadow-sm relative overflow-hidden backdrop-blur-md">
                        <KycStatusCard />
                        <WalletCard />
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar pb-6 relative z-10">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`group flex items-center space-x-3 px-4 py-3 mx-2 rounded-2xl transition-all duration-300 relative overflow-hidden ${isActive
                                    ? "text-slate-900 dark:text-[#D4AF37] shadow-sm"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/5 to-transparent dark:from-[#D4AF37]/15 dark:to-transparent z-0 border-l-4 border-slate-900 dark:border-[#D4AF37]" />
                                )}
                                <span className={`material-icons-round text-[20px] transition-transform duration-300 z-10 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span>
                                <span className="text-[13px] font-bold tracking-wide z-10">{item.label}</span>
                            </Link>
                        );
                    })}

                    <div className="pt-8 pb-2 px-6">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-black">Preferences</p>
                    </div>

                    {preferencesItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`group flex items-center space-x-3 px-4 py-3 mx-2 rounded-2xl transition-all duration-300 relative overflow-hidden ${isActive
                                    ? "text-slate-900 dark:text-[#D4AF37] shadow-sm"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/5 to-transparent dark:from-[#D4AF37]/15 dark:to-transparent z-0 border-l-4 border-slate-900 dark:border-[#D4AF37]" />
                                )}
                                <span className={`material-icons-round text-[20px] transition-transform duration-300 z-10 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span>
                                <span className="text-[13px] font-bold tracking-wide z-10">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto shrink-0 relative z-10">
                    <div className="bg-white/80 dark:bg-[#1a1c23]/90 p-3 rounded-2xl flex items-center space-x-3 mb-4 shadow-sm border border-black/5 dark:border-white/5 backdrop-blur-md transition-all hover:shadow-md">
                        <div className="w-12 h-12 rounded-full border-[3px] border-white dark:border-[#2a2c33] shadow-[0_0_15px_rgba(0,0,0,0.1)] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 relative group">
                            {merchant?.user_profiles?.avatar_url ? (
                                <img 
                                    src={merchant.user_profiles.avatar_url} 
                                    alt={merchant.business_name} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <span className="material-icons-round text-slate-400 text-3xl">storefront</span>
                            )}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-black truncate text-slate-800 dark:text-white uppercase tracking-tighter">
                                {merchant?.business_name || "Merchant"}
                            </p>
                            <Link href="/merchant/profile" className="text-[10px] text-slate-500 dark:text-slate-400 truncate block hover:text-slate-900 dark:hover:text-white font-bold transition-colors uppercase tracking-widest mt-0.5">
                                View Profile
                            </Link>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl border border-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-all text-[13px] font-bold disabled:opacity-50"
                    >
                        <span className="material-icons-round text-[18px]">logout</span>
                        <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
                    </button>
                </div>
            </aside>

            <ConfirmModal
                isOpen={showLogoutModal}
                onConfirm={confirmLogout}
                onCancel={() => setShowLogoutModal(false)}
                title="Confirm Logout"
                message="Are you sure you want to log out from your merchant account?"
                confirmLabel="Logout"
                cancelLabel="Cancel"
            />
        </>
    );
}
