/**
 * Helper utilities and API clients for the Product Reviews System
 */

/**
 * Masks a full name for privacy, e.g.:
 * "Aarav Sharma" -> "A***v S."
 * "Pooja" -> "P***a"
 * "Al" -> "A*"
 * "A" -> "A*"
 */
export function maskName(name) {
    if (!name || typeof name !== 'string') return 'Verified Buyer';
    const trimmed = name.trim();
    if (!trimmed) return 'Verified Buyer';

    const parts = trimmed.split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

    let maskedFirst = firstName;
    if (firstName.length === 1) {
        maskedFirst = `${firstName}*`;
    } else if (firstName.length === 2) {
        maskedFirst = `${firstName[0]}*`;
    } else if (firstName.length === 3) {
        maskedFirst = `${firstName[0]}*${firstName[2]}`;
    } else {
        maskedFirst = `${firstName[0]}***${firstName[firstName.length - 1]}`;
    }

    if (lastName) {
        return `${maskedFirst} ${lastName[0]}.`;
    }
    return maskedFirst;
}

/**
 * Formats review timestamp into a friendly human-readable date
 */
export function formatReviewDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
        if (diffHours === 0) {
            if (diffMin <= 1) return 'Just now';
            return `${diffMin} minutes ago`;
        }
        return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    }
    if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    }

    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

export const SORT_OPTIONS = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'helpful', label: 'Most Helpful' },
    { value: 'highest', label: 'Highest Rating' },
    { value: 'lowest', label: 'Lowest Rating' },
    { value: 'verified', label: 'Verified First' },
];

/**
 * Client-side fetch helper for reviews
 */
export async function fetchProductReviews({
    productId,
    sort = 'recent',
    page = 1,
    limit = 10,
    rating = null,
    verifiedOnly = false,
    withMedia = false,
}) {
    const params = new URLSearchParams({
        productId,
        sort,
        page: String(page),
        limit: String(limit),
    });

    if (rating) params.set('rating', String(rating));
    if (verifiedOnly) params.set('verifiedOnly', 'true');
    if (withMedia) params.set('withMedia', 'true');

    const res = await fetch(`/api/shopping/reviews?${params.toString()}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch reviews');
    }
    return res.json();
}

/**
 * Client-side helper to submit or update a review
 */
export async function submitProductReview({ productId, rating, title, comment, mediaUrls = [] }) {
    const res = await fetch('/api/shopping/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            productId,
            rating,
            title,
            comment,
            mediaUrls
        })
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
    }
    return data;
}

/**
 * Client-side helper to toggle helpful vote
 */
export async function toggleReviewHelpful(reviewId) {
    const res = await fetch(`/api/shopping/reviews/${reviewId}/helpful`, {
        method: 'POST'
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Failed to update helpful vote');
    }
    return data.data;
}

/**
 * Client-side helper to delete review
 */
export async function deleteProductReview(reviewId) {
    const res = await fetch(`/api/shopping/reviews/${reviewId}`, {
        method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Failed to delete review');
    }
    return data;
}
