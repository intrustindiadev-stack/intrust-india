'use client';

import { useState } from 'react';
import { Star, BadgeCheck, ThumbsUp, Trash2, Edit3, MessageSquareQuote, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { maskName, formatReviewDate } from '@/lib/shopping/reviews';
import toast from 'react-hot-toast';

export default function ReviewCard({
    review,
    currentUserId,
    onToggleHelpful,
    onEditReview,
    onDeleteReview,
    onOpenMedia
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const isAuthor = Boolean(currentUserId && review.user_id === currentUserId);
    const displayName = maskName(review.user_profile?.full_name);
    const avatarUrl = review.user_profile?.avatar_url;
    const initial = (review.user_profile?.full_name?.[0] || 'C').toUpperCase();
    const isVerified = Boolean(review.verified_purchase);
    const dateFormatted = formatReviewDate(review.created_at);
    const hasMedia = Array.isArray(review.media_urls) && review.media_urls.length > 0;
    const reply = review.reply || (Array.isArray(review.review_replies) && review.review_replies[0]) || null;

    const commentText = review.comment || '';
    const shouldClamp = commentText.length > 280;
    const displayText = shouldClamp && !isExpanded
        ? `${commentText.slice(0, 280)}...`
        : commentText;

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete your review?')) return;
        setIsDeleting(true);
        try {
            await onDeleteReview(review.id);
            toast.success('Review deleted');
        } catch (err) {
            toast.error(err.message || 'Failed to delete review');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xs space-y-3 transition-all hover:border-slate-300 dark:hover:border-white/20">
            {/* Header: Author Info + Star Rating */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    {/* Avatar / Initial circle */}
                    {avatarUrl ? (
                        <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-white/10">
                            <Image
                                src={avatarUrl}
                                alt={displayName}
                                fill
                                sizes="36px"
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
                            {initial}
                        </div>
                    )}

                    <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                {displayName}
                            </span>
                            {isVerified && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200/60 dark:border-emerald-800/40">
                                    <BadgeCheck size={11} className="stroke-[2.5]" />
                                    <span>Verified Purchase</span>
                                </span>
                            )}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            {dateFormatted}
                        </div>
                    </div>
                </div>

                {/* Rating Stars */}
                <div className="flex items-center text-amber-500 gap-0.5 shrink-0 bg-amber-50/60 dark:bg-amber-950/20 px-2 py-1 rounded-lg border border-amber-100 dark:border-amber-900/30">
                    {[...Array(5)].map((_, i) => (
                        <Star
                            key={i}
                            size={13}
                            className={i < review.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-300 dark:text-slate-600'}
                        />
                    ))}
                </div>
            </div>

            {/* Review Title */}
            {review.title && (
                <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {review.title}
                </h5>
            )}

            {/* Review Comment */}
            <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {displayText}
                {shouldClamp && (
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="ml-1.5 font-bold text-blue-600 dark:text-sky-400 hover:underline inline-flex items-center text-xs"
                    >
                        {isExpanded ? (
                            <>Show less <ChevronUp size={12} className="ml-0.5" /></>
                        ) : (
                            <>Read more <ChevronDown size={12} className="ml-0.5" /></>
                        )}
                    </button>
                )}
            </p>

            {/* Attached Photo Thumbnails */}
            {hasMedia && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {review.media_urls.map((url, imgIdx) => (
                        <button
                            key={imgIdx}
                            type="button"
                            onClick={() => onOpenMedia(review.media_urls, imgIdx)}
                            className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 hover:border-amber-400 dark:hover:border-amber-400 transition-all hover:scale-105 shadow-xs shrink-0 group"
                        >
                            <Image
                                src={url}
                                alt={`Customer attachment ${imgIdx + 1}`}
                                fill
                                sizes="56px"
                                className="object-cover group-hover:scale-105 transition-transform duration-200"
                                unoptimized
                            />
                        </button>
                    ))}
                </div>
            )}

            {/* Official Merchant Reply Callout Block */}
            {reply && reply.reply_text && (
                <div className="mt-3 p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border-l-4 border-l-blue-600 dark:border-l-blue-500 border border-slate-200/60 dark:border-white/5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                            <MessageSquareQuote size={13} className="text-blue-600 dark:text-blue-400" />
                            <span>Response from {reply.merchant_name || 'Seller'}</span>
                        </div>
                        {reply.created_at && (
                            <span className="text-[10px] text-slate-400">
                                {formatReviewDate(reply.created_at)}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {reply.reply_text}
                    </p>
                </div>
            )}

            {/* Bottom Actions: Helpful Button + Owner Edit/Delete */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-xs text-slate-400">
                <button
                    type="button"
                    onClick={() => onToggleHelpful(review.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                        review.has_voted_helpful
                            ? 'text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-blue-950/30'
                            : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                >
                    <ThumbsUp
                        size={13}
                        className={review.has_voted_helpful ? 'fill-blue-600 dark:fill-sky-400 stroke-blue-600 dark:stroke-sky-400' : ''}
                    />
                    <span>Helpful ({review.helpful_votes || 0})</span>
                </button>

                {isAuthor && (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onEditReview(review)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <Edit3 size={12} />
                            <span>Edit</span>
                        </button>
                        <button
                            type="button"
                            disabled={isDeleting}
                            onClick={handleDelete}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={12} />
                            <span>Delete</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
