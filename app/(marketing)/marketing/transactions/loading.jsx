export default function TransactionsLoading() {
    return (
        <div className="space-y-4 sm:space-y-6 animate-fadeIn" aria-busy="true" aria-label="Loading transactions">
            <div className="h-1 w-full bg-blue-100 dark:bg-slate-800 overflow-hidden rounded-full">
                <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 w-1/3 rounded-full animate-indeterminate" />
            </div>
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 space-y-3 animate-pulse">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}
