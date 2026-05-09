'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The network chain now lives on the /refer page.
// This page simply redirects there immediately.
export default function RewardsTreeRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/refer');
    }, []);

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
    );
}
