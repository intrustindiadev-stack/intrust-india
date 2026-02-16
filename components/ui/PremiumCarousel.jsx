'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

const slides = [
    {
        id: 1,
        title: 'Get Instant Loans',
        description: 'Quick approval, easy EMI',
        gradient: 'from-[#7A93AC] to-[#92BCEA]',
        icon: '💳',
    },
    {
        id: 2,
        title: 'Gift Cards at Best Prices',
        description: 'Save up to 15% on every purchase',
        gradient: 'from-[#92BCEA] to-[#AFB3F7]',
        icon: '🎁',
    },
    {
        id: 3,
        title: 'Recharge & Bill Payments',
        description: 'Mobile, DTH, Electricity & more',
        gradient: 'from-[#AFB3F7] to-[#7A93AC]',
        icon: '⚡',
    },
    {
        id: 4,
        title: 'Multi-Vendor Marketplace',
        description: 'Shop from verified sellers',
        gradient: 'from-[#617073] to-[#7A93AC]',
        icon: '🛍️',
    },
];

export default function PremiumCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    useEffect(() => {
        if (!isAutoPlaying) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [isAutoPlaying]);

    const goToSlide = (index) => {
        setCurrentIndex(index);
        setIsAutoPlaying(false);
    };

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
        setIsAutoPlaying(false);
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
        setIsAutoPlaying(false);
    };

    return (
        <div
            className="relative w-full max-w-4xl mx-auto"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
        >
            {/* Carousel Container */}
            <div className="relative overflow-hidden rounded-3xl shadow-2xl">
                <div
                    className="flex transition-transform duration-700 ease-out"
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                    {slides.map((slide) => (
                        <div
                            key={slide.id}
                            className={`min-w-full h-64 md:h-80 bg-gradient-to-br ${slide.gradient} p-8 md:p-12 flex flex-col justify-center items-center text-center relative`}
                        >
                            {/* Icon */}
                            <div className="text-6xl md:text-8xl mb-4 animate-float">{slide.icon}</div>

                            {/* Content */}
                            <h3 className="text-2xl md:text-4xl font-bold text-white mb-2 font-[family-name:var(--font-outfit)]">
                                {slide.title}
                            </h3>
                            <p className="text-white/80 text-base md:text-lg">{slide.description}</p>

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Arrows */}
            <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full glass-dark hover:bg-white/20 transition-all hover:scale-110 touch-feedback"
                aria-label="Previous slide"
            >
                <ChevronLeft className="text-white" size={24} />
            </button>

            <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full glass-dark hover:bg-white/20 transition-all hover:scale-110 touch-feedback"
                aria-label="Next slide"
            >
                <ChevronRight className="text-white" size={24} />
            </button>

            {/* Dot Indicators */}
            <div className="flex justify-center gap-2 mt-6">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex
                                ? 'w-8 bg-[#92BCEA]'
                                : 'w-2 bg-white/30 hover:bg-white/50'
                            }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
