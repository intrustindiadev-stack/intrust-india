export default function MerchantLoading() {
    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto w-full animate-pulse font-[family-name:var(--font-outfit)]">
            {/* Header Skeleton */}
            <div className="mb-8 md:mb-12">
                <div className="h-12 w-64 bg-slate-200 dark:bg-slate-800/60 rounded-2xl mb-4"></div>
                <div className="h-5 w-3/4 max-w-md bg-slate-100 dark:bg-slate-800/40 rounded-xl"></div>
            </div>

            {/* Top Cards Skeleton Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-36 bg-white dark:bg-[#1a1c23]/40 rounded-[2rem] border border-slate-100 dark:border-white/5 p-6 flex flex-col justify-between shadow-sm">
                        <div className="flex justify-between items-start">
                            <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800/50 rounded-2xl"></div>
                            <div className="h-6 w-16 bg-slate-50 dark:bg-slate-800/30 rounded-xl"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800/60 rounded-xl"></div>
                            <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800/40 rounded-lg"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Large Chart/List Area */}
                <div className="lg:col-span-2 bg-white dark:bg-[#1a1c23]/40 rounded-[2rem] border border-slate-100 dark:border-white/5 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div className="h-6 w-40 bg-slate-200 dark:bg-slate-800/60 rounded-xl"></div>
                        <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800/40 rounded-xl"></div>
                    </div>
                    
                    <div className="space-y-6">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800/50 rounded-2xl shrink-0"></div>
                                <div className="flex-1 space-y-2.5">
                                    <div className="h-5 w-full max-w-[250px] bg-slate-200 dark:bg-slate-800/60 rounded-xl"></div>
                                    <div className="h-4 w-full max-w-[150px] bg-slate-100 dark:bg-slate-800/40 rounded-lg"></div>
                                </div>
                                <div className="h-8 w-20 bg-slate-100 dark:bg-slate-800/40 rounded-xl shrink-0 hidden sm:block"></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar/Secondary Area */}
                <div className="space-y-6">
                    <div className="h-64 bg-white dark:bg-[#1a1c23]/40 rounded-[2rem] border border-slate-100 dark:border-white/5 p-6 shadow-sm flex flex-col items-center justify-center gap-4">
                        <div className="h-24 w-24 bg-slate-100 dark:bg-slate-800/50 rounded-full"></div>
                        <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800/60 rounded-xl"></div>
                        <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800/40 rounded-lg"></div>
                    </div>
                    
                    <div className="h-48 bg-white dark:bg-[#1a1c23]/40 rounded-[2rem] border border-slate-100 dark:border-white/5 p-6 shadow-sm">
                        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800/60 rounded-xl mb-6"></div>
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-4 w-full bg-slate-100 dark:bg-slate-800/40 rounded-lg"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
