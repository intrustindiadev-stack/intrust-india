'use client';

import React from 'react';

export function SkeletonBox({ className = '' }) {
    return (
        <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-2xl ${className}`} />
    );
}

export function MarketingDashboardSkeleton() {
    return (
        <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
            {/* Hero banner skeleton */}
            <div className="rounded-3xl p-6 sm:p-10 bg-slate-100 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <SkeletonBox className="h-6 w-32" />
                <SkeletonBox className="h-10 w-3/4 max-w-md" />
                <SkeletonBox className="h-4 w-1/2 max-w-sm" />
                <div className="flex gap-3 pt-2">
                    <SkeletonBox className="h-10 w-28 rounded-xl" />
                    <SkeletonBox className="h-10 w-36 rounded-xl" />
                </div>
            </div>

            {/* KPI cards skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <div className="flex justify-between items-center">
                            <SkeletonBox className="h-4 w-16" />
                            <SkeletonBox className="h-7 w-7 rounded-xl" />
                        </div>
                        <SkeletonBox className="h-8 w-24" />
                        <SkeletonBox className="h-3 w-16" />
                    </div>
                ))}
            </div>

            {/* 2-column content skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <SkeletonBox className="h-64 rounded-3xl" />
                    <SkeletonBox className="h-48 rounded-3xl" />
                </div>
                <div className="space-y-4">
                    <SkeletonBox className="h-72 rounded-3xl" />
                    <SkeletonBox className="h-40 rounded-3xl" />
                </div>
            </div>
        </div>
    );
}

export function MarketingProductsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <SkeletonBox className="h-8 w-48" />
                <SkeletonBox className="h-4 w-80" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="rounded-3xl p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <SkeletonBox className="h-32 sm:h-44 w-full rounded-2xl" />
                        <SkeletonBox className="h-4 w-3/4" />
                        <SkeletonBox className="h-6 w-1/3" />
                        <SkeletonBox className="h-10 w-full rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function MarketingQuizSkeleton() {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
                <SkeletonBox className="h-6 w-36 mx-auto rounded-full" />
                <SkeletonBox className="h-8 w-64 mx-auto" />
                <SkeletonBox className="h-4 w-48 mx-auto" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonBox key={i} className="h-28 rounded-3xl" />
                ))}
            </div>
        </div>
    );
}
