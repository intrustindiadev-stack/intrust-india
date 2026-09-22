export default function ProductsLoading() {
    return (
        <div className="space-y-4 sm:space-y-6 animate-fadeIn" aria-busy="true" aria-label="Loading products">
            <div className="h-1 w-full bg-blue-100 dark:bg-slate-800 overflow-hidden rounded-full">
                <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 w-1/3 rounded-full animate-indeterminate" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 animate-pulse">
                        <div className="h-28 sm:h-36 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800" />
                        <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded mt-3" />
                        <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded-xl mt-3" />
                    </div>
                ))}
            </div>
        </div>
    );
}
