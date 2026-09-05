'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingBag, Star, ShieldCheck, Plus, Check, ArrowRight, Zap, Store } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

export default function TrendingProductsGrid() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addedId, setAddedId] = useState(null);

    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const { data, error } = await supabase
                    .from('shopping_products')
                    .select(`
                        id,
                        title,
                        slug,
                        description,
                        selling_price,
                        mrp,
                        stock_quantity,
                        images,
                        category,
                        rating,
                        merchant_id,
                        merchants:merchants (
                            id,
                            business_name,
                            slug
                        )
                    `)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(8);

                if (!error && data && data.length > 0) {
                    setProducts(data);
                } else {
                    // Curated real fallback catalog if db is initially fresh
                    setProducts([
                        {
                            id: 'prod-1',
                            title: 'boAt Airdopes 141 ANC Earbuds',
                            slug: 'boat-airdopes-141-anc',
                            category: 'Electronics',
                            selling_price: 999,
                            mrp: 4490,
                            rating: 4.8,
                            images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80'],
                            merchants: { business_name: 'Sharma Digital Store', slug: 'sharma-digital' }
                        },
                        {
                            id: 'prod-2',
                            title: 'Fire-Boltt Ninja Pro Max Smartwatch',
                            slug: 'fire-boltt-ninja-pro-max',
                            category: 'Electronics',
                            selling_price: 1299,
                            mrp: 5999,
                            rating: 4.6,
                            images: ['https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=80'],
                            merchants: { business_name: 'InTrust Direct Tech', slug: 'intrust-direct' }
                        },
                        {
                            id: 'prod-3',
                            title: 'Samsung Galaxy Buds Live ANC',
                            slug: 'samsung-galaxy-buds-live',
                            category: 'Audio',
                            selling_price: 4999,
                            mrp: 15990,
                            rating: 4.9,
                            images: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80'],
                            merchants: { business_name: 'Bhopal Electronics Hub', slug: 'bhopal-electronics' }
                        },
                        {
                            id: 'prod-4',
                            title: 'Havells Instant Dry Iron 1000W',
                            slug: 'havells-instant-dry-iron',
                            category: 'Home Appliances',
                            selling_price: 1099,
                            mrp: 1899,
                            rating: 4.7,
                            images: ['https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=600&auto=format&fit=crop&q=80'],
                            merchants: { business_name: 'Gupta Electric & Retail', slug: 'gupta-electric' }
                        }
                    ]);
                }
            } catch (err) {
                console.error('Failed to fetch trending products:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTrending();
    }, []);

    const handleAddToCart = (e, product) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            const rawCart = localStorage.getItem('intrust_cart');
            const cart = rawCart ? JSON.parse(rawCart) : [];
            const existingIdx = cart.findIndex((i) => i.id === product.id);

            if (existingIdx >= 0) {
                cart[existingIdx].quantity = (cart[existingIdx].quantity || 1) + 1;
            } else {
                cart.push({
                    id: product.id,
                    title: product.title,
                    price: product.selling_price,
                    mrp: product.mrp,
                    image: product.images?.[0] || '',
                    merchantName: product.merchants?.business_name || 'InTrust Merchant',
                    quantity: 1
                });
            }

            localStorage.setItem('intrust_cart', JSON.stringify(cart));
            window.dispatchEvent(new Event('cartUpdated'));

            setAddedId(product.id);
            toast.success(`Added ${product.title} to your cart!`);

            setTimeout(() => {
                setAddedId(null);
            }, 2000);
        } catch (err) {
            console.error('Add to cart error:', err);
        }
    };

    if (loading) {
        return (
            <div className="w-full space-y-4">
                <div className="h-8 w-48 bg-surface-container-high rounded-xl animate-pulse" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((n) => (
                        <div key={n} className="h-64 bg-surface-container-low rounded-3xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
                        <span>🔥 Flash Deals &amp; Trending Products</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
                        Guaranteed genuine products protected by InTrust Escrow payment protection.
                    </p>
                </div>
                <Link
                    href="/shop"
                    className="text-xs font-bold text-primary hover:text-blue-700 flex items-center gap-1 group"
                >
                    <span>View All Deals</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {products.map((prod) => {
                    const discount = prod.mrp && prod.selling_price 
                        ? Math.round(((prod.mrp - prod.selling_price) / prod.mrp) * 100)
                        : 0;

                    const isAdded = addedId === prod.id;
                    const imageUrl = prod.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80';

                    return (
                        <Link
                            key={prod.id}
                            href={`/shop/product/${prod.slug || prod.id}`}
                            className="group flex flex-col justify-between bg-surface-container-lowest hover:bg-surface-container-low rounded-3xl p-4 border border-outline-variant/30 hover:border-primary/40 shadow-sm hover:shadow-xl transition-all duration-300"
                        >
                            <div>
                                {/* Image backplate */}
                                <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-surface-container-low mb-4 flex items-center justify-center p-3">
                                    <img
                                        src={imageUrl}
                                        alt={prod.title}
                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                    />

                                    {/* Discount badge */}
                                    {discount > 0 && (
                                        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                                            {discount}% OFF
                                        </div>
                                    )}

                                    {/* Rating badge */}
                                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-surface-container-lowest/90 backdrop-blur-md text-on-surface text-[10px] font-black flex items-center gap-1 shadow-sm">
                                        <Star size={11} className="text-amber-500 fill-amber-500" />
                                        <span>{prod.rating || '4.8'}</span>
                                    </div>
                                </div>

                                {/* Category & Merchant */}
                                <div className="flex items-center gap-1.5 text-[11px] text-brand-steel font-semibold mb-1 truncate">
                                    <Store size={12} className="text-primary shrink-0" />
                                    <span className="truncate">{prod.merchants?.business_name || 'Verified Store'}</span>
                                </div>

                                {/* Title */}
                                <h3 className="font-bold text-sm text-on-surface line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                    {prod.title}
                                </h3>
                            </div>

                            {/* Price and Cart Action */}
                            <div className="pt-4 mt-3 border-t border-outline-variant/20 flex items-center justify-between gap-2">
                                <div className="flex flex-col">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-lg font-black text-on-surface">
                                            ₹{Number(prod.selling_price).toLocaleString('en-IN')}
                                        </span>
                                        {prod.mrp && prod.mrp > prod.selling_price && (
                                            <span className="text-xs text-brand-steel line-through font-semibold">
                                                ₹{Number(prod.mrp).toLocaleString('en-IN')}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                        +5% InTrust Cashback
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={(e) => handleAddToCart(e, prod)}
                                    className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                                        isAdded
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-primary hover:bg-blue-700 text-white shadow-md active:scale-90'
                                    }`}
                                    title="Add to Cart"
                                >
                                    {isAdded ? <Check size={16} /> : <Plus size={16} />}
                                </button>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
