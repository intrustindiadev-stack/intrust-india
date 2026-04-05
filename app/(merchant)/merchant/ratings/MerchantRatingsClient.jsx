'use client';

import { useState } from 'react';
import { Star, MessageSquare, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function StarRow({ star, count, total }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-4 text-right">{star}</span>
            <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
            <div className="flex-1 h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-amber-400 rounded-full"
                />
            </div>
            <span className="text-xs font-bold text-slate-400 w-6 text-right">{count}</span>
        </div>
    );
}

function RatingCard({ rating }) {
    const profile = Array.isArray(rating.user_profiles) ? rating.user_profiles[0] : rating.user_profiles;
    const name = profile?.full_name || 'Customer';
    const initials = name.substring(0, 2).toUpperCase();
    const date = new Date(rating.created_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#13161f] rounded-2xl p-4 border border-slate-100 dark:border-white/[0.05] shadow-sm"
        >
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 overflow-hidden">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                        <span className="text-white text-sm font-black">{initials}</span>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{name}</p>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">{date}</span>
                    </div>

                    {/* Stars */}
                    <div className="flex items-center gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map(s => (
                            <Star
                                key={s}
                                size={13}
                                className={s <= rating.rating_value ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}
                            />
                        ))}
                    </div>

                    {rating.feedback_text && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                            "{rating.feedback_text}"
                        </p>
                    )}

                    {/* Phone (private, visible only to merchant) */}
                    {profile?.phone && (
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-600 mt-2">
                            📞 {profile.phone}
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default function MerchantRatingsClient({ ratings, avgRating, totalRatings, distribution }) {
    const [filter, setFilter] = useState(0); // 0 = all

    const filtered = filter === 0 ? ratings : ratings.filter(r => r.rating_value === filter);

    return (
        <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#09090b] p-4 md:p-8">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Customer Ratings</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">See what your customers think about your store.</p>
                </div>

                {/* Summary Card */}
                <div className="bg-white dark:bg-[#13161f] rounded-2xl p-5 border border-slate-100 dark:border-white/[0.05] shadow-sm">
                    {avgRating ? (
                        <div className="flex gap-6 items-center">
                            <div className="text-center shrink-0">
                                <p className="text-5xl font-black text-slate-900 dark:text-white">{avgRating}</p>
                                <div className="flex justify-center gap-0.5 mt-1">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star
                                            key={s}
                                            size={14}
                                            className={s <= Math.round(parseFloat(avgRating)) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}
                                        />
                                    ))}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">{totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}</p>
                            </div>
                            <div className="flex-1 space-y-2">
                                {distribution.map(d => (
                                    <StarRow key={d.star} star={d.star} count={d.count} total={totalRatings} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <Star size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                            <p className="font-bold text-slate-600 dark:text-slate-400">No ratings yet</p>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Ratings will appear here after customers review your store.</p>
                        </div>
                    )}
                </div>

                {/* Filter Tabs */}
                {totalRatings > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {[0, 5, 4, 3, 2, 1].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                    filter === f
                                        ? 'bg-amber-400 text-white border-amber-400 shadow-md shadow-amber-400/30'
                                        : 'bg-white dark:bg-[#13161f] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-amber-300'
                                }`}
                            >
                                {f === 0 ? 'All' : `${f} ★`}
                            </button>
                        ))}
                    </div>
                )}

                {/* Ratings List */}
                <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                        {filtered.length > 0 ? (
                            filtered.map(r => <RatingCard key={r.id} rating={r} />)
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-16 bg-white dark:bg-[#13161f] rounded-2xl border border-slate-100 dark:border-white/[0.05]"
                            >
                                <MessageSquare size={28} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                <p className="font-bold text-slate-500 dark:text-slate-400">No ratings in this category</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </div>
    );
}
