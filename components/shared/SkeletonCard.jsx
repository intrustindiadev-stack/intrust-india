'use client';

/**
 * SkeletonCard — Contextual skeleton presets for internal panels.
 *
 * Usage:
 *   <SkeletonCard type="stat" />
 *   <SkeletonCard type="list-item" />
 *   <SkeletonCard type="table-row" />
 *   <SkeletonCard type="id-card" />
 *   <SkeletonCard type="quick-action" />
 */

const shimmer = 'bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.6s_ease-in-out_infinite]';

function Bone({ className = '' }) {
    return <div className={`rounded-xl ${shimmer} ${className}`} />;
}

export function SkeletonStatCard() {
    return (
        <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-gray-200/40 space-y-4">
            <div className="flex justify-between items-start">
                <Bone className="w-12 h-12 rounded-[1rem]" />
                <Bone className="w-14 h-5 rounded-full" />
            </div>
            <Bone className="w-24 h-3" />
            <Bone className="w-20 h-9" />
        </div>
    );
}

export function SkeletonListItem({ count = 1 }) {
    return (
        <>
            {[...Array(count)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                    <Bone className="w-10 h-10 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Bone className="h-4 w-2/5" />
                        <Bone className="h-3 w-1/4" />
                    </div>
                    <Bone className="w-16 h-6 rounded-full shrink-0" />
                </div>
            ))}
        </>
    );
}

export function SkeletonTableRow({ cols = 5, count = 4 }) {
    return (
        <>
            {[...Array(count)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
                    {[...Array(cols)].map((_, j) => (
                        <Bone key={j} className={`h-4 ${j === 0 ? 'w-8' : j === 1 ? 'flex-1' : 'w-20'}`} />
                    ))}
                </div>
            ))}
        </>
    );
}

export function SkeletonIDCard() {
    return (
        <div className="w-[320px] bg-gradient-to-br from-gray-200 to-gray-300 rounded-[2rem] p-8 space-y-4 shadow-xl">
            <div className="flex justify-between">
                <Bone className="w-24 h-8 rounded-xl" />
                <Bone className="w-8 h-8 rounded-xl" />
            </div>
            <div className="flex flex-col items-center gap-3 py-4">
                <Bone className="w-24 h-24 rounded-full" />
                <Bone className="w-32 h-5" />
                <Bone className="w-20 h-3" />
            </div>
            <div className="space-y-2">
                <Bone className="w-full h-3" />
                <Bone className="w-3/4 h-3" />
            </div>
            <Bone className="w-24 h-24 rounded-xl mx-auto" />
        </div>
    );
}

export function SkeletonQuickAction({ count = 6 }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="bg-white rounded-[1.5rem] p-5 space-y-3 shadow-sm">
                    <Bone className="w-10 h-10 rounded-[1rem]" />
                    <Bone className="w-16 h-3" />
                    <Bone className="w-12 h-3" />
                </div>
            ))}
        </div>
    );
}

// Default export with type prop
export default function SkeletonCard({ type = 'stat', count, cols }) {
    switch (type) {
        case 'stat': return <SkeletonStatCard />;
        case 'list-item': return <SkeletonListItem count={count} />;
        case 'table-row': return <SkeletonTableRow count={count} cols={cols} />;
        case 'id-card': return <SkeletonIDCard />;
        case 'quick-action': return <SkeletonQuickAction count={count} />;
        default: return <div className={`rounded-2xl ${shimmer} h-24`} />;
    }
}
