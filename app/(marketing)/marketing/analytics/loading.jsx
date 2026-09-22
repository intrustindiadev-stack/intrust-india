export default function AnalyticsLoading() {
    return (
        <div className="space-y-4 sm:space-y-6 animate-fadeIn" aria-busy="true" aria-label="Loading analytics">
            <div className="h-1 w-full bg-blue-100 dark:bg-slate-800 overflow-hidden rounded-full">
                <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 w-1/3 rounded-full animate-indeterminate" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-pulse">
                        <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded mt-2" />
                    </div>
                ))}
            </div>
            <div className="h-64 rounded-2xl sm:rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </div>
    );
}
