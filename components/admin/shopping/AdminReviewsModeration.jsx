'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Star,
    BadgeCheck,
    Eye,
    EyeOff,
    Search,
    Filter,
    Loader2,
    ShieldAlert,
    ExternalLink,
    Clock,
    User,
    Check,
    X,
    Package
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatReviewDate } from '@/lib/shopping/reviews';

export default function AdminReviewsModeration() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [ratingFilter, setRatingFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);

    const fetchReviews = useCallback(async (targetPage = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                status: statusFilter,
                page: String(targetPage),
                limit: '15'
            });
            if (ratingFilter !== 'all') params.set('rating', ratingFilter);
            if (search) params.set('search', search);

            const res = await fetch(`/api/admin/shopping/reviews?${params.toString()}`);
            const json = await res.json();

            if (json.success && json.data) {
                setReviews(json.data.reviews || []);
                setTotalCount(json.data.totalCount || 0);
                setHasMore(json.data.hasMore || false);
                setPage(targetPage);
            } else {
                toast.error(json.error || 'Failed to fetch reviews');
            }
        } catch (err) {
            console.error('[AdminReviewsModeration] Fetch error:', err);
            toast.error('Network error fetching moderation queue');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, ratingFilter, search]);

    useEffect(() => {
        fetchReviews(1);
    }, [fetchReviews]);

    const handleModerate = async (reviewId, newStatus) => {
        setUpdatingId(reviewId);
        try {
            const res = await fetch('/api/admin/shopping/reviews', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviewId, status: newStatus })
            });

            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Failed to update review status');
            }

            toast.success(`Review marked as ${newStatus}`);
            // Update locally
            setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: newStatus } : r));
        } catch (err) {
            console.error('[Admin Moderate Error]:', err);
            toast.error(err.message || 'Failed to update status');
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Toolbar */}
            <div className="p-5 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap flex-1">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[220px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search title, comment, or author..."
                            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                    >
                        <option value="all">All Statuses ({totalCount})</option>
                        <option value="published">Published</option>
                        <option value="hidden">Hidden</option>
                        <option value="pending_moderation">Pending Moderation</option>
                    </select>

                    {/* Rating Filter */}
                    <select
                        value={ratingFilter}
                        onChange={(e) => setRatingFilter(e.target.value)}
                        className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                    >
                        <option value="all">All Ratings</option>
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                    </select>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="py-20 text-center">
                    <Loader2 size={32} className="animate-spin text-amber-500 mx-auto mb-2" />
                    <span className="text-xs font-semibold text-slate-400">Loading reviews queue...</span>
                </div>
            ) : reviews.length === 0 ? (
                <div className="py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
                    <ShieldAlert size={36} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">No reviews match filters</h4>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map(rev => {
                        const isUpdating = updatingId === rev.id;
                        const productThumbnail = rev.shopping_products?.product_images?.[0] || null;

                        return (
                            <div
                                key={rev.id}
                                className={`p-5 sm:p-6 rounded-3xl border transition-all shadow-xs space-y-4 ${
                                    rev.status === 'hidden'
                                        ? 'bg-red-50/30 dark:bg-red-950/10 border-red-200/60 dark:border-red-900/30 opacity-75'
                                        : 'bg-white dark:bg-white/[0.02] border-slate-200/80 dark:border-white/10'
                                }`}
                            >
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-3">
                                        {productThumbnail ? (
                                            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shrink-0">
                                                <Image
                                                    src={productThumbnail}
                                                    alt="Product"
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
                                                className="text-xs sm:text-sm font-black text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-sky-400 inline-flex items-center gap-1.5"
                                            >
                                                <span>{rev.shopping_products?.title || 'Product'}</span>
                                                <ExternalLink size={12} className="opacity-60" />
                                            </Link>
                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                                                <span>Customer: <strong>{rev.user_profiles?.full_name || 'Anonymous'}</strong></span>
                                                {rev.user_profiles?.phone && <span>({rev.user_profiles.phone})</span>}
                                                <span>•</span>
                                                <span>{formatReviewDate(rev.created_at)}</span>
                                                {rev.verified_purchase && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                                            <BadgeCheck size={12} /> Verified
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Badge + Star Rating */}
                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                            rev.status === 'published'
                                                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                                : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                                        }`}>
                                            {rev.status}
                                        </span>

                                        <div className="flex items-center gap-0.5 text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-200/50">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    size={12}
                                                    className={i < rev.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-300 dark:text-slate-600'}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="space-y-1.5">
                                    {rev.title && (
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                            {rev.title}
                                        </h4>
                                    )}
                                    <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                        {rev.comment}
                                    </p>

                                    {/* Media */}
                                    {Array.isArray(rev.media_urls) && rev.media_urls.length > 0 && (
                                        <div className="flex items-center gap-2 pt-1">
                                            {rev.media_urls.map((url, idx) => (
                                                <div key={idx} className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
                                                    <Image src={url} alt="Review attachment" fill sizes="48px" className="object-cover" unoptimized />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Moderation Actions */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                                    <div className="text-[11px] text-slate-400">
                                        Helpful Votes: {rev.helpful_votes || 0}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {rev.status !== 'published' && (
                                            <button
                                                type="button"
                                                disabled={isUpdating}
                                                onClick={() => handleModerate(rev.id, 'published')}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                                            >
                                                <Eye size={13} />
                                                <span>Publish / Approve</span>
                                            </button>
                                        )}

                                        {rev.status !== 'hidden' && (
                                            <button
                                                type="button"
                                                disabled={isUpdating}
                                                onClick={() => handleModerate(rev.id, 'hidden')}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                                            >
                                                <EyeOff size={13} />
                                                <span>Hide from Public</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
