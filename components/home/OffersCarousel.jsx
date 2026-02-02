'use client';

import { motion } from 'framer-motion';
import { Gift, Zap, Smartphone, CreditCard, ArrowRight, ChevronRight, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';

export default function OffersCarousel() {
    const scrollContainerRef = useRef(null);

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = 350; // Card width approx
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const systemOffers = [
        {
            category: 'Recharge & Bills',
            title: '100% Cashback',
            subtitle: 'On Electricity Bill',
            desc: 'Pay your utility bills via InTrust and stand a chance to win.',
            bg: 'bg-blue-50',
            accent: 'text-blue-600',
            icon: Zap,
            link: '/services/electricity'
        },
        {
            category: 'Gift Cards',
            title: 'Flat 12% Off',
            subtitle: 'On Amazon Pay',
            desc: 'Instant delivery. Use for shopping, bills, and more.',
            bg: 'bg-purple-50',
            accent: 'text-purple-600',
            icon: Gift,
            link: '/gift-cards'
        },
        {
            category: 'Mobile Prepaid',
            title: 'Data Booster',
            subtitle: 'Free 5GB Data',
            desc: 'On recharges above ₹299. Valid for Jio & Airtel.',
            bg: 'bg-emerald-50',
            accent: 'text-emerald-600',
            icon: Smartphone,
            link: '/services/recharge'
        },
        {
            category: 'Credit Card',
            title: 'No Platform Fee',
            subtitle: 'Pay Your Bills',
            desc: 'Instant settlement. No hidden charges. 1% Reward points.',
            bg: 'bg-rose-50',
            accent: 'text-rose-600',
            icon: CreditCard,
            link: '/services/credit-card'
        },
        {
            category: 'DTH Recharge',
            title: '2 Months Free',
            subtitle: 'HD Pack Offer',
            desc: 'Recharge for 12 months and get 2 months extra validity.',
            bg: 'bg-orange-50',
            accent: 'text-orange-600',
            icon: Zap,
            link: '/services/dth'
        },
    ];

    return (
        <section className="py-20 bg-white font-[family-name:var(--font-outfit)] border-t border-slate-50">
            <div className="w-full max-w-7xl mx-auto px-4 md:px-6">

                {/* Header with Controls */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">
                            Curated For You
                        </h2>
                        <p className="text-slate-500">Exclusive offers on payments & rewards</p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => scroll('left')}
                            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
                            aria-label="Scroll Left"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
                            aria-label="Scroll Right"
                        >
                            <ChevronRight size={20} />
                        </button>
                        <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block" />
                        <Link href="/services" className="hidden md:flex items-center gap-1 font-semibold text-blue-600 hover:gap-2 transition-all">
                            View All <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>

                {/* Swiper Container */}
                <div
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto pb-8 -mx-4 px-4 md:mx-0 md:px-0 gap-5 snap-x snap-mandatory scrollbar-hide scroll-smooth"
                >
                    {systemOffers.map((offer, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.05 }}
                            className="snap-start shrink-0 w-[85%] sm:w-[320px] md:w-[350px]"
                        >
                            <Link href={offer.link} className="block h-full group">
                                <div className={`h-full ${offer.bg} rounded-[1.5rem] p-6 transition-all duration-300 border border-transparent hover:border-black/5 hover:shadow-lg relative overflow-hidden`}>

                                    {/* Icon & Category */}
                                    <div className="flex justify-between items-start mb-6 z-10 relative">
                                        <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm ${offer.accent}`}>
                                            <offer.icon size={20} strokeWidth={2.5} />
                                        </div>
                                        <span className={`px-2.5 py-1 bg-white/60 backdrop-blur-sm rounded-lg text-[10px] font-bold uppercase tracking-wider ${offer.accent}`}>
                                            {offer.category}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="z-10 relative">
                                        <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">
                                            {offer.title}
                                        </h3>
                                        <p className={`font-bold text-lg mb-3 ${offer.accent}`}>{offer.subtitle}</p>
                                        <p className="text-slate-600 text-sm font-medium leading-relaxed mb-6 opacity-80">
                                            {offer.desc}
                                        </p>
                                    </div>

                                    {/* Link Text */}
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 z-10 relative">
                                        Claim Now <ArrowRight size={16} className={`group-hover:translate-x-1 transition-transform ${offer.accent}`} />
                                    </div>

                                    {/* Hover Gradient Overlay */}
                                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity z-0" />
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>

            </div>
        </section>
    );
}
