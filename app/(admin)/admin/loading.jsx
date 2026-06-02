export default function AdminLoading() {
    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto w-full animate-pulse font-[family-name:var(--font-outfit)] min-h-screen bg-[#f8f9fb]">
            {/* Header Skeleton */}
            <div className="mb-8 md:mb-10">
                <div className="h-6 w-32 bg-slate-200 rounded-full mb-3"></div>
                <div className="h-12 w-80 bg-slate-200 rounded-2xl mb-4"></div>
                <div className="h-5 w-3/4 max-w-md bg-slate-200 rounded-xl"></div>
            </div>

            {/* Top Stats Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-white rounded-3xl border border-slate-100 p-6 flex flex-col justify-between shadow-sm">
                        <div className="flex justify-between items-start">
                            <div className="h-12 w-12 bg-slate-100 rounded-2xl"></div>
                        </div>
                        <div className="space-y-2 mt-auto">
                            <div className="h-7 w-24 bg-slate-200 rounded-xl"></div>
                            <div className="h-4 w-16 bg-slate-100 rounded-lg"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Large Chart/Table Area */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                        <div className="h-6 w-48 bg-slate-200 rounded-xl"></div>
                        <div className="flex gap-2">
                            <div className="h-8 w-20 bg-slate-100 rounded-xl"></div>
                            <div className="h-8 w-20 bg-slate-100 rounded-xl"></div>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-slate-100 rounded-xl shrink-0"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 w-32 sm:w-48 bg-slate-200 rounded-lg"></div>
                                        <div className="h-3 w-20 sm:w-24 bg-slate-100 rounded-md"></div>
                                    </div>
                                </div>
                                <div className="h-6 w-16 bg-slate-100 rounded-lg hidden sm:block"></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Secondary Sidebar Area */}
                <div className="space-y-6 md:space-y-8">
                    <div className="h-72 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                        <div className="h-6 w-32 bg-slate-200 rounded-xl mb-8"></div>
                        <div className="flex justify-center mb-6">
                            <div className="h-32 w-32 bg-slate-100 rounded-full"></div>
                        </div>
                        <div className="flex justify-center gap-4">
                            <div className="h-4 w-16 bg-slate-100 rounded-lg"></div>
                            <div className="h-4 w-16 bg-slate-100 rounded-lg"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
