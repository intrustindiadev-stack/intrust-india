'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Star,
    BadgeCheck,
    MessageSquare,
    Reply,
    Search,
    Filter,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Package,
    ExternalLink,
    Clock,
    X,
    ThumbsUp
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { maskName, formatReviewDate } from '@/lib/shopping/reviews';

export default function MerchantReviewsClient({ merchant, user }) {
    const [reviews, setReviews] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [selectedProduct, setSelectedProduct] = useState('all');
    const [selectedRating, setSelectedRating] = useState('all');
    const [needsReplyOnly, setNeedsReplyOnly] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Reply modal / inline state
    const [activeReplyId, setActiveReplyId] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [submittingReply, setSubmittingReply] = useState(false);

    // Fetch reviews
    const fetchReviews = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedProduct !== 'all') params.set('productId', selectedProduct);
            if (selectedRating !== 'all') params.set('rating', selectedRating);
            if (needsReplyOnly) params.set('needsReply', 'true');

            const res = await fetch(`/api/merchant/reviews?${params.toString()}`);
            const json = await res.json();

            if (json.success && json.data) {
                setReviews(json.data.reviews || []);
                setTotalCount(json.data.totalCount || 0);
                if (json.data.products?.length) {
                    setProducts(json.data.products);
                }
            } else {
                toast.error(json.error || 'Failed to load reviews');
            }
        } catch (err) {
            console.error('[MerchantReviewsClient] Fetch error:', err);
            toast.error('Network error loading reviews');
        } finally {
            setLoading(false);
        }
    }, [selectedProduct, selectedRating, needsReplyOnly]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    // Handle Reply Submission
    const handleSendReply = async (reviewId) => {
        if (!replyText.trim()) {
            toast.error('Reply text cannot be empty');
            return;
        }

        setSubmittingReply(true);
        try {
            const res = await fetch(`/api/merchant/reviews/${reviewId}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    replyText: replyText.trim(),
                    merchantId: merchant?.id
                })
            });

            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Failed to save reply');
            }

            toast.success('Reply published to customer review!');
            setActiveReplyId(null);
            setReplyText('');
            // Refresh reviews
            fetchReviews();
        } catch (err) {
            console.error('[SendReply Error]:', err);
            toast.error(err.message || 'Failed to send reply');
        } finally {
            setSubmittingReply(false);
        }
    };

    // Filter reviews by client-side search query
    const filteredReviews = reviews.filter(rev => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const author = (rev.user_profiles?.full_name || '').toLowerCase();
        const title = (rev.title || '').toLowerCase();
        const comment = (rev.comment || '').toLowerCase();
        const prodTitle = (rev.shopping_products?.title || '').toLowerCase();
        return author.includes(q) || title.includes(q) || comment.includes(q) || prodTitle.includes(q);
    });

    // KPI metrics
    const totalReviewsCount = reviews.length;
    const avgScore = totalReviewsCount > 0
        ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviewsCount).toFixed(1)
        : '0.0';
    const pendingRepliesCount = reviews.filter(r => !r.review_replies || (Array.isArray(r.review_replies) && r.review_replies.length === 0)).length;
    const verifiedPurchasesCount = reviews.filter(r => r.verified_purchase).length;

    return (
        <div className="space-y-6">
            {/* Top Title & Merchant Business Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-400 text-xs font-bold backdrop-blur-md">
                        <MessageSquare size={13} />
                        <span>Merchant Customer Care</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                        Product Reviews & Ratings
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-300">
                        Monitor verified buyer feedback and publish official replies for {merchant?.business_name}.
                    </p>
                </div>
            </div>

            {/* KPI Cards Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-1">
                    <span className="text-xs font-bold text-slate-400">Total Customer Reviews</span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                        {totalCount}
                    </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-1">
                    <span className="text-xs font-bold text-slate-400">Average Rating</span>
                    <div className="flex items-center gap-2">
                        <div className="text-2xl sm:text-3xl font-black text-amber-500">
                            {avgScore}
                        </div>
                        <Star size={20} className="fill-amber-500 text-amber-500" />
                    </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-1">
                    <span className="text-xs font-bold text-slate-400">Awaiting Your Reply</span>
                    <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
                        {pendingRepliesCount}
                    </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-1">
                    <span className="text-xs font-bold text-slate-400">Verified Purchases</span>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                        {verifiedPurchasesCount}
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-[280px]">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by review text or product..."
                            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/40"
                        />
                    </div>

                    {/* Product Filter */}
                    <select
                        value={selectedProduct}
                        onChange={(e) => setSelectedProduct(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                    >
                        <option value="all">All Products</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.title}
                            </option>
                        ))}
                    </select>

                    {/* Rating Filter */}
                    <select
                        value={selectedRating}
                        onChange={(e) => setSelectedRating(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                    >
                        <option value="all">All Star Ratings</option>
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                    </select>

                    {/* Needs Reply Chip */}
                    <button
                        type="button"
                        onClick={() => setNeedsReplyOnly(!needsReplyOnly)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            needsReplyOnly
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                    >
                        <Reply size={13} />
                        <span>Needs Reply Only</span>
                    </button>
                </div>
            </div>

            {/* Reviews List */}
            {loading ? (
                <div className="py-16 text-center">
                    <Loader2 size={28} className="animate-spin text-amber-500 mx-auto mb-2" />
                    <span className="text-xs text-slate-400 font-medium">Loading merchant reviews...</span>
                </div>
            ) : filteredReviews.length === 0 ? (
                <div className="py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] space-y-2">
                    <Package size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        No reviews found
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        No customer reviews match your selected filters.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredReviews.map(rev => {
                        const reply = Array.isArray(rev.review_replies) && rev.review_replies.length > 0
                            ? rev.review_replies[0]
                            : rev.review_replies || null;
                        const isReplying = activeReplyId === rev.id;
                        const productThumbnail = rev.shopping_products?.product_images?.[0] || null;

                        return (
                            <div
                                key={rev.id}
                                className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4"
                            >
                                {/* Product Header + Customer Rating */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-3">
                                        {productThumbnail ? (
                                            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shrink-0">
                                                <Image
                                                    src={productThumbnail}
                                                    alt={rev.shopping_products?.title || 'Product'}
                                                    fill
                                                    sizes="48px"
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 shrink-0">
                                                <Package size={20} />
                                            </div>
                                        )}

                                        <div>
                                            <Link
                                                href={`/shop/product/${rev.shopping_products?.slug || rev.product_id}`}
                                                target="_blank"
                                                className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-sky-400 inline-flex items-center gap-1.5"
                                            >
                                                <span>{rev.shopping_products?.title || 'Product'}</span>
                                                <ExternalLink size={12} className="opacity-60" />
                                            </Link>
                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                                                <span>Review by {maskName(rev.user_profiles?.full_name)}</span>
                                                <span>•</span>
                                                <span>{formatReviewDate(rev.created_at)}</span>
                                                {rev.verified_purchase && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                                            <BadgeCheck size={12} />
                                                            <span>Verified Buyer</span>
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Star Rating */}
                                    <div className="flex items-center gap-1 text-amber-500 bg-amber-50/60 dark:bg-amber-950/30 px-2.5 py-1 rounded-xl self-start sm:self-auto border border-amber-200/50 dark:border-amber-900/30">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                size={13}
                                                className={i < rev.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-300 dark:text-slate-600'}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Review Content */}
                                <div className="space-y-2">
                                    {rev.title && (
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                            {rev.title}
                                        </h4>
                                    )}
                                    <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                        {rev.comment}
                                    </p>

                                    {/* Review Media Attachments */}
                                    {Array.isArray(rev.media_urls) && rev.media_urls.length > 0 && (
                                        <div className="flex items-center gap-2 pt-1">
                                            {rev.media_urls.map((url, imgIdx) => (
                                                <div
                                                    key={imgIdx}
                                                    className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10"
                                                >
                                                    <Image
                                                        src={url}
                                                        alt="Customer upload"
                                                        fill
                                                        sizes="48px"
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Existing Reply Block */}
                                {reply && reply.reply_text && !isReplying && (
                                    <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
                                                <Reply size={13} />
                                                <span>Your Official Reply</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveReplyId(rev.id);
                                                    setReplyText(reply.reply_text);
                                                }}
                                                className="text-blue-600 dark:text-sky-400 font-bold hover:underline"
                                            >
                                                Edit Reply
                                            </button>
                                        </div>
                                        <p className="text-xs text-blue-950 dark:text-blue-200 leading-relaxed">
                                            {reply.reply_text}
                                        </p>
                                    </div>
                                )}

                                {/* Reply Editor Form */}
                                {isReplying && (
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                                            <span>Compose Merchant Response</span>
                                            <span className="text-slate-400 font-normal">{replyText.length}/1000</span>
                                        </div>
                                        <textarea
                                            rows={3}
                                            maxLength={1000}
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder="Thank the customer or provide support information..."
                                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/40"
                                        />
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveReplyId(null);
                                                    setReplyText('');
                                                }}
                                                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                disabled={submittingReply}
                                                onClick={() => handleSendReply(rev.id)}
                                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                                            >
                                                {submittingReply ? <Loader2 size={13} className="animate-spin" /> : <Reply size={13} />}
                                                <span>Publish Reply</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Action Toolbar if no reply yet */}
                                {!reply && !isReplying && (
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveReplyId(rev.id);
                                                setReplyText('');
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-sky-400 hover:bg-blue-100 dark:hover:bg-blue-950/50 text-xs font-bold transition-colors"
                                        >
                                            <Reply size={13} />
                                            <span>Reply to Review</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => toast('Review moderation request submitted to InTrust Admin.')}
                                            className="text-[11px] font-semibold text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            Report Inappropriate
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
