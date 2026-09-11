export default function MerchantGiftcardsLoading() {
    return (
        <div className="space-y-6 animate-pulse pb-16">
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-4">
                <div className="space-y-2">
                    <div className="w-32 h-4 bg-slate-200 dark:bg-white/10 rounded-full" />
                    <div className="w-48 h-8 bg-slate-300 dark:bg-white/15 rounded-xl" />
                    <div className="w-72 max-w-full h-3.5 bg-slate-200/70 dark:bg-white/5 rounded-lg" />
                </div>

                <div className="flex items-center gap-2.5">
                    <div className="w-36 h-10 bg-[#D4AF37]/20 rounded-xl" />
                    <div className="w-28 h-10 bg-slate-200 dark:bg-white/10 rounded-xl" />
                </div>
            </div>

            {/* KPI Summary Cards Skeleton (4 cards) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className="bg-white/60 dark:bg-white/[0.03] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/5 flex flex-col justify-between h-28"
                    >
                        <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-white/10" />
                        <div className="space-y-1.5">
                            <div className="w-16 h-6 bg-slate-300 dark:bg-white/20 rounded-md" />
                            <div className="w-24 h-3 bg-slate-200/70 dark:bg-white/5 rounded" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Segmented Tabs Skeleton */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl w-fit">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-24 h-9 bg-slate-200 dark:bg-white/10 rounded-xl" />
                ))}
            </div>

            {/* Search & Filter Toolbar Skeleton */}
            <div className="bg-white/60 dark:bg-white/[0.02] p-3 rounded-2xl border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1 h-10 bg-slate-100 dark:bg-white/5 rounded-xl" />
                <div className="flex gap-2">
                    <div className="w-32 h-10 bg-slate-100 dark:bg-white/5 rounded-xl" />
                    <div className="w-36 h-10 bg-slate-100 dark:bg-white/5 rounded-xl" />
                </div>
            </div>

            {/* Desktop Table Skeleton */}
            <div className="hidden md:block bg-white/70 dark:bg-white/[0.02] rounded-3xl border border-slate-200/80 dark:border-white/5 overflow-hidden shadow-sm">
                <div className="h-12 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5" />
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 w-1/4">
                                <div className="w-11 h-11 bg-slate-200 dark:bg-white/10 rounded-xl shrink-0" />
                                <div className="space-y-1.5 flex-1">
                                    <div className="w-28 h-4 bg-slate-300 dark:bg-white/20 rounded" />
                                    <div className="w-16 h-3 bg-slate-200 dark:bg-white/10 rounded" />
                                </div>
                            </div>
                            <div className="w-20 h-4 bg-slate-200 dark:bg-white/10 rounded" />
                            <div className="w-20 h-4 bg-slate-200 dark:bg-white/10 rounded" />
                            <div className="w-20 h-4 bg-slate-200 dark:bg-white/10 rounded" />
                            <div className="w-16 h-6 bg-slate-200 dark:bg-white/10 rounded-full" />
                            <div className="w-24 h-9 bg-slate-200 dark:bg-white/10 rounded-xl" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile Stacked Cards Skeleton */}
            <div className="md:hidden space-y-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 bg-white/70 dark:bg-white/[0.03] rounded-2xl border border-slate-200/80 dark:border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 bg-slate-200 dark:bg-white/10 rounded-xl" />
                                <div className="space-y-1">
                                    <div className="w-24 h-4 bg-slate-300 dark:bg-white/20 rounded" />
                                    <div className="w-14 h-3 bg-slate-200 dark:bg-white/10 rounded" />
                                </div>
                            </div>
                            <div className="w-16 h-5 bg-slate-200 dark:bg-white/10 rounded-full" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-xl" />
                            <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-xl" />
                        </div>
                        <div className="h-10 bg-slate-200 dark:bg-white/10 rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    );
}
