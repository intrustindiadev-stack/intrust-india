export function CustomerLoadingSkeleton({ label = 'Loading...' }) {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] px-4 sm:px-6 py-6 animate-fadeIn" aria-busy="true" aria-label={label}>
            <div className="max-w-7xl mx-auto space-y-4">
                <div className="h-12 rounded-2xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
                <div className="h-44 rounded-3xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-28 rounded-2xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
                    ))}
                </div>
                <div className="h-36 rounded-3xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
            </div>
        </div>
    );
}

export default CustomerLoadingSkeleton;
