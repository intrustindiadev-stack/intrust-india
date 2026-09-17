'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
    Store, 
    ShoppingBag, 
    Megaphone, 
    ArrowLeftRight,
    Briefcase,
    ChevronRight,
    Sparkles
} from 'lucide-react';

/**
 * Reusable Switch Portal Section for Sidebars & Mobile Drawers
 * High-performance, compact, ultra-clean UI for both desktop and mobile
 * 
 * @param {{
 *   currentPortal: 'customer' | 'merchant' | 'marketing';
 *   isMerchant?: boolean;
 *   isAdmin?: boolean;
 *   isSuperAdmin?: boolean;
 *   role?: string | null;
 *   onNavigate?: () => void;
 *   className?: string;
 *   variant?: 'auto' | 'compact' | 'cards';
 * }} props
 */
export default function SwitchPortalSection({
    currentPortal = 'customer',
    isMerchant = false,
    isAdmin = false,
    isSuperAdmin = false,
    role = null,
    onNavigate,
    className = '',
    variant = 'auto'
}) {
    const effectiveIsSuperAdmin = isSuperAdmin || role === 'super_admin';
    const effectiveIsAdmin = isAdmin || effectiveIsSuperAdmin || role === 'admin';

    // Admin and super admin do not have access to switch portal section per guidelines
    if (effectiveIsAdmin) {
        return null;
    }

    // Determine destination portals to show based on current portal & user role
    const portals = [];

    // ─── 1. CURRENT PORTAL: MARKETING WORKSPACE ───
    if (currentPortal === 'marketing') {
        if (isMerchant) {
            portals.push({
                id: 'merchant',
                name: 'Merchant Panel',
                shortName: 'Merchant',
                subtitle: 'Store & Orders',
                href: '/merchant/dashboard',
                icon: Store,
                badge: 'PRO',
                borderClass: 'border-amber-500/25 hover:border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/5',
                iconBg: 'bg-gradient-to-br from-amber-500 to-yellow-600 text-white',
                textColor: 'text-amber-600 dark:text-amber-400'
            });
        } else {
            portals.push({
                id: 'customer',
                name: 'Customer Panel',
                shortName: 'Customer',
                subtitle: 'Dashboard & Wallet',
                href: '/dashboard',
                icon: ShoppingBag,
                badge: 'HOME',
                borderClass: 'border-purple-500/25 hover:border-purple-500/50 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/5',
                iconBg: 'bg-gradient-to-br from-purple-600 to-pink-600 text-white',
                textColor: 'text-purple-600 dark:text-purple-400'
            });
        }
    }

    // ─── 2. CURRENT PORTAL: MERCHANT PANEL ───
    // Only show Marketing — no customer/storefront switcher here
    else if (currentPortal === 'merchant') {
        portals.push({
            id: 'marketing',
            name: 'Marketing Hub',
            shortName: 'Marketing',
            subtitle: 'Sponsor & Boost',
            href: '/marketing',
            icon: Megaphone,
            badge: 'GROW',
            borderClass: 'border-blue-500/20 hover:border-blue-500/40 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-transparent',
            iconBg: 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white',
            textColor: 'text-blue-600 dark:text-blue-400'
        });
    }

    // ─── 3. CURRENT PORTAL: CUSTOMER PORTAL ───
    else if (currentPortal === 'customer') {
        portals.push({
            id: 'marketing',
            name: 'Marketing Hub',
            shortName: 'Marketing',
            subtitle: isMerchant ? 'Sponsor & Boost' : 'Quiz & Earn ₹',
            href: '/marketing',
            icon: Megaphone,
            badge: isMerchant ? 'GROW' : 'WIN ₹',
            borderClass: 'border-blue-500/20 hover:border-blue-500/40 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/5',
            iconBg: 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white',
            textColor: 'text-blue-600 dark:text-blue-400'
        });

        if (isMerchant) {
            portals.push({
                id: 'merchant',
                name: 'Merchant Panel',
                shortName: 'Merchant',
                subtitle: 'Store & Payouts',
                href: '/merchant/dashboard',
                icon: Store,
                badge: 'PRO',
                borderClass: 'border-amber-500/20 hover:border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/5',
                iconBg: 'bg-gradient-to-br from-amber-600 to-yellow-600 text-white',
                textColor: 'text-amber-600 dark:text-amber-400'
            });
        } else {
            portals.push({
                id: 'merchant-apply',
                name: 'Sell on InTrust',
                shortName: 'Sell',
                subtitle: 'Become Merchant',
                href: '/merchant-apply',
                icon: Briefcase,
                badge: 'JOIN',
                borderClass: 'border-emerald-500/20 hover:border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5',
                iconBg: 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white',
                textColor: 'text-emerald-600 dark:text-emerald-400'
            });
        }
    }

    if (portals.length === 0) return null;

    const isTwoColumn = portals.length === 2;

    return (
        <div className={`space-y-1.5 ${className}`}>
            {/* Header / Section Label */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    <ArrowLeftRight size={10} className="text-blue-500" />
                    <span>Quick Switch</span>
                </div>
                <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                    PORTAL
                </span>
            </div>

            {/* Portal Action Buttons (Clean Segmented Tray for 2 columns, or Single Sleek Pill for 1) */}
            {isTwoColumn ? (
                <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
                    {portals.map((portal) => {
                        const Icon = portal.icon;
                        return (
                            <Link
                                key={portal.id}
                                href={portal.href}
                                onClick={() => onNavigate?.()}
                                className="group flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white dark:bg-[#151821] hover:bg-slate-50 dark:hover:bg-[#1d202b] text-slate-800 dark:text-slate-200 border border-black/5 dark:border-white/5 shadow-2xs hover:shadow-xs transition-all active:scale-[0.97]"
                                title={`${portal.name} — ${portal.subtitle}`}
                            >
                                <div className={`w-5 h-5 rounded-lg ${portal.iconBg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                                    <Icon size={11} />
                                </div>
                                <span className="text-[11px] font-black tracking-tight truncate">
                                    {portal.shortName}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-1">
                    {portals.map((portal) => {
                        const Icon = portal.icon;
                        return (
                            <Link
                                key={portal.id}
                                href={portal.href}
                                onClick={() => onNavigate?.()}
                                className="group flex items-center justify-between p-2 px-2.5 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] border border-black/5 dark:border-white/5 shadow-2xs transition-all active:scale-[0.98]"
                                title={`${portal.name} — ${portal.subtitle}`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-6 h-6 rounded-xl ${portal.iconBg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                                        <Icon size={12} />
                                    </div>
                                    <div className="text-left min-w-0">
                                        <span className="text-[11px] font-black text-slate-900 dark:text-white truncate block leading-tight">
                                            {portal.name}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 truncate block leading-none mt-0.5">
                                            {portal.subtitle}
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight size={13} className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all shrink-0" />
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
