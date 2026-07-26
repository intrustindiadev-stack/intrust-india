export default function CustomerDashboardLoadingSkeleton() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 font-[family-name:var(--font-outfit)] flex flex-col">
            <div className="pt-24 sm:pt-32 px-4 sm:px-6 flex-grow">
                <div className="max-w-7xl mx-auto animate-pulse">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-8" />
                    <div className="h-8 sm:h-10 w-64 sm:w-80 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-10" />

                    {/* Stats grid skeleton */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        <div className="h-32 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800/80 rounded-3xl shadow-sm p-6 flex flex-col justify-between">
                            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-8 w-36 bg-blue-500/20 rounded-lg" />
                        </div>
                        <div className="h-32 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800/80 rounded-3xl shadow-sm p-6 flex flex-col justify-between">
                            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-8 w-36 bg-emerald-500/20 rounded-lg" />
                        </div>
                        <div className="h-32 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800/80 rounded-3xl shadow-sm p-6 flex flex-col justify-between">
                            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-8 w-36 bg-amber-500/20 rounded-lg" />
                        </div>
                    </div>

                    {/* Content split skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                        <div className="lg:col-span-2 space-y-8">
                            <div className="h-48 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/80 p-6" />
                            <div className="h-64 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/80 p-6" />
                        </div>
                        <div className="lg:col-span-1 space-y-8">
                            <div className="h-44 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/80 p-6" />
                            <div className="h-52 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/80 p-6" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
