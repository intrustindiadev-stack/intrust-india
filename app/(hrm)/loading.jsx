export default function HRMLoadingSkeleton() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 font-[family-name:var(--font-outfit)] flex flex-col p-4 sm:p-6 lg:p-8 animate-pulse">
            {/* Top Bar Skeleton */}
            <div className="h-16 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 mb-8 w-full shadow-sm flex items-center justify-between px-6">
                <div className="h-6 w-48 bg-slate-200 dark:bg-gray-800 rounded-lg" />
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-slate-200 dark:bg-gray-800 rounded-full" />
                    <div className="h-6 w-24 bg-slate-200 dark:bg-gray-800 rounded-md hidden sm:block" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-grow">
                {/* Sidebar Navigation Skeleton */}
                <div className="hidden lg:flex flex-col gap-3 col-span-1 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-slate-200 dark:border-gray-800 h-[calc(100vh-140px)]">
                    <div className="h-5 w-32 bg-indigo-500/20 rounded-md mb-4" />
                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                        <div key={idx} className="h-12 bg-slate-100 dark:bg-gray-800/50 rounded-xl w-full" />
                    ))}
                </div>

                {/* Main HRM Content Area Skeleton */}
                <div className="col-span-1 lg:col-span-3 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="h-32 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
                            <div className="h-4 w-24 bg-slate-200 dark:bg-gray-800 rounded" />
                            <div className="h-8 w-20 bg-indigo-500/20 rounded-lg" />
                        </div>
                        <div className="h-32 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
                            <div className="h-4 w-24 bg-slate-200 dark:bg-gray-800 rounded" />
                            <div className="h-8 w-20 bg-emerald-500/20 rounded-lg" />
                        </div>
                        <div className="h-32 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
                            <div className="h-4 w-24 bg-slate-200 dark:bg-gray-800 rounded" />
                            <div className="h-8 w-20 bg-amber-500/20 rounded-lg" />
                        </div>
                    </div>
                    
                    <div className="h-96 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                        <div className="h-6 w-56 bg-slate-200 dark:bg-gray-800 rounded-md" />
                        <div className="h-full bg-slate-50 dark:bg-gray-800/30 rounded-2xl w-full border border-dashed border-slate-200 dark:border-gray-700" />
                    </div>
                </div>
            </div>
        </div>
    );
}
