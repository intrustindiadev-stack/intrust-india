'use client';

// Skeleton placeholder matching the MerchantCard layout in ShopHubClient.jsx
// Used during loading / framer-motion stagger: rendered as hidden initial state
export default function MerchantCardSkeleton() {
    return (
        <div className="relative h-full flex flex-col bg-white dark:bg-[#0c0e16] rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-white/[0.04] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            
            {/* Shimmer Overlay */}
            <div className="absolute inset-0 z-30 pointer-events-none" style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
                animation: 'merchant-shimmer 1.5s infinite',
                backgroundSize: '200% 100%'
            }} />
            <style jsx>{`
                @keyframes merchant-shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>

            {/* ── Visual skeleton ── */}
            <div className="relative w-full h-[180px] sm:h-[200px] bg-slate-50 dark:bg-[#13161f]" />

            {/* ── Content skeleton ── */}
            <div className="relative flex flex-col flex-1 px-6 pt-12 pb-6 bg-white dark:bg-[#0c0e16]">
                {/* Floating Avatar skeleton */}
                <div className="absolute -top-10 left-6 z-20">
                    <div className="w-20 h-20 rounded-[1.5rem] bg-slate-200 dark:bg-[#1c212d] shadow-2xl ring-1 ring-black/5 dark:ring-white/10" />
                </div>

                {/* Store Title skeleton */}
                <div className="h-7 w-2/3 rounded-xl bg-slate-200 dark:bg-[#1c212d] mb-4" />
                
                {/* Info row skeleton */}
                <div className="flex gap-2 mb-1">
                    <div className="h-5 w-14 rounded-lg bg-slate-200 dark:bg-[#1c212d]" />
                    <div className="h-5 w-28 rounded-lg bg-slate-200 dark:bg-[#1c212d]" />
                </div>
                
                {/* Detailed info skeleton */}
                <div className="flex gap-3 mt-3">
                    <div className="h-4 w-20 rounded-md bg-slate-100 dark:bg-[#1c212d]" />
                    <div className="h-4 w-20 rounded-md bg-slate-100 dark:bg-[#1c212d]" />
                </div>

                <div className="flex-1" />

                {/* CTA area skeleton */}
                <div className="mt-6">
                    <div className="w-full h-12 rounded-2xl bg-slate-100 dark:bg-[#1c212d]" />
                </div>
            </div>
        </div>
    );
}
