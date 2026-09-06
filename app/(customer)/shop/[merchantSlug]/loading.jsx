export default function StorefrontLoading() {
    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-4 sm:py-6 space-y-6">
            {/* Header Skeleton */}
            <div className="bg-surface-container-lowest rounded-2xl md:rounded-[2rem] border border-outline-variant/30 shadow-sm py-3 px-4 md:px-5 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0 bg-surface-container-high" />
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full shrink-0 bg-surface-container-high" />
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div className="h-5 bg-surface-container-high rounded-full w-1/3" />
                    <div className="h-3 bg-surface-container rounded-full w-1/4" />
                </div>
            </div>

            {/* Banner Skeleton */}
            <div className="w-full h-28 bg-surface-container-high rounded-2xl animate-pulse" />

            {/* Product Grid Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                    <div key={i} className="flex flex-col bg-surface-container-lowest rounded-[2rem] border border-outline-variant/20 p-3 animate-pulse">
                        <div className="w-full aspect-square bg-surface-container-high rounded-[1.5rem] mb-3" />
                        <div className="h-4 bg-surface-container-high rounded-full w-3/4 mb-2 ml-2" />
                        <div className="h-3 bg-surface-container rounded-full w-1/2 mb-4 ml-2" />
                        <div className="flex justify-between items-center mt-auto px-2">
                            <div className="h-5 bg-surface-container-high rounded-full w-1/3" />
                            <div className="w-8 h-8 rounded-full bg-surface-container-high" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
