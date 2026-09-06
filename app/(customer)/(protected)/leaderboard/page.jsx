'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Leaderboard Redirect
 * Standardizes customer navigation to the unified /rewards/leaderboard route.
 */
export default function LeaderboardRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/rewards/leaderboard');
    }, [router]);

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-xs font-bold text-on-surface-variant animate-pulse">Loading Leaderboard...</p>
        </div>
    );
}
