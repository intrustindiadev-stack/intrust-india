'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    ChevronRight, 
    Home, 
    LayoutDashboard, 
    ShoppingBag, 
    Trophy, 
    Target, 
    ArrowLeftRight, 
    BarChart3, 
    Bell,
    Store,
    Calendar,
    Sparkles
} from 'lucide-react';

const ROUTE_CONFIG = {
    '/marketing': { label: 'Overview', icon: LayoutDashboard, parent: null },
    '/marketing/products': { label: 'Product Marketing', icon: ShoppingBag, parent: '/marketing' },
    '/marketing/daily-challenge': { label: 'Daily Challenge', icon: Trophy, parent: '/marketing' },
    '/marketing/daily-challenge/sponsor': { label: 'Sponsor Billboard', icon: Store, parent: '/marketing/daily-challenge' },
    '/marketing/daily-challenge/sponsor/history': { label: 'Sponsorship History', icon: Calendar, parent: '/marketing/daily-challenge' },
    '/marketing/targets': { label: 'Growth Targets', icon: Target, parent: '/marketing' },
    '/marketing/transactions': { label: 'Transactions & History', icon: ArrowLeftRight, parent: '/marketing' },
    '/marketing/analytics': { label: 'Growth Analytics', icon: BarChart3, parent: '/marketing' },
    '/marketing/notifications': { label: 'Activity & Alerts', icon: Bell, parent: '/marketing' },
};

/**
 * Premium Marketing Breadcrumbs with hierarchical trail navigation
 * @param {{ customTitle?: string; customSubtitle?: string; className?: string }} props
 */
export default function MarketingBreadcrumbs({ 
    customTitle, 
    customSubtitle, 
    className = ''
}) {
    const pathname = usePathname();

    // Resolve current route and any parent route
    const current = ROUTE_CONFIG[pathname] || {
        label: customTitle || 'Marketing',
        icon: LayoutDashboard,
        parent: pathname.startsWith('/marketing/daily-challenge/sponsor/history')
            ? '/marketing/daily-challenge/sponsor/history'
            : pathname.startsWith('/marketing/daily-challenge')
            ? '/marketing/daily-challenge'
            : '/marketing'
    };

    const parent = current.parent ? ROUTE_CONFIG[current.parent] : null;
    const CurrentIcon = current.icon;
    const ParentIcon = parent?.icon;

    return (
        <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 ${className}`}>
            <div className="flex flex-col gap-2 min-w-0 flex-1">
                {/* ── Breadcrumb Navigation Trail ── */}
                <nav aria-label="Breadcrumb" className="inline-flex items-center gap-1.5 sm:gap-2 p-1 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-2xs text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 self-start max-w-full overflow-x-auto no-scrollbar">
                    {/* Marketing Hub root */}
                    <Link 
                        href="/marketing" 
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                            pathname === '/marketing'
                                ? 'bg-blue-600 text-white font-black shadow-xs'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title="Marketing Hub Overview"
                    >
                        <Home size={14} className={pathname === '/marketing' ? 'text-white' : 'text-slate-400'} />
                        <span>Marketing</span>
                    </Link>

                    {/* Intermediate parent route (if nested, e.g. Daily Challenge -> Sponsor Billboard) */}
                    {parent && current.parent !== '/marketing' && (
                        <>
                            <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 shrink-0" />
                            <Link
                                href={current.parent}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                            >
                                {ParentIcon && <ParentIcon size={14} className="text-slate-400" />}
                                <span>{parent.label}</span>
                            </Link>
                        </>
                    )}

                    {/* Current active page indicator */}
                    {pathname !== '/marketing' && (
                        <>
                            <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 shrink-0" />
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold border border-blue-200/60 dark:border-blue-800/60 shrink-0 shadow-2xs">
                                <CurrentIcon size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                <span className="truncate">{customTitle || current.label}</span>
                            </span>
                        </>
                    )}
                </nav>

                {/* ── Page Header Typography ── */}
                {(customTitle || customSubtitle) && (
                    <div className="mt-1 space-y-1">
                        {customTitle && (
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-950 dark:text-white leading-tight">
                                {customTitle}
                            </h1>
                        )}
                        {customSubtitle && (
                            <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                                {customSubtitle}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
