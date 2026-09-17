'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home, LayoutDashboard, ShoppingBag, Trophy, Target, ArrowLeftRight, BarChart3, Bell } from 'lucide-react';

const ROUTE_LABELS = {
    '/marketing': { label: 'Overview', icon: LayoutDashboard },
    '/marketing/products': { label: 'Product Marketing', icon: ShoppingBag },
    '/marketing/daily-challenge': { label: 'Daily Challenge', icon: Trophy },
    '/marketing/targets': { label: 'Growth Targets', icon: Target },
    '/marketing/transactions': { label: 'Transactions', icon: ArrowLeftRight },
    '/marketing/analytics': { label: 'Analytics', icon: BarChart3 },
    '/marketing/notifications': { label: 'Notifications', icon: Bell },
};

/**
 * Reusable Marketing Breadcrumbs with rich typography
 * @param {{ customTitle?: string; customSubtitle?: string; className?: string }} props
 */
export default function MarketingBreadcrumbs({ customTitle, customSubtitle, className = '' }) {
    const pathname = usePathname();
    const currentRoute = ROUTE_LABELS[pathname] || { label: customTitle || 'Marketing', icon: LayoutDashboard };
    const Icon = currentRoute.icon;

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                <Link 
                    href="/marketing" 
                    className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                    <Home size={13} className="text-slate-400" />
                    <span>Marketing</span>
                </Link>

                {pathname !== '/marketing' && (
                    <>
                        <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 shrink-0" />
                        <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-extrabold">
                            <Icon size={13} className="text-blue-600 dark:text-blue-400" />
                            <span>{currentRoute.label}</span>
                        </span>
                    </>
                )}
            </nav>

            {(customTitle || customSubtitle) && (
                <div className="mt-1">
                    {customTitle && (
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            {customTitle}
                        </h1>
                    )}
                    {customSubtitle && (
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            {customSubtitle}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
