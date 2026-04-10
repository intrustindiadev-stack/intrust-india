import Navbar from '@/components/layout/Navbar';

export default function ProductDetailLoading() {
    return (
        <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#080a10]">
            <Navbar />
            <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-8 pt-24 md:pt-28 pb-28 sm:pb-32">

                {/* Back Button Skeleton */}
                <div className="h-5 w-16 bg-slate-200 dark:bg-white/10 rounded-full animate-pulse mb-4" />

                {/* Breadcrumb Skeleton */}
                <div className="flex items-center gap-2 mb-6">
                    <div className="h-3 w-8 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                    <div className="h-3 w-3 bg-slate-100 dark:bg-white/5 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                    <div className="h-3 w-3 bg-slate-100 dark:bg-white/5 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-14">

                    {/* Left: Product Image Skeleton */}
                    <div className="lg:col-span-6">
                        <div className="aspect-[4/3] sm:aspect-square bg-white dark:bg-[#0c0e16] rounded-2xl sm:rounded-[2rem] border border-slate-100 dark:border-white/5 animate-pulse flex items-center justify-center">
                            <div className="w-1/2 h-1/2 rounded-2xl bg-slate-100 dark:bg-white/5" />
                        </div>
                        {/* Thumbnail Strip Skeleton */}
                        <div className="flex gap-2 mt-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
                            ))}
                        </div>
                    </div>

                    {/* Right: Product Info Skeleton */}
                    <div className="lg:col-span-6 flex flex-col gap-4">

                        {/* Title */}
                        <div className="space-y-2">
                            <div className="h-9 w-4/5 bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse" />
                            <div className="h-4 w-full bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse" />
                            <div className="h-4 w-3/5 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse" />
                        </div>

                        {/* Pricing Box */}
                        <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-3 animate-pulse">
                            <div className="flex items-end gap-3">
                                <div className="h-10 w-32 bg-slate-200 dark:bg-white/10 rounded-lg" />
                                <div className="h-6 w-20 bg-slate-100 dark:bg-white/5 rounded-lg" />
                            </div>
                            <div className="h-7 w-36 bg-slate-100 dark:bg-white/5 rounded-lg" />
                        </div>

                        {/* Desktop Buttons */}
                        <div className="hidden sm:flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-[126px] h-12 bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse" />
                                <div className="flex-1 h-12 bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse" />
                            </div>
                            <div className="w-full h-12 bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse" />
                        </div>

                        {/* Merchant Info Box */}
                        <div className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 flex items-center justify-between animate-pulse">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-white/10" />
                                <div className="space-y-1.5">
                                    <div className="h-2.5 w-12 bg-slate-200 dark:bg-white/10 rounded" />
                                    <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded" />
                                </div>
                            </div>
                            <div className="h-5 w-16 bg-slate-200 dark:bg-white/10 rounded" />
                        </div>

                        {/* Trust Badges */}
                        <div className="grid grid-cols-4 gap-2 sm:gap-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white dark:bg-white/[0.02] border border-slate-50 dark:border-white/5 animate-pulse">
                                    <div className="w-4 h-4 rounded bg-slate-200 dark:bg-white/10 mb-1.5" />
                                    <div className="h-2 w-8 bg-slate-200 dark:bg-white/10 rounded mb-1" />
                                    <div className="h-2 w-6 bg-slate-100 dark:bg-white/5 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recommended Products */}
                <div className="mt-10">
                    <div className="h-6 w-40 bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse mb-4" />
                    <div className="flex gap-3 overflow-x-hidden">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex-shrink-0 w-[140px] sm:w-[160px] rounded-xl overflow-hidden bg-white dark:bg-[#12151c] border border-slate-100 dark:border-white/5 animate-pulse">
                                <div className="aspect-square bg-slate-100 dark:bg-[#0c0e14]" />
                                <div className="p-2.5 space-y-2">
                                    <div className="h-2 w-3/4 bg-slate-200 dark:bg-white/10 rounded" />
                                    <div className="h-3 w-full bg-slate-200 dark:bg-white/10 rounded" />
                                    <div className="h-3 w-2/3 bg-slate-100 dark:bg-white/5 rounded" />
                                    <div className="h-4 w-1/2 bg-slate-200 dark:bg-white/10 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile Sticky Bar Skeleton */}
            <div className="fixed bottom-0 left-0 w-full z-50 sm:hidden bg-white dark:bg-[#080a10] border-t border-slate-200 dark:border-white/[0.06] px-3 py-3 flex items-center gap-3">
                <div className="flex-1">
                    <div className="h-5 w-20 bg-slate-200 dark:bg-white/10 rounded animate-pulse mb-1" />
                    <div className="h-3 w-12 bg-slate-100 dark:bg-white/5 rounded animate-pulse" />
                </div>
                <div className="flex-1 h-12 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
                <div className="w-24 h-12 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
            </div>
        </div>
    );
}
