'use client';

import { useState, useEffect, useCallback } from 'react';
import ReviewSummary from './ReviewSummary';
import ReviewList from './ReviewList';
import ReviewSubmitModal from './ReviewSubmitModal';
import ReviewLightbox from './ReviewLightbox';
import { fetchProductReviews, toggleReviewHelpful, deleteProductReview } from '@/lib/shopping/reviews';
import toast from 'react-hot-toast';

export default function ProductReviews({ product, customer }) {
    const productId = product?.id;
    const currentUserId = customer?.id;

    // Review Summary & Histogram State
    const [summary, setSummary] = useState({
        avg_rating: Number(product?.avg_rating || 0),
        review_count: Number(product?.review_count || 0),
        histogram: {
            5: Number(product?.rating_5_count || 0),
            4: Number(product?.rating_4_count || 0),
            3: Number(product?.rating_3_count || 0),
            2: Number(product?.rating_2_count || 0),
            1: Number(product?.rating_1_count || 0),
        },
        verified_count: 0,
        with_media_count: 0
    });

    // Reviews List State
    const [reviews, setReviews] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Filter & Sort State
    const [sort, setSort] = useState('recent');
    const [selectedRating, setSelectedRating] = useState(null);
    const [verifiedOnly, setVerifiedOnly] = useState(false);
    const [withMedia, setWithMedia] = useState(false);

    // Modal & Lightbox State
    const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
    const [editingReview, setEditingReview] = useState(null);
    const [lightboxMedia, setLightboxMedia] = useState({ isOpen: false, images: [], index: 0 });

    // Load reviews
    const loadReviews = useCallback(async (targetPage = 1, append = false) => {
        if (!productId) return;
        if (append) setLoadingMore(true);
        else setLoading(true);

        try {
            const res = await fetchProductReviews({
                productId,
                sort,
                page: targetPage,
                limit: 10,
                rating: selectedRating,
                verifiedOnly,
                withMedia
            });

            if (res.success && res.data) {
                if (res.data.summary) {
                    setSummary(res.data.summary);
                }

                if (append) {
                    setReviews(prev => [...prev, ...(res.data.reviews || [])]);
                } else {
                    setReviews(res.data.reviews || []);
                }

                setTotalCount(res.data.totalCount || 0);
                setHasMore(res.data.hasMore || false);
                setPage(targetPage);
            }
        } catch (err) {
            console.error('[ProductReviews] Error loading reviews:', err);
            if (append) {
                toast.error('Failed to load more reviews');
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [productId, sort, selectedRating, verifiedOnly, withMedia]);

    // Fetch reviews when filters change
    useEffect(() => {
        loadReviews(1, false);
    }, [loadReviews]);

    // Handle Helpful Toggle (Optimistic)
    const handleToggleHelpful = async (reviewId) => {
        if (!currentUserId) {
            toast('Please log in to vote on reviews.', { icon: '🔒' });
            return;
        }

        // Optimistic UI update
        setReviews(prev => prev.map(rev => {
            if (rev.id === reviewId) {
                const wasVoted = rev.has_voted_helpful;
                const newVotes = wasVoted
                    ? Math.max(0, (rev.helpful_votes || 1) - 1)
                    : (rev.helpful_votes || 0) + 1;
                return {
                    ...rev,
                    has_voted_helpful: !wasVoted,
                    helpful_votes: newVotes
                };
            }
            return rev;
        }));

        try {
            const data = await toggleReviewHelpful(reviewId);
            // Sync with authoritative server response
            setReviews(prev => prev.map(rev => {
                if (rev.id === reviewId) {
                    return {
                        ...rev,
                        has_voted_helpful: data.voted,
                        helpful_votes: data.helpful_votes
                    };
                }
                return rev;
            }));
        } catch (err) {
            toast.error(err.message || 'Failed to update vote');
            // Revert by re-fetching
            loadReviews(page, false);
        }
    };

    // Handle Edit / Write
    const handleOpenWriteModal = () => {
        if (!currentUserId) {
            toast('Please log in to write a review.', { icon: '🔒' });
            return;
        }
        // Check if user already reviewed
        const userReview = reviews.find(r => r.user_id === currentUserId);
        setEditingReview(userReview || null);
        setIsWriteModalOpen(true);
    };

    const handleEditSpecificReview = (rev) => {
        setEditingReview(rev);
        setIsWriteModalOpen(true);
    };

    // Handle Delete
    const handleDeleteReview = async (reviewId) => {
        await deleteProductReview(reviewId);
        // Refresh list and summary
        loadReviews(1, false);
    };

    // Handle Lightbox
    const handleOpenMedia = (images, index) => {
        setLightboxMedia({
            isOpen: true,
            images,
            index
        });
    };

    const userHasReviewed = Boolean(currentUserId && reviews.some(r => r.user_id === currentUserId));

    return (
        <section id="customer-reviews" className="space-y-6 pt-2">
            {/* Rating Summary Cluster */}
            <ReviewSummary
                summary={summary}
                selectedRating={selectedRating}
                onSelectRating={(r) => setSelectedRating(r)}
                onOpenWriteModal={handleOpenWriteModal}
                hasUserReviewed={userHasReviewed}
            />

            {/* Filtered Reviews List */}
            <ReviewList
                reviews={reviews}
                loading={loading}
                loadingMore={loadingMore}
                hasMore={hasMore}
                totalCount={totalCount}
                sort={sort}
                onSortChange={(s) => setSort(s)}
                verifiedOnly={verifiedOnly}
                onToggleVerifiedOnly={() => setVerifiedOnly(!verifiedOnly)}
                withMedia={withMedia}
                onToggleWithMedia={() => setWithMedia(!withMedia)}
                onLoadMore={() => loadReviews(page + 1, true)}
                currentUserId={currentUserId}
                onToggleHelpful={handleToggleHelpful}
                onEditReview={handleEditSpecificReview}
                onDeleteReview={handleDeleteReview}
                onOpenMedia={handleOpenMedia}
                onOpenWriteModal={handleOpenWriteModal}
            />

            {/* Write/Edit Review Modal */}
            <ReviewSubmitModal
                isOpen={isWriteModalOpen}
                onClose={() => {
                    setIsWriteModalOpen(false);
                    setEditingReview(null);
                }}
                productId={productId}
                productTitle={product?.title}
                currentUser={customer}
                existingReview={editingReview}
                onSubmitSuccess={() => {
                    loadReviews(1, false);
                }}
            />

            {/* Review Photos Lightbox */}
            <ReviewLightbox
                isOpen={lightboxMedia.isOpen}
                images={lightboxMedia.images}
                initialIndex={lightboxMedia.index}
                onClose={() => setLightboxMedia(prev => ({ ...prev, isOpen: false }))}
            />
        </section>
    );
}
