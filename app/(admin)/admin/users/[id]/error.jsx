'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Error boundary for /admin/users/[id].
 * Catches runtime errors (e.g. missing env vars, data fetch failures)
 * and shows a clear message instead of a blank white screen.
 */
export default function UserDetailError({ error, reset }) {
    useEffect(() => {
        console.error('[AdminUserDetail] Page error:', error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-8 font-[family-name:var(--font-outfit)]">
            <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-200 shadow-lg text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center">
                    <AlertTriangle size={32} className="text-red-500" />
                </div>

                <div>
                    <h2 className="text-xl font-extrabold text-gray-900 tracking-tight mb-2">
                        Unable to Load User Details
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">
                        Something went wrong while loading this page. This is most
                        likely a server configuration issue.
                    </p>
                </div>

                {process.env.NODE_ENV === 'development' && error?.message && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">
                            Error Details
                        </p>
                        <p className="text-sm text-red-700 font-mono break-all">
                            {error.message}
                        </p>
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={() => window.history.back()}
                        className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors"
                    >
                        ← Go Back
                    </button>
                    <button
                        onClick={() => reset()}
                        className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={14} />
                        Retry
                    </button>
                </div>
            </div>
        </div>
    );
}
