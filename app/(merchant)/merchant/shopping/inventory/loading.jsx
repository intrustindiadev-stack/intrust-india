export default function MerchantInventoryLoading() {
    return (
        <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="space-y-2.5">
                    <div className="w-36 h-6 bg-slate-200 dark:bg-white/10 rounded-full" />
                    <div className="w-56 h-10 bg-slate-200 dark:bg-white/10 rounded-2xl" />
                    <div className="w-80 max-w-full h-4 bg-slate-200/70 dark:bg-white/5 rounded-lg" />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="w-full sm:w-64 h-14 bg-slate-200/80 dark:bg-white/10 rounded-2xl" />
                    <div className="flex items-center gap-2">
                        <div className="w-28 h-12 bg-slate-200 dark:bg-white/10 rounded-xl" />
                        <div className="w-40 h-12 bg-slate-300 dark:bg-white/20 rounded-xl" />
                    </div>
                </div>
            </div>

            {/* KPI Summary Cards Skeleton (5 cards) */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className={`bg-white dark:bg-white/5 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between h-32 ${
                            i === 4 ? 'col-span-2 lg:col-span-1' : ''
                        }`}
                    >
                        <div className="w-10 h-10 rounded-xl bg-slate-200/80 dark:bg-white/10" />
                        <div className="space-y-1.5">
                            <div className="w-20 h-7 bg-slate-200 dark:bg-white/10 rounded-lg" />
                            <div className="w-24 h-3 bg-slate-100 dark:bg-white/5 rounded" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Search & Filter Toolbar Skeleton */}
            <div className="bg-white dark:bg-white/5 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 h-11 bg-slate-100 dark:bg-white/5 rounded-xl" />
                    <div className="flex gap-2">
                        <div className="w-36 h-11 bg-slate-100 dark:bg-white/5 rounded-xl" />
                        <div className="w-32 h-11 bg-slate-100 dark:bg-white/5 rounded-xl" />
                        <div className="w-32 h-11 bg-slate-100 dark:bg-white/5 rounded-xl" />
                    </div>
                </div>

                {/* Status Chips Skeleton */}
                <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 overflow-x-hidden">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="w-20 h-8 bg-slate-100 dark:bg-white/5 rounded-full shrink-0" />
                        ))}
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                        <div className="w-28 h-8 bg-slate-100 dark:bg-white/5 rounded-xl" />
                        <div className="w-16 h-8 bg-slate-100 dark:bg-white/5 rounded-xl" />
                    </div>
                </div>
            </div>

            {/* Desktop Table Skeleton */}
            <div className="hidden md:block bg-white dark:bg-white/5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="h-12 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10" />
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-5 h-5 bg-slate-200/60 dark:bg-white/10 rounded" />
                                <div className="w-12 h-12 bg-slate-200 dark:bg-white/10 rounded-xl shrink-0" />
                                <div className="space-y-1.5 flex-1">
                                    <div className="w-48 h-4 bg-slate-200 dark:bg-white/10 rounded" />
                                    <div className="w-28 h-3 bg-slate-100 dark:bg-white/5 rounded" />
                                </div>
                            </div>
                            <div className="w-20 h-4 bg-slate-200/60 dark:bg-white/10 rounded" />
                            <div className="w-20 h-6 bg-slate-100 dark:bg-white/5 rounded-full" />
                            <div className="w-20 h-5 bg-slate-200 dark:bg-white/10 rounded" />
                            <div className="w-16 h-5 bg-slate-200/60 dark:bg-white/10 rounded" />
                            <div className="w-20 h-6 bg-slate-100 dark:bg-white/5 rounded-full" />
                            <div className="w-20 h-8 bg-slate-100 dark:bg-white/5 rounded-xl" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile Cards Skeleton */}
            <div className="md:hidden space-y-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm flex items-center gap-3">
                        <div className="w-16 h-16 bg-slate-200 dark:bg-white/10 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="w-3/4 h-4 bg-slate-200 dark:bg-white/10 rounded" />
                            <div className="w-1/2 h-3 bg-slate-100 dark:bg-white/5 rounded" />
                            <div className="flex items-center justify-between">
                                <div className="w-16 h-4 bg-slate-200 dark:bg-white/10 rounded" />
                                <div className="w-14 h-5 bg-slate-100 dark:bg-white/5 rounded-full" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
