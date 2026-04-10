'use client';

// Skeleton placeholder matching the ProductCardV2 layout
// Rendered while syncCartFromDB / syncWishlistFromDB are resolving in StorefrontV2Client
export default function ProductCardSkeleton() {
    return (
        <div className="relative flex flex-col h-full rounded-2xl overflow-hidden border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-[#12151c] shadow-sm animate-pulse">

            {/* Discount badge placeholder */}
            <div className="absolute top-0 left-0 h-6 w-12 rounded-br-xl bg-slate-200 dark:bg-slate-700/60 z-10" />

            {/* Image area */}
            <div className="w-full aspect-square bg-slate-100 dark:bg-[#0c0e14] flex items-center justify-center">
                <div className="w-[85%] h-[85%] rounded-xl bg-slate-200 dark:bg-slate-700/40" />
            </div>

            {/* Body */}
            <div className="flex flex-col flex-1 p-2 md:p-3 gap-2">
                {/* Brand / title lines */}
                <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700/50" />
                <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-700/60" />
                <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700/50" />
                <div className="flex-1" />
                {/* Price line */}
                <div className="h-5 w-1/3 rounded bg-slate-200 dark:bg-slate-700/60" />
            </div>

            {/* Action bar */}
            <div className="p-2 border-t border-slate-100 dark:border-white/[0.04]">
                <div className="h-9 md:h-10 w-full rounded-xl bg-slate-200 dark:bg-slate-700/40" />
            </div>
        </div>
    );
}
