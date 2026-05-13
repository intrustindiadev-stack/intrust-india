'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function ResultCard({ result, variant = 'default' }) {
    const [imgError, setImgError] = useState(false);

    if (variant === 'skeleton') {
        return (
            <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden animate-pulse">
                <div className="aspect-[4/5] bg-[var(--bg-secondary)]" />
                <div className="p-3.5 space-y-2">
                    <div className="h-3 w-16 bg-[var(--bg-secondary)] rounded" />
                    <div className="h-4 w-full bg-[var(--bg-secondary)] rounded" />
                    <div className="h-4 w-2/3 bg-[var(--bg-secondary)] rounded" />
                    <div className="h-4 w-1/3 bg-[var(--bg-secondary)] rounded" />
                </div>
            </div>
        );
    }

    const categoryStyles = {
        products: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        services: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
        giftcards: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
        offers: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        nfc: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        solar: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    };

    const categoryEmojis = {
        products: '🛍️',
        services: '🏪',
        giftcards: '🎁',
        offers: '🏷️',
        nfc: '📲',
        solar: '☀️',
    };

    const catStyle = categoryStyles[result.category] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    const emoji = categoryEmojis[result.category] || '🔍';

    return (
        <Link 
            href={result.url}
            className="group block rounded-2xl overflow-hidden border bg-[var(--card-bg)] border-[var(--border-color)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
            <div className="relative aspect-[4/5] bg-[var(--bg-secondary)] overflow-hidden">
                {!imgError && result.thumbnail ? (
                    <Image
                        src={result.thumbnail}
                        alt={result.name}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl">
                        {emoji}
                    </div>
                )}
            </div>
            
            <div className="p-3.5">
                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 ${catStyle}`}>
                    {result.category}
                </span>
                
                <h3 className="text-sm font-semibold line-clamp-2 mb-1" style={{ color: 'var(--text-primary)' }}>
                    {result.name}
                </h3>
                
                {result.description && (
                    <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {result.description}
                    </p>
                )}
                
                {result.price !== null && result.price !== undefined && (
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        ₹{result.price.toLocaleString('en-IN')}
                    </p>
                )}
            </div>
        </Link>
    );
}
