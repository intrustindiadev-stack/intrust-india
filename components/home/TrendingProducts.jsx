'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, ArrowRight, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';

// Fallback static products in case DB fetch fails
const FALLBACK_PRODUCTS = [
    {
        id: '039ef7ed',
        title: 'Adidas Sneaker',
        category: 'Fashion',
        suggested_retail_price_paise: 296299,
        mrp_paise: 299900,
        product_images: ['https://bhgbylyzlwmmabegxlfc.supabase.co/storage/v1/object/public/product-images/merchant/e942151a-4026-4488-8cd3-edbe6d679460/1775556668138_0a5sg.jpeg'],
        slug: 'adidas-sneaker',
    },
    {
        id: 'a37b56da',
        title: 'Vaseline Intensive Care Lotion 400ml',
        category: 'Beauty',
        suggested_retail_price_paise: 29500,
        mrp_paise: 29900,
        product_images: ['https://bhgbylyzlwmmabegxlfc.supabase.co/storage/v1/object/public/product-images/admin/1775019590842_96zav.jpg'],
        slug: 'vaseline-intensive-care-lotion-400ml',
    },
    {
        id: '5963720f',
        title: 'Kohinoor Charminar Basmati 5kg',
        category: 'Groceries',
        suggested_retail_price_paise: 34500,
        mrp_paise: 35000,
        product_images: ['https://bhgbylyzlwmmabegxlfc.supabase.co/storage/v1/object/public/product-images/admin/1775709258168_u6lz9.jpg'],
        slug: 'kohinoor-charminar-basmati-5kg',
    },
    {
        id: '7e8aecef',
        title: 'Lakme Sun Expert SPF 50 60ml',
        category: 'Beauty',
        suggested_retail_price_paise: 30500,
        mrp_paise: 31000,
        product_images: ['https://bhgbylyzlwmmabegxlfc.supabase.co/storage/v1/object/public/product-images/admin/1774955174468_gxdeq8.jpg'],
        slug: 'lakme-sun-expert-spf-50-60ml',
    },
];

function formatPrice(paise) {
    return (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function ProductCard({ product, index }) {
    const [added, setAdded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const discount = product.mrp_paise > product.suggested_retail_price_paise
        ? Math.round((1 - product.suggested_retail_price_paise / product.mrp_paise) * 100)
        : 0;

    const handleAdd = (e) => {
        e.preventDefault();
        setAdded(true);
        setTimeout(() => setAdded(false), 1800);
    };

    const imageUrl = product.product_images?.[0] || null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="snap-center shrink-0 w-[62vw] sm:w-[220px]"
        >
            <Link
                href={`/shop/product/${product.slug}`}
                className="
                    group block rounded-2xl overflow-hidden border
                    bg-[var(--card-bg)] border-[var(--border-color)]
                    hover:shadow-xl hover:-translate-y-1
                    transition-all duration-300 active:scale-[0.98]
                "
            >
                {/* Product Image */}
                <div className="relative h-44 bg-[var(--bg-secondary)] overflow-hidden">
                    {imageUrl && !imgError ? (
                        <Image
                            src={imageUrl}
                            alt={product.title}
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 62vw, 220px"
                            className="object-contain p-3 group-hover:scale-105 transition-transform duration-500"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                            🛍️
                        </div>
                    )}

                    {/* Discount chip */}
                    {discount > 0 && (
                        <span className="
                            absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full
                            text-[10px] font-bold bg-rose-500 text-white
                        ">
                            -{discount}%
                        </span>
                    )}
                </div>

                {/* Info */}
                <div className="p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                        style={{ color: 'var(--text-secondary)' }}>
                        {product.category}
                    </p>
                    <h3 className="text-sm font-semibold leading-snug mb-3 line-clamp-2"
                        style={{ color: 'var(--text-primary)' }}>
                        {product.title}
                    </h3>

                    {/* Price row */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                ₹{formatPrice(product.suggested_retail_price_paise)}
                            </span>
                            {discount > 0 && (
                                <span className="ml-1.5 text-[11px] line-through"
                                    style={{ color: 'var(--text-secondary)' }}>
                                    ₹{formatPrice(product.mrp_paise)}
                                </span>
                            )}
                        </div>

                        <button
                            onClick={handleAdd}
                            aria-label="Add to cart"
                            className={`
                                w-8 h-8 rounded-full flex items-center justify-center shrink-0
                                transition-all duration-300 active:scale-90
                                ${added
                                    ? 'bg-emerald-500 text-white scale-110'
                                    : 'bg-[#171A21] dark:bg-[#92BCEA] text-white dark:text-[#171A21]'
                                }
                            `}
                        >
                            <ShoppingCart size={14} strokeWidth={2} />
                        </button>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

export default function TrendingProducts() {
    const scrollRef = useRef(null);
    const [products, setProducts] = useState(FALLBACK_PRODUCTS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const { data, error } = await supabase
                    .from('shopping_products')
                    .select('id, title, category, suggested_retail_price_paise, mrp_paise, product_images, slug, admin_stock')
                    .eq('is_active', true)
                    .is('deleted_at', null)
                    .not('product_images', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(16);

                if (error || !data?.length) return;

                const filtered = data
                    .filter(p => p.product_images?.length > 0)
                    .slice(0, 8);

                if (filtered.length >= 4) setProducts(filtered);
            } catch {
                // silently fall back to static data
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const scroll = (dir) => {
        if (!scrollRef.current) return;
        const amount = window.innerWidth < 640 ? window.innerWidth * 0.65 : 240;
        scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
    };

    return (
        <section
            className="py-14 md:py-20 font-[family-name:var(--font-outfit)]"
            style={{ background: 'var(--bg-primary)' }}
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6">

                {/* Header row */}
                <div className="flex items-end justify-between mb-7">
                    <motion.div
                        initial={{ opacity: 0, x: -16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-rose-500 mb-2">
                            <Flame size={13} /> Trending Now
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight"
                            style={{ color: 'var(--text-primary)' }}>
                            Trending Products
                        </h2>
                    </motion.div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => scroll('left')}
                            className="
                                hidden md:flex w-9 h-9 rounded-full items-center justify-center
                                border border-[var(--border-color)] bg-[var(--card-bg)]
                                hover:bg-[#171A21] hover:text-white dark:hover:bg-[#92BCEA] dark:hover:text-[#171A21]
                                transition-all duration-200 active:scale-95
                            "
                            aria-label="Scroll left"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="
                                hidden md:flex w-9 h-9 rounded-full items-center justify-center
                                border border-[var(--border-color)] bg-[var(--card-bg)]
                                hover:bg-[#171A21] hover:text-white dark:hover:bg-[#92BCEA] dark:hover:text-[#171A21]
                                transition-all duration-200 active:scale-95
                            "
                            aria-label="Scroll right"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            <ChevronRight size={16} />
                        </button>

                        <Link
                            href="/shop"
                            className="flex items-center gap-1 text-xs font-bold text-[#92BCEA] hover:text-[#7A93AC] transition-colors"
                        >
                            View All <ArrowRight size={13} />
                        </Link>
                    </div>
                </div>

                {/* Skeleton loading state */}
                {loading ? (
                    <div className="flex gap-4 overflow-hidden">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="shrink-0 w-[62vw] sm:w-[220px] rounded-2xl border border-[var(--border-color)] overflow-hidden"
                            >
                                <div className="h-44 bg-[var(--bg-secondary)] animate-pulse" />
                                <div className="p-3.5 space-y-2">
                                    <div className="h-2.5 w-1/3 rounded bg-[var(--bg-secondary)] animate-pulse" />
                                    <div className="h-3.5 w-3/4 rounded bg-[var(--bg-secondary)] animate-pulse" />
                                    <div className="h-3.5 w-1/2 rounded bg-[var(--bg-secondary)] animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div
                        ref={scrollRef}
                        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar scroll-smooth"
                    >
                        {products.map((p, i) => (
                            <ProductCard key={p.id} product={p} index={i} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
