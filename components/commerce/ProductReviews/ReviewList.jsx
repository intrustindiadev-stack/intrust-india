'use client';

import { Check, ChevronDown, Filter, Image as ImageIcon, Loader2, Sparkles, MessageSquareOff } from 'lucide-react';
import ReviewCard from './ReviewCard';
import { SORT_OPTIONS } from '@/lib/shopping/reviews';

export default function ReviewList({
    reviews = [],
    loading = false,
    loadingMore = false,
    hasMore = false,
    totalCount = 0,
    sort = 'recent',
    onSortChange,
    verifiedOnly = false,
    onToggleVerifiedOnly,
    withMedia = false,
    onToggleWithMedia,
    onLoadMore,
    currentUserId,
    onToggleHelpful,
    onEditReview,
    onDeleteReview,
    onOpenMedia,
    onOpenWriteModal
}) {
    return (
        <div className="space-y-5">
            {/* Filter & Sort Control Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 shadow-xs">
                {/* Left Filter Chips */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                    <button
                        type="button"
                        onClick={onToggleVerifiedOnly}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all border ${
                            verifiedOnly
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                                : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                    >
                        {verifiedOnly && <Check size={13} className="stroke-[3]" />}
                        <span>Verified Purchases Only</span>
                    </button>

                    <button
                        type="button"
                        onClick={onToggleWithMedia}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all border ${
                            withMedia
                                ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-xs'
                                : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                    >
                        <ImageIcon size={13} />
                        <span>With Photos</span>
                    </button>
                </div>

                {/* Right Sort Dropdown */}
                <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                    <span className="text-slate-400 font-medium">Sort by:</span>
                    <div className="relative inline-block">
                        <select
                            value={sort}
                            onChange={(e) => onSortChange(e.target.value)}
                            className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-bold text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                        >
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                    </div>
                </div>
            </div>

            {/* Loading Skeleton */}
            {loading && (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] animate-pulse space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/10" />
                                <div className="space-y-1.5 flex-1">
                                    <div className="w-24 h-3 bg-slate-200 dark:bg-white/10 rounded-sm" />
                                    <div className="w-16 h-2.5 bg-slate-100 dark:bg-white/5 rounded-sm" />
                                </div>
                            </div>
                            <div className="w-3/4 h-3 bg-slate-100 dark:bg-white/5 rounded-sm" />
                            <div className="w-full h-12 bg-slate-50 dark:bg-white/[0.02] rounded-lg" />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && reviews.length === 0 && (
                <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
                        <MessageSquareOff size={22} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        No reviews match your filters
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        Try resetting your active filters or be the first customer to write a review for this product!
                    </p>
                    <button
                        type="button"
                        onClick={onOpenWriteModal}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs hover:scale-105 transition-all"
                    >
                        <Sparkles size={13} />
                        <span>Write a Review</span>
                    </button>
                </div>
            )}

            {/* Review Cards Grid / List */}
            {!loading && reviews.length > 0 && (
                <div className="space-y-3.5">
                    {reviews.map(review => (
                        <ReviewCard
                            key={review.id}
                            review={review}
                            currentUserId={currentUserId}
                            onToggleHelpful={onToggleHelpful}
                            onEditReview={onEditReview}
                            onDeleteReview={onDeleteReview}
                            onOpenMedia={onOpenMedia}
                        />
                    ))}
                </div>
            )}

            {/* Load More Button */}
            {!loading && hasMore && (
                <div className="text-center pt-2">
                    <button
                        type="button"
                        disabled={loadingMore}
                        onClick={onLoadMore}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                    >
                        {loadingMore ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Loading more...</span>
                            </>
                        ) : (
                            <span>Load More Reviews</span>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
