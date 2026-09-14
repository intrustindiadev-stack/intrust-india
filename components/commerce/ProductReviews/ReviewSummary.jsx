'use client';

import { Star, Edit3, X, CheckCircle2 } from 'lucide-react';

export default function ReviewSummary({
    summary,
    selectedRating,
    onSelectRating,
    onOpenWriteModal,
    hasUserReviewed = false
}) {
    const avgRating = Number(summary?.avg_rating || 0).toFixed(1);
    const totalReviews = Number(summary?.review_count || 0);
    const histogram = summary?.histogram || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const verifiedCount = Number(summary?.verified_count || 0);
    const verifiedPct = totalReviews > 0 ? Math.round((verifiedCount / totalReviews) * 100) : 100;

    const ratingBars = [5, 4, 3, 2, 1].map(stars => {
        const count = Number(histogram[stars] || 0);
        const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
        return { stars, count, pct };
    });

    return (
        <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-6 shadow-xs">
            {/* Header: Title + Write Review CTA */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-400/10 dark:text-amber-400">
                        <Star size={20} className="fill-amber-500 dark:fill-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                            Customer Reviews & Ratings
                        </h3>
                        {totalReviews > 0 && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {verifiedPct}% of reviewers are verified buyers
                            </p>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onOpenWriteModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Edit3 size={15} />
                    <span>{hasUserReviewed ? 'Edit Your Review' : 'Write a Review'}</span>
                </button>
            </div>

            {/* Summary Cluster: Big Score + Histogram */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-5 sm:p-6 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                {/* Big Score Block */}
                <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-white/10 pb-5 md:pb-0 md:pr-6">
                    <div className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
                        {totalReviews > 0 ? avgRating : '0.0'}
                    </div>
                    <div className="flex items-center text-amber-500 gap-1 my-2">
                        {[...Array(5)].map((_, i) => {
                            const fillAmount = Math.max(0, Math.min(1, Number(avgRating) - i));
                            return (
                                <Star
                                    key={i}
                                    size={18}
                                    className={fillAmount > 0.3 ? 'fill-amber-500 text-amber-500' : 'text-slate-300 dark:text-slate-600'}
                                />
                            );
                        })}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Based on {totalReviews} {totalReviews === 1 ? 'rating' : 'ratings'}
                    </div>
                    {totalReviews === 0 && (
                        <div className="mt-2 text-xs text-slate-400 dark:text-slate-500 italic">
                            Be the first to review this product!
                        </div>
                    )}
                </div>

                {/* Star Breakdown Histogram Bars */}
                <div className="md:col-span-8 space-y-2 text-xs">
                    {ratingBars.map(({ stars, count, pct }) => {
                        const isSelected = selectedRating === stars;
                        return (
                            <button
                                key={stars}
                                type="button"
                                onClick={() => onSelectRating(isSelected ? null : stars)}
                                className={`w-full flex items-center gap-3 p-1.5 rounded-xl transition-all text-left group ${
                                    isSelected
                                        ? 'bg-amber-500/10 ring-1 ring-amber-500/30'
                                        : 'hover:bg-slate-100/70 dark:hover:bg-white/5'
                                }`}
                            >
                                <span className="w-9 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-0.5">
                                    {stars} <Star size={11} className="fill-amber-500 text-amber-500 inline" />
                                </span>

                                <div className="flex-1 h-2.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            isSelected
                                                ? 'bg-amber-500'
                                                : 'bg-amber-500/80 group-hover:bg-amber-500'
                                        }`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>

                                <span className="w-12 text-right font-medium text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                                    {count} ({pct}%)
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Active Star Filter Pill */}
            {selectedRating && (
                <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Active filter:
                    </span>
                    <button
                        type="button"
                        onClick={() => onSelectRating(null)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors"
                    >
                        <span>{selectedRating} Stars only</span>
                        <X size={12} className="stroke-[3]" />
                    </button>
                </div>
            )}
        </div>
    );
}
