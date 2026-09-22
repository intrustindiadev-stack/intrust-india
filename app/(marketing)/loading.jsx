export default function MarketingLoading() {
    return (
        <div className="w-full space-y-4 animate-fadeIn" aria-busy="true" aria-label="Loading marketing workspace">
            <div className="h-1 w-full bg-blue-100 dark:bg-slate-800 overflow-hidden rounded-full">
                <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 w-1/3 rounded-full animate-indeterminate" />
            </div>
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 animate-pulse">
                <div className="h-5 w-44 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="h-3 w-64 bg-slate-100 dark:bg-slate-800 rounded-lg mt-2" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="rounded-2xl border border-slate-100 dark:border-slate-800 p-3">
                            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                            <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded mt-2" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-pulse">
                        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full mt-3" />
                        <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl mt-3" />
                    </div>
                ))}
            </div>
        </div>
    );
}
