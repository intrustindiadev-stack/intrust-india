'use client';

import { Star } from 'lucide-react';

export default function RatingStars({ rating, totalRatings, size = 12 }) {
    const avg = totalRatings > 0 ? parseFloat(rating) : 0;
    const isNew = totalRatings === 0 || !totalRatings;

    return (
        <div className="flex items-center gap-1.5">
            <div className="flex gap-[1px]">
                {[1, 2, 3, 4, 5].map((star) => (
                    <div key={star} className="relative">
                        <Star size={size} className="text-slate-200 dark:text-slate-800 fill-current" />
                        {star <= avg ? (
                            <Star size={size} className="absolute top-0 left-0 text-[#F59E0B] fill-[#F59E0B]" />
                        ) : star - 0.5 <= avg ? (
                            <div className="absolute top-0 left-0 overflow-hidden" style={{ width: '50%' }}>
                                <Star size={size} className="text-[#F59E0B] fill-[#F59E0B]" />
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
            <span className="text-[11px] font-black text-slate-800 dark:text-white leading-none">
                {isNew ? 'New' : `${avg.toFixed(1)}`}
            </span>
            {!isNew && (
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 leading-none">
                    ({totalRatings})
                </span>
            )}
        </div>
    );
}
