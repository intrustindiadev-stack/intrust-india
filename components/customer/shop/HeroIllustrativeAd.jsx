'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function HeroIllustrativeAd() {
    return (
        <section className="bg-gradient-to-r from-blue-700 to-blue-600 max-h-56 overflow-hidden rounded-[2rem] shadow-sm mb-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-4 py-6 md:py-8">
                    {/* LEFT: Text Content */}
                    <div className="min-w-0">
                        <h1 className="text-white text-xl md:text-2xl font-bold leading-tight">
                            Shop Local. Delivered Fast.
                        </h1>
                        <p className="text-blue-100 text-sm mt-1 max-w-md line-clamp-2">
                            Connect with the best merchants in your area. Get fresh groceries, electronics, and daily essentials right at your fingertips.
                        </p>
                        <Link 
                            href="/shop" 
                            className="mt-3 inline-flex items-center gap-2 bg-white text-blue-700 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            Explore Stores
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* RIGHT: Decorative Element */}
                    <div className="hidden md:flex items-center justify-center w-32 lg:w-40">
                        <img 
                            src="/images/ecommerce_shopping_ad.png" 
                            alt="Local Shopping" 
                            className="w-full h-full max-h-40 object-contain drop-shadow-xl" 
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
