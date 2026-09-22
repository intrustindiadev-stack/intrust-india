export default function MarketingLoading() {
    return (
        <div className="w-full py-2 animate-fadeIn">
            <div className="h-1 w-full bg-blue-100 dark:bg-slate-800 overflow-hidden rounded-full">
                <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 w-1/3 rounded-full animate-indeterminate" />
            </div>
            <div className="flex items-center justify-center gap-2 py-8 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                <span>Loading workspace updates...</span>
            </div>
        </div>
    );
}
