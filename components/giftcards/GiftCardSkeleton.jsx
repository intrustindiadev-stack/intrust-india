'use client';

export default function GiftCardSkeleton() {
    return (
        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 h-full flex flex-col animate-pulse">
            {/* Card Header Skeleton */}
            <div className="relative h-48 bg-gradient-to-br from-gray-200 to-gray-300">
                {/* Brand Logo Skeleton */}
                <div className="absolute top-4 left-4 w-14 h-14 bg-white/50 rounded-2xl" />

                {/* Favorite Button Skeleton */}
                <div className="absolute top-4 right-4 w-10 h-10 bg-white/50 rounded-full" />

                {/* Discount Badge Skeleton */}
                <div className="absolute top-16 right-4 w-16 h-6 bg-white/50 rounded-full" />

                {/* Brand Name Skeleton */}
                <div className="absolute bottom-4 right-4 w-24 h-6 bg-white/50 rounded" />
            </div>

            {/* Card Body Skeleton */}
            <div className="p-5 flex-1 flex flex-col">
                {/* Price Section Skeleton */}
                <div className="flex items-baseline justify-between mb-4">
                    <div>
                        <div className="h-3 w-16 bg-gray-200 rounded mb-1" />
                        <div className="h-8 w-20 bg-gray-300 rounded" />
                    </div>
                    <div className="text-right">
                        <div className="h-4 w-16 bg-gray-200 rounded" />
                    </div>
                </div>

                {/* Merchant Info Skeleton */}
                <div className="pb-4 border-b border-gray-100 mb-4">
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-32 bg-gray-200 rounded" />
                </div>

                {/* Button Skeleton */}
                <div className="h-12 bg-gray-300 rounded-2xl mt-auto" />
            </div>
        </div>
    );
}
