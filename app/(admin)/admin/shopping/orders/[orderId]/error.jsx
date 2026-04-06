'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({ error, reset }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
            <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Something went wrong!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">
                {error.message || 'An unexpected error occurred while loading this order.'}
            </p>
            <button
                onClick={() => reset()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
                Try again
            </button>
        </div>
    );
}
