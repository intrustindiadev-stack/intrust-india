export default function SponsorHistoryLoading() {
    return (
        <div className="space-y-4 sm:space-y-6 animate-fadeIn" aria-busy="true" aria-label="Loading sponsorship history">
            <div className="h-1 w-full bg-blue-100 dark:bg-slate-800 overflow-hidden rounded-full">
                <div className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-400 w-1/3 rounded-full animate-indeterminate" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-pulse">
                        <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded mt-2" />
                    </div>
                ))}
            </div>
            {[0, 1].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 animate-pulse">
                    <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-64 bg-slate-100 dark:bg-slate-800 rounded mt-2" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
                        {[0, 1, 2, 3].map((j) => (
                            <div key={j} className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
