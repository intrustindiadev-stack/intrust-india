'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const TESTIMONIALS = [
    {
        id: 1,
        name: 'Ankit Sharma',
        role: 'Retail Business Owner',
        avatar: 'AS',
        avatarColor: 'bg-blue-500',
        rating: 5,
        review:
            'InTrust completely transformed how I run my shop. The NFC cards are incredible — customers just tap and get all my details. My sales have gone up 35% since joining!',
    },
    {
        id: 2,
        name: 'Priya Menon',
        role: 'Freelance Designer',
        avatar: 'PM',
        avatarColor: 'bg-violet-500',
        rating: 5,
        review:
            'The gift card deals are unbeatable. I saved over ₹2,000 last month just on Amazon and Flipkart cards alone. The platform is incredibly easy to use and the UI is super clean.',
    },
    {
        id: 3,
        name: 'Rahul Gupta',
        role: 'College Student',
        avatar: 'RG',
        avatarColor: 'bg-emerald-500',
        rating: 5,
        review:
            'Finally a platform that does everything! Recharges, gift cards, shopping — all in one place. The wallet cashback feature is a lifesaver for someone on a tight budget.',
    },
];

function StarRating({ count = 5 }) {
    return (
        <div className="flex items-center gap-0.5">
            {[...Array(count)].map((_, i) => (
                <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
            ))}
        </div>
    );
}

export default function TestimonialsSection() {
    return (
        <section
            className="py-14 md:py-20 font-[family-name:var(--font-outfit)]"
            style={{ background: 'var(--bg-primary)' }}
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-10 md:mb-14"
                >
                    <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-[#92BCEA] mb-3">
                        Reviews
                    </span>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight"
                        style={{ color: 'var(--text-primary)' }}>
                        Trusted by Thousands
                    </h2>
                    <p className="mt-3 text-sm md:text-base max-w-md mx-auto leading-relaxed"
                        style={{ color: 'var(--text-secondary)' }}>
                        Real stories from merchants and customers who use InTrust every day.
                    </p>
                </motion.div>

                {/* Cards — snap scroll on mobile, 3-col on desktop */}
                <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-6 overflow-x-auto pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar snap-x snap-mandatory md:snap-none">
                    {TESTIMONIALS.map((t, i) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.45, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                            className="snap-center shrink-0 w-[82vw] sm:w-[300px] md:w-auto"
                        >
                            <div className="
                                h-full flex flex-col p-5 md:p-6 rounded-2xl border
                                bg-[var(--card-bg)] border-[var(--border-color)]
                                hover:shadow-lg hover:-translate-y-0.5
                                transition-all duration-300
                            ">
                                {/* Quote icon */}
                                <Quote
                                    size={22}
                                    className="text-[#92BCEA] mb-3 opacity-60"
                                    strokeWidth={1.5}
                                />

                                {/* Review text */}
                                <p className="text-sm leading-relaxed flex-1 mb-5"
                                    style={{ color: 'var(--text-secondary)' }}>
                                    &quot;{t.review}&quot;
                                </p>

                                {/* Footer */}
                                <div className="flex items-center gap-3 pt-4"
                                    style={{ borderTop: '1px solid var(--border-color)' }}>
                                    {/* Avatar */}
                                    <div className={`
                                        w-10 h-10 rounded-full ${t.avatarColor}
                                        flex items-center justify-center shrink-0
                                        text-white text-xs font-bold
                                    `}>
                                        {t.avatar}
                                    </div>

                                    {/* Name + role */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold truncate"
                                            style={{ color: 'var(--text-primary)' }}>
                                            {t.name}
                                        </p>
                                        <p className="text-[11px] truncate"
                                            style={{ color: 'var(--text-secondary)' }}>
                                            {t.role}
                                        </p>
                                    </div>

                                    {/* Stars */}
                                    <StarRating count={t.rating} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Overall rating pill */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    className="flex justify-center mt-8"
                >
                    <div className="
                        inline-flex items-center gap-2 px-5 py-2.5 rounded-full border
                        bg-[var(--card-bg)] border-[var(--border-color)]
                        text-sm font-medium
                    " style={{ color: 'var(--text-secondary)' }}>
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                            ))}
                        </div>
                        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>4.9</span>
                        <span>from 2,400+ reviews</span>
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
