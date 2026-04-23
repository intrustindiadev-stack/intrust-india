'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Tag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';

// Fallback brands seeded from real DB data
const FALLBACK_BRANDS = [
    {
        brand: 'Amazon',
        image_url: 'https://bhgbylyzlwmmabegxlfc.supabase.co/storage/v1/object/public/gift-cards/giftcard_1771957430032_bxssld.png',
        min_price: 27847,
        max_face: 200000,
        color: '#FF9900',
        href: '/gift-cards?brand=amazon',
    },
    {
        brand: 'Apple',
        image_url: 'https://bhgbylyzlwmmabegxlfc.supabase.co/storage/v1/object/public/gift-cards/giftcard_1772965220676_80j2s.png',
        min_price: 50000,
        max_face: 500000,
        color: '#1D1D1F',
        href: '/gift-cards?brand=apple',
    },
    {
        brand: 'Netflix',
        image_url: 'https://bhgbylyzlwmmabegxlfc.supabase.co/storage/v1/object/public/gift-cards/giftcard_1771679655860_2de74l.png',
        min_price: 50000,
        max_face: 129900,
        color: '#E50914',
        href: '/gift-cards?brand=netflix',
    },
    {
        brand: 'Zomato',
        image_url: 'https://bhgbylyzlwmmabegxlfc.supabase.co/storage/v1/object/public/gift-cards/giftcard_1773032684399_0x72ad.png',
        min_price: 66690,
        max_face: 100000,
        color: '#E23744',
        href: '/gift-cards?brand=zomato',
    },
    {
        brand: 'Amazon Prime',
        image_url: 'https://bhgbylyzlwmmabegxlfc.supabase.co/storage/v1/object/public/gift-cards/giftcard_1774852466393_qo50xm.png',
        min_price: 37565,
        max_face: 149900,
        color: '#00A8E0',
        href: '/gift-cards?brand=amazon-prime',
    },
    {
        brand: 'Bhima Jewellers',
        image_url: 'https://bhgbylyzlwmmabegxlfc.supabase.co/storage/v1/object/public/gift-cards/giftcard_1774855064721_3ntogj.png',
        min_price: 970000,
        max_face: 5000000,
        color: '#C9A84C',
        href: '/gift-cards?brand=bhima-jewellers',
    },
];

function formatPrice(paise) {
    return (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function BrandCard({ brand, index }) {
    const [imgError, setImgError] = useState(false);
    const discount = brand.min_price < brand.max_face
        ? Math.round((1 - brand.min_price / brand.max_face) * 100)
        : null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.38, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="snap-center shrink-0 w-40 md:w-auto"
        >
            <Link
                href={brand.href}
                className="
                    group block rounded-2xl overflow-hidden border text-center
                    bg-[var(--card-bg)] border-[var(--border-color)]
                    hover:-translate-y-1 hover:shadow-lg
                    transition-all duration-300 active:scale-[0.97]
                "
            >
                {/* Card Image */}
                <div className="relative h-28 bg-[var(--bg-secondary)] overflow-hidden">
                    {brand.image_url && !imgError ? (
                        <Image
                            src={brand.image_url}
                            alt={`${brand.brand} Gift Card`}
                            fill
                            sizes="(max-width: 768px) 160px, 200px"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center text-2xl font-black text-white"
                            style={{ backgroundColor: brand.color }}
                        >
                            {brand.brand.charAt(0)}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="px-3 py-3">
                    <p className="text-sm font-bold leading-tight mb-1"
                        style={{ color: 'var(--text-primary)' }}>
                        {brand.brand}
                    </p>

                    {discount !== null && (
                        <p className="text-[11px] font-semibold mb-2.5"
                            style={{ color: brand.color }}>
                            Up to {discount}% off
                        </p>
                    )}

                    <span
                        className="
                            inline-block w-full py-1.5 rounded-lg text-[11px] font-bold
                            text-white transition-all duration-200
                            group-hover:opacity-90 group-hover:shadow-md
                        "
                        style={{ backgroundColor: brand.color }}
                    >
                        Buy Gift Card
                    </span>
                </div>
            </Link>
        </motion.div>
    );
}

export default function BrandGiftCards() {
    const [brands, setBrands] = useState(FALLBACK_BRANDS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const { data, error } = await supabase
                    .from('coupons')
                    .select('brand, selling_price_paise, face_value_paise, image_url')
                    .eq('status', 'available')
                    .not('brand', 'is', null)
                    .not('image_url', 'is', null)
                    .order('created_at', { ascending: false });

                if (error || !data?.length) return;

                // Group by brand and pick lowest price / first image
                const brandMap = {};
                data.forEach((row) => {
                    const key = row.brand?.trim();
                    if (!key) return;
                    if (!brandMap[key]) {
                        brandMap[key] = {
                            brand: key,
                            image_url: row.image_url,
                            min_price: row.selling_price_paise,
                            max_face: row.face_value_paise,
                            href: `/gift-cards?brand=${encodeURIComponent(key.toLowerCase())}`,
                            color: FALLBACK_BRANDS.find(b => b.brand.toLowerCase() === key.toLowerCase())?.color || '#2563EB',
                        };
                    } else {
                        if (row.selling_price_paise < brandMap[key].min_price) {
                            brandMap[key].min_price = row.selling_price_paise;
                        }
                        if (row.face_value_paise > brandMap[key].max_face) {
                            brandMap[key].max_face = row.face_value_paise;
                        }
                    }
                });

                const result = Object.values(brandMap).slice(0, 8);
                if (result.length >= 3) setBrands(result);
            } catch {
                // silently use fallback
            } finally {
                setLoading(false);
            }
        };

        fetchBrands();
    }, []);

    return (
        <section
            className="py-14 md:py-20 font-[family-name:var(--font-outfit)]"
            style={{ background: 'var(--bg-secondary)' }}
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8"
                >
                    <div>
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#92BCEA] mb-2">
                            <Tag size={12} /> Gift Cards
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight"
                            style={{ color: 'var(--text-primary)' }}>
                            Brand Gift Cards
                        </h2>
                        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Instant delivery. Real savings on top brands.
                        </p>
                    </div>
                    <Link
                        href="/gift-cards"
                        className="flex items-center gap-1.5 text-xs font-bold text-[#92BCEA] hover:text-[#7A93AC] transition-colors shrink-0"
                    >
                        Browse All Cards <ArrowRight size={13} />
                    </Link>
                </motion.div>

                {/* Cards — snap scroll on mobile, grid on md+ */}
                {loading ? (
                    <div className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-3 overflow-hidden">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className="shrink-0 w-40 md:w-auto rounded-2xl border border-[var(--border-color)] overflow-hidden"
                            >
                                <div className="h-28 bg-[var(--bg-primary)] animate-pulse" />
                                <div className="p-3 space-y-2">
                                    <div className="h-3 w-2/3 rounded bg-[var(--bg-primary)] animate-pulse" />
                                    <div className="h-2.5 w-1/2 rounded bg-[var(--bg-primary)] animate-pulse" />
                                    <div className="h-7 rounded-lg bg-[var(--bg-primary)] animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 overflow-x-auto pb-3 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar snap-x snap-mandatory md:snap-none">
                        {brands.map((brand, i) => (
                            <BrandCard key={brand.brand} brand={brand} index={i} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
