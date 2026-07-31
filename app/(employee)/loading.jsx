import SkeletonCard from '@/components/shared/SkeletonCard';

export default function EmployeeLoadingSkeleton() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Skeleton */}
                <div className="flex justify-between items-center bg-white/80 dark:bg-gray-800/80 p-4 rounded-3xl border border-white/60 dark:border-gray-700 shadow-sm animate-pulse">
                    <div className="h-10 w-48 bg-slate-200 dark:bg-gray-700 rounded-xl" />
                    <div className="h-10 w-32 bg-slate-200 dark:bg-gray-700 rounded-xl" />
                </div>

                {/* Banner Skeleton */}
                <div className="w-full h-64 rounded-[2.5rem] bg-slate-200 dark:bg-gray-800 animate-pulse" />

                {/* Quick Actions Skeleton */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-28 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700" />
                    ))}
                </div>

                {/* Content Cards Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <SkeletonCard type="stat" />
                    </div>
                    <div className="space-y-6">
                        <SkeletonCard type="stat" />
                        <SkeletonCard type="stat" />
                    </div>
                </div>
            </div>
        </div>
    );
}
