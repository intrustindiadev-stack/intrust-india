export default function DailyChallengeLoading() {
    return (
        <div className="space-y-4 sm:space-y-6 animate-fadeIn" aria-busy="true" aria-label="Loading daily challenge">
            <div className="h-1 w-full bg-blue-100 dark:bg-slate-800 overflow-hidden rounded-full">
                <div className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-400 w-1/3 rounded-full animate-indeterminate" />
            </div>
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 animate-pulse">
                <div className="h-5 w-56 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="h-3 w-72 bg-slate-100 dark:bg-slate-800 rounded-lg mt-2" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800" />
                    ))}
                </div>
            </div>
        </div>
    );
}
