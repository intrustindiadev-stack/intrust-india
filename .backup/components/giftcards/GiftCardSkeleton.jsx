'use client';

export default function GiftCardSkeleton() {
    return (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm h-full flex flex-col animate-pulse">
            {/* Card Header Skeleton */}
            <div className="relative h-44 bg-gray-200">
                {/* Brand Logo Skeleton */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white rounded-xl" />
                </div>

                {/* Discount Badge Skeleton */}
                <div className="absolute top-3 left-3 w-16 h-7 bg-white/50 rounded-lg" />
            </div>

            {/* Card Body Skeleton */}
            <div className="p-6 flex-1 flex flex-col">
                {/* Brand Name */}
                <div className="h-6 w-32 bg-gray-200 rounded mb-2" />

                {/* Verified Tag */}
                <div className="h-4 w-24 bg-gray-100 rounded mb-auto" />

                {/* Price Section */}
                <div className="mt-6 space-y-2">
                    <div className="flex items-baseline gap-2">
                        <div className="h-8 w-24 bg-gray-200 rounded" />
                        <div className="h-5 w-16 bg-gray-200 rounded" />
                    </div>
                    <div className="h-4 w-20 bg-gray-100 rounded" />
                </div>

                {/* Button Skeleton */}
                <div className="h-11 bg-gray-200 rounded-lg mt-6 w-full" />
            </div>
        </div>
    );
}
