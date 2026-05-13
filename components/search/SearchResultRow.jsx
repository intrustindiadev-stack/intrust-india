import Image from 'next/image';
import { useState } from 'react';

export default function SearchResultRow({ result, isHighlighted, onSelect, onMouseEnter }) {
    const [imgError, setImgError] = useState(false);

    const categoryStyles = {
        products: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        services: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
        giftcards: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
        offers: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        nfc: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        solar: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    };

    const catStyle = categoryStyles[result.category] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

    return (
        <button
            onMouseDown={(e) => {
                e.preventDefault();
                onSelect(result);
            }}
            onMouseEnter={onMouseEnter}
            className={`flex items-center gap-3 px-4 py-2.5 w-full text-left rounded-2xl transition-colors ${isHighlighted ? 'bg-blue-50/80 dark:bg-gray-700/60' : 'hover:bg-slate-50 dark:hover:bg-gray-700/40'
                }`}
        >
            <div className="relative w-8 h-8 shrink-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                {!imgError && result.thumbnail ? (
                    <Image
                        src={result.thumbnail}
                        alt={result.name}
                        width={32}
                        height={32}
                        unoptimized
                        className="rounded-lg object-cover shrink-0 w-full h-full"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <span className="text-sm">🔍</span>
                )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {result.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {result.price !== null && result.price !== undefined
                        ? `₹${result.price.toLocaleString('en-IN')}`
                        : result.category}
                </p>
            </div>

            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${catStyle}`}>
                {result.category}
            </span>
        </button>
    );
}
