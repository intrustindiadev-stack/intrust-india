'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Clock } from 'lucide-react';
import { IS_MARKETING_COMING_SOON } from '@/lib/marketingConfig';

/**
 * Marketing Hub redirect banner for the customer dashboard.
 * Renders the pre-designed poster from /banners/marketinghub.png - clean CTA, no KPIs.
 */
export default function MarketingHubBanner() {
    return (
        <section className="w-full flex justify-center">
            <Link
                href="/marketing"
                aria-label="Visit the InTrust Marketing Hub"
                className="group relative block w-full max-w-[440px] sm:max-w-[480px] overflow-hidden rounded-3xl border border-blue-500/20 dark:border-white/10 shadow-xs hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-300"
            >
                <Image
                    src="/banners/marketinghub.png"
                    alt="InTrust Marketing Hub - Play, participate and earn rewards with daily challenges, streaks, shared deals and free gifts"
                    width={1024}
                    height={1536}
                    sizes="(max-width: 640px) 100vw, 480px"
                    className="w-full h-auto select-none"
                    draggable={false}
                />

                {/* Overlay CTA (visual only - the whole card is already the link) */}
                <span className="absolute inset-x-0 bottom-4 sm:bottom-6 flex justify-center px-4">
                    <span className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white text-slate-900 font-black text-sm sm:text-base shadow-lg border border-slate-200/60 transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
                        {IS_MARKETING_COMING_SOON ? (
                            <>
                                Marketing Hub — Coming Soon
                                <Clock size={16} className="text-amber-500" />
                            </>
                        ) : (
                            <>
                                Visit Marketing Hub
                                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                            </>
                        )}
                    </span>
                </span>
            </Link>
        </section>
    );
}