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
            className="group flex flex-col rounded-[24px] overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-500 ease-out h-full"
        >
            <div className="relative aspect-[4/5] bg-gray-50 dark:bg-gray-800 overflow-hidden">
                {!imgError && result.thumbnail ? (
                    <Image
                        src={result.thumbnail}
                        alt={result.name}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        onError={() => setImgError(true)}
                        sizes="(max-width: 640px) 100vw, 250px"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                        {emoji}
                    </div>
                )}
                {/* Category Badge overlay */}
                <div className="absolute top-3 left-3 z-10">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm border border-white/20 ${catStyle}`}>
                        {result.category}
                    </span>
                </div>
            </div>
            
            <div className="p-5 flex flex-col flex-1">
                <h3 className="text-[15px] font-bold leading-snug line-clamp-2 text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
                    {result.name}
                </h3>
                
                {result.description && (
                    <p className="text-xs line-clamp-2 text-gray-500 dark:text-gray-400 mb-4 mt-auto">
                        {result.description}
                    </p>
                )}
                
                <div className="mt-auto flex items-end justify-between">
                    {result.price !== null && result.price !== undefined ? (
                        <div>
                            <p className="text-sm font-black text-gray-900 dark:text-white tracking-tight">
                                ₹{result.price.toLocaleString('en-IN')}
                            </p>
                        </div>
                    ) : (
                        <div />
                    )}
                    <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}
