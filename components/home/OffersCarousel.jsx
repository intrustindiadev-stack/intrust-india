'use client';

import { motion } from 'framer-motion';
import { Gift, Zap, Smartphone, CreditCard, ArrowRight, ChevronRight, ChevronLeft, Star } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';

export default function OffersCarousel() {
    const scrollContainerRef = useRef(null);

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = window.innerWidth < 768 ? window.innerWidth * 0.8 : 420;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const offers = [
        {
            id: 1,
            category: 'LIMITED TIME',
            title: 'Free 5GB Data',
            subtitle: 'On Plans ₹299+',
            tagLine: 'Jio • Airtel • Vi',
            bg: 'bg-[#171A21]',
            text: 'text-white',
            accent: 'bg-emerald-400',
            icon: Smartphone,
            link: '/services/recharge'
        },
        {
            id: 2,
            category: 'FLASH SALE',
            title: '100% Cashback',
            subtitle: 'Electricity Bills',
            tagLine: 'Win every hour',
            bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
            text: 'text-[#171A21]',
            accent: 'bg-blue-500',
            icon: Zap,
            link: '/services/electricity'
        },
        {
            id: 3,
            category: 'BEST SELLER',
            title: 'Flat 12% Off',
            subtitle: 'Gift Cards',
            tagLine: 'Amazon • Flipkart',
            bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
            text: 'text-[#171A21]',
            accent: 'bg-[#0052CC]',
            icon: Gift,
            link: '/gift-cards'
        },
        {
            id: 4,
            category: 'PREMIUM',
            title: 'Zero Fees',
            subtitle: 'Credit Cards',
            tagLine: 'Instant Settlement',
            bg: 'bg-gradient-to-br from-rose-50 to-orange-50',
            text: 'text-[#171A21]',
            accent: 'bg-[#E02424]',
            icon: CreditCard,
            link: '/services/credit-card'
        },
    ];

    return (
        <section className="py-16 md:py-24 bg-white relative overflow-hidden font-[family-name:var(--font-outfit)]">

            <div className="container mx-auto px-6 relative z-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div className="text-left max-w-xl">
                        <h2 className="text-3xl md:text-5xl font-bold text-[#171A21] tracking-tight mb-3">
                            Exclusive Offers
                        </h2>
                        <p className="text-[#617073] text-lg font-light leading-relaxed">
                            Premium rewards curated for your lifestyle.
                        </p>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="hidden md:flex gap-3">
                        <button
                            onClick={() => scroll('left')}
                            className="p-4 rounded-full border border-gray-100 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 active:scale-95"
                            aria-label="Scroll left"
                        >
                            <ChevronLeft size={24} className="text-[#171A21]" strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="p-4 rounded-full border border-gray-100 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 active:scale-95"
                            aria-label="Scroll right"
                        >
                            <ChevronRight size={24} className="text-[#171A21]" strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                {/* Carousel */}
                <div
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto gap-6 pb-12 -mx-6 px-6 md:mx-0 md:px-0 snap-x snap-mandatory scrollbar-hide scroll-smooth"
                    style={{ scrollPaddingLeft: '0' }}
                >
                    {offers.map((offer) => (
                        <motion.div
                            key={offer.id}
                            whileHover={{ y: -8 }}
                            className="snap-center shrink-0 w-[85vw] md:w-[400px]"
                        >
                            <Link href={offer.link} className="block h-full">
                                <div className={`
                                    relative h-[280px] rounded-[2rem] p-8
                                    ${offer.bg} ${offer.text}
                                    shadow-sm hover:shadow-xl hover:shadow-blue-900/5
                                    transition-all duration-500
                                    overflow-hidden flex flex-col justify-between
                                    border border-black/5
                                `}>

                                    {/* Abstract Art Background */}
                                    <div className="absolute right-0 top-0 w-2/3 h-full opacity-[0.08] pointer-events-none">
                                        <offer.icon className="w-full h-full -rotate-12 scale-150 translate-x-12 -translate-y-8" />
                                    </div>

                                    {/* Top Tag */}
                                    <div className="relative z-10">
                                        <span className={`
                                            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider
                                            ${offer.text === 'text-white' ? 'bg-white/20 text-white backdrop-blur-sm' : 'bg-white text-[#171A21] shadow-sm'}
                                        `}>
                                            <Star size={10} fill="currentColor" /> {offer.category}
                                        </span>
                                    </div>

                                    {/* Main Info */}
                                    <div className="relative z-10 mt-auto">
                                        <h3 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight leading-none">
                                            {offer.title}
                                        </h3>
                                        <p className="text-lg opacity-80 font-medium mb-6">
                                            {offer.subtitle}
                                        </p>

                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold opacity-70 uppercase tracking-widest">
                                                {offer.tagLine}
                                            </span>
                                            <div className={`
                                                w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110
                                                ${offer.text === 'text-white' ? 'bg-white text-black' : 'bg-[#171A21] text-white'}
                                            `}>
                                                <ArrowRight size={20} />
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </Link>
                        </motion.div>
                    ))}

                    {/* View All Card */}
                    <div className="snap-center shrink-0 w-[200px] flex items-center justify-center">
                        <Link
                            href="/offers"
                            className="
                                group w-full h-[280px] rounded-[2rem] 
                                bg-gray-50 border-2 border-dashed border-gray-200 
                                flex flex-col items-center justify-center gap-4 
                                text-gray-400 hover:border-gray-400 hover:text-[#171A21] 
                                transition-all duration-300
                            "
                        >
                            <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ArrowRight size={24} />
                            </div>
                            <span className="font-bold text-sm tracking-widest uppercase">View All</span>
                        </Link>
                    </div>
                </div>

            </div>
        </section>
    );
}
