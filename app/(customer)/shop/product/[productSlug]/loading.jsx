export default function ProductDetailLoading() {
    return (
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-6">
            {/* Back Button Skeleton */}
            <div className="h-5 w-16 bg-surface-container-high rounded-full animate-pulse mb-4" />

            {/* Breadcrumb Skeleton */}
            <div className="flex items-center gap-2 mb-6">
                <div className="h-3 w-8 bg-surface-container-high rounded animate-pulse" />
                <div className="h-3 w-3 bg-surface-container rounded animate-pulse" />
                <div className="h-3 w-16 bg-surface-container-high rounded animate-pulse" />
                <div className="h-3 w-3 bg-surface-container rounded animate-pulse" />
                <div className="h-3 w-24 bg-surface-container-high rounded animate-pulse" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-14">
                {/* Left: Product Image Skeleton */}
                <div className="lg:col-span-6">
                    <div className="aspect-[4/3] sm:aspect-square bg-surface-container-lowest rounded-2xl sm:rounded-[2rem] border border-outline-variant/20 animate-pulse flex items-center justify-center">
                        <div className="w-1/2 h-1/2 rounded-2xl bg-surface-container-high" />
                    </div>
                    {/* Thumbnail Strip Skeleton */}
                    <div className="flex gap-2 mt-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-14 h-14 rounded-xl bg-surface-container-high animate-pulse" />
                        ))}
                    </div>
                </div>

                {/* Right: Product Info Skeleton */}
                <div className="lg:col-span-6 flex flex-col gap-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <div className="h-8 w-4/5 bg-surface-container-high rounded-xl animate-pulse" />
                        <div className="h-4 w-full bg-surface-container rounded-lg animate-pulse" />
                        <div className="h-4 w-3/5 bg-surface-container rounded-lg animate-pulse" />
                    </div>

                    {/* Pricing Box */}
                    <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-surface-container-lowest border border-outline-variant/20 space-y-3 animate-pulse">
                        <div className="flex items-end gap-3">
                            <div className="h-9 w-32 bg-surface-container-high rounded-lg" />
                            <div className="h-5 w-20 bg-surface-container rounded-lg" />
                        </div>
                        <div className="h-6 w-36 bg-surface-container rounded-lg" />
                    </div>

                    {/* Desktop Buttons */}
                    <div className="hidden sm:flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-[126px] h-12 bg-surface-container-high rounded-xl animate-pulse" />
                            <div className="flex-1 h-12 bg-surface-container-high rounded-xl animate-pulse" />
                        </div>
                        <div className="w-full h-12 bg-surface-container-high rounded-xl animate-pulse" />
                    </div>

                    {/* Merchant Info Box */}
                    <div className="p-3 sm:p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-lg bg-surface-container-high" />
                            <div className="space-y-1.5">
                                <div className="h-2.5 w-12 bg-surface-container-high rounded" />
                                <div className="h-4 w-24 bg-surface-container-high rounded" />
                            </div>
                        </div>
                        <div className="h-5 w-16 bg-surface-container-high rounded" />
                    </div>
                </div>
            </div>
        </div>
    );
}
