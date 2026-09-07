'use client';

import React, { useState } from 'react';
import { Package, Smartphone, Laptop, Shirt, Watch, Headphones, Home, Sparkles } from 'lucide-react';

const CATEGORY_FALLBACKS = {
    'electronics': 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=300&auto=format&fit=crop&q=80',
    'computers': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&auto=format&fit=crop&q=80',
    'fashion': 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=300&auto=format&fit=crop&q=80',
    'footwear': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&auto=format&fit=crop&q=80',
    'personal care': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&auto=format&fit=crop&q=80',
    'wearables': 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=300&auto=format&fit=crop&q=80',
    'audio': 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=300&auto=format&fit=crop&q=80',
    'home & living': 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=300&auto=format&fit=crop&q=80'
};

const CATEGORY_ICONS = {
    'electronics': Smartphone,
    'computers': Laptop,
    'fashion': Shirt,
    'footwear': Package,
    'personal care': Sparkles,
    'wearables': Watch,
    'audio': Headphones,
    'home & living': Home
};

export default function ProductThumbnail({
    src,
    alt = 'Product Thumbnail',
    category = 'electronics',
    className = 'w-12 h-12 rounded-xl',
    imgClassName = 'w-full h-full object-cover',
    showIconFallback = true
}) {
    const normCategory = (category || '').toLowerCase().trim();
    const fallbackImage = CATEGORY_FALLBACKS[normCategory] || CATEGORY_FALLBACKS['electronics'];
    const IconComponent = CATEGORY_ICONS[normCategory] || Package;

    const [imgSrc, setImgSrc] = useState(src || fallbackImage);
    const [hasError, setHasError] = useState(false);

    // Sync when src prop changes
    React.useEffect(() => {
        setImgSrc(src || fallbackImage);
        setHasError(false);
    }, [src, fallbackImage]);

    const handleError = () => {
        if (imgSrc !== fallbackImage) {
            // Try category fallback first
            setImgSrc(fallbackImage);
        } else {
            // If fallback also fails, trigger icon mode
            setHasError(true);
        }
    };

    return (
        <div className={`relative overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 shadow-xs flex items-center justify-center ${className}`}>
            {!hasError && imgSrc ? (
                <img
                    src={imgSrc}
                    alt={alt}
                    onError={handleError}
                    loading="lazy"
                    className={`transition-transform duration-300 ${imgClassName}`}
                />
            ) : showIconFallback ? (
                <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-400">
                    <IconComponent size={20} className="stroke-[1.5]" />
                </div>
            ) : null}
        </div>
    );
}
